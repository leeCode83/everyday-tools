import { describe, expect, it } from "vitest";
import { clampQuality } from "../src/core/types";

describe("clampQuality", () => {
  it("keeps in-range quality as a 0-1 fraction", () => {
    expect(clampQuality(75)).toBe(0.75);
    expect(clampQuality(0)).toBe(0);
    expect(clampQuality(100)).toBe(1);
  });

  it("clamps values outside 0-100", () => {
    expect(clampQuality(-10)).toBe(0);
    expect(clampQuality(150)).toBe(1);
  });

  it("treats NaN as 0", () => {
    expect(clampQuality(Number.NaN)).toBe(0);
  });
});
