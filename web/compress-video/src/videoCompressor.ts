import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";
import { resolveVideoQuality } from "./core/settings";
import type { VideoQualitySetting } from "./core/settings";
import type {
  CompressionHooks,
  CompressionOptions,
  VideoCompressor,
  VideoMetadata,
} from "./core/types";

const OUTPUT_MIME_TYPE = "video/mp4";
/** Audio is kept at a steady medium tier in every mode. */
const AUDIO_QUALITY_LEVEL = "medium";

/**
 * Feature-detects WebCodecs, the browser API this compressor is built on.
 *
 * @returns `true` when the current context can encode video.
 */
export function supportsVideoCompression(): boolean {
  return typeof VideoEncoder !== "undefined";
}

/**
 * Reads the facts the UI shows before compressing: file size, duration,
 * display resolution, and whether an audio track exists.
 *
 * @param file - The selected video file.
 * @returns Metadata about the file, read entirely client-side.
 * @throws Error when the file has no readable video track.
 */
export async function probeVideoFile(file: Blob): Promise<VideoMetadata> {
  const input = createInput(file);

  const duration = await input.computeDuration();
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error("File tidak memiliki track video yang bisa dibaca.");
  }

  const [width, height, audioTrack] = await Promise.all([
    videoTrack.getDisplayWidth(),
    videoTrack.getDisplayHeight(),
    input.getPrimaryAudioTrack(),
  ]);

  return {
    sizeBytes: file.size,
    durationSeconds: duration,
    width,
    height,
    hasAudio: audioTrack !== null,
  };
}

/**
 * {@link VideoCompressor} backed by mediabunny's Conversion API: demuxes the
 * input, re-encodes video and audio through the browser's WebCodecs
 * (hardware-accelerated where available), and muxes the result into MP4.
 * All work happens locally; nothing is uploaded.
 *
 * Progress and cancellation flow through `hooks`.
 */
export const mediabunnyCompressor: VideoCompressor = {
  compress: compressVideo,
};

/**
 * Compresses one video file to MP4 according to `options`.
 *
 * @param file - The source video.
 * @param options - Compression settings (preset or target size).
 * @param hooks - Optional progress sink and abort signal.
 * @returns The compressed MP4 as a blob.
 * @throws Error when the file cannot be read, its codec cannot be
 *   processed, or the conversion fails mid-flight.
 * @throws RangeError / TargetTooSmallError (from settings) when the
 *   requested target size is impossible.
 */
export async function compressVideo(
  file: Blob,
  options: CompressionOptions,
  hooks?: CompressionHooks,
): Promise<Blob> {
  assertNotAborted(hooks?.signal);

  const input = createInput(file);
  const [duration, videoTrack, audioTrack] = await Promise.all([
    input.computeDuration(),
    input.getPrimaryVideoTrack(),
    input.getPrimaryAudioTrack(),
  ]);
  if (!videoTrack) {
    throw new Error("File tidak memiliki track video yang bisa dibaca.");
  }

  const quality = resolveVideoQuality(options.mode, {
    durationSeconds: duration,
    hasAudio: audioTrack !== null,
  });

  const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  });
  const conversion = await Conversion.init({
    input,
    output,
    video: { quality: toQuality(quality) },
    audio: { quality: new Quality(AUDIO_QUALITY_LEVEL) },
  });
  if (!conversion.isValid) {
    throw new Error(
      "Isi file ini tidak bisa dikompres — codec-nya tidak didukung browser ini.",
    );
  }

  hooks?.signal?.addEventListener("abort", () => void conversion.cancel(), {
    once: true,
  });
  conversion.onProgress = (progress) => hooks?.onProgress?.(progress);

  try {
    await conversion.execute();
  } catch (error) {
    if (hooks?.signal?.aborted) {
      throw new DOMException("Kompresi dibatalkan.", "AbortError");
    }
    throw error;
  }

  const buffer = output.target.buffer;
  if (!buffer) {
    throw new Error("Kompresi selesai tetapi hasilnya kosong.");
  }
  return new Blob([buffer], { type: OUTPUT_MIME_TYPE });
}

/** Maps a resolved quality setting onto mediabunny's `Quality` class. */
function toQuality(setting: VideoQualitySetting): Quality {
  return setting.kind === "preset"
    ? new Quality(setting.level)
    : new Quality({ bitrate: setting.bitrate });
}

function createInput(file: Blob): Input {
  return new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Kompresi dibatalkan.", "AbortError");
  }
}
