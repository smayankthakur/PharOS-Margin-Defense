import { describe, expect, it } from "vitest";

describe("api smoke", () => {
  it("has required runtime env access", () => {
    expect(typeof process.env).toBe("object");
  });
});
