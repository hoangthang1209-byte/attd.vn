import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SECTION_PATH = join(
  process.cwd(),
  "src/components/admin/products/ProductCatalogVariantsSection.tsx",
);

describe("ProductCatalogVariantsSection matrix save-before-preview", () => {
  const source = readFileSync(SECTION_PATH, "utf8");

  it("saves options once before server preview, not again before execute", () => {
    assert.match(source, /onBeforeMatrixGenerate/);
    assert.match(source, /Đang lưu tuỳ chọn\.\.\./);
    assert.match(source, /Đang kiểm tra tổ hợp\.\.\./);
    assert.match(source, /Đang tạo tổ hợp biến thể\.\.\./);
    assert.match(source, /fetchServerMatrixPreview/);
    assert.match(source, /serverMatrixPreview/);
    assert.match(source, /async function openMatrixConfirm/);
    assert.match(
      source,
      /Không thể tạo biến thể vì nhóm tuỳ chọn chưa được lưu\. Vui lòng lưu sản phẩm rồi thử lại\./,
    );
    // Execute path must not call onBeforeMatrixGenerate again.
    const generateFn = source.slice(source.indexOf("async function generateFromServer"));
    const generateBody = generateFn.slice(0, generateFn.indexOf("async function confirmMatrixGeneration"));
    assert.doesNotMatch(generateBody, /onBeforeMatrixGenerate/);
  });

  it("does not block fresh unsaved option groups from matrix confirmation", () => {
    assert.doesNotMatch(
      source,
      /if \(optionGroups\.length > 0 && !hasPersistedOptionValues\) return;/,
    );
  });

  it("invalidates preview when options change and blocks concurrent product save", () => {
    assert.match(source, /MATRIX_PREVIEW_STALE_ERROR/);
    assert.match(source, /PRODUCT_SAVE_IN_PROGRESS_FOR_MATRIX_ERROR/);
    assert.match(source, /productSaveInProgress/);
    assert.match(source, /onMatrixBusyChange/);
  });

  it("shows large-matrix warning and does not claim zero created before refetch", () => {
    assert.match(source, /Ma trận lớn:.*biến thể\. Quá trình tạo có thể mất vài giây/);
    assert.match(source, /Đang tạo \$\{expectedCreateCount\} biến thể/);
    assert.match(source, /matrixNeedsRefetch/);
    assert.match(source, /kiểm tra lại trạng thái biến thể/);
    assert.match(source, /fetchServerMatrixPreview/);
    assert.doesNotMatch(source, /Không có biến thể nào được tạo/);
  });
});
