/**
 * AI Prompts for candidate analysis
 */

export const DOCUMENT_PARSING_PROMPT = `You are an expert resume parser. Parse this document and extract structured information.

Document Text:
{{DOCUMENT_TEXT}}

Return a JSON object with the following structure:
{
  "personalInfo": {
    "name": string,
    "email": string,
    "phone": string,
    "location": string,
    "linkedin": string (optional),
    "website": string (optional)
  },
  "summary": string (professional summary if present),
  "experience": [
    {
      "company": string,
      "title": string,
      "startDate": string,
      "endDate": string (or "Present"),
      "responsibilities": string[],
      "achievements": string[]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "field": string,
      "graduationYear": string
    }
  ],
  "skills": string[],
  "certifications": string[],
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": string[]
    }
  ]
}

Be thorough and extract all relevant information. If a field is not present, omit it from the JSON.`;

export const SKILLS_EXTRACTION_PROMPT = `You are an expert skills analyst. Analyze the candidate's resume and cover letter to extract all skills with detailed categorization.

RESUME:
{{RESUME}}

COVER LETTER:
{{COVER_LETTER}}

For each skill you identify, provide:
1. Skill name (normalized, e.g., "JavaScript" not "java script")
2. Category: technical, soft, domain, language, tool, or other
3. Proficiency level: beginner, intermediate, advanced, or expert (based on context clues)
4. Estimated years of experience (if mentioned or can be inferred)
5. Source: "resume", "cover_letter", or "both"
6. Context: Brief quote or description of where/how it was mentioned

Return as a JSON array:
[
  {
    "skillName": string,
    "category": "technical" | "soft" | "domain" | "language" | "tool" | "other",
    "proficiencyLevel": "beginner" | "intermediate" | "advanced" | "expert",
    "yearsOfExperience": number (can be null),
    "source": "resume" | "cover_letter" | "both",
    "context": string
  }
]

Be comprehensive - extract technical skills, soft skills, domain knowledge, languages, tools, and frameworks.`;

export const POSITION_MATCHING_PROMPT = `You are an expert HR analyst. Evaluate this candidate for the position and provide detailed scoring and analysis.

CANDIDATE DATA:
{{CANDIDATE_DATA}}

POSITION INFORMATION:
Name: {{POSITION_NAME}}
Description: {{POSITION_DESCRIPTION}}

Evaluate the candidate on the following criteria and provide scores from 0-100:

1. **Skills Match Score** (0-100): How well do the candidate's skills match the position requirements?
2. **Experience Match Score** (0-100): How relevant and sufficient is their experience?
3. **Culture Fit Score** (0-100): Based on cover letter tone, values, and communication style
4. **Overall Score** (0-100): Weighted average considering all factors

Also provide:
- **Summary**: 2-3 sentences capturing the candidate's fit for this role
- **Strengths**: Top 3-5 strengths relevant to this position
- **Concerns**: Top 2-3 concerns or gaps
- **Detailed Report**: A comprehensive markdown-formatted report (200-300 words) covering:
  - Skills assessment
  - Experience evaluation
  - Culture fit analysis
  - Recommendation
- **Sentiment Score** (-100 to 100): Overall enthusiasm/positivity in their application
- **Enthusiasm**: "low", "medium", or "high"
- **Experience Years**: Total years of relevant experience
- **Education Level**: Highest degree (e.g., "Bachelor's", "Master's", "PhD", "None")

Return as JSON:
{
  "skillsMatchScore": number,
  "experienceMatchScore": number,
  "cultureFitScore": number,
  "overallScore": number,
  "summary": string,
  "strengths": string[],
  "concerns": string[],
  "detailedReport": string (markdown formatted),
  "sentimentScore": number,
  "enthusiasm": "low" | "medium" | "high",
  "experienceYears": number,
  "educationLevel": string
}

Be objective, thorough, and provide actionable insights.`;

export const COHORT_INSIGHTS_PROMPT = `You are an expert HR analyst. Analyze this cohort of candidates and provide insights about the overall candidate pool.

CANDIDATES:
{{CANDIDATES_JSON}}

Provide insights about:
1. Overall quality of the candidate pool
2. Common strengths across candidates
3. Common gaps or concerns
4. Diversity of skills and backgrounds
5. Top candidates and why they stand out
6. Recommendations for hiring team

Return as a structured markdown report (150-200 words).`;

export const COVER_LETTER_ANALYSIS_PROMPT = `Analyze this cover letter for insights about the candidate's motivation, communication style, and culture fit.

COVER LETTER:
{{COVER_LETTER}}

POSITION:
{{POSITION_NAME}}

Provide:
1. **Key motivations**: Why they want this role
2. **Communication style**: Professional, casual, enthusiastic, etc.
3. **Standout points**: Unique aspects or compelling arguments
4. **Red flags**: Any concerns (if present)
5. **Culture fit indicators**: Values, work style, team fit

Return as JSON:
{
  "motivations": string[],
  "communicationStyle": string,
  "standoutPoints": string[],
  "redFlags": string[],
  "cultureFitIndicators": string[]
}`;

/**
 * Helper function to fill in prompt templates
 */
export function fillPrompt(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(`{{${key}}}`, value || 'N/A');
  }
  return filled;
}
