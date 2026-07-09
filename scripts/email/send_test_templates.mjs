import { GmailGateway } from "../../packages/backend/dist/index.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RECIPIENT = "amsborse@gmail.com";
const RESUME_PATH = "D:/Docs/Interview/Resume/Akshay_Borse_Resume.pdf";

const template = {
  name: "Generic recruiter outreach",
  subject: "Senior Software Engineer | Microsoft & Amazon Experience",
  body: `Hi {{FirstName}},

I hope you're doing well.

I'm reaching out because I'm exploring Senior Software Engineer opportunities and wanted to introduce myself.

I'm currently a Senior Software Engineer at Microsoft, and before that I spent nearly six years at Amazon. Over the past seven years I've worked on large-scale backend systems, distributed infrastructure, cloud services, and developer platforms.

Some of the work I've led includes:

* Building enterprise-scale security and platform services used across thousands of organizations.
* Designing distributed systems processing over 100K transactions per second.
* Creating internal developer tooling that reduced service setup from weeks to hours.
* Leading infrastructure improvements that reduced operational costs by more than $250K per month.

I'm looking for opportunities where I can continue building reliable, large-scale systems and would appreciate the chance to learn more about any roles that might be a good fit.

If you think my background aligns with your hiring needs, I'd love to schedule a brief conversation.

I've attached my resume for reference. Thanks for your time, and I hope to hear from you.

Best,

Akshay Borse

LinkedIn: https://linkedin.com/in/amsborse
GitHub: https://github.com/amsborse`,
};

function renderTemplate(body, variables) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

if (!fs.existsSync(RESUME_PATH)) {
  console.error(`Warning: Resume file not found at ${RESUME_PATH}. Please check if the filename or path is correct.`);
}

async function main() {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    console.error("Credentials missing in environment variables.");
    process.exit(1);
  }

  const gateway = new GmailGateway({
    user,
    appPassword,
    logger: console,
  });

  console.log("Verifying connection to Gmail SMTP...");
  const isConnected = await gateway.verifyConnection();
  if (!isConnected) {
    console.error("Connection failed.");
    process.exit(1);
  }
  console.log("Connected.");

  const previewName = process.argv[2] || "there";
  const body = renderTemplate(template.body, { FirstName: previewName });

  console.log(`\nSending template: ${template.name}...`);

  try {
    const attachments = [];
    if (fs.existsSync(RESUME_PATH)) {
      attachments.push({
        path: RESUME_PATH,
        filename: "Akshay_Borse_Resume.pdf",
      });
    } else {
      console.warn(`[WARN] Resume PDF not found at ${RESUME_PATH}. Sending without attachment.`);
    }

    const result = await gateway.send({
      to: RECIPIENT,
      subject: `[TEST CAMPAIGN] ${template.subject}`,
      text: body,
      attachments,
    });

    console.log(`Success! Message ID: ${result.messageId}`);
  } catch (err) {
    console.error(`Failed to send ${template.name}:`, err.message);
    process.exit(1);
  }

  console.log("\nTest outreach email dispatched successfully.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
