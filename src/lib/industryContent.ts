/**
 * Static content registry for industry-intent landing pages.
 *
 * Each entry targets a commercial search intent keyword cluster
 * (e.g. "áo thun đồng phục công ty") without modifying any DB schema.
 *
 * intro accepts an HTML string — paragraphs can be separated with <p> tags.
 */

import type { FaqItem } from "@/components/seo/FaqSchema";
import type { ContentBenefit } from "@/components/seo/CollectionSEOContent";

export interface InternalLink {
  label: string;
  href: string;
}

export interface IndustryContent {
  /** Used in <title> and OpenGraph */
  seoTitle: string;
  /** Used in <meta name="description"> — 120-160 chars */
  metaDescription: string;
  /** H1 displayed on the page */
  h1: string;
  /** Short paragraph below H1 in the hero (40-60 words) */
  heroIntro: string;
  /** Long-form intro HTML (3-4 <p> paragraphs) */
  intro: string;
  benefits: ContentBenefit[];
  whyAttd: ContentBenefit[];
  useCases: ContentBenefit[];
  /** Product category tiles with internal links */
  productCategories: { name: string; href: string; description: string }[];
  faq: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  /** Page-specific contextual links shown in the CTA footer */
  internalLinks: InternalLink[];
}

const content: Record<string, IndustryContent> = {
  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN ĐỒNG PHỤC CÔNG TY
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-cong-ty": {
    seoTitle: "Áo Thun Đồng Phục Công Ty | Sỉ Số Lượng Lớn | ATTD",
    metaDescription:
      "Áo thun đồng phục công ty sỉ — cotton cao cấp, in thêu logo sắc nét, đủ size S-4XL. Nguồn hàng ổn định cho doanh nghiệp, đại lý và xưởng in. Giao hàng toàn quốc.",
    h1: "Áo Thun Đồng Phục Công Ty",
    heroIntro:
      "ATTD cung cấp áo thun đồng phục công ty số lượng lớn — chất liệu cotton cao cấp, màu sắc ổn định theo lô, phù hợp in thêu logo chuyên nghiệp. Dành cho doanh nghiệp, đại lý và xưởng in trên toàn quốc.",
    intro: `<p>Áo thun đồng phục công ty là lựa chọn trang phục làm việc phổ biến và tiết kiệm chi phí nhất hiện nay. Từ chuỗi bán lẻ, nhà hàng, cửa hàng convenience store đến công ty logistics và doanh nghiệp thương mại — áo thun đồng phục giúp tạo sự đồng nhất, chuyên nghiệp và nhận diện thương hiệu rõ ràng trong mắt khách hàng.</p>

<p>ATTD chuyên cung cấp <strong>áo thun trơn sỉ</strong> làm nền tảng cho đồng phục công ty. Mỗi chiếc áo được chọn từ chất liệu cotton 100% co giãn 4 chiều hoặc cotton pique cao cấp, đảm bảo form dáng đẹp, thoáng mát khi mặc suốt ngày dài làm việc. Trọng lượng vải từ 160-220gsm phù hợp với khí hậu nhiệt đới Việt Nam.</p>

<p>Điểm mạnh của nguồn hàng ATTD là <strong>tính ổn định màu theo lô</strong> — điều kiện tiên quyết để đồng phục công ty nhìn đồng bộ giữa hàng trăm nhân viên. Chúng tôi duy trì kho đệm cho từng màu cơ bản (trắng, đen, xám, navy, đỏ, xanh royal) đảm bảo bổ sung hàng nhanh khi doanh nghiệp cần bổ sung nhân sự mới giữa mùa.</p>

<p>Với hơn 200 đối tác doanh nghiệp đang sử dụng nguồn hàng ATTD cho đồng phục nội bộ, chúng tôi hiểu rõ yêu cầu về tiến độ nghiêm ngặt — đặc biệt trước các dịp khai trương chi nhánh mới, mùa Tết và các sự kiện công ty định kỳ. ATTD cam kết giao hàng đúng hẹn, đúng số lượng và đúng màu sắc như đã xác nhận.</p>`,
    benefits: [
      {
        title: "Màu sắc ổn định theo lô",
        description:
          "Đồng phục công ty yêu cầu màu sắc đồng nhất từ chiếc đầu đến chiếc cuối. ATTD kiểm soát chặt chẽ màu vải theo từng lô sản xuất — không chênh màu giữa các đơn bổ sung trong cùng mùa. Đây là tiêu chuẩn quan trọng nhất khi lựa chọn nhà cung cấp đồng phục.",
      },
      {
        title: "Đủ size S-4XL cho mọi vóc dáng nhân viên",
        description:
          "Thực tế doanh nghiệp có nhân viên với đa dạng vóc dáng. ATTD cung cấp đủ dải size từ S đến 4XL — đảm bảo mọi nhân viên đều có áo vừa vặn, thoải mái và trông đẹp khi mặc đồng phục. Kho hàng luôn sẵn sàng cho tất cả size cơ bản.",
      },
      {
        title: "Vải mịn, bề mặt phẳng phù hợp in thêu",
        description:
          "Chất liệu cotton cao cấp của ATTD có bề mặt đều, mịn — lý tưởng cho in lụa sắc nét, in kỹ thuật số đa màu và thêu vi tính logo chuẩn. Đảm bảo logo công ty hiển thị rõ ràng, không bị biến dạng sau nhiều lần giặt.",
      },
      {
        title: "Giá sỉ theo bậc, chiết khấu hấp dẫn",
        description:
          "Đơn hàng đồng phục thường từ 50-500+ chiếc — đúng quy mô ATTD tối ưu giá sỉ bậc thang. Doanh nghiệp đặt định kỳ mỗi quý được hưởng chính sách giá ổn định suốt năm, không bị ảnh hưởng bởi biến động giá thị trường ngắn hạn.",
      },
    ],
    whyAttd: [
      {
        title: "Nguồn hàng trực tiếp, không qua trung gian",
        description:
          "ATTD làm việc trực tiếp với nhà máy sản xuất — cắt bỏ chi phí trung gian, đảm bảo doanh nghiệp nhận được giá sỉ tốt nhất. Mỗi lô hàng đều có thông tin xuất xứ rõ ràng và chứng nhận chất lượng vật liệu.",
      },
      {
        title: "Kho hàng lớn, giao hàng nhanh",
        description:
          "Kho hàng tại Hà Nội và TP.HCM với trữ lượng hàng chục nghìn sản phẩm luôn sẵn sàng. Đơn hàng dưới 200 chiếc giao trong 2-3 ngày làm việc. Đơn lớn trên 500 chiếc lên kế hoạch giao hàng theo từng đợt theo yêu cầu.",
      },
      {
        title: "Hỗ trợ kỹ thuật in ấn",
        description:
          "Đội ngũ ATTD tư vấn kỹ thuật in phù hợp cho từng loại vải và từng kiểu logo — giúp doanh nghiệp chọn đúng kỹ thuật (in lụa, in kỹ thuật số, thêu vi tính) để đạt chất lượng tốt nhất với ngân sách hợp lý nhất.",
      },
      {
        title: "Chính sách đổi trả minh bạch",
        description:
          "Cam kết đổi toàn bộ hàng lỗi do sản xuất trong 7 ngày nhận hàng. Quy trình xử lý nhanh gọn, không phát sinh thêm chi phí cho doanh nghiệp — đặc biệt quan trọng với đơn hàng đồng phục gấp.",
      },
    ],
    useCases: [
      {
        title: "Chuỗi bán lẻ và siêu thị",
        description:
          "Áo thun có logo là đồng phục phổ biến của nhân viên bán lẻ, giúp khách hàng dễ dàng nhận biết nhân viên hỗ trợ. Màu sắc nhất quán theo tầng hoặc phòng ban tạo hệ thống đồng phục chuyên nghiệp.",
      },
      {
        title: "Nhà hàng, F&B và dịch vụ",
        description:
          "Ngành dịch vụ ăn uống đặt hàng đồng phục nhân viên thường xuyên với tần suất cao. Áo thun trơn của ATTD đáp ứng yêu cầu thoáng mát, bền giặt, màu chuẩn và giá phải chăng cho mọi quy mô cơ sở.",
      },
      {
        title: "Công ty logistics và vận chuyển",
        description:
          "Nhân viên giao hàng và kho vận cần áo thun bền, co giãn thoải mái khi vận động. Cotton 4 chiều của ATTD đáp ứng yêu cầu này, đồng thời dễ in số nhận diện và logo công ty sắc nét.",
      },
      {
        title: "Startup và doanh nghiệp vừa nhỏ",
        description:
          "Không cần đầu tư nhiều vào đồng phục phức tạp — áo thun công ty đơn giản, đẹp, giá tốt là lựa chọn thông minh. ATTD hỗ trợ đơn nhỏ từ 30 chiếc với giá sỉ cạnh tranh, không yêu cầu hợp đồng dài hạn.",
      },
    ],
    productCategories: [
      {
        name: "Áo Thun Trơn",
        href: "/ao-thun-tron",
        description:
          "Cotton cao cấp, đa màu sắc, phù hợp in thêu logo đồng phục mọi ngành nghề.",
      },
      {
        name: "Áo Polo Trơn",
        href: "/ao-polo-tron",
        description:
          "Pique cotton lịch sự — lý tưởng cho đồng phục văn phòng và gặp gỡ khách hàng.",
      },
    ],
    faq: [
      {
        question:
          "Đặt áo thun đồng phục công ty số lượng tối thiểu là bao nhiêu chiếc?",
        answer:
          "ATTD hỗ trợ đơn hàng đồng phục từ 30 chiếc trở lên cho doanh nghiệp. Đơn từ 100 chiếc được hưởng giá sỉ bậc 1, từ 300 chiếc bậc 2, từ 500+ chiếc bậc đặc biệt. Liên hệ để nhận bảng giá chi tiết theo số lượng cụ thể.",
      },
      {
        question: "Thời gian giao hàng đồng phục công ty là bao lâu?",
        answer:
          "Với hàng có sẵn (màu cơ bản, size thông dụng), ATTD giao trong 2-4 ngày làm việc sau khi nhận đơn. Với đơn hàng có in thêu logo, thêm 5-10 ngày làm việc tùy kỹ thuật và số lượng. Trường hợp cần gấp, liên hệ trực tiếp để thương lượng tiến độ.",
      },
      {
        question: "Có thể đặt nhiều màu cho các phòng ban khác nhau không?",
        answer:
          "Hoàn toàn có thể. Nhiều doanh nghiệp phân biệt phòng ban hoặc chức vụ qua màu áo. ATTD hỗ trợ đơn hàng nhiều màu với MOQ riêng theo từng màu — thường từ 30 chiếc/màu. Giao hàng đồng thời hoặc theo đợt tùy yêu cầu.",
      },
      {
        question: "Áo thun đồng phục có bị co rút sau khi giặt không?",
        answer:
          "Tất cả sản phẩm tại ATTD qua quy trình xử lý pre-shrunk. Mức co rút sau lần giặt đầu tiên dưới 3% — nằm trong tiêu chuẩn ngành. Để duy trì form dáng, khuyến nghị giặt lạnh và tránh sấy ở nhiệt độ cao.",
      },
      {
        question: "ATTD có hỗ trợ tư vấn chọn màu đồng phục phù hợp không?",
        answer:
          "Có. Đội ngũ ATTD sẵn sàng tư vấn lựa chọn màu phù hợp với nhận diện thương hiệu của doanh nghiệp — bao gồm phối màu áo với logo, chọn tone màu thể hiện tính chuyên nghiệp hoặc năng động theo ngành nghề. Gửi logo và mô tả nhu cầu để được tư vấn cụ thể.",
      },
      {
        question: "Doanh nghiệp có thể tái đặt hàng bổ sung sau 3-6 tháng không?",
        answer:
          "Có. ATTD ưu tiên đơn bổ sung cho đối tác đang hợp tác — đảm bảo màu sắc khớp với lô hàng trước để không tạo sự chênh màu giữa nhân viên cũ và mới. Hãy lưu mã màu và mã sản phẩm từ đơn hàng đầu tiên để tái đặt hàng nhanh chóng.",
      },
    ],
    ctaTitle: "Cần áo thun đồng phục công ty số lượng lớn?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ theo số lượng, tư vấn màu sắc phù hợp thương hiệu và lên kế hoạch giao hàng theo tiến độ yêu cầu.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Áo polo trơn sỉ", href: "/ao-polo-tron" },
      { label: "Chính sách đại lý", href: "/dai-ly" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN SỰ KIỆN
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-su-kien": {
    seoTitle: "Áo Thun Sự Kiện Giá Sỉ | Đặt In Theo Yêu Cầu | ATTD",
    metaDescription:
      "Áo thun sự kiện sỉ giá tốt — đặt in logo, tên sự kiện theo yêu cầu. Giao hàng nhanh cho hội nghị, roadshow, khai trương và teambuilding. Liên hệ ATTD ngay.",
    h1: "Áo Thun Sự Kiện Giá Sỉ",
    heroIntro:
      "Áo thun sự kiện là item không thể thiếu trong mỗi chương trình hội nghị, roadshow, khai trương và sự kiện thương hiệu. ATTD cung cấp áo thun trơn số lượng lớn với giao hàng nhanh — sẵn sàng cho đơn hàng gấp theo lịch sự kiện.",
    intro: `<p>Mỗi sự kiện doanh nghiệp đều cần áo thun đồng phục để tạo sự đồng nhất, nhận diện và năng lượng tập thể. Từ <strong>hội nghị thường niên</strong> 100 người đến <strong>roadshow quảng bá sản phẩm</strong> tại 5 tỉnh thành — áo thun in logo là vật dụng đồng hành không thể thiếu, đồng thời là kênh truyền thông thương hiệu tiết kiệm chi phí nhất.</p>

<p>ATTD cung cấp áo thun trơn số lượng lớn cho các đơn vị tổ chức sự kiện, agency sự kiện và doanh nghiệp tự tổ chức. <strong>Ưu thế cốt lõi</strong> của ATTD trong phân khúc sự kiện là kho hàng lớn luôn sẵn sàng — đảm bảo bạn nhận được hàng đúng số lượng, đúng size và đúng màu kể cả khi đặt hàng gấp 5-7 ngày trước sự kiện.</p>

<p>Chất liệu áo thun sự kiện thường ưu tiên cotton nhẹ, thoáng mát — phù hợp với các sự kiện ngoài trời, team outing và các hoạt động thể chất. ATTD cung cấp cotton 160gsm thoáng mát cho sự kiện mùa hè và cotton 190gsm bền chắc cho sự kiện trong nhà, phòng máy lạnh. Đội ngũ tư vấn sẵn sàng giúp bạn chọn đúng chất liệu theo bối cảnh sự kiện.</p>

<p>Sau sự kiện, áo thun chất lượng từ ATTD tiếp tục là kênh truyền thông thương hiệu hữu hiệu khi người tham dự mặc trong cuộc sống hàng ngày. Đây là <strong>lý do áo thun có ROI cao nhất</strong> trong các hạng mục chi phí tổ chức sự kiện — vừa phục vụ trực tiếp cho sự kiện vừa kéo dài thời gian nhận diện thương hiệu.</p>`,
    benefits: [
      {
        title: "Giao hàng nhanh, đúng hạn sự kiện",
        description:
          "ATTD hiểu áp lực về deadline trong tổ chức sự kiện. Kho hàng lớn tại Hà Nội và TP.HCM đảm bảo giao hàng trong 2-4 ngày làm việc cho đơn màu cơ bản. Đơn in thêu logo thêm 5-7 ngày. Liên hệ sớm để đặt lịch giao hàng theo thời điểm sự kiện.",
      },
      {
        title: "Cotton nhẹ, thoáng mát cho hoạt động",
        description:
          "Sự kiện thường kéo dài cả ngày với nhiều hoạt động — áo thun thoáng mát là yếu tố quan trọng cho trải nghiệm người tham dự. Cotton 160gsm của ATTD nhẹ, thấm hút nhanh, không bí bức kể cả khi vận động ngoài trời dưới nắng.",
      },
      {
        title: "In ấn sắc nét, logo đẹp trong ảnh",
        description:
          "Ảnh sự kiện được chia sẻ rộng rãi trên mạng xã hội — logo trên áo thun phải đủ sắc nét để nhận diện rõ ràng. ATTD tư vấn kỹ thuật in phù hợp (in lụa cho màu đồng nhất, in kỹ thuật số cho thiết kế phức tạp) để áo thun đẹp trong mọi góc chụp.",
      },
      {
        title: "Đa dạng màu sắc theo theme sự kiện",
        description:
          "Màu áo theo đúng màu nhận diện thương hiệu hay theme màu sự kiện. ATTD có bộ sưu tập màu phong phú từ basic đến bright, với kho sẵn cho các màu phổ biến. Màu đặc biệt sản xuất riêng với đơn từ 300 chiếc/màu.",
      },
    ],
    whyAttd: [
      {
        title: "Kinh nghiệm phục vụ sự kiện doanh nghiệp",
        description:
          "ATTD đã cung cấp áo thun cho hàng trăm sự kiện doanh nghiệp từ quy mô 50 đến 2000 người. Quy trình nhận đơn, xác nhận và giao hàng được tối ưu riêng cho đơn hàng sự kiện có deadline nghiêm ngặt.",
      },
      {
        title: "Hỗ trợ kết nối xưởng in uy tín",
        description:
          "Nếu bạn cần áo thun đã có in logo sẵn khi nhận, ATTD có mạng lưới xưởng in đối tác uy tín — cung cấp gói trọn gói từ áo trơn đến thành phẩm in logo theo yêu cầu sự kiện.",
      },
      {
        title: "Linh hoạt số lượng theo quy mô sự kiện",
        description:
          "Sự kiện 80 người hay 1500 người, ATTD đều đáp ứng tốt. Đơn hàng nhỏ được xử lý nhanh, đơn lớn được lên kế hoạch giao hàng theo lịch setup sự kiện để đội ngũ tổ chức luôn có hàng đúng lúc.",
      },
      {
        title: "Đảm bảo chất lượng đồng đều toàn đơn",
        description:
          "Mỗi chiếc áo trong đơn hàng sự kiện đều phải đạt chất lượng như nhau — không có chiếc lỗi, không chênh màu. ATTD kiểm tra chất lượng theo quy trình chuẩn trước khi đóng gói và xuất kho.",
      },
    ],
    useCases: [
      {
        title: "Hội nghị và sự kiện nội bộ công ty",
        description:
          "Annual conference, kickoff meeting, all-hands meeting — áo thun đồng phục tạo cảm giác đoàn kết, thuộc về và tự hào trong nội bộ. Màu sắc và thiết kế theo năm hoặc theo chủ đề giúp sự kiện trở nên đáng nhớ.",
      },
      {
        title: "Roadshow và activation thương hiệu",
        description:
          "Áo thun nhân viên roadshow phải nổi bật, dễ nhận ra trong đám đông. Màu sắc tươi sáng, in logo lớn, chất liệu thoáng mát — ATTD tư vấn giải pháp áo thun tối ưu cho hoạt động brand activation.",
      },
      {
        title: "Khai trương chi nhánh và sự kiện ra mắt",
        description:
          "Ngày khai trương cần áo thun gấp cho nhân viên và PG/PB. ATTD ưu tiên xử lý đơn gấp với timeline rõ ràng — đặt hàng 5-7 ngày trước khai trương để đảm bảo có hàng đúng thời điểm.",
      },
      {
        title: "Sự kiện từ thiện và cộng đồng",
        description:
          "CSR event, charity run, ngày hội tình nguyện — áo thun sự kiện tạo hình ảnh đẹp và lan truyền thông điệp thương hiệu tốt bụng. Màu sắc tươi sáng tạo không khí năng lượng tích cực cho toàn sự kiện.",
      },
    ],
    productCategories: [
      {
        name: "Áo Thun Trơn",
        href: "/ao-thun-tron",
        description:
          "Kho hàng lớn, nhiều màu — lý tưởng cho đơn hàng áo thun sự kiện cần giao nhanh.",
      },
    ],
    faq: [
      {
        question:
          "Đặt áo thun sự kiện trước bao nhiêu ngày để đảm bảo nhận hàng đúng hẹn?",
        answer:
          "Với áo trơn không in ấn, ATTD giao trong 2-4 ngày làm việc. Với áo có in logo (in lụa 1-2 màu), cần thêm 5-7 ngày sản xuất — tổng 7-11 ngày từ lúc xác nhận đơn. Với in phức tạp (in kỹ thuật số nhiều màu, thêu vi tính), cần 10-14 ngày. Khuyến nghị đặt hàng ít nhất 2 tuần trước sự kiện.",
      },
      {
        question: "ATTD có hỗ trợ giao hàng gấp trong 24-48 giờ không?",
        answer:
          "Với hàng trơn (không in ấn), ATTD có thể hỗ trợ giao nhanh trong 24-48 giờ cho đơn hàng màu cơ bản có sẵn kho. Với đơn in ấn, không thể đảm bảo tiến độ dưới 5 ngày — cần liên hệ trực tiếp để đánh giá khả năng từng trường hợp cụ thể.",
      },
      {
        question: "Số lượng tối thiểu đặt áo thun sự kiện là bao nhiêu?",
        answer:
          "Áo trơn (không in) từ 30 chiếc. Áo có in logo: tùy xưởng in đối tác, thường từ 50 chiếc cho in lụa, 20 chiếc cho in kỹ thuật số. Liên hệ ATTD để được tư vấn giải pháp tốt nhất theo số lượng sự kiện của bạn.",
      },
      {
        question: "Có thể đặt áo thun nhiều size khác nhau không?",
        answer:
          "Hoàn toàn có. Đơn hàng sự kiện thường cần phân bổ size theo danh sách người tham dự. ATTD cung cấp bảng size chuẩn giúp bạn lập danh sách đặt hàng chính xác. Giao hàng theo đúng phân bổ size đã xác nhận.",
      },
      {
        question:
          "Sau sự kiện có thể đặt thêm áo cùng màu và cùng lô không?",
        answer:
          "Có. ATTD lưu thông tin lô hàng và mã màu của từng đơn — đảm bảo đơn bổ sung sau sự kiện (cho chương trình khác hoặc bổ sung cho người thiếu) có màu sắc khớp hoàn toàn. Hãy lưu mã đơn hàng để tái đặt nhanh chóng.",
      },
    ],
    ctaTitle: "Cần áo thun sự kiện gấp?",
    ctaDescription:
      "Gửi yêu cầu ngay hôm nay để ATTD tư vấn số lượng, màu sắc và lên kế hoạch giao hàng phù hợp với lịch sự kiện của bạn.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Liên hệ tư vấn", href: "/lien-he" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN TEAM BUILDING
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-team-building": {
    seoTitle: "Áo Thun Team Building Theo Yêu Cầu | Sỉ Giá Tốt | ATTD",
    metaDescription:
      "Áo thun team building sỉ — đặt theo màu nhóm, in tên thành viên, số lượng linh hoạt. Chất liệu thoáng mát, giao hàng đúng hạn cho mọi chương trình teambuilding.",
    h1: "Áo Thun Team Building Theo Yêu Cầu",
    heroIntro:
      "Áo thun team building phải thoáng mát, bền và đẹp khi chụp ảnh nhóm. ATTD cung cấp áo thun trơn chất lượng cao với phân nhóm màu sắc linh hoạt — đủ để tạo không khí sôi động và dấu ấn riêng cho mỗi chương trình.",
    intro: `<p>Team building là khoảnh khắc tập thể quan trọng, và áo thun đồng phục chính là item kết nối mọi người lại với nhau. <strong>Màu áo theo nhóm, in tên thành viên, in số hoặc in logo chương trình</strong> — tất cả đều tạo nên bản sắc riêng, khuyến khích tinh thần cạnh tranh lành mạnh và gắn kết cảm xúc của người tham gia với sự kiện.</p>

<p>ATTD cung cấp <strong>áo thun trơn sỉ</strong> đặc biệt phù hợp cho team building với các đặc tính quan trọng: cotton thoáng mát cho hoạt động thể chất, màu sắc tươi sáng dễ phân biệt nhóm, bề mặt phẳng in tên và số thành viên sắc nét. Nhiều đơn vị tổ chức team building tin dùng ATTD vì chất lượng ổn định và giao hàng đúng hẹn theo lịch chương trình.</p>

<p>Điểm khác biệt của áo thun team building so với đồng phục thông thường là <strong>yêu cầu nhiều màu trong một đơn hàng</strong> — thường từ 3-6 màu cho từng đội. ATTD hỗ trợ đơn hàng đa màu với MOQ linh hoạt theo từng màu, đảm bảo số lượng áo theo đúng phân bổ thành viên mỗi đội mà bạn cung cấp.</p>

<p>Sau chương trình, áo thun team building trở thành vật kỷ niệm gắn liền với kỷ niệm tập thể đẹp — người tham gia mặc lại nhiều lần trong cuộc sống hàng ngày, tiếp tục lan truyền thương hiệu và tinh thần đội nhóm. Đây là giá trị kéo dài vượt xa khoảng thời gian diễn ra sự kiện.</p>`,
    benefits: [
      {
        title: "Hỗ trợ đơn đa màu theo nhóm",
        description:
          "Team building thường cần 4-6 màu khác nhau cho các đội cạnh tranh. ATTD hỗ trợ đơn đa màu trong một lần đặt hàng, giao hàng đồng thời với số lượng theo phân bổ nhóm mà bạn cung cấp — không cần đặt riêng từng màu.",
      },
      {
        title: "Chất liệu thoáng mát, co giãn tốt",
        description:
          "Hoạt động team building đòi hỏi áo thun có độ co giãn và thoáng khí tốt. Cotton 4 chiều và cotton jersey của ATTD không bó cứng khi vận động, thấm hút mồ hôi tốt — giúp người mặc thoải mái suốt ngày dài hoạt động.",
      },
      {
        title: "Màu sắc tươi sáng, nổi bật trong ảnh",
        description:
          "Ảnh team building được chia sẻ và lưu giữ lâu dài. Màu sắc tươi sáng giúp ảnh nhóm sống động, nổi bật trên mạng xã hội. ATTD có bộ màu bright như đỏ, xanh, vàng, cam và xanh lá phù hợp cho các đội thi đua.",
      },
      {
        title: "In tên và số thành viên sắc nét",
        description:
          "Cá nhân hóa áo thun bằng tên và số thành viên tạo cảm giác đặc biệt cho mỗi người. Bề mặt vải mịn của ATTD đảm bảo in tên rõ ràng, không bị nhòe hay bong tróc sau nhiều lần giặt.",
      },
    ],
    whyAttd: [
      {
        title: "Quy trình đặt hàng đơn giản cho đơn phức tạp",
        description:
          "Đơn team building thường phức tạp với nhiều màu, nhiều size, nhiều in ấn khác nhau. ATTD có quy trình nhận đơn chuẩn — bảng Excel phân bổ size/màu/tên giúp tránh nhầm lẫn và đảm bảo giao đúng hàng cho từng người.",
      },
      {
        title: "Kho màu tươi sáng sẵn sàng",
        description:
          "Màu tươi như đỏ, vàng, cam, xanh royal, xanh lá — ATTD duy trì kho cho những màu này suốt năm. Đặt hàng team building không phải lo về màu cần thiết bị hết hàng trong mùa cao điểm.",
      },
      {
        title: "Gói trọn gói cùng xưởng in đối tác",
        description:
          "Muốn nhận áo đã in logo chương trình, tên thành viên và số nhóm? ATTD phối hợp với xưởng in đối tác để cung cấp gói trọn gói từ áo trơn đến thành phẩm — một đầu mối liên hệ, tiết kiệm thời gian cho BTC.",
      },
      {
        title: "Hỗ trợ 24/7 trong giai đoạn chuẩn bị sự kiện",
        description:
          "BTC team building thường cần xác nhận và thay đổi đơn hàng liên tục trong tuần cuối trước sự kiện. ATTD hỗ trợ nhanh chóng qua Zalo và email trong giờ làm việc và cả ngoài giờ trong giai đoạn gấp.",
      },
    ],
    useCases: [
      {
        title: "Team building ngoài trời và thể thao",
        description:
          "Áo thun cotton thoáng mát, màu đội nổi bật — lý tưởng cho các hoạt động thể thao đồng đội, trò chơi vận động, thử thách ngoài trời. Màu sắc phân biệt rõ ràng giúp tổ chức trò chơi dễ dàng hơn.",
      },
      {
        title: "Team building công ty hàng năm",
        description:
          "Chương trình team building định kỳ hàng năm thường cần áo thun theo chủ đề khác nhau mỗi lần. ATTD hỗ trợ ý tưởng màu sắc và thiết kế đơn giản phù hợp với từng chủ đề — tạo sự khác biệt và kỷ niệm riêng cho mỗi năm.",
      },
      {
        title: "Tổ chức sự kiện agency và event management",
        description:
          "Agency tổ chức team building cho nhiều khách hàng cần đối tác cung cấp áo thun ổn định, nhanh và chuyên nghiệp. ATTD là đối tác cung cấp áo thun trơn lý tưởng cho agency với giá sỉ tốt và quy trình đặt hàng tối ưu.",
      },
      {
        title: "CLB thể thao và nhóm cộng đồng",
        description:
          "Không chỉ doanh nghiệp — CLB chạy bộ, nhóm yoga, đội bóng nghiệp dư và cộng đồng sở thích cũng cần áo thun nhóm. ATTD hỗ trợ đơn nhỏ từ 20 chiếc với giá sỉ hấp dẫn cho cộng đồng không phải doanh nghiệp lớn.",
      },
    ],
    productCategories: [
      {
        name: "Áo Thun Trơn",
        href: "/ao-thun-tron",
        description:
          "Nhiều màu tươi sáng, cotton thoáng mát — lý tưởng cho đơn hàng team building đa màu.",
      },
      {
        name: "Áo Polo Trơn",
        href: "/ao-polo-tron",
        description:
          "Lựa chọn team building lịch sự cho môi trường doanh nghiệp và sự kiện outdoor cao cấp.",
      },
    ],
    faq: [
      {
        question:
          "Có thể đặt 4-5 màu khác nhau trong một đơn team building không?",
        answer:
          "Hoàn toàn có thể. ATTD xử lý đơn đa màu thường xuyên cho team building. Bạn cung cấp bảng phân bổ số lượng theo màu và size, ATTD sẽ đóng gói theo từng nhóm để tiện phát áo trong ngày sự kiện. MOQ mỗi màu từ 20-30 chiếc tùy loại áo.",
      },
      {
        question: "Màu áo có thể chọn theo màu thương hiệu công ty không?",
        answer:
          "ATTD có bảng màu phong phú — hầu hết màu thương hiệu doanh nghiệp đều có màu tương đồng trong danh mục. Nếu cần màu Pantone chính xác, sản xuất riêng với đơn từ 300 chiếc/màu. Gửi code màu để ATTD tư vấn lựa chọn phù hợp nhất từ kho sẵn.",
      },
      {
        question: "Thời gian giao hàng đơn team building đa màu là bao lâu?",
        answer:
          "Đơn trơn đa màu (không in) giao trong 3-5 ngày làm việc. Đơn có in tên thành viên hoặc logo chương trình thêm 5-10 ngày tùy kỹ thuật. ATTD có thể lên lịch giao hàng theo ngày setup sự kiện — liên hệ sớm để lên kế hoạch chi tiết.",
      },
      {
        question: "ATTD có thể in số và tên từng người lên áo không?",
        answer:
          "ATTD cung cấp áo trơn. Dịch vụ in tên và số thành viên được thực hiện bởi xưởng in đối tác uy tín mà ATTD có thể giới thiệu kết nối. Cần cung cấp file thiết kế và danh sách tên/số trước ít nhất 7-10 ngày trước sự kiện.",
      },
      {
        question:
          "Đơn team building 500 người, ATTD có đảm bảo giao đủ hàng không?",
        answer:
          "Có. ATTD thường xuyên xử lý đơn hàng 300-1000 chiếc cho sự kiện doanh nghiệp lớn. Kho dự trữ đủ lớn và hệ thống quản lý đơn hàng chặt chẽ đảm bảo giao đủ số lượng, đúng màu và đúng size theo bảng phân bổ đã xác nhận.",
      },
    ],
    ctaTitle: "Cần áo thun cho chương trình team building?",
    ctaDescription:
      "Gửi số lượng, phân bổ màu và ngày sự kiện để ATTD tư vấn giải pháp và lên kế hoạch giao hàng đảm bảo đúng hạn.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Áo polo trơn sỉ", href: "/ao-polo-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN NHÂN VIÊN
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-nhan-vien": {
    seoTitle: "Áo Thun Đồng Phục Nhân Viên | Sỉ Số Lượng Lớn | ATTD",
    metaDescription:
      "Áo thun đồng phục nhân viên sỉ — cotton bền, in logo chuyên nghiệp, đủ size cho toàn bộ nhân sự. Nguồn hàng ổn định, giá sỉ cạnh tranh, giao hàng toàn quốc.",
    h1: "Áo Thun Đồng Phục Nhân Viên",
    heroIntro:
      "Đồng phục nhân viên thể hiện tính chuyên nghiệp và tạo nhận diện thương hiệu trong mắt khách hàng. ATTD cung cấp áo thun đồng phục nhân viên số lượng lớn — chất lượng ổn định, màu sắc đồng nhất và giá sỉ cạnh tranh cho mọi quy mô doanh nghiệp.",
    intro: `<p>Đồng phục nhân viên không chỉ là trang phục làm việc — đó là ngôn ngữ thương hiệu hiện diện liên tục trước mắt khách hàng và đối tác. Khi nhân viên mặc áo thun đồng phục đồng nhất, chuyên nghiệp và thoải mái, hình ảnh doanh nghiệp được nâng cao rõ rệt mà không cần đầu tư lớn vào các kênh marketing khác.</p>

<p>ATTD chuyên cung cấp <strong>áo thun trơn sỉ</strong> làm nền tảng cho đồng phục nhân viên — chất liệu cotton cao cấp, đủ size từ S đến 4XL, màu sắc ổn định và phù hợp in thêu logo chuyên nghiệp. Dù doanh nghiệp bạn có 20 nhân viên hay 2000 nhân viên, ATTD đều có giải pháp phù hợp với ngân sách và yêu cầu cụ thể.</p>

<p>Một trong những yêu cầu quan trọng nhất của đồng phục nhân viên là <strong>tính nhất quán khi bổ sung</strong>. Khi doanh nghiệp tuyển thêm nhân sự, áo bổ sung phải có màu sắc khớp hoàn toàn với lô hàng trước. ATTD duy trì thông tin lô hàng và mã màu của từng đối tác — đảm bảo đơn bổ sung bất kỳ lúc nào cũng nhận được màu sắc đồng nhất với toàn đội.</p>

<p>Ngoài chất lượng vải, ATTD cũng đặc biệt chú trọng đến <strong>chất lượng may và hoàn thiện</strong>: đường may thẳng đều, cổ áo không bị giãn, lai áo và tay áo hoàn chỉnh — đảm bảo mỗi chiếc áo đồng phục khi mặc trông đẹp, phẳng phiu và chuyên nghiệp trong suốt thời gian sử dụng.</p>`,
    benefits: [
      {
        title: "Màu sắc đồng nhất theo lô",
        description:
          "Đồng phục nhân viên đòi hỏi màu sắc thống nhất từ đầu đến cuối đơn hàng và cả những đơn bổ sung về sau. ATTD kiểm soát chặt chẽ quy trình sản xuất và lưu thông tin lô hàng để đảm bảo không có sự chênh màu giữa các đơn trong cùng một thương hiệu.",
      },
      {
        title: "Đủ size S-4XL cho toàn bộ nhân sự",
        description:
          "Đội ngũ nhân viên đa dạng vóc dáng — áo đồng phục cần đủ size để mọi người đều mặc vừa và thoải mái. ATTD duy trì kho đầy đủ size từ S đến 4XL, kể cả các size đặc biệt không phổ biến mà nhiều nhà cung cấp thường không có.",
      },
      {
        title: "Vải bền, giữ form sau nhiều lần giặt",
        description:
          "Đồng phục nhân viên được giặt thường xuyên — chất liệu phải giữ màu sắc và form dáng qua nhiều lần giặt. Cotton cao cấp của ATTD được xử lý pre-shrunk và định hình màu, đảm bảo áo đẹp và không bị bạc màu trong suốt mùa sử dụng.",
      },
      {
        title: "Đặt bổ sung dễ dàng, màu khớp hoàn toàn",
        description:
          "Khi cần bổ sung đồng phục cho nhân viên mới, ATTD tìm lại thông tin đơn hàng cũ và cung cấp đúng màu sắc đã sử dụng. Không cần đặt lại toàn bộ — chỉ đặt số lượng cần bổ sung với thông tin đơn gốc là đủ.",
      },
    ],
    whyAttd: [
      {
        title: "Chuyên phục vụ doanh nghiệp và đại lý",
        description:
          "ATTD là đơn vị B2B chuyên nghiệp — quy trình đặt hàng, thanh toán và giao hàng được thiết kế cho doanh nghiệp, không phải người mua lẻ. Hóa đơn VAT, hợp đồng cung cấp và báo cáo đơn hàng đều được hỗ trợ đầy đủ.",
      },
      {
        title: "Tư vấn chuyên sâu về chất liệu",
        description:
          "Không phải mọi ngành nghề đều phù hợp với cùng một loại vải. Nhân viên nhà hàng cần cotton thoáng mát, nhân viên văn phòng cần vải mịn lịch sự, nhân viên kho vận cần cotton co giãn bền. ATTD tư vấn loại vải phù hợp với môi trường làm việc cụ thể của doanh nghiệp bạn.",
      },
      {
        title: "Hỗ trợ lên kế hoạch đặt hàng định kỳ",
        description:
          "Doanh nghiệp có kế hoạch đặt hàng định kỳ (thường là đầu năm, giữa năm và cuối năm) được ATTD hỗ trợ lên kế hoạch trước — đảm bảo ưu tiên kho hàng và giá ổn định trong năm, không bị ảnh hưởng bởi biến động giá thị trường.",
      },
      {
        title: "Quy trình kiểm tra chất lượng nghiêm ngặt",
        description:
          "Mỗi đơn hàng đồng phục nhân viên đều được kiểm tra về màu sắc, kích thước, form dáng và chất lượng may trước khi xuất kho. ATTD không để hàng lỗi xuất đi và cam kết đổi trong 7 ngày nếu có sai sót từ phía nhà sản xuất.",
      },
    ],
    useCases: [
      {
        title: "Chuỗi cửa hàng và bán lẻ",
        description:
          "Nhân viên bán lẻ cần áo đồng phục thoải mái, dễ vận động và nhận diện rõ ràng. Màu sắc và logo rõ nét giúp khách hàng dễ tìm nhân viên hỗ trợ — đặc biệt trong các không gian cửa hàng đông đúc.",
      },
      {
        title: "Ngành dịch vụ và hospitality",
        description:
          "Nhà hàng, khách sạn, spa và cơ sở dịch vụ cần đồng phục nhân viên thoáng mát, bền giặt và thể hiện sự chuyên nghiệp trong ngành dịch vụ. ATTD cung cấp giải pháp phù hợp với tiêu chuẩn vệ sinh và thẩm mỹ của từng loại hình dịch vụ.",
      },
      {
        title: "Logistics và vận hành kho",
        description:
          "Nhân viên kho và giao nhận cần áo co giãn tốt để vận động tự do. Cotton 4 chiều của ATTD phù hợp cho công việc vận động nhiều — bền, thoải mái và dễ in số nhận diện nhân viên.",
      },
      {
        title: "Giáo dục và đào tạo",
        description:
          "Giáo viên, nhân viên trung tâm học và nhân viên trường học cần đồng phục lịch sự, thể hiện hình ảnh chuyên nghiệp. Áo thun polo hoặc áo thun trơn màu đặc trưng của trường là lựa chọn phổ biến trong ngành giáo dục.",
      },
    ],
    productCategories: [
      {
        name: "Áo Thun Trơn",
        href: "/ao-thun-tron",
        description:
          "Nền tảng đồng phục nhân viên phổ biến nhất — bền, thoáng mát và phù hợp mọi ngành nghề.",
      },
    ],
    faq: [
      {
        question:
          "Đặt áo thun đồng phục nhân viên có cần ký hợp đồng không?",
        answer:
          "Với đơn hàng trên 300 chiếc, ATTD hỗ trợ ký hợp đồng cung cấp để đảm bảo quyền lợi hai bên — cam kết giá, tiến độ và chất lượng. Đơn dưới 300 chiếc xử lý theo đơn thông thường với xác nhận đơn hàng qua email hoặc Zalo.",
      },
      {
        question: "Có thể in logo công ty trực tiếp trên áo không?",
        answer:
          "ATTD cung cấp áo thun trơn (blank). Dịch vụ in/thêu logo được thực hiện bởi xưởng in đối tác uy tín. ATTD có thể kết nối hoặc bạn tự chọn xưởng in theo yêu cầu. Cần cung cấp file thiết kế logo đúng định dạng cho xưởng in.",
      },
      {
        question: "Giá áo thun đồng phục nhân viên theo số lượng như thế nào?",
        answer:
          "Giá phụ thuộc vào loại vải, màu sắc và số lượng. ATTD có bậc giá sỉ từ 50 chiếc với mức giảm dần khi số lượng tăng. Đơn từ 100 chiếc được tư vấn giá riêng. Liên hệ với số lượng cụ thể để nhận bảng giá chi tiết ngay hôm nay.",
      },
      {
        question: "Áo có thể giặt máy hàng ngày mà không bị hỏng không?",
        answer:
          "Có. Cotton cao cấp của ATTD được xử lý pre-shrunk và định hình màu, chịu được giặt máy hàng ngày ở nhiệt độ thường. Khuyến nghị giặt với nước lạnh đến ấm (dưới 40°C) và không dùng chất tẩy mạnh để duy trì màu sắc lâu nhất.",
      },
      {
        question: "Doanh nghiệp có thể bổ sung thêm áo sau 6 tháng không?",
        answer:
          "Có, và đây là yêu cầu rất phổ biến khi doanh nghiệp tuyển thêm nhân sự. ATTD lưu thông tin lô hàng của từng khách hàng — khi bổ sung sẽ sản xuất cùng loại vải và mã màu để đảm bảo không có sự khác biệt giữa áo cũ và áo mới trong đội ngũ.",
      },
      {
        question: "ATTD có hỗ trợ xuất hóa đơn VAT không?",
        answer:
          "Có. ATTD xuất hóa đơn VAT đầy đủ cho mọi đơn hàng doanh nghiệp theo yêu cầu. Cần cung cấp thông tin doanh nghiệp (tên, địa chỉ, MST) khi xác nhận đơn hàng để ATTD chuẩn bị hóa đơn kịp thời.",
      },
    ],
    ctaTitle: "Tìm nguồn hàng áo thun đồng phục nhân viên?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ theo số lượng, tư vấn chất liệu phù hợp ngành nghề và lên kế hoạch giao hàng ổn định cho doanh nghiệp.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Nguồn hàng sỉ", href: "/nguon-hang" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN DOANH NGHIỆP
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-doanh-nghiep": {
    seoTitle: "Áo Thun Doanh Nghiệp | In Logo Số Lượng Lớn | ATTD",
    metaDescription:
      "Áo thun doanh nghiệp sỉ — in logo thương hiệu, đồng phục nội bộ, quà tặng đối tác. Nguồn hàng B2B ổn định, chính sách đại lý hấp dẫn. Giao hàng toàn quốc.",
    h1: "Áo Thun Doanh Nghiệp",
    heroIntro:
      "Từ đồng phục nội bộ đến quà tặng đối tác — áo thun doanh nghiệp là công cụ xây dựng thương hiệu hiệu quả và tiết kiệm chi phí. ATTD cung cấp nguồn hàng áo thun B2B chất lượng cao cho doanh nghiệp từ 30 đến hàng nghìn chiếc.",
    intro: `<p>Áo thun doanh nghiệp phục vụ nhiều mục đích cùng lúc: <strong>đồng phục nhân viên</strong> tạo sự chuyên nghiệp trong mắt khách hàng, <strong>quà tặng đối tác</strong> xây dựng quan hệ kinh doanh, <strong>áo thun sự kiện</strong> lan truyền thương hiệu và <strong>áo thun đại lý</strong> tạo kênh phân phối. ATTD hiểu rõ vai trò của từng loại và cung cấp giải pháp phù hợp cho từng nhu cầu.</p>

<p>Điểm khác biệt của ATTD trong phân khúc doanh nghiệp là <strong>hiểu rõ yêu cầu B2B</strong>: hóa đơn VAT đầy đủ, khả năng ký hợp đồng cung cấp định kỳ, bảo hành sản phẩm rõ ràng và đội ngũ hỗ trợ chuyên nghiệp biết lắng nghe và giải quyết vấn đề nhanh chóng. Đây là những yếu tố mà doanh nghiệp cần ở một đối tác cung ứng lâu dài.</p>

<p>ATTD cung cấp <strong>áo thun trơn (blank)</strong> — nền tảng hoàn hảo cho bất kỳ chiến dịch branding nào. Bề mặt vải mịn, cotton cao cấp, màu sắc ổn định — đảm bảo logo và tên thương hiệu hiển thị sắc nét và bền lâu dù in bằng phương pháp nào: in lụa, in kỹ thuật số, thêu vi tính hay in chuyển nhiệt.</p>

<p>Với mạng lưới hơn 200 đối tác doanh nghiệp và đại lý trên toàn quốc, ATTD đã tích lũy kinh nghiệm phong phú trong việc phục vụ nhu cầu đa dạng từ startup tới tập đoàn lớn. Mỗi đơn hàng đều được tiếp nhận với sự chuyên nghiệp và cam kết chất lượng nhất quán — từ đơn 50 chiếc đến đơn 5000 chiếc.</p>`,
    benefits: [
      {
        title: "Đa dạng ứng dụng cho doanh nghiệp",
        description:
          "Một nguồn hàng phục vụ nhiều nhu cầu: đồng phục nhân viên, quà tặng đối tác, áo sự kiện, áo cho đại lý phân phối. Mua từ ATTD, doanh nghiệp có thể tối ưu chi phí đơn vị nhờ đặt số lượng lớn hơn trên một nhà cung cấp thay vì phân tán nhiều nguồn.",
      },
      {
        title: "Chất lượng B2B chuyên nghiệp",
        description:
          "Hóa đơn VAT, hợp đồng cung cấp, chứng nhận xuất xứ, bảo hành sản phẩm — ATTD đáp ứng đầy đủ yêu cầu của phòng mua hàng và kế toán doanh nghiệp. Quy trình minh bạch, không phát sinh chi phí ẩn.",
      },
      {
        title: "Chính sách đối tác dài hạn",
        description:
          "Doanh nghiệp đặt hàng định kỳ được hưởng giá ưu đãi ổn định suốt năm, ưu tiên kho hàng trong mùa cao điểm và hỗ trợ lên kế hoạch cung ứng hàng năm. ATTD xây dựng quan hệ đối tác lâu dài, không phải chỉ bán từng đơn hàng đơn lẻ.",
      },
      {
        title: "Giải pháp trọn gói theo yêu cầu",
        description:
          "Từ áo trơn đến áo đã in/thêu logo, từ đơn hàng đơn lẻ đến hợp đồng cung cấp định kỳ, từ giao hàng tập trung đến giao hàng theo địa điểm nhiều chi nhánh — ATTD linh hoạt theo yêu cầu của từng doanh nghiệp.",
      },
    ],
    whyAttd: [
      {
        title: "Nguồn hàng ổn định, không đứt gãy",
        description:
          "Kho hàng lớn và mạng lưới nhà máy sản xuất đa dạng đảm bảo ATTD luôn có hàng kể cả trong mùa cao điểm. Doanh nghiệp không phải lo ngại tình trạng hết hàng đột ngột khi cần bổ sung đồng phục hoặc chuẩn bị cho sự kiện lớn.",
      },
      {
        title: "Đội ngũ tư vấn am hiểu nhu cầu doanh nghiệp",
        description:
          "Nhân viên ATTD hiểu rõ thách thức của doanh nghiệp trong việc quản lý đồng phục: ngân sách, tiến độ, chất lượng và tính đồng nhất. Chúng tôi tư vấn giải pháp toàn diện, không chỉ bán sản phẩm.",
      },
      {
        title: "Chất lượng kiểm tra trước khi xuất kho",
        description:
          "100% sản phẩm được kiểm tra về màu sắc, kích thước, chất lượng may và form dáng trước khi đóng gói. Đối với đơn hàng lớn, ATTD thực hiện QC theo lô với báo cáo kiểm tra gửi cho doanh nghiệp nếu yêu cầu.",
      },
      {
        title: "Mạng lưới giao hàng toàn quốc",
        description:
          "Đối tác vận chuyển uy tín với coverage toàn 63 tỉnh thành. Đơn hàng được theo dõi realtime, thông báo khi giao thành công. Với doanh nghiệp có nhiều chi nhánh, hỗ trợ giao hàng tách lô đến từng địa điểm theo yêu cầu.",
      },
    ],
    useCases: [
      {
        title: "Quà tặng đối tác và khách hàng",
        description:
          "Áo thun in logo thương hiệu là quà tặng thực dụng, được sử dụng lâu dài và tiếp tục lan truyền thương hiệu sau khi được nhận. Phù hợp cho quà tặng năm mới, kỷ niệm đối tác và sự kiện hội nghị doanh nghiệp.",
      },
      {
        title: "Đồng phục nhân viên toàn hệ thống",
        description:
          "Doanh nghiệp có nhiều chi nhánh cần đồng phục thống nhất để tạo nhận diện thương hiệu nhất quán. ATTD cung cấp và giao hàng đến từng chi nhánh theo lịch nội bộ của doanh nghiệp, đảm bảo mọi nhân viên đều có đồng phục đúng thời điểm.",
      },
      {
        title: "Áo thun cho kênh đại lý",
        description:
          "Nhiều thương hiệu cung cấp áo thun có logo cho đại lý và điểm bán hàng — vừa là quà tặng vừa là công cụ marketing. ATTD hỗ trợ đơn hàng đại lý với giá sỉ cạnh tranh và giao hàng đến từng địa điểm đại lý.",
      },
      {
        title: "Áo thun cho chương trình khách hàng thân thiết",
        description:
          "Áo thun in logo là phần thưởng phổ biến trong chương trình loyalty và referral. Chi phí thấp, giá trị cảm nhận cao — khách hàng tự hào khi mặc áo có logo thương hiệu họ yêu thích, tạo hiệu ứng word-of-mouth tự nhiên.",
      },
    ],
    productCategories: [
      {
        name: "Áo Thun Trơn",
        href: "/ao-thun-tron",
        description:
          "Nền tảng cho mọi chiến dịch branding doanh nghiệp — cotton cao cấp, bề mặt in logo sắc nét.",
      },
      {
        name: "Áo Polo Trơn",
        href: "/ao-polo-tron",
        description:
          "Lựa chọn cao cấp hơn cho đồng phục lịch sự và quà tặng doanh nghiệp premium.",
      },
    ],
    faq: [
      {
        question:
          "ATTD có thể cung cấp áo thun doanh nghiệp định kỳ hàng quý không?",
        answer:
          "Có. ATTD hỗ trợ ký hợp đồng cung cấp định kỳ với giá ổn định suốt thời gian hợp đồng. Doanh nghiệp lên lịch đặt hàng hàng quý, ATTD đảm bảo ưu tiên kho hàng và tiến độ sản xuất theo kế hoạch đã thống nhất.",
      },
      {
        question:
          "Có thể giao hàng đến nhiều địa điểm chi nhánh cùng lúc không?",
        answer:
          "Có. ATTD hỗ trợ chia lô giao hàng theo từng địa điểm chi nhánh với bảng phân bổ số lượng và địa chỉ giao hàng riêng. Chi phí vận chuyển tính theo từng điểm giao — liên hệ để nhận báo giá vận chuyển đa điểm.",
      },
      {
        question: "Áo thun doanh nghiệp có được xuất hóa đơn đỏ (VAT) không?",
        answer:
          "Có. ATTD xuất hóa đơn VAT 10% cho tất cả đơn hàng doanh nghiệp. Cần cung cấp tên công ty, địa chỉ và mã số thuế khi đặt hàng để ATTD chuẩn bị hóa đơn đúng thông tin.",
      },
      {
        question: "Số lượng tối thiểu để được giá sỉ doanh nghiệp là bao nhiêu?",
        answer:
          "ATTD bắt đầu giá sỉ từ 50 chiếc/đơn. Đơn từ 100 chiếc được giá bậc 1, từ 300 chiếc bậc 2, từ 500 chiếc trở lên được tư vấn giá đặc biệt theo hợp đồng. Liên hệ với số lượng cụ thể để nhận bảng giá phù hợp.",
      },
      {
        question:
          "Chính sách bảo hành và đổi hàng của ATTD như thế nào?",
        answer:
          "ATTD bảo hành 30 ngày cho lỗi sản xuất (đường may lệch, màu không đều, size sai so với bảng size đã xác nhận). Hàng lỗi được đổi hoặc hoàn tiền toàn phần. Cần liên hệ trong vòng 7 ngày nhận hàng và cung cấp ảnh/video chứng minh lỗi.",
      },
      {
        question: "ATTD có hỗ trợ đặt hàng với màu theo Pantone không?",
        answer:
          "Có, với đơn hàng từ 300 chiếc/màu và thời gian sản xuất riêng 20-25 ngày làm việc. Cần cung cấp mã màu Pantone và duyệt mẫu màu trước khi sản xuất đại trà. Phù hợp cho doanh nghiệp yêu cầu màu chính xác theo brand guideline.",
      },
    ],
    ctaTitle: "Tìm đối tác cung cấp áo thun doanh nghiệp ổn định?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ, tư vấn giải pháp đồng phục và quà tặng phù hợp ngân sách doanh nghiệp. Hóa đơn VAT đầy đủ, giao hàng toàn quốc.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Áo polo trơn sỉ", href: "/ao-polo-tron" },
      { label: "Chính sách đại lý", href: "/dai-ly" },
    ],
  },
};

export function getIndustryContent(slug: string): IndustryContent | null {
  return content[slug] ?? null;
}

export const INDUSTRY_SLUGS = Object.keys(content);
