/**
 * R1 Article #3 — Chọn áo trơn để in lụa, DTF và thêu (DRAFT).
 */

import {
  R1_MEDIA,
  R1_SLUGS,
  r1Figure,
} from "@/features/content/revenue/r1-shared";

export const R1_BLOG_PRINT = {
  title: "Chọn áo trơn để in lụa, DTF và thêu khác nhau thế nào?",
  slug: "chon-ao-tron-de-in-lua-dtf-va-theu",
  excerpt:
    "Hướng dẫn chọn áo trơn trước khi trang trí: mặt vải, độ đàn hồi, form, tương thích in lụa/DTF/thêu, lấy mẫu và lỗi sourcing thường gặp.",
  metaTitle: "Chọn áo trơn để in lụa, DTF và thêu | ATTD.vn",
  metaDescription:
    "So sánh cách chọn áo thun trơn cho in lụa, DTF và thêu: mặt vải, stretch, form, lấy mẫu và lỗi sourcing — dành cho xưởng in và agency.",
  tags: [
    "áo trơn để in",
    "in lụa áo thun",
    "DTF áo trơn",
    "thêu áo thun trơn",
    "nguồn hàng xưởng in",
  ],
  coverUrl: R1_MEDIA.regularDetail.url,
  coverAssetId: R1_MEDIA.regularDetail.id,
  faqJson: [
    {
      question: "Cùng một dòng áo có làm được cả in lụa và thêu không?",
      answer:
        "Nhiều dòng cotton/CVC dùng được cho cả hai, nhưng vẫn phải thử trên mẫu thật với đúng máy và vị trí trang trí. Đừng suy diễn từ tên chất liệu.",
    },
    {
      question: "DTF có đòi hỏi áo đặc biệt không?",
      answer:
        "DTF linh hoạt trên nhiều nền, nhưng cảm giác film, độ bám và độ bền sau giặt phụ thuộc gsm, mặt vải và quy trình ép. Luôn test trên đúng màu sẽ bán.",
    },
    {
      question: "Nên lấy mẫu thế nào trước khi nhập lớn?",
      answer:
        "Lấy đúng form + chất liệu + màu nền dự kiến, chạy thử kỹ thuật chính, giặt mẫu nếu brief yêu cầu độ bền, rồi mới chốt màu core.",
    },
  ],
} as const;

export function buildR1PrintHtml(): string {
  const img1 = R1_MEDIA.khoThun;
  const img2 = R1_MEDIA.khoOversize;
  return `
<p>Chọn <strong>áo trơn để in</strong> sai kỹ thuật sẽ đội chi phí setup, tăng tỷ lệ lỗi và làm khách cuối không hài lòng dù artwork đẹp. Bài viết giúp xưởng in, agency và local brand chọn áo thun trơn trước khi trang trí bằng <strong>in lụa, DTF hoặc thêu</strong>.</p>
<p>Hub mua sỉ: <a href="${R1_SLUGS.hub}">áo thun trơn sỉ</a>. Chất liệu tổng quan: <a href="${R1_SLUGS.article2}">cotton / CVC / polyester</a>. Form: <a href="${R1_SLUGS.article4}">regular hay oversize</a>.</p>

<h2>Trước khi chọn kỹ thuật: bốn yếu tố của áo trơn</h2>
<ul>
<li><strong>Mặt vải</strong> — độ phẳng, độ mịn, hướng sợi ảnh hưởng độ sắc artwork.</li>
<li><strong>Độ dày / định lượng</strong> — quá mỏng dễ lộ mực/nhăn; quá dày có thể khó ép hoặc nặng cảm giác.</li>
<li><strong>Độ đàn hồi (stretch)</strong> — ảnh hưởng register in và độ ổn định thêu.</li>
<li><strong>Form áo</strong> — diện tích in, vị trí ngực/tay, cảm giác mặc sau khi trang trí.</li>
</ul>

${r1Figure(img1.url, img1.alt, "Kiểm tra mặt vải và form trên hàng kho trước khi chốt kỹ thuật.")}

<h2>In lụa (screen print)</h2>
<p>In lụa hợp đơn màu lớn, màu đặc, số lượng lặp. Áo trơn cần mặt tương đối ổn định để khung in tiếp xúc đều.</p>
<ul>
<li>Ưu tiên nền có độ ổn định màu giữa các chiếc trong cùng lô.</li>
<li>Màu nền đậm cần cân nhắc underbase và số lần in — thử trên đúng màu sẽ bán.</li>
<li>Form regular thường dễ căn vị trí logo đồng phục hơn oversize rộng.</li>
</ul>

<h2>DTF</h2>
<p>DTF linh hoạt artwork nhiều màu và đơn biến thiên. Vẫn phụ thuộc bề mặt áo và quy trình ép.</p>
<ul>
<li>Thử độ bám và cảm giác film trên đúng gsm/chất liệu.</li>
<li>Kiểm vùng co giãn (ngực, tay) nếu artwork lớn.</li>
<li>Giặt mẫu nếu brief yêu cầu độ bền — đừng chỉ nhìn mẫu ép xong.</li>
</ul>

<h2>Thêu</h2>
<p>Thêu cần ổn định cấu trúc áo quanh vị trí thêu: cổ, vai, thân trước.</p>
<ul>
<li>Vải quá mỏng dễ nhăn hoặc thủng; quá dày có thể cần kim/chỉ khác.</li>
<li>Kiểm độ dày cổ áo nếu thêu gần bo cổ.</li>
<li>Oversize có thể đòi hỏi vị trí thêu khác regular — đo trên mẫu mặc.</li>
</ul>

${r1Figure(img2.url, img2.alt, "Oversize thay đổi diện tích và vị trí trang trí so với regular.")}

<h2>Artwork và ứng dụng thực tế</h2>
<p>Chia brief thành: kích thước artwork, số màu, vị trí, nền áo sáng/tối, yêu cầu giặt. Từ đó chọn kỹ thuật rồi mới chọn áo — không chọn áo rồi “cố” kỹ thuật.</p>
<p>Khi brief nghiêng đồng phục chỉnh chu hơn áo thun, có thể xem thêm <a href="/ao-polo-tron">áo polo trơn</a> (không thuộc cụm R1 blog này).</p>

<h2>Lỗi sourcing thường gặp</h2>
<ul>
<li>Chọn áo theo ảnh đẹp, không thử trên máy thật.</li>
<li>Đổi mã vải giữa hai đợt nhưng giữ cùng file in.</li>
<li>Ôm màu nền đậm/nhiều màu campaign trước khi có đơn.</li>
<li>Bỏ qua size curve — thiếu size bán chạy làm trễ giao.</li>
</ul>
<p>Checklist chọn nguồn tổng: <a href="${R1_SLUGS.article1}">nguồn áo thun trơn cho xưởng in</a>. Danh mục: <a href="${R1_SLUGS.category}">áo thun trơn</a>.</p>

<aside class="blog-cta-block"><p class="blog-cta-block__title">Tìm nguồn áo trơn theo kỹ thuật in-thêu</p><p class="blog-cta-block__body">Cho ATTD biết kỹ thuật chính, màu nền và form — nhận gợi ý dòng áo trơn và báo giá theo tồn kho.</p><a class="blog-cta-block__button" href="${R1_SLUGS.contact}">Yêu cầu báo giá</a><a class="blog-cta-block__secondary" href="${R1_SLUGS.hub}">Xem áo thun trơn sỉ</a></aside>
`.trim();
}
