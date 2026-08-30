import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatEmailExpiry } from "../template-utils";

export interface InterviewInviteTemplateData {
  candidateName: string;
  positionName: string;
  interviewUrl: string;
  expiresAt: Date;
  /** Optional personalized intro paragraph (placeholders already substituted). */
  customMessage?: string;
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

const button = {
  display: "inline-block",
  backgroundColor: "#18181b",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "500",
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: "8px",
};

const footer = {
  marginTop: "24px",
  paddingTop: "16px",
  borderTop: "1px solid #e4e4e7",
};

export function InterviewInviteEmail({
  candidateName,
  positionName,
  interviewUrl,
  expiresAt,
  customMessage,
}: InterviewInviteTemplateData) {
  const expiresText = formatEmailExpiry(expiresAt);

  return (
    <Html lang="en">
      <Head />
      <Preview>
        You have been invited to interview for {positionName} at Dark Alpha
        Capital
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Heading style={heading}>Hi {candidateName},</Heading>
            {customMessage ? (
              <Text style={paragraph}>{customMessage}</Text>
            ) : (
              <>
                <Text style={paragraph}>
                  You have been invited to complete a round of interviews for the{" "}
                  <strong>{positionName}</strong> position at Dark Alpha Capital.
                </Text>
                <Text style={paragraph}>
                  Click the button below to begin. The link is valid until{" "}
                  <strong>{expiresText}</strong>.
                </Text>
              </>
            )}
            <Section style={{ margin: "24px 0" }}>
              <Button href={interviewUrl} style={button}>
                Start my interview
              </Button>
            </Section>
            <Text style={paragraph}>
              If the button doesn&apos;t work, copy and paste this link into
              your browser:
            </Text>
            <Link
              href={interviewUrl}
              style={{ ...muted, wordBreak: "break-all", display: "block" }}
            >
              {interviewUrl}
            </Link>
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
