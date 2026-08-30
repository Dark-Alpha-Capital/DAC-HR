import { createServerFn } from "@tanstack/react-start";
import { serverFnAdminGuard } from "#/features/auth/server/auth-middleware";
import {
  emailTemplatesService,
  type SaveEmailTemplateInput,
} from "../email-templates-service";

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([serverFnAdminGuard])
  .validator((data: SaveEmailTemplateInput) => data)
  .handler(async ({ data, context: { session } }) =>
    emailTemplatesService.saveEmailTemplate(data, session.user),
  );
