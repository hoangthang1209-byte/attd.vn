/**
 * R1 Article #1 — Cách chọn nguồn áo thun trơn cho xưởng in (DRAFT).
 */

import {
  R1_MEDIA,
  R1_SLUGS,
  r1Figure,
} from "@/features/content/revenue/r1-shared";

export const R1_BLOG_XUONG_IN = {
  id: "cmqe1hepx0000jv04uzj80tci",
  title: "Cách chọn nguồn áo thun trơn cho xưởng in",
  slug: "cach-chon-nguon-ao-thun-tron-cho-xuong-in",
  excerpt:
    "Checklist cho xưởng in khi chọn nguồn áo thun trơn: form, chất liệu, màu/size, tương thích in-thêu, mẫu thử và rủi ro tái nhập.",
  metaTitle: "Cách chọn nguồn áo thun trơn cho xưởng in | ATTD.vn",
  metaDescription:
    "Hướng dẫn xưởng in chọn nguồn áo thun trơn: form, chất liệu, màu/size, in lụa/DTF/thêu, lấy mẫu và đánh giá nhà cung cấp B2B — không bịa MOQ/giá.",
  tags: [
    "nguồn áo thun trơn",
    "áo thun trơn xưởng in",
    "hàng trơn sẵn kho",
    "áo trơn để in",
    "nguồn hàng B2B",
  ],
  coverUrl: R1_MEDIA.khoThun.url,
  coverAssetId: R1_MEDIA.khoThun.id,
  faqJson: [
    {
      question: "Xưởng in nên ưu tiên hàng sẵn kho hay đặt sản xuất?",
      answer:
        "Đơn cần giao theo tồn kho và màu phổ biến thường phù hợp hàng sẵn. Đặt sản xuất hợp lý khi cần màu/tem/form riêng hoặc lịch cố định số lượng lớn.",
    },
    {
      question: "Có bắt buộc lấy mẫu trước khi nhập lớn không?",
      answer:
        "Với màu chủ lực và kỹ thuật in/thêu chính, nên lấy mẫu và chạy thử trên đúng máy của xưởng trước khi chốt.",
    },
    {
      question: "Bắt đầu yêu cầu báo giá thế nào?",
      answer:
        "Gửi form áo, chất liệu quan tâm, màu/size dự kiến và kỹ thuật trang trí qua form liên hệ. ATTD phản hồi theo catalogue và tồn kho thời điểm.",
    },
  ],
} as const;

export function buildR1XuongInHtml(): string {
  const img1 = R1_MEDIA.khoOversize;
  const img2 = R1_MEDIA.regularDetail;
  return `
<p>Xưởng in không thiếu brief — thường thiếu <strong>nguồn áo thun trơn</strong> đủ ổn định để nhận đơn, giữ chất lượng giữa các lô và tái nhập đúng màu/size. Bài viết này là checklist mua hàng cho xưởng in và shop in áo: form, vải, màu, size, tương thích kỹ thuật và rủi ro vận hành.</p>
<p>Góc thương mại xem hub <a href="${R1_SLUGS.hub}">áo thun trơn sỉ</a> và danh mục <a href="${R1_SLUGS.category}">áo thun trơn</a>. Bài này giữ intent giáo dục.</p>

<h2>Xưởng in cần gì ở nguồn áo trơn?</h2>
<p>Áo thun trơn với xưởng in là nguyên liệu đầu vào. Tiêu chí quyết định thường là:</p>
<ul>
<li><strong>Form và cổ áo ổn định</strong> giữa các lần nhập — giảm lệch vị trí in.</li>
<li><strong>Tái nhập màu/size core</strong> để nhận đơn gấp.</li>
<li><strong>Mặt vải phù hợp kỹ thuật</strong> bạn đang bán (in lụa, DTF, thêu…).</li>
<li><strong>Mẫu thử trước khi đổ vốn</strong> vào một màu chủ lực.</li>
</ul>
<p>Đơn giá thấp không bù được chi phí in lại, đổi hàng hoặc mất khách vì lệch form/màu.</p>

${r1Figure(img1.url, img1.alt, "Oversize trơn — thường gặp ở local brand và campaign.")}

<h2>Form: regular hay oversize?</h2>
<p><strong>Regular</strong> phù hợp đồng phục, event tiêu chuẩn và nhiều đơn logo doanh nghiệp — dễ chia size, dễ giải thích khách cuối.</p>
<p><strong>Oversize</strong> hợp streetwear/local brand; cần bảng size riêng và thử vị trí in vì diện tích và cảm giác mặc khác regular.</p>
<p>Quy tắc: chọn theo khách cuối và kỹ thuật trang trí. Chi tiết quyết định form xem <a href="${R1_SLUGS.article4}">regular hay oversize cho xưởng in</a>. Catalogue: <a href="${R1_SLUGS.regular}">áo thun regular</a>, <a href="${R1_SLUGS.oversize}">áo thun oversized</a>.</p>

${r1Figure(img2.url, img2.alt, "Regular — nền phổ biến cho đồng phục và merchandise.")}

<h2>Chất liệu và kỹ thuật trang trí</h2>
<p>Cotton, CVC hay polyester không “tốt/xấu tuyệt đối” — phụ thuộc brief. So sánh góc người mua xem <a href="${R1_SLUGS.article2}">cotton, CVC hay polyester khi nhập áo trơn</a>.</p>
<p>Trước khi chốt nguồn, chạy thử kỹ thuật trên mẫu thật. Checklist riêng cho in lụa / DTF / thêu: <a href="${R1_SLUGS.article3}">chọn áo trơn để in lụa, DTF và thêu</a>.</p>

<h2>Màu và size khi nhập số lượng lớn</h2>
<ul>
<li>Tách <strong>màu core</strong> (luôn cần) và <strong>màu campaign</strong> (theo brief).</li>
<li>Lập size curve theo loại khách — không chia đều máy móc.</li>
<li>Ghi nhận size thiếu để ưu tiên tái nhập.</li>
<li>Tránh ôm quá nhiều màu trend khi chưa có đơn.</li>
</ul>

<h2>Câu hỏi cần hỏi nhà cung cấp</h2>
<ul>
<li>Màu/size nào đang có — catalogue có khớp hàng thật?</li>
<li>Có hỗ trợ mẫu và thử in/thêu trước khi nhập lớn?</li>
<li>Khi thiếu size, phương án bù hàng thế nào?</li>
<li>Có mở rộng OEM/tem riêng khi brand khách lớn dần không?</li>
</ul>
<p>MOQ, giá và lịch giao thuộc điều kiện báo giá — không niêm yết số cố định trong bài giáo dục. Góc sourcing: <a href="${R1_SLUGS.sourcing}">nguồn hàng áo thun trơn</a>; góc kho: <a href="${R1_SLUGS.warehouse}">kho áo thun trơn</a>.</p>

<h2>Lộ trình chọn nguồn cho xưởng in</h2>
<ol>
<li>Chốt khách cuối + kỹ thuật in/thêu chính.</li>
<li>Chọn 1–2 form và 1–2 chất liệu để lấy mẫu.</li>
<li>Thử in/thêu, ghi nhận lỗi.</li>
<li>Chốt màu core + size curve đợt đầu.</li>
<li>Gửi nhu cầu qua <a href="${R1_SLUGS.hub}">áo thun trơn sỉ</a> / <a href="${R1_SLUGS.contact}">yêu cầu báo giá</a>, rồi theo dõi tái nhập.</li>
</ol>

<aside class="blog-cta-block"><p class="blog-cta-block__title">Tìm nguồn áo thun trơn cho xưởng in</p><p class="blog-cta-block__body">Gửi form, chất liệu, màu/size và kỹ thuật in — ATTD tư vấn nguồn hàng sẵn kho và báo giá theo nhu cầu.</p><a class="blog-cta-block__button" href="${R1_SLUGS.contact}">Yêu cầu báo giá</a><a class="blog-cta-block__secondary" href="${R1_SLUGS.hub}">Xem áo thun trơn sỉ</a></aside>
`.trim();
}
