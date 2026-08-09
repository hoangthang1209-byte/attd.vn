/**
 * R1 Article #2 — Cotton vs CVC vs polyester (DRAFT).
 */

import {
  R1_MEDIA,
  R1_SLUGS,
  r1Figure,
} from "@/features/content/revenue/r1-shared";

export const R1_BLOG_FABRIC = {
  id: "cmqfmcwpf003wk0045sto7jt7",
  title: "Nên chọn cotton, CVC hay polyester khi nhập áo trơn?",
  slug: "ao-thun-cvc-tc-cotton-khac-nhau",
  excerpt:
    "So sánh cotton, CVC và polyester cho người nhập áo trơn: cảm giác mặc, độ bền form, in-thêu, tái đơn và định vị sản phẩm.",
  metaTitle: "Cotton, CVC hay polyester khi nhập áo trơn? | ATTD.vn",
  metaDescription:
    "Hướng dẫn chọn cotton, CVC hoặc polyester khi nhập áo thun trơn cho xưởng in, đại lý và local brand — gắn với in-thêu, tái nhập và định vị, không bịa MOQ/giá.",
  tags: [
    "cotton áo trơn",
    "áo thun CVC",
    "polyester áo thun",
    "chất liệu áo thun trơn",
    "nhập áo trơn",
  ],
  coverUrl: R1_MEDIA.khoOversize.url,
  coverAssetId: R1_MEDIA.khoOversize.id,
  faqJson: [
    {
      question: "Xưởng in nên chọn cotton hay CVC?",
      answer:
        "Cotton thường hợp khi cần cảm giác mềm và hình ảnh “vải tự nhiên”. CVC thường được cân nhắc khi cần cân bằng độ bền form cho đơn lặp. Luôn thử in trên mẫu thật.",
    },
    {
      question: "Polyester có in được không?",
      answer:
        "Tùy kỹ thuật. Polyester thường thân thiện một số quy trình nhiệt/hiệu năng; in lụa hoặc DTF vẫn cần thử bám mực trên đúng dòng vải.",
    },
    {
      question: "TC khác CVC thế nào?",
      answer:
        "TC thường có tỷ lệ polyester cao hơn CVC, thiên bền màu và nhanh khô. CVC nghiêng cotton nhiều hơn. Hỏi rõ tỷ lệ và lấy mẫu thay vì suy diễn từ tên gọi.",
    },
  ],
} as const;

export const R1_FABRIC_INLINE_BLOCK_IDS = {
  stock: "r1-fabric-inline-stock",
  detail: "r1-fabric-inline-detail",
} as const;

export function buildR1FabricHtml(): string {
  const img1 = R1_MEDIA.khoThun;
  const img2 = R1_MEDIA.regularDetail;
  return `
<p>Khi <strong>nhập áo trơn</strong>, chất liệu ảnh hưởng cảm giác mặc, độ bền form sau giặt, khả năng chịu in/thêu và rủi ro tái đơn. Bài viết dành cho xưởng in, đại lý, agency và local brand — chọn giữa <strong>cotton, CVC và polyester</strong> theo brief, không theo tên gọi trên phiếu hàng.</p>
<p>Sau khi chọn hướng chất liệu, bạn có thể đối chiếu <a href="${R1_SLUGS.category}">danh mục áo thun trơn</a> và <a href="${R1_SLUGS.hub}">áo thun trơn sỉ</a>. Báo giá luôn theo tồn kho và số lượng đơn.</p>

<h2>Ba nhóm chất liệu phổ biến</h2>
<table>
<thead>
<tr><th>Nhóm</th><th>Góc người mua</th><th>Thường gặp ở</th></tr>
</thead>
<tbody>
<tr><td>Cotton</td><td>Cảm giác tự nhiên, thấm hút tốt</td><td>Đồng phục, quà tặng, brand cần “feel” cotton</td></tr>
<tr><td>CVC</td><td>Cân bằng form và độ bền vận hành</td><td>Đơn lặp, xưởng in cần ổn định</td></tr>
<tr><td>Polyester / hiệu năng</td><td>Bền màu, nhanh khô, ít nhăn hơn</td><td>Event ngoài trời, thể thao, một số quy trình nhiệt</td></tr>
</tbody>
</table>
<p>TC (polyester cao hơn CVC) thường gần nhóm polyester về hành vi sử dụng. Khi phiếu hàng ghi TC, hỏi rõ tỷ lệ và lấy mẫu.</p>

${r1Figure(img1, "Chọn chất liệu trước khi chốt màu/size số lượng lớn.", {
  blockId: R1_FABRIC_INLINE_BLOCK_IDS.stock,
})}

<h2>Cotton: cảm giác mặc và định vị</h2>
<p>Cotton phù hợp khi khách cuối cần mềm, thoáng và hình ảnh vải tự nhiên. Local brand và quà tặng thường ưu tiên nếu brief yêu cầu.</p>
<p>Kiểm trên mẫu: định lượng có đủ cho kỹ thuật bạn bán; co rút/nhăn sau giặt mẫu; độ đều màu trong cùng lô.</p>
<p>Các dòng như <a href="/san-pham/ao-thun-cotton-100-180gsm">cotton 180gsm</a> và <a href="/san-pham/ao-thun-cotton-100-220gsm">cotton 220gsm</a> giúp so định lượng theo brief — vẫn xác nhận tồn kho trước khi nhập.</p>

${r1Figure(img2, "Quan sát mặt vải và đường may trên mẫu thật.", {
  blockId: R1_FABRIC_INLINE_BLOCK_IDS.detail,
})}

<h2>CVC: cân bằng cho đơn lặp</h2>
<p>CVC (thường cotton chiếm tỷ lệ cao hơn polyester) được nhiều xưởng in và đại lý chọn vì giữ form ổn định hơn cotton thuần ở một số ứng dụng, vẫn gần cảm giác cotton.</p>
<p>Phù hợp khi cần nguồn ổn định cho đơn in lặp, khách chấp nhận “cotton pha” nếu giải thích lợi ích bền form, và muốn giảm rủi ro nhăn/co trong đồng phục.</p>
<p>Tham khảo <a href="/san-pham/ao-thun-cvc-65-35">áo thun CVC 65/35</a> và bài giải thích <a href="/vai-cvc-la-gi">vải CVC là gì</a>.</p>

<h2>Polyester: khi nào hợp lý?</h2>
<p>Polyester không đồng nghĩa “rẻ và kém”. Event ngoài trời, team building hoặc brief cần nhanh khô/bền màu có thể đúng hơn cotton.</p>
<ul>
<li>Một số quy trình chuyển nhiệt/hiệu năng thân thiện polyester.</li>
<li>In lụa và DTF vẫn cần thử độ bám và cảm giác bề mặt.</li>
<li>Thêu trên vải tổng hợp cần kiểm độ dày và lớp ổn định.</li>
</ul>

<h2>Gắn chất liệu với in-thêu, tái đơn và định vị</h2>
<p>Chất liệu chỉ là một biến. Kết hợp với kỹ thuật trang trí qua bài <a href="${R1_SLUGS.article3}">áo trơn cho in lụa, DTF và thêu</a>. Kết hợp với form qua bài <a href="${R1_SLUGS.article4}">regular hay oversize</a>. Nếu cần checklist chọn nguồn tổng, xem <a href="${R1_SLUGS.article1}">nguồn áo thun trơn cho xưởng in</a>.</p>
<p>Tái đơn: giữ cùng mã sản phẩm và ghi nhận cảm giác khách cuối sau giặt/in. Đổi chất liệu giữa hai đợt nên coi như dự án mẫu mới.</p>

<h2>Checklist trước khi nhập lớn</h2>
<ol>
<li>Viết rõ khách cuối và kỹ thuật chính.</li>
<li>Chọn tối đa 2 chất liệu để lấy mẫu.</li>
<li>Giặt mẫu và thử in/thêu.</li>
<li>Đối chiếu form regular/oversize.</li>
<li>Gửi nhu cầu qua <a href="${R1_SLUGS.contact}">trang liên hệ</a> với mã sản phẩm quan tâm.</li>
</ol>
<p>ATTD không đưa MOQ hay bảng giá cố định trong bài này. Điều kiện thương mại phụ thuộc sản phẩm, màu/size và tồn kho lúc báo giá.</p>

<aside class="blog-cta-block"><p class="blog-cta-block__title">Nhận tư vấn chất liệu áo trơn</p><p class="blog-cta-block__body">Cho ATTD biết mục đích in-thêu và nhóm khách — nhận gợi ý cotton/CVC/polyester kèm báo giá theo tồn kho.</p><a class="blog-cta-block__button" href="${R1_SLUGS.contact}">Nhận tư vấn nguồn hàng</a><a class="blog-cta-block__secondary" href="${R1_SLUGS.category}">Xem danh mục áo thun trơn</a></aside>
`.trim();
}
