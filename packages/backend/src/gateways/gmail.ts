import nodemailer from "nodemailer";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { Logger } from "../logging/index.js";

// Input validation schema for sending email
export const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.any().optional(), // Buffer, string, etc.
        path: z.string().optional(),
        contentType: z.string().optional(),
      })
    )
    .optional(),
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

export interface GmailGatewayConfig {
  user: string;
  appPassword: string;
  logger?: Logger;
}

export class GmailGateway {
  private transporter: nodemailer.Transporter;
  private logger?: Logger;
  private user: string;

  constructor(config: GmailGatewayConfig) {
    if (!config.user || !config.appPassword) {
      throw new AppError("Gmail credentials (user, appPassword) are required.", {
        statusCode: 400,
        code: "INVALID_CONFIGURATION",
      });
    }

    this.user = config.user;
    this.logger = config.logger;
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: config.user,
        pass: config.appPassword,
      },
    });
  }

  /**
   * Send an email using Gmail SMTP.
   */
  async send(input: SendEmailInput): Promise<{ messageId: string }> {
    const parseResult = SendEmailSchema.safeParse(input);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new AppError(`Invalid email payload: ${errorMsg}`, {
        statusCode: 400,
        code: "INVALID_EMAIL_PAYLOAD",
        details: parseResult.error.format(),
      });
    }

    const { to, cc, bcc, subject, text, html, attachments } = parseResult.data;

    try {
      this.logger?.info("Sending email via Gmail SMTP...", { to, subject });

      const info = await this.transporter.sendMail({
        from: this.user,
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        attachments,
      });

      this.logger?.info("Email sent successfully via Gmail SMTP", { messageId: info.messageId });
      return { messageId: info.messageId };
    } catch (error: any) {
      this.logger?.error("Failed to send email via Gmail SMTP", { error: error.message });
      throw new AppError("Failed to send email via Gmail SMTP", {
        statusCode: 500,
        code: "EMAIL_SEND_FAILURE",
        cause: error,
      });
    }
  }

  /**
   * Verify SMTP connection to Gmail.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error: any) {
      this.logger?.error("Gmail SMTP transport verification failed", { error: error.message });
      return false;
    }
  }
}
