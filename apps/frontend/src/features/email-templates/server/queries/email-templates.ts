import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { emailTemplatesService } from "../email-templates-service";

// Any authenticated user reads templates (used to pre-fill the send dialog);
// only saving is admin-guarded.
export const loadEmailTemplate = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { type: string }) => data)
  .handler(async ({ data }) => {
    if (data.type !== "interview-invite") {
      throw new Error(`Unknown email template type: ${data.type}`);
    }
    return emailTemplatesService.getEmailTemplate(data.type);
  });
