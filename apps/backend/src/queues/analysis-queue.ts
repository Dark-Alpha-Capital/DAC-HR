import { Queue, Worker, Job } from 'bullmq';
import { db } from '@workspace/db';
import { aiAnalysis, aiSkill, application, candidate, candidateDocument } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { parseResume, parseCoverLetter } from '../services/document-parser';
import { extractSkills } from '../services/skills-extractor';
import { matchCandidateToPosition } from '../services/position-matcher';

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export interface AnalysisJobData {
  analysisId: string;
  applicationId: string;
}

// Create the queue
export const analysisQueue = new Queue<AnalysisJobData>('candidate-analysis', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
});

// Create the worker
export const analysisWorker = new Worker<AnalysisJobData>(
  'candidate-analysis',
  async (job: Job<AnalysisJobData>) => {
    const { analysisId, applicationId } = job.data;

    console.log(`[Worker] Processing analysis ${analysisId} for application ${applicationId}`);

    try {
      // Update status to processing
      await db
        .update(aiAnalysis)
        .set({ status: 'processing' })
        .where(eq(aiAnalysis.id, analysisId));

      const startTime = Date.now();
      let totalTokens = 0;

      // 1. Get application with candidate and position data
      const app = await db.query.application.findFirst({
        where: eq(application.id, applicationId),
        with: {
          candidate: true,
          position: true,
        },
      });

      if (!app) {
        throw new Error('Application not found');
      }

      // 2. Get candidate documents
      const docs = await db.query.candidateDocument.findMany({
        where: eq(candidateDocument.candidateId, app.candidate.id),
      });

      const resumeDoc = docs.find(d => d.category === 'resume');
      const coverLetterDoc = docs.find(d => d.category === 'cover-letter');

      // 3. Parse documents
      let parsedResumeData = null;
      let resumeText = '';
      if (resumeDoc) {
        console.log(`[Worker] Parsing resume: ${resumeDoc.url}`);
        const result = await parseResume(resumeDoc.url);
        parsedResumeData = result.parsed;
        resumeText = result.rawText;
        totalTokens += result.tokensUsed;
      }

      let coverLetterText = '';
      if (coverLetterDoc) {
        console.log(`[Worker] Parsing cover letter: ${coverLetterDoc.url}`);
        const result = await parseCoverLetter(coverLetterDoc.url);
        coverLetterText = result.text;
      }

      // 4. Extract skills
      console.log(`[Worker] Extracting skills`);
      const skillsResult = await extractSkills(resumeText, coverLetterText);
      totalTokens += skillsResult.tokensUsed;

      // 5. Match to position
      console.log(`[Worker] Matching to position`);
      const matchResult = await matchCandidateToPosition(
        {
          parsedResume: parsedResumeData || {},
          coverLetterText,
          skills: skillsResult.skills,
          candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
          candidateEmail: app.candidate.email,
        },
        {
          name: app.position.name,
          description: app.position.description,
        }
      );
      totalTokens += matchResult.tokensUsed;

      const processingTime = Date.now() - startTime;

      // 6. Save analysis results
      console.log(`[Worker] Saving analysis results`);
      await db
        .update(aiAnalysis)
        .set({
          parsedResume: parsedResumeData ? JSON.stringify(parsedResumeData) : null,
          parsedCoverLetter: coverLetterText ? JSON.stringify({ text: coverLetterText }) : null,
          skillsExtracted: skillsResult.skills.map(s => s.skillName),
          experienceYears: matchResult.match.experienceYears,
          educationLevel: matchResult.match.educationLevel,
          overallScore: matchResult.match.overallScore,
          skillsMatchScore: matchResult.match.skillsMatchScore,
          experienceMatchScore: matchResult.match.experienceMatchScore,
          cultureFitScore: matchResult.match.cultureFitScore,
          summary: matchResult.match.summary,
          strengths: matchResult.match.strengths,
          concerns: matchResult.match.concerns,
          detailedReport: matchResult.match.detailedReport,
          sentimentScore: matchResult.match.sentimentScore,
          enthusiasm: matchResult.match.enthusiasm,
          tokensUsed: totalTokens,
          processingTimeMs: processingTime,
          status: 'completed',
        })
        .where(eq(aiAnalysis.id, analysisId));

      // 7. Save individual skills
      console.log(`[Worker] Saving ${skillsResult.skills.length} extracted skills`);
      for (const skill of skillsResult.skills) {
        await db.insert(aiSkill).values({
          analysisId,
          skillName: skill.skillName,
          category: skill.category,
          proficiencyLevel: skill.proficiencyLevel,
          yearsOfExperience: skill.yearsOfExperience,
          source: skill.source,
          context: skill.context,
        });
      }

      console.log(`[Worker] ✅ Analysis ${analysisId} completed successfully`);

      return {
        success: true,
        analysisId,
        processingTime,
        totalTokens,
      };
    } catch (error) {
      console.error(`[Worker] ❌ Analysis ${analysisId} failed:`, error);

      // Save error to database
      await db
        .update(aiAnalysis)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(aiAnalysis.id, analysisId));

      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Event listeners
analysisWorker.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed successfully`);
});

analysisWorker.on('failed', (job, error) => {
  console.error(`[Queue] Job ${job?.id} failed:`, error);
});

analysisWorker.on('error', (error) => {
  console.error('[Queue] Worker error:', error);
});

console.log('[Queue] Analysis worker started and ready to process jobs');
