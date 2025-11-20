"use server";

import { db } from "@workspace/db";
import { application, candidate, position, documents } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "hired"
  | "rejected"
  | "withdrawn";

/**
 * Update application status and trigger onboarding workflow if hired
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  try {
    // Update the application status
    const [updatedApplication] = await db
      .update(application)
      .set({ status })
      .where(eq(application.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return { success: false, error: "Application not found" };
    }

    // If status is "hired", trigger the onboarding workflow
    if (status === "hired") {
      await triggerOnboardingWorkflow(applicationId);
    }

    revalidatePath(`/applications/${applicationId}`);
    revalidatePath(`/candidates/[uid]`, "page");

    return { success: true, application: updatedApplication };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update application status" };
  }
}

/**
 * Onboarding workflow - triggered when a candidate is hired
 * This function orchestrates the onboarding process
 */
async function triggerOnboardingWorkflow(applicationId: string) {
  try {
    // Get application with candidate and position data
    const [applicationData] = await db
      .select({
        application,
        candidate,
        position,
      })
      .from(application)
      .innerJoin(candidate, eq(application.candidateId, candidate.id))
      .innerJoin(position, eq(application.positionId, position.id))
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!applicationData) {
      console.error("Application not found for onboarding workflow");
      return;
    }

    const { candidate: candidateData, position: positionData } = applicationData;

    // Get onboarding documents if specified
    let onboardingDocuments: typeof documents.$inferSelect[] = [];
    if (
      positionData.onboardingDocumentIds &&
      positionData.onboardingDocumentIds.length > 0
    ) {
      onboardingDocuments = await db
        .select()
        .from(documents)
        .where(inArray(documents.id, positionData.onboardingDocumentIds));
    }

    // Prepare onboarding email data
    const onboardingData = {
      candidateName: `${candidateData.firstName} ${candidateData.lastName}`,
      candidateEmail: candidateData.email,
      positionName: positionData.name,
      onboardingTitle: positionData.onboardingTitle || `Welcome to ${positionData.name}`,
      onboardingMessage: positionData.onboardingMessage ||
        `Congratulations! We're excited to have you join our team as ${positionData.name}.`,
      onboardingInstructions: positionData.onboardingInstructions,
      documents: onboardingDocuments,
    };

    // Send onboarding email (async workflow step)
    await sendOnboardingEmail(onboardingData);

    console.log(`✅ Onboarding workflow completed for ${candidateData.email}`);
  } catch (error) {
    console.error("Error in onboarding workflow:", error);
    // Don't throw - we don't want to block the status update
  }
}

/**
 * Send onboarding email
 * This is a placeholder - integrate with your email service (SendGrid, Resend, etc.)
 */
async function sendOnboardingEmail(data: {
  candidateName: string;
  candidateEmail: string;
  positionName: string;
  onboardingTitle: string;
  onboardingMessage: string;
  onboardingInstructions: string | null;
  documents: Array<{ id: string; name: string; url: string; description: string | null }>;
}) {
  try {
    // TODO: Replace with actual email service integration
    // Examples: SendGrid, Resend, AWS SES, etc.

    console.log("📧 Sending onboarding email:");
    console.log(`  To: ${data.candidateEmail}`);
    console.log(`  Name: ${data.candidateName}`);
    console.log(`  Position: ${data.positionName}`);
    console.log(`  Title: ${data.onboardingTitle}`);
    console.log(`  Message: ${data.onboardingMessage}`);
    if (data.onboardingInstructions) {
      console.log(`  Instructions: ${data.onboardingInstructions}`);
    }
    if (data.documents.length > 0) {
      console.log(`  Documents (${data.documents.length}):`);
      data.documents.forEach((doc) => {
        console.log(`    - ${doc.name}: ${doc.url}`);
      });
    }

    // Example integration with Resend (uncomment when ready):
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'hr@yourcompany.com',
      to: data.candidateEmail,
      subject: data.onboardingTitle,
      html: `
        <h1>${data.onboardingTitle}</h1>
        <p>Dear ${data.candidateName},</p>
        <p>${data.onboardingMessage}</p>
        ${data.onboardingInstructions ? `<h2>Next Steps</h2><p>${data.onboardingInstructions}</p>` : ''}
        ${data.documents.length > 0 ? `
          <h2>Important Documents</h2>
          <ul>
            ${data.documents.map(doc => `
              <li><a href="${doc.url}">${doc.name}</a>${doc.description ? ` - ${doc.description}` : ''}</li>
            `).join('')}
          </ul>
        ` : ''}
      `,
    });
    */

    return { success: true };
  } catch (error) {
    console.error("Error sending onboarding email:", error);
    return { success: false, error };
  }
}

/**
 * Get application by ID with related data
 */
export async function getApplicationById(applicationId: string) {
  try {
    const [applicationData] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!applicationData) {
      return { success: false, error: "Application not found" };
    }

    return { success: true, application: applicationData };
  } catch (error) {
    console.error("Error fetching application:", error);
    return { success: false, error: "Failed to fetch application" };
  }
}
