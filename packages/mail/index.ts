import { createElement, type ReactElement } from "react";
import { render } from "@react-email/render";
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

export type TemplateData<T extends EmailTemplateName> = Parameters<
  (typeof templates)[T]["Component"]
>[0];

export interface SendMailInput<T extends EmailTemplateName> {
  sender: EmailSender;
  to: string;
  from?: EmailAddress;
  template: T;
  data: TemplateData<T>;
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
 * Renders a named template to subject/html/text using the React Email
 * component and `@react-email/render`. `render` resolves to an async
 * implementation on both the node and Workers (edge) builds.
 */
export async function renderEmail<T extends EmailTemplateName>(
  template: T,
  data: TemplateData<T>,
): Promise<RenderedEmail> {
  const entry = templates[template] as {
    subject: (data: TemplateData<T>) => string;
    Component: (props: TemplateData<T>) => ReactElement;
  };
  const element = createElement(entry.Component, data);
  const [html, text] = await Promise.all([
    render(element),
    render(element, {
      plainText: true,
      htmlToTextOptions: {
        selectors: [
          { selector: "h1", options: { uppercase: false } },
          { selector: "h2", options: { uppercase: false } },
          { selector: "h3", options: { uppercase: false } },
          { selector: "h4", options: { uppercase: false } },
          { selector: "h5", options: { uppercase: false } },
          { selector: "h6", options: { uppercase: false } },
        ],
      },
    }),
  ]);

  return { subject: entry.subject(data), html, text };
}

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

  const rendered = await renderEmail(template, data);

  return sender.send({
    to,
    from,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export { templates, type EmailTemplateName } from "./templates";
