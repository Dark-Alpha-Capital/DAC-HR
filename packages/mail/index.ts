import { templates, type EmailTemplateName } from "./templates";

export type EmailAddress = {
  email: string;
  name?: string;
};

/**
 * Minimal shape of the Cloudflare Email Service `send_email` binding.
 * Use `SendEmail` from `@cloudflare/workers-types` where available; this keeps
 * the package dependency-free and testable.
 */
export interface EmailSender {
  send(input: {
    to: string | string[];
    from: EmailAddress;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void>;
}

export interface SendMailInput<T extends EmailTemplateName> {
  sender: EmailSender;
  to: string;
  from?: EmailAddress;
  template: T;
  data: Parameters<(typeof templates)[T]["render"]>[0];
}

export const DEFAULT_FROM: EmailAddress = {
  email: "noreply@darkalphacapital.com",
  name: "Dark Alpha Capital",
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Renders a named template and sends it via the Cloudflare Email Service
 * binding. Safe to call from server functions / workflows / DOs. Returns the
 * send result, or `false` when no sender is available (e.g. local dev without
 * the EMAIL binding) so callers can no-op gracefully.
 */
export async function sendMail<T extends EmailTemplateName>({
  sender,
  to,
  from = DEFAULT_FROM,
  template,
  data,
}: SendMailInput<T>): Promise<void | false> {
  if (!sender) {
    return false;
  }

  const rendered = (
    // SAFETY: the generic index keeps the selected template's render
    // signature; the cast correlates it with `data`, which is already typed
    // to that render's parameter.
    templates[template] as {
      render: (
        data: Parameters<(typeof templates)[T]["render"]>[0],
      ) => RenderedEmail;
    }
  ).render(data);

  return sender.send({
    to,
    from,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export { templates, type EmailTemplateName } from "./templates";
