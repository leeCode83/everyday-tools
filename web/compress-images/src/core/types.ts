/** Image formats the tool can output. */
export type OutputFormat = "image/jpeg" | "image/webp" | "image/png";

/** File extensions for each {@link OutputFormat}. */
export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  "image/jpeg": "jpeg",
  "image/webp": "webp",
  "image/png": "png",
};

/** Codec strategy selectable in the UI. */
export type EncoderKind = "browser" | "small";

/** Settings for one encode operation. */
export interface EncodeOptions {
  /** Target format to re-encode into. */
  format: OutputFormat;
  /** Quality on a 0–100 scale (ignored by lossless PNG). */
  quality: number;
  /** Optional max width in pixels; images are never upscaled. */
  maxWidth?: number;
  /**
   * Which codec strategy to use: `"browser"` is the fast native canvas
   * encoder; `"small"` picks the best WASM encoder per format (MozJPEG for
   * JPEG, OxiPNG for PNG) for noticeably smaller output.
   */
  encoder?: EncoderKind;
}

/** Request sent from the UI to the encode worker. */
export interface EncodeRequest {
  /** Correlation id echoed back in the response. */
  id: string;
  /** The raw image file to decode and re-encode. */
  file: Blob;
  options: EncodeOptions;
}

/** Successful worker response with the encoded result. */
export interface EncodeSuccess {
  id: string;
  ok: true;
  blob: Blob;
  /** Pixel dimensions of the encoded image. */
  width: number;
  height: number;
}

/** Failed worker response; `error` is a safe, user-presentable message. */
export interface EncodeFailure {
  id: string;
  ok: false;
  error: string;
}

/** Response union sent from the worker back to the UI. */
export type EncodeResponse = EncodeSuccess | EncodeFailure;

/**
 * Clamps a 0–100 quality value into the 0–1 fraction that canvas and WASM
 * encoders expect. `NaN` becomes 0.
 *
 * @param quality - Quality on a 0–100 scale.
 * @returns Fraction in `[0, 1]`.
 */
export function clampQuality(quality: number): number {
  const safe = Number.isNaN(quality) ? 0 : quality;
  return Math.min(100, Math.max(0, safe)) / 100;
}
