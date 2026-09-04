import { describe, expect, it, vi } from "vitest";
import { handleEncodeRequest } from "../src/core/protocol";
import type { ImageEncoder, EncodedImage } from "../src/encoders/imageEncoder";
import type { EncodeRequest } from "../src/core/types";

const REQUEST: EncodeRequest = {
  id: "req-1",
  file: new Blob(["img"], { type: "image/png" }),
  options: { format: "image/webp", quality: 75 },
};

function fakeEncoder(result: Promise<EncodedImage>): ImageEncoder {
  return { encode: vi.fn().mockReturnValue(result) };
}

describe("handleEncodeRequest", () => {
  it("returns a success response with the encoded image", async () => {
    const blob = new Blob(["out"], { type: "image/webp" });
    const encoder = fakeEncoder(
      Promise.resolve({ blob, width: 800, height: 600 }),
    );

    const response = await handleEncodeRequest(REQUEST, encoder);

    expect(response).toEqual({
      id: "req-1",
      ok: true,
      blob,
      width: 800,
      height: 600,
    });
    expect(encoder.encode).toHaveBeenCalledWith(REQUEST.file, REQUEST.options);
  });

  it("returns a failure response when encoding throws an Error", async () => {
    const encoder = fakeEncoder(Promise.reject(new Error("boom")));

    const response = await handleEncodeRequest(REQUEST, encoder);

    expect(response).toEqual({
      id: "req-1",
      ok: false,
      error: "boom",
    });
  });

  it("stringifies non-Error rejections", async () => {
    const encoder = fakeEncoder(Promise.reject("weird failure"));

    const response = await handleEncodeRequest(REQUEST, encoder);

    expect(response).toEqual({
      id: "req-1",
      ok: false,
      error: "weird failure",
    });
  });

  it("never rejects, even when the encoder throws synchronously", async () => {
    const encoder: ImageEncoder = {
      encode: () => {
        throw new Error("sync boom");
      },
    };

    const response = await handleEncodeRequest(REQUEST, encoder);

    expect(response).toEqual({ id: "req-1", ok: false, error: "sync boom" });
  });
});
