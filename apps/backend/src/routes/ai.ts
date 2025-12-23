import { Hono } from 'hono';
import { db } from '@workspace/db';
import { aiAnalysis, aiSkill, application, candidate } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { analysisQueue } from '../queues/analysis-queue';
import { generateRankings, getRankingStatistics } from '../services/ranking';
import { analyzeCandidateSchema, getRankingsSchema } from '../utils/validators';
import { betterAuthMiddleware } from '../middleware/better-auth';

const ai = new Hono();

// Apply authentication middleware to all AI routes
ai.use('*', betterAuthMiddleware);

/**
 * POST /api/ai/analyze-candidate
 * Trigger AI analysis for a single candidate application
 */
ai.post('/analyze-candidate', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = analyzeCandidateSchema.parse(body);

    const { applicationId } = validatedData;

    // Check if application exists
    const app = await db.query.application.findFirst({
      where: eq(application.id, applicationId),
    });

    if (!app) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Check if analysis already exists
    const existingAnalysis = await db.query.aiAnalysis.findFirst({
      where: eq(aiAnalysis.applicationId, applicationId),
    });

    if (existingAnalysis && existingAnalysis.status === 'completed') {
      return c.json({
        success: true,
        analysisId: existingAnalysis.id,
        status: 'completed',
        message: 'Analysis already completed',
      });
    }

    // Create or update analysis record
    let analysisId: string;

    if (existingAnalysis) {
      // Reset to pending
      await db
        .update(aiAnalysis)
        .set({ status: 'pending', errorMessage: null })
        .where(eq(aiAnalysis.id, existingAnalysis.id));
      analysisId = existingAnalysis.id;
    } else {
      // Create new analysis record
      const [newAnalysis] = await db
        .insert(aiAnalysis)
        .values({
          applicationId,
          status: 'pending',
        })
        .returning();
      analysisId = newAnalysis.id;
    }

    // Add to queue for async processing
    await analysisQueue.add('analyze-candidate', {
      analysisId,
      applicationId,
    });

    return c.json({
      success: true,
      analysisId,
      status: 'processing',
      estimatedTime: 30000, // ~30 seconds
    });
  } catch (error) {
    console.error('Error in analyze-candidate:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to start analysis',
    }, 500);
  }
});

/**
 * POST /api/ai/analyze-batch
 * Analyze multiple candidates for a position
 */
ai.post('/analyze-batch', async (c) => {
  try {
    const body = await c.req.json();
    const { positionId, applicationIds } = body;

    // Get applications for this position
    let apps;
    if (applicationIds && applicationIds.length > 0) {
      apps = await db.query.application.findMany({
        where: eq(application.positionId, positionId),
      });
      apps = apps.filter(app => applicationIds.includes(app.id));
    } else {
      apps = await db.query.application.findMany({
        where: eq(application.positionId, positionId),
      });
    }

    if (apps.length === 0) {
      return c.json({ error: 'No applications found for this position' }, 404);
    }

    const results = [];

    // Queue analysis for each application
    for (const app of apps) {
      // Check if analysis already exists
      const existingAnalysis = await db.query.aiAnalysis.findFirst({
        where: eq(aiAnalysis.applicationId, app.id),
      });

      let analysisId: string;

      if (existingAnalysis) {
        analysisId = existingAnalysis.id;
        if (existingAnalysis.status !== 'completed') {
          await db
            .update(aiAnalysis)
            .set({ status: 'pending', errorMessage: null })
            .where(eq(aiAnalysis.id, existingAnalysis.id));
        }
      } else {
        const [newAnalysis] = await db
          .insert(aiAnalysis)
          .values({
            applicationId: app.id,
            status: 'pending',
          })
          .returning();
        analysisId = newAnalysis.id;
      }

      await analysisQueue.add('analyze-candidate', {
        analysisId,
        applicationId: app.id,
      });

      results.push({ applicationId: app.id, analysisId });
    }

    return c.json({
      success: true,
      totalCandidates: results.length,
      results,
      status: 'processing',
    });
  } catch (error) {
    console.error('Error in analyze-batch:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to start batch analysis',
    }, 500);
  }
});

/**
 * GET /api/ai/analysis/:id
 * Get analysis results by ID
 */
ai.get('/analysis/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const analysis = await db.query.aiAnalysis.findFirst({
      where: eq(aiAnalysis.id, id),
    });

    if (!analysis) {
      return c.json({ error: 'Analysis not found' }, 404);
    }

    // Get associated skills
    const skills = await db.query.aiSkill.findMany({
      where: eq(aiSkill.analysisId, id),
    });

    return c.json({
      ...analysis,
      skills,
    });
  } catch (error) {
    console.error('Error in get-analysis:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to get analysis',
    }, 500);
  }
});

/**
 * GET /api/ai/analysis/application/:applicationId
 * Get analysis by application ID
 */
ai.get('/analysis/application/:applicationId', async (c) => {
  try {
    const applicationId = c.req.param('applicationId');

    const analysis = await db.query.aiAnalysis.findFirst({
      where: eq(aiAnalysis.applicationId, applicationId),
    });

    if (!analysis) {
      return c.json({ error: 'Analysis not found for this application' }, 404);
    }

    // Get associated skills
    const skills = await db.query.aiSkill.findMany({
      where: eq(aiSkill.analysisId, analysis.id),
    });

    return c.json({
      ...analysis,
      skills,
    });
  } catch (error) {
    console.error('Error in get-analysis-by-application:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to get analysis',
    }, 500);
  }
});

/**
 * GET /api/ai/rankings/:positionId
 * Get ranked candidates for a position
 */
ai.get('/rankings/:positionId', async (c) => {
  try {
    const positionId = c.req.param('positionId');

    // Get all applications with completed AI analysis for this position
    const apps = await db.query.application.findMany({
      where: eq(application.positionId, positionId),
      with: {
        candidate: true,
      },
    });

    const candidatesWithAnalysis = [];

    for (const app of apps) {
      const analysis = await db.query.aiAnalysis.findFirst({
        where: eq(aiAnalysis.applicationId, app.id),
      });

      if (analysis && analysis.status === 'completed') {
        candidatesWithAnalysis.push({
          applicationId: app.id,
          candidateId: app.candidateId,
          candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
          analysis: {
            skillsMatchScore: analysis.skillsMatchScore,
            experienceMatchScore: analysis.experienceMatchScore,
            overallScore: analysis.overallScore,
            cultureFitScore: analysis.cultureFitScore,
          },
        });
      }
    }

    if (candidatesWithAnalysis.length === 0) {
      return c.json({
        positionId,
        rankings: [],
        statistics: {
          totalCandidates: 0,
          averageScore: 0,
          topScore: 0,
          lowestScore: 0,
          tierDistribution: { top: 0, qualified: 0, consider: 0 },
        },
        message: 'No completed analyses found for this position',
      });
    }

    // Generate rankings
    const rankings = generateRankings(candidatesWithAnalysis);
    const statistics = getRankingStatistics(rankings);

    return c.json({
      positionId,
      rankings,
      statistics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in get-rankings:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to generate rankings',
    }, 500);
  }
});

/**
 * GET /api/ai/report/:applicationId
 * Get detailed markdown report for an application
 */
ai.get('/report/:applicationId', async (c) => {
  try {
    const applicationId = c.req.param('applicationId');

    const analysis = await db.query.aiAnalysis.findFirst({
      where: eq(aiAnalysis.applicationId, applicationId),
    });

    if (!analysis) {
      return c.json({ error: 'Analysis not found' }, 404);
    }

    if (analysis.status !== 'completed') {
      return c.json({
        error: `Analysis status is ${analysis.status}, not completed`,
      }, 400);
    }

    return c.json({
      applicationId,
      report: analysis.detailedReport,
      format: 'markdown',
      generatedAt: analysis.updatedAt,
    });
  } catch (error) {
    console.error('Error in get-report:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to get report',
    }, 500);
  }
});

/**
 * GET /api/ai/status
 * Get queue status and statistics
 */
ai.get('/status', async (c) => {
  try {
    const waiting = await analysisQueue.getWaitingCount();
    const active = await analysisQueue.getActiveCount();
    const completed = await analysisQueue.getCompletedCount();
    const failed = await analysisQueue.getFailedCount();

    return c.json({
      queue: {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active,
      },
    });
  } catch (error) {
    console.error('Error in get-status:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to get queue status',
    }, 500);
  }
});

export default ai;
