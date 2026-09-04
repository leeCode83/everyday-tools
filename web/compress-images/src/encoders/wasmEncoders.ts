import { encode as mozJpegEncode } from "@jsquash/jpeg";
import { optimise as oxipngOptimise } from "@jsquash/oxipng";
import { clampQuality, type EncodeOptions } from "../core/types";
import { fittedSize } from "./canvasEncoder";
import type { EncodedImage, ImageEncoder } from "./imageEncoder";

/**
 * Draws a bitmap into an OffscreenCanvas of the given size. Shared pixel
 * plumbing for the WASM encoders.
 */
function drawBitmap(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): OffscreenCanvasRenderingContext2D {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("OffscreenCanvas 2D context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx;
}

/** Injectable browser capabilities for {@link MozJpegEncoder}. */
export interface MozJpegEncoderDeps {
  decode(blob: Blob): Promise<ImageBitmap>;
  /** Rasterizes the bitmap at the given pixel size. */
  toImageData(bitmap: ImageBitmap, width: number, height: number): ImageData;
  /**
   * The WASM MozJPEG call, injectable for unit tests. `quality` uses the
   * jSquash scale: an integer 0–100 (not the 0–1 canvas scale).
   */
  encodeImageData(data: ImageData, quality: number): Promise<ArrayBuffer>;
}

const defaultMozJpegDeps: MozJpegEncoderDeps = {
  decode: (blob) => createImageBitmap(blob),
  toImageData: (bitmap, width, height) =>
    drawBitmap(bitmap, width, height).getImageData(0, 0, width, height),
  encodeImageData: (data, quality) => mozJpegEncode(data, { quality }),
};

/**
 * JPEG encoder backed by MozJPEG compiled to WebAssembly. Same pipeline as
 * the canvas encoder (decode, optional downscale, EXIF stripped) but a
 * considerably better JPEG encoder, typically 20–30% smaller at equal
 * quality.
 */
export class MozJpegEncoder implements ImageEncoder {
  private readonly deps: MozJpegEncoderDeps;

  constructor(deps: MozJpegEncoderDeps = defaultMozJpegDeps) {
    this.deps = deps;
  }

  /** @inheritdoc */
  async encode(source: Blob, options: EncodeOptions): Promise<EncodedImage> {
    const bitmap = await this.deps.decode(source);
    try {
      const { width, height } = fittedSize(bitmap, options.maxWidth);
      const imageData = this.deps.toImageData(bitmap, width, height);
      // jSquash expects quality 0–100; clampQuality yields a 0–1 fraction.
      const quality = Math.round(clampQuality(options.quality) * 100);
      const buffer = await this.deps.encodeImageData(imageData, quality);
      return { blob: new Blob([buffer], { type: "image/jpeg" }), width, height };
    } finally {
      bitmap.close();
    }
  }
}

/** Injectable browser capabilities for {@link OxiPngEncoder}. */
export interface OxiPngEncoderDeps {
  decode(blob: Blob): Promise<ImageBitmap>;
  /** Rasterizes the bitmap at the given pixel size as PNG bytes. */
  toPngBlob(bitmap: ImageBitmap, width: number, height: number): Promise<Blob>;
  /** The WASM OxiPNG call, injectable for unit tests. */
  optimisePng(buffer: ArrayBuffer, level: number): Promise<ArrayBuffer>;
}

const defaultOxiPngDeps: OxiPngEncoderDeps = {
  decode: (blob) => createImageBitmap(blob),
  toPngBlob: async (bitmap, width, height) => {
    const ctx = drawBitmap(bitmap, width, height);
    return ctx.canvas.convertToBlob({ type: "image/png" });
  },
  optimisePng: (buffer, level) => oxipngOptimise(buffer, { level }),
};

/**
 * Lossless PNG encoder backed by OxiPNG compiled to WebAssembly: the canvas
 * PNG is re-compressed with OxiPNG's optimizer for smaller files with
 * pixel-identical content.
 */
export class OxiPngEncoder implements ImageEncoder {
  private readonly deps: OxiPngEncoderDeps;

  constructor(deps: OxiPngEncoderDeps = defaultOxiPngDeps) {
    this.deps = deps;
  }

  /** @inheritdoc */
  async encode(source: Blob, options: EncodeOptions): Promise<EncodedImage> {
    const bitmap = await this.deps.decode(source);
    try {
      const { width, height } = fittedSize(bitmap, options.maxWidth);
      const pngBlob = await this.deps.toPngBlob(bitmap, width, height);
      const optimised = await this.deps.optimisePng(
        await pngBlob.arrayBuffer(),
        /* level */ 2,
      );
      return {
        blob: new Blob([optimised], { type: "image/png" }),
        width,
        height,
      };
    } finally {
      bitmap.close();
    }
  }
}
