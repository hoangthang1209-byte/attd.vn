/**
 * R1 Article #4 — Regular vs oversize for print shops (DRAFT).
 */

import {
  R1_MEDIA,
  R1_SLUGS,
  r1Figure,
} from "@/features/content/revenue/r1-shared";

export const R1_BLOG_FORM = {
  title: "Regular hay oversize: xưởng in nên nhập form áo trơn nào?",
  slug: "regular-hay-oversize-xuong-in-nen-nhap-form-nao",
  excerpt:
    "So sánh form regular và oversize khi nhập áo trơn: phân khúc khách, diện tích trang trí, size mix, rủi ro tồn kho và tái đơn.",
  metaTitle: "Regular hay oversize khi nhập áo trơn? | ATTD.vn",
  metaDescription:
    "Xưởng in nên nhập áo trơn regular hay oversize? So sánh theo khách cuối, diện tích in/thêu, size mix, rủi ro tồn và tái đơn — không có form nào đúng cho mọi brief.",
  tags: [
    "áo thun regular",
    "áo thun oversize",
    "form áo trơn",
    "xưởng in nhập áo",
    "nguồn hàng áo trơn",
  ],
  coverUrl: R1_MEDIA.khoOversize.url,
  coverAssetId: R1_MEDIA.khoOversize.id,
  faqJson: [
    {
      question: "Xưởng in nên nhập cả hai form không?",
      answer:
        "Có thể nếu bạn phục vụ hai phân khúc rõ (đồng phục vs streetwear). Nếu mới bắt đầu, ưu tiên form chiếm phần lớn đơn thật, rồi mở form thứ hai sau khi có dữ liệu bán.",
    },
    {
      question: "Oversize có khó in hơn regular không?",
      answer:
        "Không nhất thiết khó hơn, nhưng vị trí artwork và cảm giác mặc khác. Cần mẫu đo và thử vị trí in/thêu trước khi chuẩn hóa file.",
    },
    {
      question: "Size mix khác nhau thế nào?",
      answer:
        "Regular thường có size curve quen thuộc với đồng phục. Oversize có thể lệch về size lớn hơn tùy thị trường — dựa trên đơn đã giao, không chia đều máy móc.",
    },
  ],
} as const;

export function buildR1FormHtml(): string {
  const img1 = R1_MEDIA.regularDetail;
  const img2 = R1_MEDIA.khoThun;
  return `
<p>Không có form áo trơn nào “tốt hơn” cho mọi xưởng in. <strong>Regular</strong> và <strong>oversize</strong> phục vụ phân khúc khác nhau — quyết định nhập phải dựa trên khách cuối, diện tích trang trí, size mix và rủi ro tồn kho.</p>
<p>Hub: <a href="${R1_SLUGS.hub}">áo thun trơn sỉ</a>. Catalogue: <a href="${R1_SLUGS.regular}">áo thun regular</a>, <a href="${R1_SLUGS.oversize}">áo thun oversized</a>.</p>

<h2>Regular: khi nào hợp lý?</h2>
<p>Regular phù hợp đồng phục, event tiêu chuẩn, merchandise doanh nghiệp và nhiều đơn logo cần dễ mặc cho đa số.</p>
<ul>
<li>Dễ giải thích size cho khách cuối.</li>
<li>Vị trí in ngực/tay quen thuộc, dễ chuẩn hóa file.</li>
<li>Thường dễ tái nhập theo size curve ổn định hơn nếu bạn đã có lịch sử đơn.</li>
</ul>
<p>Với agency làm đồng phục sự kiện, regular giúp giảm câu hỏi “mặc có rộng quá không?” và giữ trải nghiệm đồng đều cho nhóm lớn.</p>

${r1Figure(img1.url, img1.alt, "Regular — nền phổ biến cho đồng phục và merchandise.")}

<h2>Oversize: khi nào hợp lý?</h2>
<p>Oversize hợp local brand, streetwear, campaign giới trẻ và một số brief muốn form rộng.</p>
<ul>
<li>Diện tích thân lớn hơn — artwork lớn có thể trông khác trên người.</li>
<li>Cần bảng size và mẫu mặc; đừng dùng size chart regular.</li>
<li>Rủi ro tồn cao hơn nếu ôm nhiều màu trend trước khi có đơn.</li>
</ul>
<p>Nếu bạn chủ yếu nhận đơn đồng phục DN mà mở oversize “cho đủ catalogue”, vốn dễ nằm ở size/màu khó xoay.</p>

${r1Figure(img2.url, img2.alt, "Nhập form theo dữ liệu đơn thật, không chỉ theo ảnh trend.")}

<h2>Diện tích trang trí và kỹ thuật</h2>
<p>Regular thường thuận cho logo ngực nhỏ/vừa và đồng phục. Oversize cần đo lại vị trí in/thêu vì tỷ lệ thân đổi. Kết hợp kỹ thuật: <a href="${R1_SLUGS.article3}">áo trơn cho in lụa, DTF và thêu</a>.</p>
<p>Một file in “chuẩn regular” đặt lên oversize có thể thấp/cao hơn kỳ vọng trên người — luôn fit trên mẫu đúng form.</p>

<h2>Size mix, tồn kho và tái đơn</h2>
<table>
<thead>
<tr><th>Yếu tố</th><th>Regular</th><th>Oversize</th></tr>
</thead>
<tbody>
<tr><td>Phân khúc</td><td>Đồng phục, event, DN</td><td>Local brand, streetwear, campaign</td></tr>
<tr><td>Rủi ro tồn</td><td>Thường thấp hơn nếu màu core</td><td>Cao hơn nếu nhiều màu trend</td></tr>
<tr><td>Tái đơn</td><td>Dễ chuẩn hóa theo lịch sử</td><td>Cần theo dõi size thực tế từng drop</td></tr>
<tr><td>Định vị</td><td>Thực dụng, dễ bán rộng</td><td>Thời trang, phân khúc hẹp hơn</td></tr>
</tbody>
</table>
<p>Chiến lược thực tế: giữ màu core trên form form chiếm ≥ phần lớn doanh thu in; form thứ hai chỉ mở khi có brief/đơn đủ để xoay vòng vốn.</p>

<h2>Quyết định nhập theo checklist</h2>
<ol>
<li>Phân khúc khách 30–60 ngày tới là gì?</li>
<li>Artwork chủ đạo nhỏ (logo) hay lớn (full print vibe)?</li>
<li>Bạn đã có size curve từ đơn thật chưa?</li>
<li>Vốn có chịu được ôm hai form song song không?</li>
<li>Đã thử in/thêu trên mẫu đúng form chưa?</li>
</ol>
<p>Chọn nguồn tổng: <a href="${R1_SLUGS.article1}">nguồn áo thun trơn cho xưởng in</a>. Chất liệu: <a href="${R1_SLUGS.article2}">cotton / CVC / polyester</a>. Danh mục: <a href="${R1_SLUGS.category}">áo thun trơn</a>.</p>

<aside class="blog-cta-block"><p class="blog-cta-block__title">Tìm nguồn áo trơn theo form</p><p class="blog-cta-block__body">Cho ATTD biết phân khúc khách và kỹ thuật in — nhận gợi ý regular/oversize kèm báo giá theo tồn kho.</p><a class="blog-cta-block__button" href="${R1_SLUGS.contact}">Yêu cầu báo giá</a><a class="blog-cta-block__secondary" href="${R1_SLUGS.category}">Xem danh mục áo thun trơn</a></aside>
`.trim();
}
