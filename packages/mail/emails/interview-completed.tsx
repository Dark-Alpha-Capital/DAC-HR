import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface InterviewCompletedTemplateData {
  candidateName: string;
  positionName: string;
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

const footer = {
  marginTop: "24px",
  paddingTop: "16px",
  borderTop: "1px solid #e4e4e7",
};

const muted = {
  fontSize: "13px",
  lineHeight: "1.6",
  color: "#71717a",
  margin: "0",
};

export function InterviewCompletedEmail({
  candidateName,
  positionName,
}: InterviewCompletedTemplateData) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        Thanks for completing your interview for {positionName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Heading style={heading}>
              Thanks for completing your interview, {candidateName}!
            </Heading>
            <Text style={paragraph}>
              Your responses for the <strong>{positionName}</strong> position
              have been recorded.
            </Text>
            <Text style={paragraph}>
              Our team will review your responses and reach out to you with the
              next steps shortly.
            </Text>
            <Text style={paragraph}>Best regards,</Text>
            <Text style={paragraph}>The Dark Alpha Capital Team</Text>
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
