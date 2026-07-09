import { describe, it, expect } from "vitest";
import { refreshToken } from "./oauth.js";

describe("oauth", () => {
  it("refreshes token", () => {
    expect(refreshToken("abc")).toBe("abc-refreshed");
  });
});
