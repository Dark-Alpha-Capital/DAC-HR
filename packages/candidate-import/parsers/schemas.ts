import { z } from "zod";

export const resumeFieldsSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  school: z.string().nullable().optional(),
  major: z.string().nullable().optional(),
  graduationYear: z.number().int().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
});

export const handshakeRosterSchema = z.array(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
    school: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
  }),
);

export type ResumeFieldsSchema = z.infer<typeof resumeFieldsSchema>;
export type HandshakeRosterSchema = z.infer<typeof handshakeRosterSchema>;
