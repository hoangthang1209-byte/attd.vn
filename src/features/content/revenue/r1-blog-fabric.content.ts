/**
 * Revenue Mode R1 — Blog 2 draft (educational).
 * Intent: cotton vs CVC vs polyester khi nhập áo trơn.
 * Reuses slug ao-thun-cvc-tc-cotton-khac-nhau.
 * No fabricated MOQ / price / lead time / capacity.
 */

export const R1_BLOG_FABRIC = {
  id: "cmqfmcwpf003wk0045sto7jt7",
  title: "Nên chọn cotton, CVC hay polyester khi nhập áo trơn?",
  slug: "ao-thun-cvc-tc-cotton-khac-nhau",
  excerpt:
    "So sánh cotton, CVC và polyester cho người nhập áo trơn B2B: cảm giác mặc, độ bền form, tương thích in-thêu và khi nào nên lấy mẫu.",
  metaTitle: "Cotton, CVC hay polyester khi nhập áo trơn? | ATTD.vn",
  metaDescription:
    "Hướng dẫn chọn cotton, CVC hoặc polyester khi nhập áo thun trơn cho xưởng in, đại lý và local brand. Tập trung form, in-thêu và rủi ro tái nhập — không bịa MOQ/giá.",
  tags: [
    "cotton áo trơn",
    "áo thun CVC",
    "polyester áo thun",
    "chất liệu áo thun trơn",
    "nhập áo trơn",
  ],
  coverUrl:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-thun-oversize-9TqarU0glcvdA8EDNDBWMptmihAw0p.jpg",
  coverAssetId: "cmqfkgww30009jq045rsg738o",
  inlineImages: [
    {
      assetId: "cmqfkgz0p000ajq04d4ncp46i",
      url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-thun-hqz725e7qNJhSUHr3Zi3OO23VEHMmN.jpg",
      alt: "Áo thun trơn xếp trong kho sỉ ATTD",
      caption: "Hàng áo trơn sẵn kho — chọn chất liệu trước khi chốt màu/size số lượng lớn.",
    },
    {
      assetId: "cmrutsrbf0001ie04kbhbwlcb",
      url: "https://res.cloudinary.com/dcgi9n5rw/image/upload/v1784648768/attd/products/chowlekh9ohczeneja44.jpg",
      alt: "Chi tiết áo thun regular cao cấp ATTD",
      caption: "Quan sát mặt vải và đường may trên mẫu thật trước khi nhập.",
    },
    {
      assetId: "cmqfkgskc0007jq04kadfsmne",
      url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-polo-the-thao-qI5Ui98kIJ9irMzOtidb2fgQV3E4X1.jpg",
      alt: "Áo polo thể thao trơn trong kho sỉ",
      caption: "Polyester hoặc vải hiệu năng thường gặp ở polo/áo thể thao đồng phục.",
    },
  ],
  faqJson: [
    {
      question: "Xưởng in nên chọn cotton hay CVC?",
      answer:
        "Nếu ưu tiên cảm giác mềm và đơn đồng phục/quà tặng, cotton thường phù hợp. Nếu cần cân bằng độ bền form và đơn số lượng lớn, CVC thường được cân nhắc. Luôn thử in trên mẫu thật.",
    },
    {
      question: "Polyester có in được không?",
      answer:
        "Có, tùy kỹ thuật. Polyester thường thân thiện với một số quy trình chuyển nhiệt/hiệu năng; với in lụa hoặc DTF vẫn cần thử bám mực và cảm giác bề mặt trên đúng dòng vải.",
    },
    {
      question: "TC khác CVC như thế nào?",
      answer:
        "TC thường có tỷ lệ polyester cao hơn CVC, thiên về bền màu/nhanh khô và ngân sách phổ thông. CVC nghiêng cotton nhiều hơn, cảm giác gần cotton hơn trong nhiều trường hợp.",
    },
  ],
} as const;

function figure(url: string, alt: string, caption: string): string {
  return `<figure><img src="${url}" alt="${alt}" loading="lazy" /><figcaption>${caption}</figcaption></figure>`;
}

export function buildR1FabricHtml(): string {
  const [img1, img2, img3] = R1_BLOG_FABRIC.inlineImages;
  return `
<p>Khi <strong>nhập áo trơn</strong>, chất liệu quyết định cảm giác mặc, độ bền form sau giặt, và khả năng chịu in lụa, DTF hay thêu. Bài viết dành cho xưởng in, đại lý, agency và local brand — giúp chọn giữa <strong>cotton, CVC và polyester</strong> theo mục đích thực tế, không theo jargon catalogue.</p>
<p>Sau khi chốt hướng chất liệu, đối chiếu sản phẩm trong <a href="/ao-thun-tron">danh mục áo thun trơn</a> và hub thương mại <a href="/ao-thun-tron-si">áo thun trơn sỉ</a>. Báo giá cụ thể luôn theo tồn kho và số lượng đơn.</p>

<h2>Ba nhóm chất liệu phổ biến khi nhập áo trơn</h2>
<table>
<thead>
<tr><th>Nhóm</th><th>Đặc điểm chính</th><th>Thường phù hợp</th></tr>
</thead>
<tbody>
<tr><td>Cotton</td><td>Cảm giác tự nhiên, thấm hút tốt</td><td>Đồng phục, quà tặng, local brand cần “feel” cotton</td></tr>
<tr><td>CVC</td><td>Pha cotton/polyester, cân bằng form và độ bền</td><td>Đơn số lượng lớn, xưởng in cần ổn định</td></tr>
<tr><td>Polyester / hiệu năng</td><td>Bền màu, nhanh khô, ít nhăn hơn</td><td>Event ngoài trời, thể thao, một số kỹ thuật nhiệt</td></tr>
</tbody>
</table>
<p>TC (tỷ lệ polyester cao hơn CVC) thường nằm gần nhóm polyester về hành vi sử dụng: bền, nhanh khô, ngân sách phổ thông. Khi catalogue ghi TC, hãy hỏi rõ tỷ lệ và lấy mẫu thay vì suy diễn từ tên gọi.</p>

${figure(img1.url, img1.alt, img1.caption)}

<h2>Cotton: khi nào nên chọn?</h2>
<p>Cotton phù hợp khi khách cuối cần cảm giác mềm, thoáng và hình ảnh “vải tự nhiên”. Local brand và quà tặng doanh nghiệp thường ưu tiên cotton nếu ngân sách cho phép.</p>
<p>Điểm cần kiểm trên mẫu:</p>
<ul>
<li>Định lượng (gsm) có đủ cho kỹ thuật in/thêu bạn bán?</li>
<li>Co rút và nhăn sau giặt mẫu có chấp nhận được không?</li>
<li>Màu nhuộm có đều giữa các chiếc trong cùng lô không?</li>
</ul>
<p>Trong catalogue ATTD, các dòng như <a href="/san-pham/ao-thun-cotton-100-180gsm">áo thun cotton 180gsm</a> và <a href="/san-pham/ao-thun-cotton-100-220gsm">220gsm</a> giúp bạn so định lượng theo brief — vẫn nên xác nhận tồn kho trước khi nhập.</p>

${figure(img2.url, img2.alt, img2.caption)}

<h2>CVC: lựa chọn cân bằng cho đơn lớn</h2>
<p>CVC (thường cotton chiếm tỷ lệ cao hơn polyester) được nhiều xưởng in và đại lý chọn vì giữ form ổn định hơn cotton thuần ở một số ứng dụng, đồng thời vẫn gần cảm giác cotton.</p>
<p>Phù hợp khi:</p>
<ul>
<li>Bạn cần nguồn ổn định cho đơn in lặp lại.</li>
<li>Khách chấp nhận “cotton pha” nếu giải thích rõ lợi ích bền form.</li>
<li>Bạn muốn giảm rủi ro nhăn/co trong vận hành đồng phục.</li>
</ul>
<p>Tham khảo dòng <a href="/san-pham/ao-thun-cvc-65-35">áo thun CVC 65/35</a> và bài liên quan về <a href="/vai-cvc-la-gi">vải CVC là gì</a> để thống nhất ngôn ngữ với khách.</p>

<h2>Polyester: khi nào hợp lý?</h2>
<p>Polyester hoặc vải hiệu năng không phải lúc nào cũng “rẻ hơn và kém hơn”. Với event ngoài trời, team building, hoặc đồng phục cần nhanh khô/bền màu, polyester có thể đúng brief hơn cotton.</p>
<p>Lưu ý kỹ thuật:</p>
<ul>
<li>Một số quy trình chuyển nhiệt/hiệu năng thân thiện với polyester.</li>
<li>In lụa và DTF vẫn cần thử độ bám và cảm giác bề mặt.</li>
<li>Thêu trên vải tổng hợp cần kiểm độ dày và lớp ổn định phía sau.</li>
</ul>

${figure(img3.url, img3.alt, img3.caption)}

<h2>Chọn theo kỹ thuật trang trí</h2>
<table>
<thead>
<tr><th>Kỹ thuật</th><th>Gợi ý hướng chất liệu</th><th>Việc cần làm trước khi nhập</th></tr>
</thead>
<tbody>
<tr><td>In lụa</td><td>Cotton hoặc CVC phổ biến</td><td>In mẫu trên đúng màu nền sẽ bán</td></tr>
<tr><td>DTF</td><td>Cotton/CVC tùy gsm</td><td>Kiểm bám film và cảm giác sau giặt mẫu</td></tr>
<tr><td>Thêu</td><td>Cotton/CVC đủ dày cổ và thân</td><td>Thêu mẫu vị trí ngực/tay, xem nhăn</td></tr>
<tr><td>Chuyển nhiệt / hiệu năng</td><td>Polyester hoặc blend phù hợp</td><td>Thử đúng máy và nhiệt độ bạn dùng</td></tr>
</tbody>
</table>

<h2>Checklist trước khi nhập số lượng lớn</h2>
<ol>
<li>Viết rõ khách cuối + kỹ thuật in/thêu chính.</li>
<li>Chọn tối đa 2 chất liệu để lấy mẫu — tránh test quá rộng.</li>
<li>Giặt mẫu và thử in/thêu trước khi chốt màu core.</li>
<li>Đối chiếu form regular/oversize — xem thêm hướng dẫn <a href="/blog/cach-chon-nguon-ao-thun-tron-cho-xuong-in">chọn nguồn áo thun trơn cho xưởng in</a>.</li>
<li>Gửi nhu cầu báo giá qua <a href="/lien-he">form liên hệ</a> với mã sản phẩm quan tâm.</li>
</ol>
<p>ATTD không đưa MOQ hay bảng giá cố định trong bài viết này. Điều kiện thương mại phụ thuộc sản phẩm, màu/size và tồn kho tại thời điểm báo giá.</p>

<aside class="blog-cta-block"><p class="blog-cta-block__title">Nhận tư vấn chất liệu áo trơn</p><p class="blog-cta-block__body">Cho ATTD biết mục đích in-thêu và nhóm khách — nhận gợi ý cotton/CVC/polyester kèm báo giá theo tồn kho.</p><a class="blog-cta-block__button" href="/lien-he">Nhận tư vấn</a><a class="blog-cta-block__secondary" href="/ao-thun-tron">Xem danh mục áo thun trơn</a></aside>
`.trim();
}
