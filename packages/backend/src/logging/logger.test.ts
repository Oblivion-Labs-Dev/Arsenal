import { describe, expect, it } from "vitest";
import { Logger } from "./logger.js";

// Assembled at runtime so secret scanners do not flag the fixture.
const TOKEN = ["ghp_", "aB3dE5gH7jK9mN1pQ3sT5vW7yZ9"].join("");

describe("Logger redaction", () => {
  it("redacts secrets in nested fields and the event, keeping ordinary values", () => {
    const lines: string[] = [];
    const log = new Logger({ service: "svc", sink: (l) => lines.push(l) });
    log.child({ requestId: "req_9f8e7d" }).error(`auth failed ${TOKEN}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
      password: "hunter22",
      usage: { promptTokens: 120 },
      skipped: undefined,
    });
    const line = lines[0]!;
    expect(line).not.toContain(TOKEN);
    expect(line).not.toContain("hunter22");
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: "error",
      service: "svc",
      requestId: "req_9f8e7d",
      usage: { promptTokens: 120 },
    });
    expect(parsed).not.toHaveProperty("skipped");
    expect(Number.isNaN(Date.parse(parsed.ts))).toBe(false);
  });
});
