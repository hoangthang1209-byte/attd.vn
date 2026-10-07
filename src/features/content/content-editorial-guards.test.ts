import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEditorialCompletion } from "./content-editorial-guards";

test("blocks the unfinished sections found in the public polo article", () => {
  assert.equal(validateEditorialCompletion("Kết luận: nội dung hướng dẫn mua hàng B2B — bổ sung chi tiết khi review.").length, 1);
});

test("blocks placeholders across HTML tags and nonbreaking spaces", () => {
  assert.equal(validateEditorialCompletion("<p>Bổ sung <strong>chi tiết</strong>&nbsp;khi review.</p>").length, 1);
  assert.equal(validateEditorialCompletion("<p>[TODO]</p>").length, 1);
  assert.equal(validateEditorialCompletion("[INSERT IMAGE]").length, 1);
});

test("blocks internal capability instructions", () => {
  assert.equal(validateEditorialCompletion("ATTD điều phối sản xuất — thay vì mặc định tự nhận là chủ toàn bộ dây chuyền may nếu chưa có bằng chứng công khai tương ứng.").length, 1);
});

test("allows completed factual customer copy and ordinary review terminology", () => {
  assert.deepEqual(validateEditorialCompletion("ATTD phối hợp với đối tác gia công và kiểm hàng trước khi giao. Khách hàng duyệt mẫu trước sản xuất."), []);
  assert.deepEqual(validateEditorialCompletion("Review mẫu áo giúp bạn đánh giá chất liệu. Chúng tôi không tự nhận là đơn vị phù hợp với mọi đơn hàng."), []);
});

test("accepts missing content without replacing the existing empty-body gate", () => {
  assert.deepEqual(validateEditorialCompletion(null), []);
});
