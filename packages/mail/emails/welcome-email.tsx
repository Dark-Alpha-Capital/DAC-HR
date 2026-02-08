import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface WelcomeEmailProps {
  employeeName: string;
  position?: string;
  startDate?: string;
}

export const WelcomeEmail = ({
  employeeName,
  position,
  startDate,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Dark Alpha Capital!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome to Dark Alpha Capital</Heading>

          <Text style={text}>Dear {employeeName},</Text>

          <Text style={text}>
            We are thrilled to welcome you to the Dark Alpha Capital team! Your
            skills and experience will be invaluable to our organization, and we
            look forward to the contributions you will make.
          </Text>

          {position && (
            <Text style={text}>
              <strong>Position:</strong> {position}
            </Text>
          )}

          {startDate && (
            <Text style={text}>
              <strong>Start Date:</strong> {startDate}
            </Text>
          )}

          <Section style={highlightSection}>
            <Text style={highlightText}>
              Our team will be reaching out shortly with onboarding details,
              including access credentials and next steps to get you started.
            </Text>
          </Section>

          <Text style={text}>
            If you have any questions before your start date, please don't
            hesitate to reach out to our HR team.
          </Text>

          <Text style={text}>
            Once again, welcome aboard! We're excited to have you join us.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Best regards,
            <br />
            The Dark Alpha Capital Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
};

const highlightSection = {
  backgroundColor: "#f0f4f8",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
};

const highlightText = {
  color: "#1a1a1a",
  fontSize: "15px",
  lineHeight: "1.5",
  margin: "0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "1.5",
};
