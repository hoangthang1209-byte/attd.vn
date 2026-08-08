/**
 * Revenue Mode R1 — Blog 1 draft (educational).
 * Intent: cách chọn nguồn áo thun trơn cho xưởng in.
 * No fabricated MOQ / price / lead time / capacity.
 */

export const R1_BLOG_XUONG_IN = {
  id: "cmqe1hepx0000jv04uzj80tci",
  previousSlug: "nguon-hang-ao-thun-tron-huong-dan-b2b-cho-dai-ly-va-doanh-nghiep",
  title: "Cách chọn nguồn áo thun trơn cho xưởng in",
  slug: "cach-chon-nguon-ao-thun-tron-cho-xuong-in",
  excerpt:
    "Checklist thực tế giúp xưởng in chọn nguồn áo thun trơn: form, chất liệu, màu/size, tương thích in-thêu, tồn kho và rủi ro tái nhập.",
  metaTitle: "Cách chọn nguồn áo thun trơn cho xưởng in | ATTD.vn",
  metaDescription:
    "Hướng dẫn xưởng in chọn nguồn áo thun trơn: form, chất liệu, màu/size, tương thích in lụa/DTF/thêu, mẫu thử và tiêu chí đánh giá nhà cung cấp B2B.",
  tags: [
    "nguồn áo thun trơn",
    "áo thun trơn xưởng in",
    "hàng trơn sẵn kho",
    "áo trơn để in",
    "nguồn hàng B2B",
  ],
  coverUrl:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-thun-hqz725e7qNJhSUHr3Zi3OO23VEHMmN.jpg",
  coverAssetId: "cmqfkgz0p000ajq04d4ncp46i",
  inlineImages: [
    {
      assetId: "cmqfkgww30009jq045rsg738o",
      url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-thun-oversize-9TqarU0glcvdA8EDNDBWMptmihAw0p.jpg",
      alt: "Áo thun oversize trơn xếp trong kho sỉ ATTD",
      caption: "Form oversize trơn — thường dùng cho local brand và campaign.",
    },
    {
      assetId: "cmrutsrbf0001ie04kbhbwlcb",
      url: "https://res.cloudinary.com/dcgi9n5rw/image/upload/v1784648768/attd/products/chowlekh9ohczeneja44.jpg",
      alt: "Áo thun regular cao cấp — mặt sau sản phẩm ATTD",
      caption: "Form regular — nền tảng phổ biến cho đơn in đồng phục và merchandise.",
    },
    {
      assetId: "cmqfkgv040008jq04y8jas69t",
      url: "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/kho-si-ao-polo-OuRMUyunFjP6MeQkJWCWfBMDCvqpse.jpg",
      alt: "Áo polo trơn xếp trong kho sỉ",
      caption: "Khi brief cần chỉnh chu hơn áo thun, xem thêm nguồn áo polo trơn.",
    },
  ],
  faqJson: [
    {
      question: "Xưởng in nên ưu tiên hàng sẵn kho hay đặt sản xuất?",
      answer:
        "Đơn cần giao nhanh và màu/size phổ biến thường phù hợp hàng sẵn kho. Đặt sản xuất hợp lý khi cần màu Pantone, tem riêng hoặc số lượng lớn theo lịch cố định.",
    },
    {
      question: "Có cần lấy mẫu trước khi nhập áo trơn số lượng lớn?",
      answer:
        "Nên lấy mẫu để kiểm form, cổ áo, độ dày vải và thử kỹ thuật in/thêu thực tế trước khi chốt màu chủ lực.",
    },
    {
      question: "Làm sao để nhận báo giá nguồn áo thun trơn?",
      answer:
        "Gửi nhu cầu qua form liên hệ với form áo, chất liệu quan tâm, màu/size dự kiến và kỹ thuật in. ATTD phản hồi báo giá theo điều kiện thực tế của đơn.",
    },
  ],
} as const;

function figure(url: string, alt: string, caption: string): string {
  return `<figure><img src="${url}" alt="${alt}" loading="lazy" /><figcaption>${caption}</figcaption></figure>`;
}

export function buildR1XuongInHtml(): string {
  const [img1, img2, img3] = R1_BLOG_XUONG_IN.inlineImages;
  return `
<p>Xưởng in không thiếu đơn — thường thiếu <strong>nguồn áo thun trơn</strong> đủ ổn định để nhận đơn gấp, giữ chất lượng giữa các lô và tái nhập đúng màu/size. Bài viết này là checklist chọn nguồn hàng cho xưởng in, shop in áo và đơn vị gia công: tập trung form, vải, màu, size, tương thích kỹ thuật in-thêu và rủi ro vận hành.</p>
<p>Nếu bạn đang ở giai đoạn mua sỉ thương mại, xem thêm hub <a href="/ao-thun-tron-si">áo thun trơn sỉ</a> và danh mục <a href="/ao-thun-tron">áo thun trơn</a>. Bài này giữ intent giáo dục — không thay trang báo giá.</p>

<h2>Xưởng in cần gì ở nguồn áo trơn?</h2>
<p>Khác với mua lẻ, xưởng in mua áo trơn như một nguyên liệu đầu vào. Tiêu chí quyết định thường là:</p>
<ul>
<li><strong>Ổn định form và cổ áo</strong> giữa các lần nhập — giảm lỗi in lệch hoặc cổ chảy sau giặt mẫu.</li>
<li><strong>Tái nhập màu/size core</strong> (trắng, đen, xám, navy…) để nhận đơn nhanh.</li>
<li><strong>Mặt vải phù hợp kỹ thuật</strong>: in lụa, DTF, chuyển nhiệt hoặc thêu.</li>
<li><strong>Minh bạch tồn kho và mẫu thử</strong> trước khi đổ vốn vào một màu chủ lực.</li>
</ul>
<p>Đừng chỉ so đơn giá. Chi phí ẩn đến từ hàng lệch form, thiếu size, màu không đều giữa hai lô, hoặc vải không chịu được kỹ thuật in bạn đang bán.</p>

${figure(img1.url, img1.alt, img1.caption)}

<h2>Form: regular hay oversize?</h2>
<p><strong>Regular</strong> phù hợp đồng phục, event tiêu chuẩn và phần lớn đơn in logo doanh nghiệp. Dễ chia size, dễ giải thích cho khách cuối.</p>
<p><strong>Oversize</strong> hợp local brand, streetwear, campaign giới trẻ. Cần bảng size riêng và mẫu thử — vì cảm giác mặc và vị trí in khác regular.</p>
<p>Quy tắc thực tế: chọn form theo khách cuối và kỹ thuật trang trí, không chọn theo ảnh trend. Xem thêm các dòng <a href="/ao-thun-regular">áo thun regular</a> và <a href="/ao-thun-oversized">áo thun oversized</a> trong catalogue.</p>

${figure(img2.url, img2.alt, img2.caption)}

<h2>Chất liệu: cotton, CVC hay polyester?</h2>
<p>Ba nhóm phổ biến khi nhập áo trơn:</p>
<ul>
<li><strong>Cotton</strong> — cảm giác tự nhiên, hợp nhiều đơn đồng phục/quà tặng; cần lưu ý co rút và nhăn tùy định lượng.</li>
<li><strong>CVC</strong> — cân bằng độ bền form và giá thành; thường gặp ở đơn số lượng lớn cần ổn định.</li>
<li><strong>Polyester / vải hiệu năng</strong> — bền màu, nhanh khô; phù hợp event ngoài trời hoặc một số kỹ thuật in chuyển nhiệt.</li>
</ul>
<p>Chi tiết so sánh xem bài <a href="/blog/ao-thun-cvc-tc-cotton-khac-nhau">cotton, CVC và polyester khi nhập áo trơn</a>. Chốt chất liệu sau khi thử in trên mẫu thật của đúng dòng bạn sẽ nhập.</p>

<h2>Màu và size: chia thế nào cho đơn lớn?</h2>
<p>Xưởng in nên tách <strong>màu core</strong> (luôn cần sẵn) và <strong>màu campaign</strong> (theo brief). Với size, lập size curve theo loại khách: đồng phục doanh nghiệp khác streetwear.</p>
<ul>
<li>Giữ tỷ lệ size dựa trên lịch sử đơn tương tự, không chia đều máy móc.</li>
<li>Ghi nhận size thiếu thường xuyên để ưu tiên tái nhập.</li>
<li>Tránh ôm quá nhiều màu trend nếu chưa có đơn — dễ ứ vốn.</li>
</ul>

<h2>Tương thích in lụa, DTF và thêu</h2>
<p>Trước khi chốt nguồn, làm mẫu với đúng máy và mực/chỉ bạn đang dùng:</p>
<ul>
<li><strong>In lụa</strong> — cần mặt vải ổn định, màu nền không “ăn” bản in.</li>
<li><strong>DTF</strong> — kiểm tra độ bám và cảm giác film trên đúng gsm.</li>
<li><strong>Thêu</strong> — kiểm cổ áo, độ dày và vị trí thêu để tránh nhăn hoặc thủng.</li>
</ul>
<p>Nếu brief nghiêng về polo đồng phục, tham khảo thêm <a href="/ao-polo-tron">áo polo trơn</a>.</p>

${figure(img3.url, img3.alt, img3.caption)}

<h2>Kho, tái nhập và rủi ro cần hỏi nhà cung cấp</h2>
<p>Checklist câu hỏi ngắn trước khi gắn bó dài hạn:</p>
<ul>
<li>Màu/size nào đang có trong kho — và ảnh/catalogue có khớp hàng thật?</li>
<li>Có hỗ trợ mẫu trước khi nhập số lượng lớn?</li>
<li>Khi thiếu size, xử lý bù hàng như thế nào?</li>
<li>Có thể mở rộng sang OEM/tem riêng khi local brand của bạn lớn dần không?</li>
</ul>
<p>ATTD định vị là nguồn hàng áo trơn B2B với catalogue sản phẩm thực. Điều kiện MOQ, giá và lịch giao được trao đổi theo từng đơn qua báo giá — không niêm yết số liệu cố định trên bài viết giáo dục.</p>

<h2>Lộ trình chọn nguồn cho xưởng in</h2>
<ol>
<li>Xác định khách cuối và kỹ thuật in/thêu chính.</li>
<li>Chọn 1–2 form + 1–2 chất liệu để lấy mẫu.</li>
<li>Thử in/thêu trên mẫu thật, ghi nhận lỗi.</li>
<li>Chốt màu core + size curve cho đợt nhập đầu.</li>
<li>Đặt hàng qua <a href="/ao-thun-tron-si">áo thun trơn sỉ</a> / <a href="/lien-he">yêu cầu báo giá</a>, rồi theo dõi tái nhập.</li>
</ol>

<aside class="blog-cta-block"><p class="blog-cta-block__title">Tìm nguồn áo thun trơn cho xưởng in</p><p class="blog-cta-block__body">Gửi form áo, chất liệu, màu/size và kỹ thuật in — ATTD tư vấn nguồn hàng sẵn kho và báo giá theo nhu cầu.</p><a class="blog-cta-block__button" href="/lien-he">Yêu cầu báo giá</a><a class="blog-cta-block__secondary" href="/ao-thun-tron-si">Xem áo thun trơn sỉ</a></aside>
`.trim();
}
