/**
 * List of emails that have access to view weekly check-in records.
 * Add or remove emails as needed.
 */
export const WEEKLY_CHECKIN_VIEWER_EMAILS = [
  "rahul@darkalphacapital.com",
  "admin@darkalphacapital.com",
  // Add more emails here as needed
];

/**
 * Check if an email has access to view weekly check-in records
 */
export const hasWeeklyCheckinViewerAccess = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return WEEKLY_CHECKIN_VIEWER_EMAILS.includes(email.toLowerCase());
};
