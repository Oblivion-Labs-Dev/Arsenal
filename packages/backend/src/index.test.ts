import { describe, it, expect } from "vitest";
import { safeJsonParse, retry } from "./utils/retry.js";
import { endpointLabel, isAbortError } from "./logging/logger.js";

describe("safeJsonParse", () => {
  it("parses plain JSON", () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(safeJsonParse("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("returns null for invalid JSON", () => {
    expect(safeJsonParse("```not-json```")).toBeNull();
    expect(safeJsonParse("```\nnot closed")).toBeNull();
  });
});

describe("retry", () => {
  it("retries transient failures", async () => {
    let calls = 0;
    const result = await retry(async () => {
      calls++;
      if (calls < 2) {
        const err = new TypeError("network");
        throw err;
      }
      return "ok";
    }, { attempts: 3, delayMs: 1 });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });
});

describe("logger helpers", () => {
  it("labels openrouter endpoints", () => {
    expect(endpointLabel("https://openrouter.ai/api/v1/chat/completions")).toBe("openrouter");
    expect(endpointLabel("https://example.com/v1")).toBe("custom");
  });

  it("detects abort errors", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError(new Error("fail"))).toBe(false);
  });
});
