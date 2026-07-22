import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("product image debt UX wiring", () => {
  it("product edit warns for invalid and stale blob images and offers re-pick", () => {
    const form = read("src/components/admin/products/ProductCatalogForm.tsx");
    assert.match(form, /classifyImageUrlDeterministic/);
    assert.match(
      form,
      /Ảnh hiện tại không hợp lệ hoặc không còn truy cập được\. Vui lòng chọn lại ảnh từ Thư viện ảnh\./,
    );
    assert.match(
      form,
      /Ảnh cũ từ Vercel Blob không còn tồn tại\. Vui lòng chọn lại ảnh từ Media Library\./,
    );
    assert.match(form, /Chọn lại ảnh/);
    assert.match(form, /section-media/);
  });

  it("MediaPicker only persists canonical public URLs", () => {
    const picker = read("src/components/admin/media/MediaPicker.tsx");
    assert.match(picker, /getPublicMediaUrl/);
    assert.match(
      picker,
      /Ảnh này chưa có URL public hợp lệ\. Vui lòng tải lại ảnh hoặc chọn ảnh khác\./,
    );
    assert.match(picker, /handleSingleSelect/);
    assert.match(picker, /extractUploadUrl/);
  });

  it("public ProductMediaFrame filters invalid URLs and falls back without remote checks", () => {
    const frame = read("src/components/public/ProductMediaFrame.tsx");
    assert.match(frame, /getPublicMediaUrl/);
    assert.match(frame, /ImagePlaceholder/);
    assert.match(frame, /onError/);
    assert.doesNotMatch(frame, /probeImageReachability|method:\s*["']HEAD["']/);
  });

  it("repair script is preview-first and documents manual re-pick when no safe match", () => {
    const repair = read("scripts/products/repair-product-images.ts");
    assert.match(repair, /preview-first|Default is preview only/);
    assert.match(repair, /--confirm/);
    assert.match(repair, /Never guess replacements/);
    assert.match(repair, /Never write placeholder/);
    assert.match(repair, /Ảnh lỗi/);
    assert.match(repair, /mode: confirm \? "confirm" : "preview"/);
    assert.ok(
      repair.indexOf("if (!confirm)") >= 0 || repair.includes("if (!confirm)"),
      "preview path must return before apply",
    );
  });

  it("diagnostic script remains read-only", () => {
    const diagnose = read("scripts/products/diagnose-product-images.ts");
    assert.match(diagnose, /scanProductImageHealth/);
    assert.doesNotMatch(diagnose, /\.update\(|\.create\(|\.delete\(/);
  });
});
