import { handleCompressionRequest } from "./core/protocol";
import { mediabunnyCompressor, supportsVideoCompression } from "./videoCompressor";
import type { CompressionRequest, WorkerMessage } from "./core/types";

/**
 * Thin bridge between the UI and the encoding backend: one compression
 * request in, progress messages plus one final response out. All real
 * decisions live in core/ and videoCompressor.ts.
 */
self.onmessage = async (event: MessageEvent<CompressionRequest>) => {
  const request = event.data;

  if (!supportsVideoCompression()) {
    const response: WorkerMessage = {
      id: request.id,
      ok: false,
      error:
        "Browser ini tidak mendukung WebCodecs. Gunakan Chrome/Edge 94+, Safari 16.4+, atau Firefox 130+.",
    };
    self.postMessage(response);
    return;
  }

  const response = await handleCompressionRequest(
    request,
    mediabunnyCompressor,
    {
      onProgress: (progress) => {
        const message: WorkerMessage = {
          id: request.id,
          type: "progress",
          progress,
        };
        self.postMessage(message);
      },
    },
  );
  self.postMessage(response);
};
