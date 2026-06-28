import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  getProductCardHoverImageFromProduct,
  getProductCardHoverImageUrl,
} from "@/lib/productImages";

const repoRoot = resolve(import.meta.dirname, "../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

const PRIMARY = "https://cdn.example.com/products/front.jpg";
const SECONDARY = "https://cdn.example.com/products/back.jpg";

describe("product-card-hover-image", () => {
  it("returns the second distinct valid image after the primary", () => {
    const images = [
      { imageUrl: PRIMARY, sortOrder: 0 },
      { imageUrl: SECONDARY, sortOrder: 1 },
    ];
    assert.equal(getProductCardHoverImageUrl(images, PRIMARY), SECONDARY);
    assert.equal(
      getProductCardHoverImageFromProduct({ images, featuredImage: null, gallery: [] }),
      SECONDARY,
    );
  });

  it("returns null when no second image exists", () => {
    const images = [{ imageUrl: PRIMARY, sortOrder: 0 }];
    assert.equal(getProductCardHoverImageUrl(images, PRIMARY), null);
    assert.equal(
      getProductCardHoverImageFromProduct({ images, featuredImage: null, gallery: [] }),
      null,
    );
  });

  it("skips duplicate primary and secondary URLs", () => {
    const images = [
      { imageUrl: PRIMARY, sortOrder: 0 },
      { imageUrl: PRIMARY, sortOrder: 1 },
      { imageUrl: SECONDARY, sortOrder: 2 },
    ];
    assert.equal(getProductCardHoverImageUrl(images, PRIMARY), SECONDARY);
  });

  it("ProductMediaFrame uses primary and hover image class contract", () => {
    const source = readRepoFile("src/components/public/ProductMediaFrame.tsx");
    assert.match(source, /product-media-frame__img--primary/);
    assert.match(source, /product-media-frame__img--hover/);
    assert.match(source, /product-media-frame--has-hover/);
  });

  it("globals.css hides hover image by default and only reveals on fine-pointer hover", () => {
    const css = readRepoFile("src/app/globals.css");
    const hoverBlockStart = css.indexOf(".product-media-frame--has-hover .product-media-frame__img--hover");
    assert.ok(hoverBlockStart >= 0);

    const beforeMediaQuery = css.slice(hoverBlockStart, css.indexOf("@media (hover: hover) and (pointer: fine)", hoverBlockStart));
    assert.match(beforeMediaQuery, /opacity:\s*0/);

    const finePointerBlock = css.match(
      /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.product-card-media-link:focus-within \.product-media-frame--has-hover \.product-media-frame__img--primary \{[\s\S]*?opacity:\s*0;[\s\S]*?\}/,
    );
    assert.ok(finePointerBlock, "desktop hover should fade primary image");
  });
});
