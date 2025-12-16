import { Hono } from "hono";
import {
  CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
  googleGenAI,
} from "../lib/ai/models";
import {
  getCandidateWithApplications,
  saveCandidateAiScreening,
} from "@workspace/db/queries";
import { candidateAiScreeningSchema } from "../lib/schema";
import { authMiddleware } from "middleware/auth";

const candidate = new Hono()
  .get("/", (c) => {
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  })
  .get("/:id", (c) => {
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  })
  /**
   * AI analysis endpoint
   *
   * - Fetches full candidate record (including applications and positions)
   * - Optionally focuses on a specific position/application (via positionId)
   * - Uses Gemini + File Search over candidate documents
   * - Returns a detailed suitability report
   */
  .post("/:id/ai-analysis", authMiddleware, async (c) => {
    try {
      const candidateId = c.req.param("id");

      if (!candidateId) {
        return c.json({ error: "Candidate ID is required" }, { status: 400 });
      }

      let body: { positionId?: string } = {};
      try {
        body = await c.req.json();
      } catch {
        // Ignore JSON parse errors – treat as no body / no positionId
      }

      const { positionId } = body;

      // Fetch candidate with all applications & positions
      const candidateRecord = await getCandidateWithApplications(candidateId);

      if (!candidateRecord) {
        return c.json({ error: "Candidate not found" }, { status: 404 });
      }

      // Choose the relevant application for analysis
      const targetApplication =
        (positionId &&
          candidateRecord.applications.find(
            (app) => app.position.id === positionId
          )) ||
        candidateRecord.applications[0] ||
        null;

      const targetPosition = targetApplication?.position ?? null;

      // Build a compact structured context for the model
      const structuredContext = {
        candidate: {
          id: candidateRecord.id,
          firstName: candidateRecord.firstName,
          lastName: candidateRecord.lastName,
          email: candidateRecord.email,
          phone: candidateRecord.phone,
          location: candidateRecord.location,
          source: candidateRecord.source,
          sourceUrl: candidateRecord.sourceUrl,
          note: candidateRecord.note,
          createdAt: candidateRecord.createdAt,
          updatedAt: candidateRecord.updatedAt,
        },
        focusApplication: targetApplication
          ? {
              id: targetApplication.id,
              status: targetApplication.status,
              personality: targetApplication.personality,
              createdAt: targetApplication.createdAt,
              updatedAt: targetApplication.updatedAt,
              position: {
                id: targetApplication.position.id,
                name: targetApplication.position.name,
                slug: targetApplication.position.slug,
                description: targetApplication.position.description,
              },
              interviews: (targetApplication.interviews || []).map((iv) => ({
                id: iv.id,
                status: iv.status,
                rating: iv.rating,
                scheduledAt: iv.scheduledAt,
                overallFeedback: iv.overallFeedback,
                roundTemplate: {
                  id: iv.roundTemplate.id,
                  name: iv.roundTemplate.name,
                  description: iv.roundTemplate.description,
                },
              })),
            }
          : null,
      };

      const structuredContextJson = JSON.stringify(structuredContext, null, 2);

      // Simplified prompt for candidate suitability analysis
      const prompt = `
You are an expert buy-side hedge fund recruiter and people manager for DarkAlpha Capital.
Your task is to evaluate whether the candidate is a strong fit for the specific position,
using BOTH:
- the structured candidate + position data I give you, AND
- the candidate's documents available via the file search tool.

FIRST, use the fileSearch tool to retrieve and read **all** documents for this candidate
from the \`${CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME}\` store. These may include resume,
cover letter, case studies, work samples, interview feedback, and internal notes.

Then, based on everything you know, produce a comprehensive markdown analysis report
covering the candidate's background, skills, experience fit, culture fit, and overall
suitability for the role.

Important guidelines:
- Always ground your reasoning in specific facts from the candidate data and documents.
- If some information is missing, **explicitly say what is missing** instead of guessing.
- Be concise but concrete; avoid generic HR language.

Here is the structured data about the candidate and position (JSON):
\`\`\`json
${structuredContextJson}
\`\`\`

Now perform the full analysis as described above.
      `.trim();

      // Note: Cannot use responseMimeType: "application/json" with tools (fileSearch)
      // So we'll ask the model to return JSON in the prompt and parse it manually
      const enhancedPrompt = `${prompt}

IMPORTANT: You must respond with ONLY valid JSON that matches this simple structure:
{
  "verdict": "Strong Hire" | "Hire" | "Neutral / On the Fence" | "Do Not Hire",
  "score": 0-10,
  "explanation": "A clear explanation of your verdict and score (2-4 sentences)",
  "fullAnalysis": "The complete markdown analysis report covering candidate background, skills, experience fit, culture fit, and overall suitability"
}

Return ONLY the JSON object, no markdown formatting, no code blocks, just pure JSON.`;

      const response = await googleGenAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: enhancedPrompt }],
          },
        ],
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME],
                metadataFilter: `candidate_id="${candidateId}"`,
              },
            },
          ],
        },
      });

      // Extract and parse JSON from response
      let responseText = response.text || "";

      // Remove markdown code blocks if present
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to extract JSON if wrapped in text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }

      const parsedResponse = JSON.parse(responseText);
      const candidateAiScreening =
        candidateAiScreeningSchema.parse(parsedResponse);

      console.log("Structured AI Screening:", candidateAiScreening);

      // Save the analysis to the database
      const savedScreening = await saveCandidateAiScreening({
        candidateId,
        positionId: targetApplication?.position.id || null,
        applicationId: targetApplication?.id || null,
        analysis: candidateAiScreening.fullAnalysis,
        model: "gemini-2.5-flash",
        structuredData: candidateAiScreening,
      });

      if (!savedScreening) {
        console.warn(
          "Failed to save AI screening to database, but analysis was generated successfully"
        );
      }

      return c.json(
        {
          analysis: candidateAiScreening.fullAnalysis,
          screeningId: savedScreening?.id || null,
          structuredData: candidateAiScreening,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error during candidate AI analysis", error);
      return c.json(
        {
          error: "Failed to analyze candidate",
        },
        { status: 500 }
      );
    }
  });

export default candidate;
