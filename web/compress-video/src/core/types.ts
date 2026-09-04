import type { QualityPreset } from "./settings";

/**
 * What the user wants out of the compression, expressed as one of two
 * mutually exclusive modes:
 * - `preset`: a named quality tier (`high` / `balanced` / `small`); the
 *   resulting size is whatever that quality produces.
 * - `target`: a desired output size in bytes; the bitrate is derived from
 *   the video duration so the result lands near the target.
 */
export type CompressionMode =
  | { kind: "preset"; preset: QualityPreset }
  | { kind: "target"; targetBytes: number };

/** Settings attached to one compression job. */
export interface CompressionOptions {
  mode: CompressionMode;
}

/** Facts about the selected video, shown in the UI before compressing. */
export interface VideoMetadata {
  /** File size in bytes. */
  sizeBytes: number;
  /** Duration in seconds (fractional). */
  durationSeconds: number;
  /** Display width in pixels. */
  width: number;
  /** Display height in pixels. */
  height: number;
  /** Whether the file carries an audio track. */
  hasAudio: boolean;
}

/** Reports conversion progress as a number between 0 and 1 (inclusive). */
export type ProgressCallback = (progress: number) => void;

/** Optional callbacks/controls accompanying one compression call. */
export interface CompressionHooks {
  /** Sink for progress updates between 0 and 1 (inclusive). */
  onProgress?: ProgressCallback;
  /** Aborting this signal cancels the running compression. */
  signal?: AbortSignal;
}

/** One compression job sent from the UI to the worker. */
export interface CompressionRequest {
  /** Correlation id echoed back on every response for this job. */
  id: string;
  /** The video file, never leaving the browser. */
  file: Blob;
  options: CompressionOptions;
}

/** Worker's final answer for one job; failures are values, not rejections. */
export type CompressionResponse =
  | { id: string; ok: true; blob: Blob }
  | { id: string; ok: false; error: string };

/**
 * Strategy that turns one video blob into a compressed blob. Injected into
 * {@link handleCompressionRequest} so the protocol stays unit-testable and
 * the encoding backend stays swappable.
 */
export interface VideoCompressor {
  /**
   * Compresses `file` according to `options`.
   *
   * @param file - The source video.
   * @param options - Compression settings for this job.
   * @param hooks - Optional progress sink and abort signal.
   * @returns The compressed video as a blob (MP4).
   * @throws Error when compression is impossible or unsupported.
   */
  compress(
    file: Blob,
    options: CompressionOptions,
    hooks?: CompressionHooks,
  ): Promise<Blob>;
}
