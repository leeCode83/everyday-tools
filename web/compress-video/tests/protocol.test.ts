import { describe, expect, it, vi } from "vitest";
import { handleCompressionRequest } from "../src/core/protocol";
import type { CompressionRequest, VideoCompressor } from "../src/core/types";

const REQUEST: CompressionRequest = {
  id: "job-1",
  file: new Blob(["video"], { type: "video/mp4" }),
  options: { mode: { kind: "preset", preset: "balanced" } },
};

function fakeCompressor(result: Promise<Blob>): VideoCompressor {
  return { compress: vi.fn().mockReturnValue(result) };
}

describe("handleCompressionRequest", () => {
  it("returns a success response with the compressed blob", async () => {
    const blob = new Blob(["out"], { type: "video/mp4" });
    const compressor = fakeCompressor(Promise.resolve(blob));

    const response = await handleCompressionRequest(REQUEST, compressor);

    expect(response).toEqual({ id: "job-1", ok: true, blob });
    expect(compressor.compress).toHaveBeenCalledWith(
      REQUEST.file,
      REQUEST.options,
      undefined,
    );
  });

  it("forwards progress updates from the compressor's hooks", async () => {
    const onProgress = vi.fn();
    const compressor: VideoCompressor = {
      compress: (_file, _options, hooks) => {
        hooks?.onProgress?.(0.25);
        hooks?.onProgress?.(1);
        return Promise.resolve(new Blob(["out"]));
      },
    };

    const response = await handleCompressionRequest(REQUEST, compressor, {
      onProgress,
    });

    expect(response).toEqual({ id: "job-1", ok: true, blob: expect.any(Blob) });
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 0.25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 1);
  });

  it("forwards an abort signal through the hooks", async () => {
    const signal = new AbortController().signal;
    const compressor = fakeCompressor(Promise.resolve(new Blob(["out"])));

    await handleCompressionRequest(REQUEST, compressor, { signal });

    expect(compressor.compress).toHaveBeenCalledWith(
      REQUEST.file,
      REQUEST.options,
      { signal },
    );
  });

  it("returns a failure response when compression throws an Error", async () => {
    const compressor = fakeCompressor(Promise.reject(new Error("boom")));

    const response = await handleCompressionRequest(REQUEST, compressor);

    expect(response).toEqual({ id: "job-1", ok: false, error: "boom" });
  });

  it("stringifies non-Error rejections", async () => {
    const compressor = fakeCompressor(Promise.reject("weird failure"));

    const response = await handleCompressionRequest(REQUEST, compressor);

    expect(response).toEqual({ id: "job-1", ok: false, error: "weird failure" });
  });

  it("never rejects, even when the compressor throws synchronously", async () => {
    const compressor: VideoCompressor = {
      compress: () => {
        throw new Error("sync boom");
      },
    };

    const response = await handleCompressionRequest(REQUEST, compressor);

    expect(response).toEqual({ id: "job-1", ok: false, error: "sync boom" });
  });
});
