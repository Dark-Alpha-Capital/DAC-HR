import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
} from "@react-email/components";

interface ApplicationRejectionProps {
  candidateName: string;
  positionTitle: string;
}

export const ApplicationRejection = ({
  candidateName,
  positionTitle,
}: ApplicationRejectionProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Update on your application for {positionTitle} at Dark Alpha Capital
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Dark Alpha Capital</Heading>

          <Text style={text}>Dear {candidateName},</Text>

          <Text style={text}>
            Thank you for your interest in the <strong>{positionTitle}</strong>{" "}
            position at Dark Alpha Capital and for taking the time to apply.
          </Text>

          <Text style={text}>
            After careful consideration, we have decided to move forward with
            other candidates whose qualifications more closely align with our
            current needs for this role.
          </Text>

          <Text style={text}>
            We genuinely appreciate the effort you put into your application and
            encourage you to apply for future positions that match your skills
            and experience. We will keep your resume on file for potential
            opportunities.
          </Text>

          <Text style={text}>
            We wish you the best in your job search and future career endeavors.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Warm regards,
            <br />
            The Dark Alpha Capital Recruiting Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ApplicationRejection;

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

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "1.5",
};
