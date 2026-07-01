import { generateObject } from "ai";
import { getOpenAIModel } from "@workspace/ai-config/ai-sdk-provider";
import {
  handshakeRosterSchema,
  normalizeResumeFields,
  resumeFieldsSchema,
  findEmailInText,
} from "./schemas";
import type { HandshakeRosterEntry, ResumeFields } from "../types";

const RESUME_EXTRACTION_PROMPT = `Extract candidate information from this resume text.
Return JSON with: firstName, lastName, email, phone, location, school, major, graduationYear, linkedinUrl.
Use null for any field you cannot find. graduationYear must be a 4-digit year or null.
email must be a real address from the resume, or null if not present.`;

const ROSTER_EXTRACTION_PROMPT = `Extract the applicant roster from this Handshake export text.
Return a JSON array of objects with: name, email, school, major.
Only include actual applicants from the roster table, not resume content.`;

export async function extractResumeFieldsFromText(
  resumeText: string,
  apiKey: string,
): Promise<ResumeFields | null> {
  const trimmed = resumeText.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const { object } = await generateObject({
      model: getOpenAIModel(apiKey),
      schema: resumeFieldsSchema,
      prompt: `${RESUME_EXTRACTION_PROMPT}\n\nResume text:\n${trimmed.slice(0, 30000)}`,
    });

    return normalizeResumeFields(object, trimmed);
  } catch (error) {
    const regexEmail = findEmailInText(trimmed);
    if (regexEmail) {
      console.warn(
        `⚠️  openai › resume extraction parse failed — using regex email │ ${regexEmail}`,
      );
      return normalizeResumeFields(
        {
          firstName: null,
          lastName: null,
          email: regexEmail,
          phone: null,
          location: null,
          school: null,
          major: null,
          graduationYear: null,
          linkedinUrl: null,
        },
        trimmed,
      );
    }

    console.error(
      `❌  openai › resume extraction failed │ ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

export async function extractHandshakeRosterWithOpenAI(
  rosterText: string,
  apiKey: string,
): Promise<HandshakeRosterEntry[]> {
  const trimmed = rosterText.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const { object } = await generateObject({
      model: getOpenAIModel(apiKey),
      schema: handshakeRosterSchema,
      prompt: `${ROSTER_EXTRACTION_PROMPT}\n\nRoster text:\n${trimmed.slice(0, 20000)}`,
    });

    return object;
  } catch (error) {
    console.error(
      `❌  openai › roster extraction failed │ ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}
