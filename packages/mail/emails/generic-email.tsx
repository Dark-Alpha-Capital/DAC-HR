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

interface GenericEmailProps {
  subject: string;
  body: string;
  preheader?: string;
}

export const GenericEmail = ({
  subject,
  body,
  preheader,
}: GenericEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preheader || subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{subject}</Heading>

          <Text style={text}>{body}</Text>

          <Hr style={hr} />

          <Text style={footer}>
            Best regards,
            <br />
            Dark Alpha Capital
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default GenericEmail;

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
  whiteSpace: "pre-wrap" as const,
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
