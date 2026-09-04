import { describe, expect, it, vi } from "vitest";
import { CanvasEncoder } from "../src/encoders/canvasEncoder";
import type { Raster, RasterFactory } from "../src/encoders/canvasEncoder";

const SOURCE_BLOB = new Blob(["fake"], { type: "image/png" });

function makeBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

/** Fake raster that records calls instead of touching any canvas. */
function makeRaster(_width: number, _height: number): Raster {
  return {
    draw: vi.fn(),
    toBlob: vi
      .fn()
      .mockResolvedValue(
        new Blob(["encoded"], { type: "image/webp" }),
      ) as Raster["toBlob"],
  };
}

interface Fixture {
  encoder: CanvasEncoder;
  rasters: Raster[];
  rasterFactory: RasterFactory;
}

function makeFixture(bitmap: ImageBitmap): Fixture {
  const rasters: Raster[] = [];
  const rasterFactory: RasterFactory = vi.fn((width: number, height: number) => {
    const raster = makeRaster(width, height);
    rasters.push(raster);
    return raster;
  });
  const encoder = new CanvasEncoder({
    decode: vi.fn().mockResolvedValue(bitmap),
    createRaster: rasterFactory,
  });
  return { encoder, rasters, rasterFactory };
}

describe("CanvasEncoder", () => {
  it("decodes, rasterizes at original size, and returns the blob", async () => {
    const { encoder, rasters, rasterFactory } = makeFixture(makeBitmap(800, 600));

    const result = await encoder.encode(SOURCE_BLOB, {
      format: "image/webp",
      quality: 75,
    });

    expect(rasterFactory).toHaveBeenCalledWith(800, 600);
    expect(rasters[0].draw).toHaveBeenCalledWith(expect.objectContaining({ width: 800 }));
    expect(rasters[0].toBlob).toHaveBeenCalledWith("image/webp", 0.75);
    expect(result).toMatchObject({ width: 800, height: 600 });
    expect(result.blob.type).toBe("image/webp");
  });

  it("downscales to maxWidth, preserving aspect ratio", async () => {
    const { encoder, rasterFactory } = makeFixture(makeBitmap(2000, 1000));

    await encoder.encode(SOURCE_BLOB, {
      format: "image/jpeg",
      quality: 80,
      maxWidth: 500,
    });

    expect(rasterFactory).toHaveBeenCalledWith(500, 250);
  });

  it("never upscales when maxWidth exceeds the original width", async () => {
    const { encoder, rasterFactory } = makeFixture(makeBitmap(100, 50));

    await encoder.encode(SOURCE_BLOB, {
      format: "image/jpeg",
      quality: 80,
      maxWidth: 500,
    });

    expect(rasterFactory).toHaveBeenCalledWith(100, 50);
  });

  it("requests lossless PNG without a quality argument", async () => {
    const { encoder, rasters } = makeFixture(makeBitmap(10, 10));

    await encoder.encode(SOURCE_BLOB, {
      format: "image/png",
      quality: 30,
    });

    expect(rasters[0].toBlob).toHaveBeenCalledWith("image/png", undefined);
  });

  it("closes the decoded bitmap after drawing", async () => {
    const bitmap = makeBitmap(10, 10);
    const { encoder } = makeFixture(bitmap);

    await encoder.encode(SOURCE_BLOB, { format: "image/png", quality: 80 });

    expect(bitmap.close).toHaveBeenCalled();
  });

  it("propagates decode failures to the caller", async () => {
    const encoder = new CanvasEncoder({
      decode: vi.fn().mockRejectedValue(new Error("unsupported format")),
      createRaster: makeRaster,
    });

    await expect(
      encoder.encode(SOURCE_BLOB, { format: "image/webp", quality: 75 }),
    ).rejects.toThrow("unsupported format");
  });
});
