import { describe, expect, it } from "vitest";
import {
  buildOutputFilename,
  formatBytes,
  savingsPercent,
} from "../src/core/format";

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes below 1 KB without decimals", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats kilobytes with one decimal", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes with one decimal", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(1572864)).toBe("1.5 MB");
    expect(formatBytes(157286400)).toBe("150.0 MB");
  });

  it("formats gigabytes with one decimal", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("throws on negative input", () => {
    expect(() => formatBytes(-1)).toThrow(RangeError);
  });
});

describe("savingsPercent", () => {
  it("computes positive savings", () => {
    expect(savingsPercent(1000, 500)).toBe(50);
    expect(savingsPercent(1000, 250)).toBe(75);
  });

  it("rounds to one decimal", () => {
    expect(savingsPercent(3, 1)).toBe(66.7);
  });

  it("returns 0 when before is 0", () => {
    expect(savingsPercent(0, 100)).toBe(0);
  });

  it("returns negative when result is bigger", () => {
    expect(savingsPercent(500, 1000)).toBe(-100);
  });

  it("throws on negative input", () => {
    expect(() => savingsPercent(-1, 0)).toThrow(RangeError);
    expect(() => savingsPercent(100, -1)).toThrow(RangeError);
  });
});

describe("buildOutputFilename", () => {
  it("replaces the original extension", () => {
    expect(buildOutputFilename("foto.png", "webp")).toBe("foto.webp");
    expect(buildOutputFilename("foto.JPG", "jpeg")).toBe("foto.jpeg");
  });

  it("handles names without extension", () => {
    expect(buildOutputFilename("foto", "jpeg")).toBe("foto.jpeg");
  });

  it("replaces only the last extension", () => {
    expect(buildOutputFilename("foto.min.png", "webp")).toBe("foto.min.webp");
    expect(buildOutputFilename("a.b.c", "png")).toBe("a.b.png");
  });

  it("handles dotfiles", () => {
    expect(buildOutputFilename(".gitignore", "webp")).toBe(".gitignore.webp");
  });

  it("normalizes extension to lowercase", () => {
    expect(buildOutputFilename("foto.png", "WEBP")).toBe("foto.webp");
  });
});
