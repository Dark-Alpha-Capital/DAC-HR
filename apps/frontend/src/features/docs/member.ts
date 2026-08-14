import {
  asImageSrc,
  asLink,
  asText,
  isFilled,
  type ImageField,
  type KeyTextField,
  type LinkField,
  type PrismicDocument,
  type RichTextField,
  type SliceZone,
} from "@prismicio/client";

export type PrismicMemberKind = "team" | "operating";

export type PrismicMember = {
  id: string;
  uid: string | null;
  kind: PrismicMemberKind;
  name: string;
  /** Raw Prismic `level` (team members). */
  level: string | null;
  /** Raw Prismic `designation` (operating members). */
  designation: string | null;
  /** Display title: level for team, designation for operating. */
  title: string | null;
  department: string | null;
  /** Convenience label for lists: title (+ department for team). */
  role: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedInUrl: string | null;
  phoneNumber: string | null;
  resumeUrl: string | null;
  calendlyUrl: string | null;
};

type MemberData = Record<
  string,
  | RichTextField
  | KeyTextField
  | ImageField
  | LinkField
  | SliceZone
  | unknown
>;

function readText(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (isFilled.richText(value as RichTextField)) {
      const text = asText(value as RichTextField).trim();
      if (text) return text;
    }
  }
  return null;
}

function readImageUrl(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (isFilled.image(value as ImageField)) {
      const src = asImageSrc(value as ImageField);
      if (src) return src;
    }
  }
  return null;
}

function readLinkUrl(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (isFilled.link(value as LinkField)) {
      const href = asLink(value as LinkField);
      if (href) return href;
    }
  }
  return null;
}

/** When top-level description is empty, fall back to slice primary.description. */
function readBioFromSlices(data: MemberData): string | null {
  const slices = data.slices;
  if (!Array.isArray(slices)) return null;

  for (const slice of slices) {
    if (!slice || typeof slice !== "object") continue;
    const primary = (slice as { primary?: MemberData }).primary;
    if (!primary) continue;
    const text = readText(primary, ["description", "bio", "summary"]);
    if (text) return text;
  }

  return null;
}

export function toPrismicMember(
  document: PrismicDocument,
  kind: PrismicMemberKind,
): PrismicMember {
  const data = document.data as MemberData;

  const level = readText(data, ["level"]);
  const designation = readText(data, ["designation"]);
  const department = readText(data, ["department"]);
  const title =
    kind === "operating" ? designation ?? level : level ?? designation;
  const role =
    kind === "operating"
      ? title
      : [title, department].filter(Boolean).join(" · ") || null;

  return {
    id: document.id,
    uid: document.uid,
    kind,
    name:
      readText(data, ["name", "full_name", "member_name"]) ??
      document.uid ??
      "Unnamed member",
    level,
    designation,
    title,
    department,
    role,
    bio:
      readText(data, ["description", "bio", "summary"]) ??
      readBioFromSlices(data),
    photoUrl: readImageUrl(data, [
      "profile_image",
      "image",
      "photo",
      "avatar",
      "headshot",
    ]),
    linkedInUrl: readLinkUrl(data, [
      "linkedinprofilelink",
      "linkedin_profile_link",
      "linkedin",
      "linkedin_url",
    ]),
    phoneNumber: readText(data, [
      "phonenumber",
      "phone_number",
      "phone",
      "phoneNumber",
    ]),
    resumeUrl: readLinkUrl(data, [
      "resume",
      "resume_link",
      "resume_url",
      "resumelink",
    ]),
    calendlyUrl: readLinkUrl(data, [
      "calendlylink",
      "calendly_link",
      "calendly",
      "calendly_url",
      "calendlyLink",
    ]),
  };
}
