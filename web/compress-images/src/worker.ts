import { handleEncodeRequest } from "./core/protocol";
import { CanvasEncoder } from "./encoders/canvasEncoder";
import { MozJpegEncoder, OxiPngEncoder } from "./encoders/wasmEncoders";
import type { ImageEncoder } from "./encoders/imageEncoder";
import type { EncodeOptions, EncodeRequest } from "./core/types";

/**
 * Picks the codec strategy for one request. `"small"` maps each format to
 * its best WASM encoder; everything else uses the fast browser canvas.
 */
function selectEncoder(options: EncodeOptions): ImageEncoder {
  if (options.encoder === "small") {
    if (options.format === "image/jpeg") {
      return new MozJpegEncoder();
    }
    if (options.format === "image/png") {
      return new OxiPngEncoder();
    }
  }
  return new CanvasEncoder();
}

self.onmessage = async (event: MessageEvent<EncodeRequest>) => {
  const response = await handleEncodeRequest(
    event.data,
    selectEncoder(event.data.options),
  );
  self.postMessage(response);
};
