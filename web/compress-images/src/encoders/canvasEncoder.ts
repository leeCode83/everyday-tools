import { clampQuality, type EncodeOptions } from "../core/types";
import type { EncodedImage, ImageEncoder } from "./imageEncoder";

/**
 * A pixel surface the encoder draws the decoded bitmap onto, then serializes.
 * Abstracted so the encode orchestration can be unit-tested without a real
 * canvas.
 */
export interface Raster {
  /** Draws the source bitmap onto the surface at full size. */
  draw(source: ImageBitmap): void;
  /** Serializes the surface. PNG is lossless, so `quality` is `undefined`. */
  toBlob(type: string, quality?: number): Promise<Blob>;
}

/** Creates a raster of the given pixel size. */
export type RasterFactory = (width: number, height: number) => Raster;

/** Injectable browser capabilities used by {@link CanvasEncoder}. */
export interface CanvasEncoderDeps {
  /** Decodes a blob into a drawable bitmap. Defaults to `createImageBitmap`. */
  decode(blob: Blob): Promise<ImageBitmap>;
  /** Creates the pixel surface. Defaults to `OffscreenCanvas`. */
  createRaster: RasterFactory;
}

const defaultDeps: CanvasEncoderDeps = {
  decode: (blob) => createImageBitmap(blob),
  createRaster: (width, height) => {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("OffscreenCanvas 2D context unavailable");
    }
    return {
      draw: (source) => ctx.drawImage(source, 0, 0, width, height),
      toBlob: (type, quality) => canvas.convertToBlob({ type, quality }),
    };
  },
};

/**
 * MVP encoder built on browser-native APIs. Decodes via `createImageBitmap`,
 * optionally downscales to {@link EncodeOptions.maxWidth} (never upscales),
 * and re-encodes through the canvas — which also strips EXIF/metadata, since
 * only raw pixels are carried over.
 */
export class CanvasEncoder implements ImageEncoder {
  private readonly deps: CanvasEncoderDeps;

  constructor(deps: CanvasEncoderDeps = defaultDeps) {
    this.deps = deps;
  }

  /** @inheritdoc */
  async encode(source: Blob, options: EncodeOptions): Promise<EncodedImage> {
    const bitmap = await this.deps.decode(source);
    try {
      const { width, height } = fittedSize(bitmap, options.maxWidth);
      const raster = this.deps.createRaster(width, height);
      raster.draw(bitmap);

      // PNG is lossless; passing a quality value there is meaningless.
      const quality =
        options.format === "image/png" ? undefined : clampQuality(options.quality);
      const blob = await raster.toBlob(options.format, quality);

      return { blob, width, height };
    } finally {
      bitmap.close();
    }
  }
}

/** Output size after optional downscaling to `maxWidth`; never upscales. */
export function fittedSize(
  bitmap: { width: number; height: number },
  maxWidth?: number,
): { width: number; height: number } {
  const scale = maxWidth && bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  return {
    width: Math.max(1, Math.round(bitmap.width * scale)),
    height: Math.max(1, Math.round(bitmap.height * scale)),
  };
}
