import { describe, expect, it } from "vitest";
import {
  MIN_VIDEO_BITRATE_BPS,
  TargetTooSmallError,
  computeTargetBitrate,
  resolveQualityLevel,
  resolveVideoQuality,
} from "../src/core/settings";
import type { CompressionMode } from "../src/core/types";

const MB = 1024 * 1024;

describe("resolveQualityLevel", () => {
  it("maps each preset to its mediabunny quality level", () => {
    expect(resolveQualityLevel("high")).toBe("high");
    expect(resolveQualityLevel("balanced")).toBe("medium");
    expect(resolveQualityLevel("small")).toBe("low");
  });
});

describe("computeTargetBitrate", () => {
  it("applies the safety factor and subtracts the audio budget", () => {
    // 25 MB, 60 s, with audio:
    // (25 * 1024 * 1024 * 8 * 0.95) / 60 - 128000 = 3192490.67
    const bitrate = computeTargetBitrate({
      targetBytes: 25 * MB,
      durationSeconds: 60,
      hasAudio: true,
    });

    expect(bitrate).toBe(3192491);
  });

  it("keeps the full budget when the video has no audio", () => {
    const bitrate = computeTargetBitrate({
      targetBytes: 25 * MB,
      durationSeconds: 60,
      hasAudio: false,
    });

    expect(bitrate).toBe(3320491);
  });

  it("returns exactly the minimum bitrate at the boundary", () => {
    // (300000 * 8 * 0.95) / 10 - 128000 = 100000
    const bitrate = computeTargetBitrate({
      targetBytes: 300_000,
      durationSeconds: 10,
      hasAudio: true,
    });

    expect(bitrate).toBe(MIN_VIDEO_BITRATE_BPS);
  });

  it("throws TargetTooSmallError when even the minimum bitrate overshoots", () => {
    const attempt = () =>
      computeTargetBitrate({
        targetBytes: 200_000,
        durationSeconds: 10,
        hasAudio: true,
      });

    expect(attempt).toThrow(TargetTooSmallError);
    expect(attempt).toThrow(/terlalu kecil/i);
  });

  it("throws RangeError for a non-positive target size", () => {
    expect(() =>
      computeTargetBitrate({ targetBytes: 0, durationSeconds: 10, hasAudio: true }),
    ).toThrow(RangeError);
  });

  it("throws RangeError for a non-positive duration", () => {
    expect(() =>
      computeTargetBitrate({
        targetBytes: 25 * MB,
        durationSeconds: 0,
        hasAudio: true,
      }),
    ).toThrow(RangeError);
  });
});

describe("resolveVideoQuality", () => {
  it("passes preset modes through as a quality level", () => {
    const mode: CompressionMode = { kind: "preset", preset: "balanced" };

    expect(resolveVideoQuality(mode, { durationSeconds: 60, hasAudio: true })).toEqual({
      kind: "preset",
      level: "medium",
    });
  });

  it("computes a bitrate for target-size modes", () => {
    const mode: CompressionMode = { kind: "target", targetBytes: 25 * MB };

    expect(
      resolveVideoQuality(mode, { durationSeconds: 60, hasAudio: true }),
    ).toEqual({ kind: "bitrate", bitrate: 3192491 });
  });

  it("propagates TargetTooSmallError from target modes", () => {
    const mode: CompressionMode = { kind: "target", targetBytes: 200_000 };

    expect(() =>
      resolveVideoQuality(mode, { durationSeconds: 10, hasAudio: true }),
    ).toThrow(TargetTooSmallError);
  });
});
