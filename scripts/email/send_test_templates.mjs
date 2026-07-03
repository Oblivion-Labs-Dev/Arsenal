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

// Verify resume exists
if (!fs.existsSync(RESUME_PATH)) {
  console.error(`Warning: Resume file not found at ${RESUME_PATH}. Please check if the filename or path is correct.`);
}

const templates = [
  {
    name: "Option 1 — Impact-Driven (Results First)",
    subject: "Senior Software Engineer | Microsoft & Amazon Experience",
    body: `Hi Akshay,

I came across opportunities at Google and wanted to introduce myself.

I'm currently a Senior Software Engineer at Microsoft with 7+ years of experience building large-scale distributed systems and AI-powered platforms.

Some projects I'm proud of:
• Architected AI agent protection systems securing **237K+ active AI agents** across **13K+ enterprise tenants**
• Built distributed event orchestration supporting **100K+ TPS** across 16 services
• Designed internal developer tooling that saved **40–50 weeks** of engineering setup time
• Optimized infrastructure that reduced operational costs by **$250K per month**
• Integrated ML models that contributed to **$28M+** in annualized business impact

I'm exploring Senior Software Engineer opportunities where I can continue building scalable backend systems and AI-enabled platforms.

If you think my background aligns with anything at Google, I'd appreciate the opportunity for a brief conversation.

Thank you for your time.

Best,
Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  },
  {
    name: "Option 2 — Curious & Collaborative",
    subject: "Quick question about engineering opportunities at Google",
    body: `Hi Akshay,

I hope you're doing well.

I've been following some of the engineering work happening at Google, and I'm curious whether my background might be a good fit.

I'm currently a Senior Software Engineer at Microsoft, previously at Amazon, where I've focused on distributed systems, cloud infrastructure, developer platforms, and AI-driven services.

Highlights include:
• AI protection platform for **237K+** enterprise AI agents
• Event processing platform supporting **100K+ TPS**
• Internal platform improvements saving **40–50** engineering weeks
• Infrastructure optimizations reducing costs by **$250K/month**

If there's a team at Google working on large-scale backend systems, cloud infrastructure, or AI platforms, I'd love to learn more and see whether there's a mutual fit.

Would you be open to a brief chat sometime soon?

Thank you!

Best,
Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  },
  {
    name: "Option 3 — Micro Outreach (Ultra-Scannable)",
    subject: "Senior Software Engineer interested in Google",
    body: `Hi Akshay,

I'll keep this short.

I'm a Senior Software Engineer at Microsoft with 7+ years of experience across Microsoft and Amazon.

A few highlights:
• **237K+** AI agents protected across 13K+ enterprise tenants
• **100K+ TPS** distributed event orchestration
• **$250K/month** infrastructure savings
• **$28M+** annual business impact through ML
• **40–50 weeks** of developer productivity saved

I'm exploring Senior Software Engineer opportunities and would love to see if there's a fit at Google. If so, I'd appreciate a brief conversation.

Thank you!

Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  },
  {
    name: "Option 4 — Story-Driven",
    subject: "From developer productivity to AI platforms",
    body: `Hi Akshay,

Over the past several years, my work has followed a common theme: building systems that help other engineers and customers operate at scale.

That journey started with developer tooling and distributed infrastructure at Amazon, where I helped improve engineering productivity, reduce operational costs, and deploy ML-driven business solutions.

Today at Microsoft, I'm building AI security systems that help protect **237K+ active AI agents** across **13K+ enterprise tenants**.

I'm looking for my next opportunity to solve similarly challenging engineering problems, and Google stood out as a place doing exactly that.

If my background sounds relevant, I'd love the opportunity to connect for a brief conversation.

Thank you for your time.

Best,
Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  },
  {
    name: "Option 5 — Builder Mindset",
    subject: "Builder interested in engineering opportunities at Google",
    body: `Hi Akshay,

I enjoy building systems that remove bottlenecks and scale well.

Across Microsoft and Amazon, that has meant:
• Designing distributed systems processing **100K+ TPS**
• Building AI protection platforms serving **237K+** enterprise AI agents
• Creating internal tooling that saved **40–50 weeks** of engineering effort
• Reducing infrastructure costs by **$250K** every month
• Deploying ML solutions generating **$28M+** annual business impact

I'm looking for a team where I can continue solving complex backend and distributed systems problems.

If there's a potential fit at Google, I'd appreciate the opportunity to connect.

Thank you!

Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  },
  {
    name: "Option 6 — Culture-Focused",
    subject: "Interested in engineering opportunities at Google",
    body: `Hi Akshay,

One reason I'm reaching out is that Google seems like the kind of engineering organization where ownership and technical depth are valued.

I'm currently a Senior Software Engineer at Microsoft after spending six years at Amazon, building distributed systems, cloud infrastructure, AI platforms, and developer tooling.

Some recent work includes:
• Protecting **237K+** enterprise AI agents
• Building systems supporting **100K+ TPS**
• Saving **$250K/month** in infrastructure costs
• Delivering **$28M+** in annualized business value through ML

I'm exploring my next opportunity and would enjoy learning more about engineering teams at Google.

If it makes sense, I'd love to schedule a brief conversation.

Thank you!

Best,
Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  },
  {
    name: "Option 7 — Executive-Level Confidence",
    subject: "Senior Software Engineer | Exploring opportunities",
    body: `Hi Akshay,

I'm reaching out because I'm exploring Senior Software Engineer opportunities and believe my background may align with engineering teams at Google.

Experience includes:
• Microsoft — AI security platform protecting **237K+** active enterprise AI agents
• Amazon — Distributed systems, developer platforms, infrastructure optimization, and ML integration
• Large-scale backend systems supporting **100K+ TPS**
• Engineering initiatives delivering measurable productivity, cost, and business impact

I'd welcome the opportunity to discuss whether there's a suitable role at Google. If you're available for a brief conversation, I'd be happy to share additional details.

Best regards,
Akshay Borse

---
LinkedIn: linkedin.com/in/akshay-borse | GitHub: github.com/amsborse`
  }
];

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
    logger: console
  });

  console.log("Verifying connection to Gmail SMTP...");
  const isConnected = await gateway.verifyConnection();
  if (!isConnected) {
    console.error("Connection failed.");
    process.exit(1);
  }
  console.log("Connected.");

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    console.log(`\n[${i + 1}/${templates.length}] Sending template: ${template.name}...`);
    
    try {
      const attachments = [];
      if (fs.existsSync(RESUME_PATH)) {
        attachments.push({
          path: RESUME_PATH,
          filename: "Akshay_Borse_Resume.pdf"
        });
      } else {
        console.warn(`[WARN] Resume PDF not found at ${RESUME_PATH}. Sending without attachment.`);
      }

      const result = await gateway.send({
        to: RECIPIENT,
        subject: `[TEST CAMPAIGN] ${template.subject}`,
        text: template.body,
        attachments
      });

      console.log(`Success! Message ID: ${result.messageId}`);
    } catch (err) {
      console.error(`Failed to send ${template.name}:`, err.message);
    }

    if (i < templates.length - 1) {
      console.log("Sleeping 3 seconds before next dispatch...");
      await sleep(3000);
    }
  }

  console.log("\nAll test campaign emails dispatched successfully.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
