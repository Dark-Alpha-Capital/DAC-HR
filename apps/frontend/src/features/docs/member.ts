import {
  asImageSrc,
  asLink,
  asText,
  isFilled,
  type AnyRegularField,
  type GroupField,
  type ImageField,
  type KeyTextField,
  type LinkField,
  type NumberField,
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

/**
 * Prismic document `data` map. Field values are heterogeneous per custom
 * type; the `isFilled` guards narrow each representation before use.
 */
type MemberData = Record<
  string,
  AnyRegularField | GroupField | SliceZone
>;

function readText(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    // SAFETY: these keys hold a Prismic KeyTextField when the guard passes.
    const keyText = value as KeyTextField;
    if (isFilled.keyText(keyText)) {
      const text = keyText.trim();
      if (text) return text;
    }
    // SAFETY: a number-representation of the field is a NumberField.
    const numberField = value as NumberField;
    if (isFilled.number(numberField)) {
      if (Number.isFinite(numberField)) return String(numberField);
    }
    // SAFETY: a rich-text representation of the field is a RichTextField.
    const richTextField = value as RichTextField;
    if (isFilled.richText(richTextField)) {
      const text = asText(richTextField).trim();
      if (text) return text;
    }
  }
  return null;
}

function readImageUrl(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    // SAFETY: these keys hold a Prismic ImageField; `isFilled.image` confirms it.
    const imageField = value as ImageField;
    if (isFilled.image(imageField)) {
      const src = asImageSrc(imageField);
      if (src) return src;
    }
  }
  return null;
}

function readLinkUrl(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    // SAFETY: these keys hold a Prismic LinkField; `isFilled.link` confirms it.
    const linkField = value as LinkField;
    if (isFilled.link(linkField)) {
      const href = asLink(linkField);
      if (href) return href;
    }
  }
  return null;
}

/** When top-level description is empty, fall back to slice primary.description. */
function readBioFromSlices(data: MemberData): string | null {
  const slices = data.slices;
  // SAFETY: when populated, the `slices` key holds a Prismic SliceZone.
  const sliceZone = slices as SliceZone;
  if (!isFilled.sliceZone(sliceZone)) return null;

  for (const slice of sliceZone) {
    if (!slice) continue;
    const primary = slice.primary;
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
  // SAFETY: Prismic documents carry their custom-type fields in `data`.
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
