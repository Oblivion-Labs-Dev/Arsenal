import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";
import { GmailGateway } from "./gmail.js";
import { AppError } from "../errors/AppError.js";

vi.mock("nodemailer", () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: "mock-message-id" });
  const verifyMock = vi.fn().mockResolvedValue(true);
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: sendMailMock,
        verify: verifyMock,
      }),
    },
  };
});

describe("GmailGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail validation if credentials are not provided", () => {
    expect(() => new GmailGateway({ user: "", appPassword: "" })).toThrow(AppError);
  });

  it("should send email successfully with correct parameters", async () => {
    const gateway = new GmailGateway({ user: "test@gmail.com", appPassword: "password" });
    const result = await gateway.send({
      to: "recipient@example.com",
      subject: "Test Subject",
      text: "Test body",
    });

    expect(result.messageId).toBe("mock-message-id");
    const mockTransporter = nodemailer.createTransport();
    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: "test@gmail.com",
      to: "recipient@example.com",
      cc: undefined,
      bcc: undefined,
      subject: "Test Subject",
      text: "Test body",
      html: undefined,
      attachments: undefined,
    });
  });

  it("should fail validation if payload is invalid", async () => {
    const gateway = new GmailGateway({ user: "test@gmail.com", appPassword: "password" });
    await expect(
      gateway.send({
        to: "invalid-email",
        subject: "",
      })
    ).rejects.toThrow(AppError);
  });

  it("should handle send errors from nodemailer", async () => {
    const gateway = new GmailGateway({ user: "test@gmail.com", appPassword: "password" });
    const mockTransporter = nodemailer.createTransport();
    vi.mocked(mockTransporter.sendMail).mockRejectedValueOnce(new Error("SMTP connection failed"));

    await expect(
      gateway.send({
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Test body",
      })
    ).rejects.toThrow(AppError);
  });

  it("should verify connection successfully", async () => {
    const gateway = new GmailGateway({ user: "test@gmail.com", appPassword: "password" });
    const success = await gateway.verifyConnection();
    expect(success).toBe(true);
  });

  it("should return false if connection verification fails", async () => {
    const gateway = new GmailGateway({ user: "test@gmail.com", appPassword: "password" });
    const mockTransporter = nodemailer.createTransport();
    vi.mocked(mockTransporter.verify).mockRejectedValueOnce(new Error("Verification failed"));

    const success = await gateway.verifyConnection();
    expect(success).toBe(false);
  });
});
