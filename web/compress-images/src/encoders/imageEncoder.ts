import type { EncodeOptions } from "../core/types";

/** Result of a successful encode: the encoded bytes plus pixel dimensions. */
export interface EncodedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Strategy for turning a source image file into an encoded output blob.
 * Implementations (browser canvas, MozJPEG/OxiPNG WASM) are selected by the
 * worker; the rest of the app only depends on this contract.
 */
export interface ImageEncoder {
  /**
   * Decodes `source` and re-encodes it with the given options.
   *
   * @param source - Raw image file (any format the browser can decode).
   * @param options - Target format, quality, and optional max width.
   * @returns The encoded image and its pixel dimensions.
   * @throws Error when decoding or encoding fails; callers must catch.
   */
  encode(source: Blob, options: EncodeOptions): Promise<EncodedImage>;
}
