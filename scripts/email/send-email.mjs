import { GmailGateway } from "../../packages/backend/dist/index.js"; // Import from the built package dist
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function main() {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    console.error("Error: GMAIL_USER and GMAIL_APP_PASSWORD must be set in your environment variables or .env file.");
    console.log("\nSetup instructions:");
    console.log("1. Enable 2-Step Verification in your Google Account settings.");
    console.log("2. Generate a 16-character App Password (Select App: Mail, Device: Other).");
    console.log("3. Add the following to your .env file at the workspace root:");
    console.log("   GMAIL_USER=your-email@gmail.com");
    console.log("   GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx");
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const to = args[0];
  const subject = args[1] || "Hello from Arsenal Email Gateway!";
  const body = args[2] || "This email was sent using the Arsenal Gmail integration scripts.";

  if (!to) {
    console.error("Error: Recipient email address is required.");
    console.log("Usage: node scripts/email/send-email.mjs <recipient-email> [subject] [body]");
    process.exit(1);
  }

  console.log(`Initializing GmailGateway for ${user}...`);
  const gateway = new GmailGateway({
    user,
    appPassword,
    logger: console, // Use console as simple Logger interface
  });

  console.log("Verifying connection to Gmail SMTP server...");
  const isConnected = await gateway.verifyConnection();
  if (!isConnected) {
    console.error("Error: Connection verification failed. Please check your credentials.");
    process.exit(1);
  }
  console.log("SMTP connection verified successfully.");

  console.log(`Sending email to ${to}...`);
  try {
    const result = await gateway.send({
      to,
      subject,
      text: body,
    });
    console.log(`Success! Email sent successfully. Message ID: ${result.messageId}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
