import { eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import { user } from "@workspace/db/schema";

/**
 * Attendance rows require a `marked_by` user FK. External mark requests have
 * no session, so attribute them to an admin (or any) user until API auth lands.
 */
export async function resolveAttendanceServiceUserId(): Promise<string> {
  const [admin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);

  if (admin) return admin.id;

  const [anyUser] = await db.select({ id: user.id }).from(user).limit(1);

  if (!anyUser) {
    throw new Error(
      "No users exist to attribute automated attendance. Sign in once to create a user.",
    );
  }

  return anyUser.id;
}
