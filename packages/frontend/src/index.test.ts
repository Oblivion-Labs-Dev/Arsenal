import { describe, it, expect } from "vitest";
import { cn } from "./utils/cn.js";
import { clamp, hasKey } from "./utils/index.js";
import { validateFileAttachment } from "./validation/fileAttachment.js";
import { csvFilename } from "./download/csvDownload.js";

describe("cn", () => {
  it("merges truthy class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});

describe("clamp", () => {
  it("clamps values within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
  });
});

describe("validateFileAttachment", () => {
  it("rejects missing files", () => {
    expect(validateFileAttachment(null)).toBe("Invalid file.");
  });
});

describe("csvFilename", () => {
  it("builds dated filenames", () => {
    expect(csvFilename("export", new Date("2024-03-15T12:00:00Z"))).toBe("export-2024-03-15.csv");
  });
});

describe("hasKey", () => {
  it("checks object keys safely", () => {
    expect(hasKey({ a: 1 }, "a")).toBe(true);
  });
});
