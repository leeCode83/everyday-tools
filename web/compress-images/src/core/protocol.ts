import type { EncodeRequest, EncodeResponse } from "./types";
import type { ImageEncoder } from "../encoders/imageEncoder";

/**
 * Runs one encode request against the given encoder and always resolves to
 * a response — failures become {@link EncodeResponse} error variants instead
 * of rejections, so the worker never needs its own try/catch.
 *
 * Pure with respect to I/O: the encoder is injected, which keeps this
 * unit-testable and lets the worker swap codec implementations freely.
 *
 * @param request - The decode/encode job, with its correlation id.
 * @param encoder - The codec strategy to run.
 * @returns A success or failure response echoing the request id.
 */
export async function handleEncodeRequest(
  request: EncodeRequest,
  encoder: ImageEncoder,
): Promise<EncodeResponse> {
  const { id, file, options } = request;
  try {
    const encoded = await encoder.encode(file, options);
    return { id, ok: true, ...encoded };
  } catch (error) {
    return {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
