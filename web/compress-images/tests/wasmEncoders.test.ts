import { describe, expect, it, vi } from "vitest";
import { MozJpegEncoder } from "../src/encoders/wasmEncoders";
import { OxiPngEncoder } from "../src/encoders/wasmEncoders";

const SOURCE_BLOB = new Blob(["fake"], { type: "image/png" });

function makeBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

describe("MozJpegEncoder", () => {
  it("encodes via the injected WASM encoder with clamped quality", async () => {
    const encodeImageData = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const toImageData = vi.fn().mockReturnValue({ width: 10, height: 10 });
    const encoder = new MozJpegEncoder({
      decode: vi.fn().mockResolvedValue(makeBitmap(10, 10)),
      toImageData,
      encodeImageData,
    });

    const result = await encoder.encode(SOURCE_BLOB, {
      format: "image/jpeg",
      quality: 75,
    });

    expect(toImageData).toHaveBeenCalled();
    // jSquash quality scale is 0–100, so 75 stays 75 (not 0.75).
    expect(encodeImageData).toHaveBeenCalledWith(expect.anything(), 75);
    expect(result.blob.type).toBe("image/jpeg");
    expect(result).toMatchObject({ width: 10, height: 10 });
  });

  it("rasterizes at the fitted size when maxWidth is set", async () => {
    const toImageData = vi.fn().mockReturnValue({ width: 1, height: 1 });
    const encoder = new MozJpegEncoder({
      decode: vi.fn().mockResolvedValue(makeBitmap(2000, 1000)),
      toImageData,
      encodeImageData: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    await encoder.encode(SOURCE_BLOB, {
      format: "image/jpeg",
      quality: 80,
      maxWidth: 500,
    });

    expect(toImageData).toHaveBeenCalledWith(
      expect.objectContaining({ width: 2000 }),
      500,
      250,
    );
  });

  it("propagates WASM encoder failures", async () => {
    const encoder = new MozJpegEncoder({
      decode: vi.fn().mockResolvedValue(makeBitmap(10, 10)),
      toImageData: vi.fn().mockReturnValue({}),
      encodeImageData: vi.fn().mockRejectedValue(new Error("wasm boom")),
    });

    await expect(
      encoder.encode(SOURCE_BLOB, { format: "image/jpeg", quality: 75 }),
    ).rejects.toThrow("wasm boom");
  });
});

describe("OxiPngEncoder", () => {
  it("optimizes the canvas PNG bytes and returns a PNG blob", async () => {
    const pngBlob = new Blob(["png-bytes"], { type: "image/png" });
    const optimisePng = vi.fn().mockResolvedValue(new ArrayBuffer(5));
    const encoder = new OxiPngEncoder({
      decode: vi.fn().mockResolvedValue(makeBitmap(20, 10)),
      toPngBlob: vi.fn().mockResolvedValue(pngBlob),
      optimisePng,
    });

    const result = await encoder.encode(SOURCE_BLOB, {
      format: "image/png",
      quality: 80,
    });

    expect(optimisePng).toHaveBeenCalledWith(expect.any(ArrayBuffer), 2);
    expect(result.blob.type).toBe("image/png");
    expect(result).toMatchObject({ width: 20, height: 10 });
  });

  it("propagates optimiser failures", async () => {
    const encoder = new OxiPngEncoder({
      decode: vi.fn().mockResolvedValue(makeBitmap(20, 10)),
      toPngBlob: vi.fn().mockResolvedValue(new Blob([])),
      optimisePng: vi.fn().mockRejectedValue(new Error("oxipng boom")),
    });

    await expect(
      encoder.encode(SOURCE_BLOB, { format: "image/png", quality: 80 }),
    ).rejects.toThrow("oxipng boom");
  });
});
