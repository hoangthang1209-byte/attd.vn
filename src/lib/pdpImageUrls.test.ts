import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPdpMainImageUrl,
  getPdpThumbnailImageUrl,
  getPdpZoomImageUrl,
  stripCloudinaryTransforms,
} from "@/lib/pdpImageUrls";

const ORIGINAL =
  "https://res.cloudinary.com/demo/image/upload/v1710000000/attd/products/shirt.jpg";
const WITH_TRANSFORMS =
  "https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/v1710000000/attd/products/shirt.jpg";
const BLOB =
  "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/shirt.jpg";

describe("pdpImageUrls", () => {
  it("strips existing Cloudinary transforms before rebuilding", () => {
    assert.equal(
      stripCloudinaryTransforms("w_400,h_400,c_fill/v1710000000/attd/products/shirt.jpg"),
      "v1710000000/attd/products/shirt.jpg",
    );
  });

  it("builds a high-resolution main-stage Cloudinary URL", () => {
    assert.equal(
      getPdpMainImageUrl(WITH_TRANSFORMS),
      "https://res.cloudinary.com/demo/image/upload/w_1600,c_limit,q_92,f_auto/v1710000000/attd/products/shirt.jpg",
    );
    assert.equal(
      getPdpMainImageUrl(ORIGINAL),
      "https://res.cloudinary.com/demo/image/upload/w_1600,c_limit,q_92,f_auto/v1710000000/attd/products/shirt.jpg",
    );
  });

  it("builds a dedicated zoom Cloudinary URL", () => {
    assert.equal(
      getPdpZoomImageUrl(WITH_TRANSFORMS),
      "https://res.cloudinary.com/demo/image/upload/w_2400,h_2400,c_limit,q_95,f_auto/v1710000000/attd/products/shirt.jpg",
    );
  });

  it("returns original URL for Vercel Blob sources", () => {
    assert.equal(getPdpMainImageUrl(BLOB), BLOB);
    assert.equal(getPdpZoomImageUrl(BLOB), BLOB);
  });

  it("keeps thumbnail transforms small", () => {
    assert.equal(
      getPdpThumbnailImageUrl(ORIGINAL),
      "https://res.cloudinary.com/demo/image/upload/w_144,h_144,c_fill,q_80,f_auto/v1710000000/attd/products/shirt.jpg",
    );
  });
});
