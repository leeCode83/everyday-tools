import { describe, expect, it } from "vitest";

describe("test pipeline", () => {
  it("runs with happy-dom environment", () => {
    expect(document.createElement("div").ownerDocument).toBeTruthy();
  });
});
