import { Resend } from "resend";
import { render } from "@react-email/components";
import { WelcomeEmail, ApplicationRejection, GenericEmail } from "./emails/index.ts";
import type { EmailJobData } from "./types.ts";
import { EMAIL_CONFIG } from "./types.ts";

// Re-export types and emails
export * from "./types.ts";
export * from "./emails/index.ts";

// Re-export render function for email templates
export { render } from "@react-email/components";

/**
 * Create a Resend client instance
 */
export const createResendClient = (apiKey: string) => {
    return new Resend(apiKey);
};

// Lazy-initialized Resend client for direct email sending
let resendClient: Resend | null = null;

const getResendClient = () => {
    if (!resendClient) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY environment variable is not set");
        }
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
};

/**
 * Send an email directly using Resend (uses RESEND_API_KEY env var)
 * This is a simple utility for sending emails without a pre-configured client.
 */
export const sendEmailDirect = async (
    to: string,
    subject: string,
    html: string
) => {
    const client = getResendClient();
    const response = await client.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
    });
    return response;
};

/**
 * Send a generic email with custom subject and body
 * Renders the GenericEmail template and sends via Resend
 */
export const sendGenericEmail = async (options: {
    to: string;
    subject: string;
    body: string;
    preheader?: string;
}) => {
    const html = await render(
        GenericEmail({
            subject: options.subject,
            body: options.body,
            preheader: options.preheader,
        })
    );
    return sendEmailDirect(options.to, options.subject, html);
};

/**
 * Send a welcome email to a new employee
 */
export const sendWelcomeEmail = async (options: {
    to: string;
    employeeName: string;
    position?: string;
    startDate?: string;
}) => {
    const subject = "Welcome to Dark Alpha Capital!";
    const html = await render(
        WelcomeEmail({
            employeeName: options.employeeName,
            position: options.position,
            startDate: options.startDate,
        })
    );
    return sendEmailDirect(options.to, subject, html);
};

/**
 * Send an application rejection email
 */
export const sendRejectionEmail = async (options: {
    to: string;
    candidateName: string;
    positionTitle: string;
}) => {
    const subject = `Update on your application for ${options.positionTitle}`;
    const html = await render(
        ApplicationRejection({
            candidateName: options.candidateName,
            positionTitle: options.positionTitle,
        })
    );
    return sendEmailDirect(options.to, subject, html);
};

/**
 * Render an email template based on job data
 * Returns the subject and HTML content
 */
export const renderEmailTemplate = async (
    jobData: EmailJobData
): Promise<{ subject: string; html: string }> => {
    switch (jobData.type) {
        case "welcome-employee": {
            const subject = "Welcome to Dark Alpha Capital!";
            const html = await render(
                WelcomeEmail({
                    employeeName: jobData.employeeName,
                    position: jobData.position,
                    startDate: jobData.startDate,
                })
            );
            return { subject, html };
        }

        case "application-rejection": {
            const subject = `Update on your application for ${jobData.positionTitle}`;
            const html = await render(
                ApplicationRejection({
                    candidateName: jobData.candidateName,
                    positionTitle: jobData.positionTitle,
                })
            );
            return { subject, html };
        }

        case "generic": {
            const html = await render(
                GenericEmail({
                    subject: jobData.subject,
                    body: jobData.body,
                    preheader: jobData.preheader,
                })
            );
            return { subject: jobData.subject, html };
        }

        // Placeholder for onboarding emails - implement when needed
        case "onboarding-investor-confirmation":
        case "onboarding-admin-notification":
            throw new Error(
                `Email type "${jobData.type}" is not yet implemented`
            );

        default:
            throw new Error(
                `Unknown email type: ${(jobData as EmailJobData).type}`
            );
    }
};

/**
 * Send an email using Resend
 */
export const sendEmail = async (
    resend: Resend,
    to: string,
    subject: string,
    html: string
) => {
    const response = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
    });

    if (response.error) {
        throw new Error(`Failed to send email: ${response.error.message}`);
    }

    return response.data;
};

/**
 * Process an email job - renders template and sends email
 */
export const processEmailJob = async (resend: Resend, jobData: EmailJobData) => {
    const { subject, html } = await renderEmailTemplate(jobData);
    const result = await sendEmail(resend, jobData.to, subject, html);
    return {
        success: true,
        emailId: result?.id,
        to: jobData.to,
        type: jobData.type,
    };
};
