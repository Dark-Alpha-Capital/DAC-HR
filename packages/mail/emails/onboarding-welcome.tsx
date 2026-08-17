import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface OnboardingWelcomeTemplateData {
  candidateName: string;
  positionName: string;
  location?: string | null;
  startDate?: string | null;
  contactEmail: string;
}

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 24px",
};

const card = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "32px",
  border: "1px solid #e4e4e7",
};

const heading = {
  fontSize: "22px",
  fontWeight: "600",
  color: "#18181b",
  margin: "0 0 8px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#3f3f46",
  margin: "0 0 16px",
};

const muted = {
  fontSize: "13px",
  lineHeight: "1.6",
  color: "#71717a",
  margin: "0",
};

const listItem = {
  fontSize: "15px",
  lineHeight: "1.8",
  color: "#3f3f46",
};

const footer = {
  marginTop: "24px",
  paddingTop: "16px",
  borderTop: "1px solid #e4e4e7",
};

export function OnboardingWelcomeEmail({
  candidateName,
  positionName,
  location,
  startDate,
  contactEmail,
}: OnboardingWelcomeTemplateData) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to Dark Alpha Capital, {candidateName}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Heading style={heading}>
              Welcome to Dark Alpha Capital, {candidateName}!
            </Heading>
            <Text style={paragraph}>
              We&apos;re excited to have you join as{" "}
              <strong>{positionName}</strong>. Here is the information you need
              to get started:
            </Text>
            <Section style={{ margin: "0 0 16px", paddingLeft: "20px" }}>
              <Text style={listItem}>
                Location: <strong>{location ?? "TBD"}</strong>
              </Text>
              <Text style={listItem}>
                Start date: <strong>{startDate ?? "TBD"}</strong>
              </Text>
              <Text style={listItem}>
                Questions:{" "}
                <Link
                  href={`mailto:${contactEmail}`}
                  style={{ color: "#18181b" }}
                >
                  {contactEmail}
                </Link>
              </Text>
            </Section>
            <Text style={paragraph}>
              Our people team will follow up with onboarding documents and next
              steps shortly.
            </Text>
            <Section style={footer}>
              <Text style={muted}>
                This is an automated message. Please do not reply to this email.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
