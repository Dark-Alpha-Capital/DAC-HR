import {
  asImageSrc,
  asText,
  isFilled,
  type ImageField,
  type KeyTextField,
  type PrismicDocument,
  type RichTextField,
} from "@prismicio/client";

export type PrismicMemberKind = "team" | "operating";

export type PrismicMember = {
  id: string;
  uid: string | null;
  kind: PrismicMemberKind;
  name: string;
  designation: string | null;
  department: string | null;
  role: string | null;
  bio: string | null;
  photoUrl: string | null;
};

type MemberData = Record<
  string,
  RichTextField | KeyTextField | ImageField | unknown
>;

function readText(data: MemberData, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
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

export function toPrismicMember(
  document: PrismicDocument,
  kind: PrismicMemberKind,
): PrismicMember {
  const data = document.data as MemberData;

  const level = readText(data, ["level"]);
  const designation = readText(data, ["designation"]);
  const department = readText(data, ["department"]);
  const memberDesignation =
    kind === "operating" ? designation ?? level : level ?? designation;
  const role =
    kind === "operating"
      ? memberDesignation
      : [memberDesignation, department].filter(Boolean).join(" · ") || null;

  return {
    id: document.id,
    uid: document.uid,
    kind,
    name:
      readText(data, ["name", "full_name", "member_name"]) ??
      document.uid ??
      "Unnamed member",
    designation: memberDesignation,
    department,
    role,
    bio: readText(data, ["description", "bio", "summary"]),
    photoUrl: readImageUrl(data, [
      "profile_image",
      "image",
      "photo",
      "avatar",
      "headshot",
    ]),
  };
}
