import { describe, expect, it } from "vitest";
import {
  buildOutputFilename,
  formatBytes,
  formatDuration,
  savingsPercent,
} from "../src/core/format";

describe("formatBytes", () => {
  it("formats whole bytes without decimals", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes with one decimal", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes with one decimal", () => {
    expect(formatBytes(150 * 1024 * 1024)).toBe("150.0 MB");
  });

  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("throws on negative input", () => {
    expect(() => formatBytes(-1)).toThrow(RangeError);
  });
});

describe("formatDuration", () => {
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("truncates fractional seconds", () => {
    expect(formatDuration(45.7)).toBe("0:45");
  });

  it("pads seconds to two digits", () => {
    expect(formatDuration(5)).toBe("0:05");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(723)).toBe("12:03");
  });

  it("formats hours as h:mm:ss", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("throws on negative input", () => {
    expect(() => formatDuration(-5)).toThrow(RangeError);
  });

  it("throws on non-finite input", () => {
    expect(() => formatDuration(Number.NaN)).toThrow(RangeError);
  });
});

describe("savingsPercent", () => {
  it("computes savings rounded to one decimal", () => {
    expect(savingsPercent(300, 100)).toBe(66.7);
  });

  it("returns 0 when nothing was saved", () => {
    expect(savingsPercent(100, 100)).toBe(0);
  });

  it("returns a negative percentage when the file grew", () => {
    expect(savingsPercent(100, 150)).toBe(-50);
  });

  it("returns 0 when the original size is zero", () => {
    expect(savingsPercent(0, 100)).toBe(0);
  });

  it("throws on negative sizes", () => {
    expect(() => savingsPercent(-1, 100)).toThrow(RangeError);
  });
});

describe("buildOutputFilename", () => {
  it("replaces the last extension with the target one", () => {
    expect(buildOutputFilename("holiday.mov", "mp4")).toBe("holiday.mp4");
  });

  it("appends the extension when the name has none", () => {
    expect(buildOutputFilename("holiday", "mp4")).toBe("holiday.mp4");
  });

  it("treats dotfiles as extensionless", () => {
    expect(buildOutputFilename(".gitignore", "mp4")).toBe(".gitignore.mp4");
  });
});
