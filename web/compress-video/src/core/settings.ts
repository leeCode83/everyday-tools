/**
 * Mapping from user-facing settings to concrete encoding numbers.
 *
 * Pure module — no DOM, no WebCodecs. Everything here is unit-tested in
 * Node; the mediabunny wrapper only translates these plain values into
 * `Quality` objects.
 */

import type { CompressionMode } from "./types";

/** Quality tiers offered by the UI's segmented control. */
export const QUALITY_PRESETS = ["high", "balanced", "small"] as const;

/** One {@link QUALITY_PRESETS} entry. */
export type QualityPreset = (typeof QUALITY_PRESETS)[number];

/** Qualitative levels understood by mediabunny's `Quality` class. */
export type QualityLevel = "very-low" | "low" | "medium" | "high" | "very-high";

/**
 * Fraction of the target size the encoder actually aims for. Encoders
 * hover around their target, so aiming just under it keeps the result
 * from overshooting a hard limit (email attachment, chat upload, …).
 */
export const TARGET_SAFETY_FACTOR = 0.95;

/** Bitrate reserved for the audio track when a video has one. */
export const TARGET_AUDIO_BITRATE_BPS = 128_000;

/** Floor for the video bitrate; below this the picture is unusable. */
export const MIN_VIDEO_BITRATE_BPS = 100_000;

/**
 * Resolves a UI preset to the mediabunny quality level it encodes with.
 *
 * @param preset - Preset selected in the UI.
 * @returns The matching `Quality` level.
 */
export function resolveQualityLevel(preset: QualityPreset): QualityLevel {
  const LEVELS: Record<QualityPreset, QualityLevel> = {
    high: "high",
    balanced: "medium",
    small: "low",
  };
  return LEVELS[preset];
}

/**
 * Computes the video bitrate that makes the output land near
 * `targetBytes`. The safety factor shrinks the budget first, then the
 * audio track's share is subtracted — the size cap applies to the whole
 * file, so audio must be paid for before the video spends anything.
 *
 * @param input - Target size in bytes, video duration in seconds, and
 *   whether the file carries audio.
 * @returns Video bitrate in bits per second.
 * @throws RangeError when `targetBytes` or `durationSeconds` is not a
 *   positive finite number.
 * @throws TargetTooSmallError when the target is below what even the
 *   minimum video bitrate would produce.
 */
export function computeTargetBitrate(input: {
  targetBytes: number;
  durationSeconds: number;
  hasAudio: boolean;
}): number {
  const { targetBytes, durationSeconds, hasAudio } = input;
  assertPositive(targetBytes, "targetBytes");
  assertPositive(durationSeconds, "durationSeconds");

  const usableBits = targetBytes * 8 * TARGET_SAFETY_FACTOR;
  const audioBudget = hasAudio ? TARGET_AUDIO_BITRATE_BPS : 0;
  const videoBudget = usableBits / durationSeconds - audioBudget;

  if (videoBudget < MIN_VIDEO_BITRATE_BPS) {
    throw new TargetTooSmallError(
      `Ukuran target terlalu kecil untuk video dengan durasi ini ` +
        `(bitrate video minimum ${MIN_VIDEO_BITRATE_BPS / 1000} kbps sudah melebihi target).`,
    );
  }
  return Math.round(videoBudget);
}

/** Plain-data description of the quality a job should encode with. */
export type VideoQualitySetting =
  | { kind: "preset"; level: QualityLevel }
  | { kind: "bitrate"; bitrate: number };

/**
 * Resolves a compression mode into the concrete quality setting to encode
 * with, using the video's duration and audio presence for target modes.
 *
 * @param mode - Mode chosen in the UI.
 * @param video - Duration and audio presence of the source video.
 * @returns A preset level or a computed bitrate.
 * @throws TargetTooSmallError when a target mode is unreachable (see
 *   {@link computeTargetBitrate}).
 */
export function resolveVideoQuality(
  mode: CompressionMode,
  video: { durationSeconds: number; hasAudio: boolean },
): VideoQualitySetting {
  if (mode.kind === "preset") {
    return { kind: "preset", level: resolveQualityLevel(mode.preset) };
  }
  return {
    kind: "bitrate",
    bitrate: computeTargetBitrate({
      targetBytes: mode.targetBytes,
      durationSeconds: video.durationSeconds,
      hasAudio: video.hasAudio,
    }),
  };
}

/** Thrown when the requested target size cannot produce a watchable video. */
export class TargetTooSmallError extends Error {
  /** @param message - Human-readable explanation, safe to show in the UI. */
  constructor(message: string) {
    super(message);
    this.name = "TargetTooSmallError";
  }
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number, got ${value}`);
  }
}
