import type {
  CompressionHooks,
  CompressionRequest,
  CompressionResponse,
  VideoCompressor,
} from "./types";

/**
 * Runs one compression request against the given compressor and always
 * resolves to a response — failures become {@link CompressionResponse}
 * error variants instead of rejections, so the worker never needs its own
 * try/catch.
 *
 * Pure with respect to I/O: the compressor is injected, which keeps this
 * unit-testable and lets the worker swap encoding backends freely.
 *
 * @param request - The compression job, with its correlation id.
 * @param compressor - The encoding strategy to run.
 * @param hooks - Optional progress sink and abort signal, forwarded to the
 *   compressor untouched.
 * @returns A success or failure response echoing the request id.
 */
export async function handleCompressionRequest(
  request: CompressionRequest,
  compressor: VideoCompressor,
  hooks?: CompressionHooks,
): Promise<CompressionResponse> {
  const { id, file, options } = request;
  try {
    const blob = await compressor.compress(file, options, hooks);
    return { id, ok: true, blob };
  } catch (error) {
    return {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
