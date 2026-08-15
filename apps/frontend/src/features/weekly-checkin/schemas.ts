import * as z from "zod";

export const sourcingChannels = [
  "linkedin",
  "indeed",
  "upwork",
  "handshake",
  "internal-referrals",
  "university-portals",
  "agency",
  "other",
] as const;

export const sourcingChannelLabels = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  upwork: "Upwork",
  handshake: "Handshake",
  "internal-referrals": "Internal Referrals",
  "university-portals": "University Portals",
  agency: "Agency",
  other: "Other",
} satisfies Record<(typeof sourcingChannels)[number], string>;

export const weeklyCheckinFormSchema = z.object({
  // Tab 1: This Week's Information
  weekStartDate: z.date({
    message: "Week start date is required",
  }),
  weekEndDate: z.date({
    message: "Week end date is required",
  }),
  recruiterName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  positionsWorked: z.array(z.string()),

  // Tab 2: Positions in Pipeline
  candidatesSourced: z.number().int().min(0),
  candidatesScreened: z.number().int().min(0),
  candidatesRejected: z.number().int().min(0),
  candidatesAdvanced2ndRound: z.number().int().min(0),
  candidatesAdvanced3rdRound: z.number().int().min(0),
  offersExtended: z.number().int().min(0),
  offersAccepted: z.number().int().min(0),

  // Tab 3: Candidate Quality, Channels & Efficiency
  bestPerformingChannels: z.array(z.enum(sourcingChannels)),
  avgTimeToScreen: z
    .string()
    .max(100, "Average time must be at most 100 characters"),

  // Tab 4: Key Notes, Issues & Performance Summary
  delaysOrBottlenecks: z
    .string()
    .max(2000, "Delays/bottlenecks must be at most 2000 characters"),
  concernsOrEscalations: z
    .string()
    .max(2000, "Concerns/escalations must be at most 2000 characters"),
  supportNeeded: z
    .string()
    .max(2000, "Support needed must be at most 2000 characters"),
});

export type WeeklyCheckinFormSchema = z.infer<typeof weeklyCheckinFormSchema>;
