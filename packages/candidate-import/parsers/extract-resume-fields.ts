import { generateObject } from "ai";
import { getOpenAIModel } from "@workspace/ai-config/ai-sdk-provider";
import {
  handshakeRosterSchema,
  resumeFieldsSchema,
} from "./schemas";
import type { HandshakeRosterEntry, ResumeFields } from "../types";

const RESUME_EXTRACTION_PROMPT = `Extract candidate information from this resume text.
Return JSON with: firstName, lastName, email, phone, location, school, major, graduationYear, linkedinUrl.
Use null for missing fields. graduationYear must be a 4-digit year or null.`;

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

    return {
      firstName: object.firstName,
      lastName: object.lastName,
      email: object.email,
      phone: object.phone,
      location: object.location,
      school: object.school,
      major: object.major,
      graduationYear: object.graduationYear,
      linkedinUrl: object.linkedinUrl,
    };
  } catch (error) {
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
