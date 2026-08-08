/**
 * Sprint 13.5 — first production article body (manual editorial draft).
 * No fabricated MOQ / lead time / factory ownership / certifications.
 */

export const FIRST_ARTICLE_META = {
  title: "Hướng dẫn chọn áo polo đồng phục công ty",
  seoTitle: "Hướng dẫn chọn áo polo đồng phục công ty phù hợp",
  metaDescription:
    "Hướng dẫn chọn chất liệu, form dáng, màu sắc và kỹ thuật in thêu logo cho áo polo đồng phục công ty. Xem quy trình đặt hàng và nhận tư vấn.",
  slug: "huong-dan-chon-ao-polo-dong-phuc-cong-ty",
  primaryKeyword: "áo polo đồng phục công ty",
} as const;

export const FIRST_ARTICLE_INTERNAL_LINKS = [
  {
    href: "/ao-polo-tron",
    anchor: "áo polo trơn",
    reason: "Category/product entry for áo polo trơn",
  },
  {
    href: "/ao-thun-tron-si",
    anchor: "áo thun trơn sỉ",
    reason: "Commercial hub for nguồn hàng áo trơn cluster",
  },
  {
    href: "/blog/ao-thun-cvc-tc-cotton-khac-nhau",
    anchor: "cotton, CVC và polyester khi nhập áo trơn",
    reason: "R1 supporting educational article on fabrics",
  },
  {
    href: "/vai-cotton-2-chieu",
    anchor: "vải cotton 2 chiều",
    reason: "Material education page",
  },
  {
    href: "/vai-cvc-la-gi",
    anchor: "vải CVC là gì",
    reason: "Material education page",
  },
  {
    href: "/lien-he",
    anchor: "liên hệ tư vấn báo giá",
    reason: "Primary conversion route",
  },
] as const;

/** Heading → HTML body. Matched loosely against Writing Plan section headings. */
export const FIRST_ARTICLE_SECTION_HTML: Record<string, string> = {
  intro: `
<p>Chọn <strong>áo polo đồng phục công ty</strong> không chỉ là chọn một kiểu áo đẹp. Với doanh nghiệp, đây là quyết định mua hàng B2B: cần cân bằng hình ảnh thương hiệu, độ bền khi giặt nhiều lần, trải nghiệm mặc của nhân viên và khả năng kiểm soát ngân sách theo số lượng.</p>
<p>Bài viết này dành cho người phụ trách mua hàng, HR/Admin, agency và đại lý đồng phục. Bạn sẽ có checklist tiêu chí chọn áo polo, cách cân nhắc chất liệu và kỹ thuật logo, quy trình đặt hàng thực tế, cùng các lỗi thường gặp khi chỉ so sánh giá báo thấp nhất.</p>
<p>Nếu bạn đang so sánh phôi trơn, có thể xem thêm danh mục <a href="/ao-polo-tron">áo polo trơn</a> để phân biệt góc nhìn áo trơn và bộ đồng phục hoàn thiện.</p>
`.trim(),

  why_polo: `
<p>Áo polo thường phù hợp đồng phục công ty vì giữ vẻ chỉnh chu hơn áo thun cổ tròn, nhưng vẫn dễ mặc hơn sơ mi trong nhiều môi trường làm việc. Form có cổ và khuy giúp đội ngũ bán hàng, dịch vụ, sự kiện hoặc văn phòng mang tính nhận diện rõ mà không cứng nhắc.</p>
<p>Với doanh nghiệp, polo cũng thuận tiện khi cần in hoặc thêu logo, phối màu thương hiệu và phân size cho nhóm nhân sự lớn. Điểm quan trọng là chọn đúng chất liệu và form theo môi trường sử dụng, không chọn theo cảm tính mẫu ảnh.</p>
`.trim(),

  criteria: `
<p>Khi chọn áo polo đồng phục, hãy xem xét 7 tiêu chí dưới đây như một checklist mua hàng.</p>
`.trim(),

  criteria_environment: `
<p><strong>Môi trường và mục đích sử dụng</strong> quyết định phần lớn chất liệu và định lượng. Nhân viên văn phòng, đội sales đi gặp khách, nhân sự kho/vận hành ngoài trời, hoặc đội sự kiện ngắn ngày sẽ có nhu cầu thoát ẩm, độ bền màu và cảm giác mặc khác nhau.</p>
<p>Ghi rõ: mặc trong nhà điều hòa hay ngoài trời, tần suất giặt, có cần nhìn chỉnh chu trước khách hàng hay ưu tiên vận động.</p>
`.trim(),

  criteria_audience: `
<p><strong>Đối tượng mặc và form dáng</strong> ảnh hưởng trực tiếp tỷ lệ size và tỷ lệ đổi/điều chỉnh sau sản xuất. Cần xác định tỷ lệ nam/nữ, khoảng tuổi, và preference form regular, slim hay rộng hơn để thoải mái vận động.</p>
<p>Với nhóm nhân sự đa dạng, ưu tiên form dễ mặc cho đa số, rồi mới tinh chỉnh theo phòng ban đặc thù nếu cần.</p>
`.trim(),

  criteria_material: `
<p><strong>Chất liệu vải</strong> là yếu tố then chốt với đồng phục giặt thường xuyên. Cotton mang cảm giác tự nhiên; cotton pha (như CVC) thường cân bằng độ bền và giá thành; polyester hoặc vải hiệu năng hỗ trợ thoát ẩm tốt hơn ở môi trường năng động.</p>
<p>Bạn có thể tham khảo thêm kiến thức nền về <a href="/vai-cotton-2-chieu">vải cotton 2 chiều</a> và <a href="/vai-cvc-la-gi">vải CVC là gì</a> trước khi chốt mẫu.</p>
`.trim(),

  criteria_gsm: `
<p><strong>Định lượng và độ dày</strong> nên chọn theo khí hậu và mục đích, không chọn “dày là đẹp”. Vải quá mỏng dễ lộ và nhanh xộc xệch; quá dày có thể nóng và tăng chi phí không cần thiết.</p>
<p>Khi chưa có số liệu kỹ thuật chốt từ mẫu duyệt, hãy yêu cầu đối tác tư vấn khoảng định lượng phù hợp theo môi trường sử dụng thay vì ép một con số cố định từ catalog chung.</p>
`.trim(),

  criteria_color: `
<p><strong>Màu sắc thương hiệu</strong> cần kiểm tra trên mẫu thật dưới ánh sáng thực tế. Màu trên màn hình và màu vải thành phẩm thường lệch nhẹ. Với đơn hàng nhiều đợt, nên lưu công thức màu/mã màu và quy trình đối màu để giảm lệch lô.</p>
`.trim(),

  criteria_logo: `
<p><strong>Logo và kỹ thuật trang trí</strong> (in hoặc thêu) ảnh hưởng thẩm mỹ, độ bền và chi phí. Logo nhiều màu, chi tiết nhỏ, hoặc cần cảm giác cao cấp sẽ dẫn tới lựa chọn kỹ thuật khác nhau. Chuẩn bị file vector rõ nét trước khi báo giá kỹ thuật.</p>
`.trim(),

  criteria_budget: `
<p><strong>Ngân sách và số lượng đặt hàng</strong> nên được nhìn theo tổng chi phí sử dụng: giá/áo, chi phí logo, tỷ lệ size dư, rủi ro phải làm lại vì mẫu chưa duyệt. Số lượng và yêu cầu kỹ thuật thường ảnh hưởng cơ cấu giá; không nên chỉ lấy báo giá thấp nhất khi chưa rõ chất liệu và tiêu chuẩn QC.</p>
`.trim(),

  materials: `
<p>Không có một chất liệu “tốt nhất” cho mọi công ty. Hãy chọn theo môi trường, ngân sách và tiêu chí bảo quản.</p>
`.trim(),

  materials_cotton: `
<p><strong>Cotton</strong> thường cho cảm giác mềm, thấm hút tốt, phù hợp môi trường văn phòng hoặc ưu tiên cảm giác tự nhiên. Lưu ý: cotton có thể nhăn và co rút tùy quy trình hoàn tất; cần duyệt mẫu giặt trước khi sản xuất số lượng lớn.</p>
`.trim(),

  materials_blend: `
<p><strong>Cotton pha</strong> (ví dụ CVC) thường được chọn khi cần cân bằng độ bền, ổn định form và chi phí theo số lượng. Đây là hướng phổ biến cho đồng phục doanh nghiệp nếu muốn giảm nhược điểm của cotton thuần mà vẫn giữ cảm giác dễ chịu.</p>
`.trim(),

  materials_poly: `
<p><strong>Polyester hoặc vải hiệu năng</strong> phù hợp đội ngũ vận động nhiều, ngoài trời, hoặc cần khô nhanh và bền màu. Cảm giác mặc khác cotton; nên cho người dùng thử mẫu trước khi chốt toàn công ty.</p>
`.trim(),

  materials_by_env: `
<p><strong>Cách chọn theo môi trường</strong>: văn phòng điều hòa có thể ưu tiên cảm giác cotton/cotton pha; sales/dịch vụ cần cân bằng chỉnh chu và thoải mái di chuyển; kho/outdoor ưu tiên thoát ẩm và bền màu. Luôn khóa quyết định sau khi duyệt mẫu thật, không chỉ dựa ảnh catalog.</p>
`.trim(),

  logo_methods: `
<p>In và thêu đều dùng được trên áo polo đồng phục. Lựa chọn phụ thuộc file logo, vị trí đặt, ngân sách và kỳ vọng độ bền sau nhiều lần giặt.</p>
`.trim(),

  logo_embroidery: `
<p><strong>Khi nào nên thêu</strong>: logo cần cảm giác nổi, bền, ít màu hoặc mang tính formal. Thêu thường phù hợp ngực trái, túi áo, hoặc dấu hiệu nhận diện dài hạn. Hạn chế thêu chi tiết quá nhỏ dễ bị “vỡ” nét.</p>
`.trim(),

  logo_print: `
<p><strong>Khi nào nên in</strong>: logo nhiều màu, gradient, hoặc cần tái hiện chi tiết phức tạp. Kỹ thuật in cụ thể phụ thuộc nền vải và yêu cầu độ bền; hãy yêu cầu mẫu in trên đúng chất liệu đã chọn.</p>
`.trim(),

  logo_placement: `
<p><strong>Vị trí và kích thước logo</strong> nên thống nhất theo guideline thương hiệu. Ngực trái là vị trí phổ biến; lưng hoặc tay áo dùng khi cần nhận diện mạnh hơn. Tránh logo quá lớn làm mất cân đối form polo.</p>
`.trim(),

  fit_sizing: `
<p>Chọn form và size cho doanh nghiệp là bước giảm rủi ro đổi trả và lệch đồng phục. Nên lấy size chart theo mẫu đã duyệt, đo thử với một nhóm đại diện (nam/nữ, nhiều body type), rồi mới chốt tỷ lệ size cho cả công ty.</p>
<p>Tránh đặt “cùng một size trung bình” cho tất cả. Ghi nhận số lượng theo size rõ ràng trước sản xuất và giữ biên dự phòng hợp lý cho nhân sự mới nếu chính sách nội bộ cho phép.</p>
`.trim(),

  process: `
<p>Quy trình đặt áo polo đồng phục thường đi theo các bước:</p>
<ol>
<li>Thu thập brief: số lượng, đối tượng, môi trường mặc, màu, logo, thời điểm cần nhận.</li>
<li>Tư vấn chất liệu/form và nhận báo giá theo yêu cầu kỹ thuật.</li>
<li>Duyệt mẫu áo và mẫu logo trên đúng chất liệu.</li>
<li>Chốt size breakdown và xác nhận sản xuất.</li>
<li>QC, đóng gói theo yêu cầu, giao hàng và đối chiếu số lượng.</li>
</ol>
<p>ATTD hỗ trợ doanh nghiệp theo hướng tư vấn sản phẩm, điều phối sản xuất với đối tác gia công và kiểm soát chất lượng đơn hàng — thay vì mặc định tự nhận là chủ toàn bộ dây chuyền may nếu chưa có bằng chứng công khai tương ứng.</p>
<p>Đại lý hoặc team mua sỉ có thể tham khảo thêm góc nhìn <a href="/blog/nguon-hang-ao-thun-polo-huong-dan-b2b-cho-dai-ly-va-doanh-nghiep">nguồn hàng áo thun polo B2B</a>.</p>
`.trim(),

  mistakes: `
<p>Các lỗi doanh nghiệp thường gặp:</p>
<ul>
<li>Chỉ chọn báo giá thấp nhất khi chưa rõ chất liệu, định lượng và tiêu chuẩn logo.</li>
<li>Bỏ qua bước duyệt mẫu áo/mẫu in-thêu trên đúng vải.</li>
<li>File logo thiếu nét, sai tỷ lệ hoặc không đúng màu brand.</li>
<li>Không đo size thực tế với nhóm đại diện trước khi chốt số lượng theo size.</li>
<li>Đặt deadline giao hàng trước khi chốt mẫu kỹ thuật.</li>
</ul>
`.trim(),

  faq: `
<p><strong>Nên chọn chất liệu nào cho áo polo đồng phục?</strong><br/>Phụ thuộc môi trường mặc và ưu tiên cảm giác. Cotton/cotton pha phổ biến cho văn phòng; polyester/hiệu năng phù hợp vận động nhiều. Hãy duyệt mẫu trước khi chốt.</p>
<p><strong>Nên in hay thêu logo?</strong><br/>Thêu phù hợp logo ít màu, cần độ bền và cảm giác nổi. In phù hợp logo nhiều màu hoặc chi tiết phức tạp.</p>
<p><strong>Làm thế nào để chọn size cho nhiều nhân viên?</strong><br/>Dùng size chart của mẫu đã duyệt, đo thử nhóm đại diện, rồi tổng hợp tỷ lệ size theo phòng ban.</p>
<p><strong>Giá áo polo đồng phục phụ thuộc vào yếu tố nào?</strong><br/>Chất liệu, định lượng, màu đặc biệt, kỹ thuật logo, số lượng và yêu cầu đóng gói/giao hàng. Giá cụ thể cần báo theo brief.</p>
<p><strong>Thời gian sản xuất được xác định như thế nào?</strong><br/>Thời gian sản xuất được xác nhận sau khi duyệt mẫu và chốt yêu cầu kỹ thuật — không nên lấy mốc chung khi brief còn thay đổi.</p>
`.trim(),

  cta: `
<p>Để nhận tư vấn phù hợp cho áo polo đồng phục công ty, doanh nghiệp nên chuẩn bị:</p>
<ul>
<li>Số lượng dự kiến</li>
<li>Đối tượng sử dụng</li>
<li>Môi trường mặc</li>
<li>Màu sắc mong muốn</li>
<li>Logo hoặc file thiết kế</li>
<li>Kỹ thuật in/thêu ưu tiên</li>
<li>Thời gian cần nhận hàng</li>
</ul>
<p>Gửi yêu cầu qua trang <a href="/lien-he">liên hệ tư vấn báo giá</a> hoặc xem danh mục <a href="/ao-polo-tron">áo polo trơn</a> để đối chiếu hướng sản phẩm trước khi chốt brief.</p>
`.trim(),
};

export function matchSectionContent(heading: string): string | null {
  const h = heading.toLowerCase();
  const rules: Array<[RegExp, keyof typeof FIRST_ARTICLE_SECTION_HTML]> = [
    [/vì sao|phù hợp làm đồng phục/i, "why_polo"],
    [/7 tiêu chí|tiêu chí cần xem/i, "criteria"],
    [/môi trường/i, "criteria_environment"],
    [/đối tượng|form dáng/i, "criteria_audience"],
    [/chất liệu vải$/i, "criteria_material"],
    [/định lượng|độ dày/i, "criteria_gsm"],
    [/màu sắc/i, "criteria_color"],
    [/logo và kỹ thuật|trang trí/i, "criteria_logo"],
    [/ngân sách|số lượng đặt/i, "criteria_budget"],
    [/nên chọn chất liệu nào/i, "materials"],
    [/^cotton$/i, "materials_cotton"],
    [/cotton pha/i, "materials_blend"],
    [/polyester|hiệu năng/i, "materials_poly"],
    [/theo môi trường sử dụng/i, "materials_by_env"],
    [/nên in hay thêu/i, "logo_methods"],
    [/khi nào nên thêu/i, "logo_embroidery"],
    [/khi nào nên in/i, "logo_print"],
    [/vị trí|kích thước logo/i, "logo_placement"],
    [/form và size|chọn form/i, "fit_sizing"],
    [/quy trình đặt/i, "process"],
    [/lỗi doanh nghiệp|nên tránh/i, "mistakes"],
    [/câu hỏi thường gặp|faq/i, "faq"],
    [/yêu cầu tư vấn|báo giá|cta/i, "cta"],
    [/giới thiệu|mở đầu|introduction|tóm tắt quyết định/i, "intro"],
  ];

  for (const [re, key] of rules) {
    if (re.test(h) || re.test(heading)) return FIRST_ARTICLE_SECTION_HTML[key];
  }
  // First section fallback often is intro-like
  if (/hướng dẫn chọn áo polo/i.test(heading)) return FIRST_ARTICLE_SECTION_HTML.intro;
  return null;
}
