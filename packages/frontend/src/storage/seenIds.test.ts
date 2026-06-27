import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearSeenIds, markIdsSeen, readSeenIds } from "./seenIds.js";

const KEY = "test.seen.ids";

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
}

describe("seenIds storage", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("reads empty set when unset", () => {
    expect(readSeenIds(KEY)).toEqual(new Set());
  });

  it("marks and reads ids", () => {
    markIdsSeen(KEY, ["a", "b"]);
    expect(readSeenIds(KEY)).toEqual(new Set(["a", "b"]));
    markIdsSeen(KEY, ["b", "c"]);
    expect(readSeenIds(KEY)).toEqual(new Set(["a", "b", "c"]));
  });

  it("clears seen ids", () => {
    markIdsSeen(KEY, ["x"]);
    clearSeenIds(KEY);
    expect(readSeenIds(KEY)).toEqual(new Set());
  });
});
