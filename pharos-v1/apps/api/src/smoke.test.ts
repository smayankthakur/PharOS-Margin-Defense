import { describe, expect, it } from "vitest";

describe("api smoke", () => {
  it("loads environment object", () => {
    expect(process.env).toBeTypeOf("object");
  });
});
