import { handleCompressionRequest } from "./core/protocol";
import { mediabunnyCompressor, supportsVideoCompression } from "./videoCompressor";
import type { CompressionRequest, ToWorkerMessage, WorkerMessage } from "./core/types";

/**
 * Thin bridge between the UI and the encoding backend: compression
 * requests in, progress messages plus one final response out. All real
 * decisions live in core/ and videoCompressor.ts.
 *
 * Cancellation is wired here because an `AbortSignal` cannot cross
 * `postMessage`: the UI sends a `{type: "cancel"}` message and the worker
 * aborts the controller it owns for that job.
 */
const running = new Map<string, AbortController>();

self.onmessage = (event: MessageEvent<ToWorkerMessage>) => {
  const message = event.data;
  if ("type" in message) {
    running.get(message.id)?.abort();
    return;
  }
  void runCompression(message);
};

async function runCompression(request: CompressionRequest): Promise<void> {
  if (!supportsVideoCompression()) {
    respond({
      id: request.id,
      ok: false,
      error:
        "Browser ini tidak mendukung WebCodecs. Gunakan Chrome/Edge 94+, Safari 16.4+, atau Firefox 130+.",
    });
    return;
  }

  const controller = new AbortController();
  running.set(request.id, controller);
  try {
    const response = await handleCompressionRequest(
      request,
      mediabunnyCompressor,
      {
        signal: controller.signal,
        onProgress: (progress) =>
          respond({ id: request.id, type: "progress", progress }),
      },
    );
    respond(response);
  } finally {
    running.delete(request.id);
  }
}

function respond(message: WorkerMessage): void {
  self.postMessage(message);
}
