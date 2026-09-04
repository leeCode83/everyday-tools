import { afterEach, describe, expect, it, vi } from "vitest";
import { compressVideo, supportsVideoCompression } from "../src/videoCompressor";
import type { CompressionOptions } from "../src/core/types";

const OPTIONS: CompressionOptions = {
  mode: { kind: "preset", preset: "balanced" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("supportsVideoCompression", () => {
  it("is true when the browser exposes VideoEncoder", () => {
    vi.stubGlobal("VideoEncoder", class {});

    expect(supportsVideoCompression()).toBe(true);
  });

  it("is false when VideoEncoder is missing", () => {
    vi.stubGlobal("VideoEncoder", undefined);

    expect(supportsVideoCompression()).toBe(false);
  });
});

describe("compressVideo", () => {
  it("throws AbortError without reading the file when already aborted", async () => {
    const attempt = compressVideo(new Blob(["v"]), OPTIONS, {
      signal: AbortSignal.abort(),
    });

    await expect(attempt).rejects.toMatchObject({ name: "AbortError" });
  });
});
