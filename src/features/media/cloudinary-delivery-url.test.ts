import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCloudinaryTransformUrl,
  getWebDeliveryMediaUrl,
  stripCloudinaryTransforms,
} from "@/features/media/cloudinary-delivery-url";

describe("cloudinary delivery urls", () => {
  it("strips existing transforms before applying web delivery", () => {
    const raw =
      "https://res.cloudinary.com/demo/image/upload/w_100,c_fill/v1710000000/attd/products/shirt.jpg";
    const tail = raw.split("/image/upload/")[1] ?? "";
    assert.equal(stripCloudinaryTransforms(tail), "v1710000000/attd/products/shirt.jpg");
    const optimized = getWebDeliveryMediaUrl(raw);
    assert.match(optimized ?? "", /w_1600,c_limit,q_auto:good,f_auto/);
    assert.match(optimized ?? "", /attd\/products\/shirt\.jpg$/);
  });

  it("buildCloudinaryTransformUrl preserves versioned public id", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/attd/general/a.png";
    const next = buildCloudinaryTransformUrl(url, "w_800,c_limit,f_auto");
    assert.equal(
      next,
      "https://res.cloudinary.com/demo/image/upload/w_800,c_limit,f_auto/v1/attd/general/a.png",
    );
  });
});
