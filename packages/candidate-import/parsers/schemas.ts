import { z } from "zod";

export const resumeFieldsSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  school: z.string().nullable(),
  major: z.string().nullable(),
  graduationYear: z.number().int().nullable(),
  linkedinUrl: z.string().nullable(),
});

export const handshakeRosterSchema = z.array(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
    school: z.string().nullable(),
    major: z.string().nullable(),
  }),
);

export type ResumeFieldsSchema = z.infer<typeof resumeFieldsSchema>;
export type HandshakeRosterSchema = z.infer<typeof handshakeRosterSchema>;
