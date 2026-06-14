/**
 * Static content registry for wholesale blank apparel SEO cluster.
 *
 * Five pages each targeting a distinct commercial search intent within the
 * kho / trơn / sỉ / nguồn hàng keyword cluster.
 *
 * Content similarity is kept below 35% across pages by varying:
 *  - primary keyword angle (inventory, price, supply chain, polo-specific)
 *  - intro paragraph focus
 *  - benefit framing
 *  - FAQ questions
 */

import type { FaqItem } from "@/components/seo/FaqSchema";
import type { ContentBenefit } from "@/components/seo/CollectionSEOContent";
import type { InternalLink } from "@/lib/industryContent";

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
}

export interface WholesaleContent {
  seoTitle: string;
  /** 120-160 characters */
  metaDescription: string;
  h1: string;
  heroIntro: string;
  /** Long-form HTML intro — 3-4 <p> paragraphs */
  intro: string;
  suitableCustomers: ContentBenefit[];
  whyAttd: ContentBenefit[];
  process: ProcessStep[];
  /** Min 6 FAQs */
  faq: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  /** Page-specific cluster cross-links shown in footer */
  internalLinks: InternalLink[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED process steps — each page customises the copy slightly
// ─────────────────────────────────────────────────────────────────────────────

const standardProcess: ProcessStep[] = [
  {
    step: 1,
    title: "Liên hệ và tư vấn",
    description:
      "Gửi yêu cầu qua Zalo, form liên hệ hoặc email. Đội ngũ ATTD phản hồi trong vòng 2 giờ làm việc, tư vấn về chủng loại sản phẩm, màu sắc, size range và chính sách giá phù hợp với quy mô của bạn.",
  },
  {
    step: 2,
    title: "Nhận báo giá chi tiết",
    description:
      "ATTD gửi bảng báo giá sỉ theo bậc số lượng — càng mua nhiều, giá càng tốt. Báo giá bao gồm đơn giá, chi phí vận chuyển dự kiến và thời gian giao hàng cụ thể.",
  },
  {
    step: 3,
    title: "Xác nhận và đặt cọc",
    description:
      "Xác nhận đơn hàng qua email hoặc Zalo với thông tin chi tiết về màu sắc, size, số lượng và địa chỉ giao hàng. Đơn hàng lớn yêu cầu đặt cọc 30-50% để ưu tiên lịch sản xuất và kho hàng.",
  },
  {
    step: 4,
    title: "Chuẩn bị và kiểm hàng",
    description:
      "ATTD kiểm tra chất lượng và đóng gói từng đơn hàng theo tiêu chuẩn xuất kho. Đơn hàng lớn từ 300 chiếc trở lên được kiểm tra QC toàn phần với báo cáo gửi cho khách hàng theo yêu cầu.",
  },
  {
    step: 5,
    title: "Giao hàng toàn quốc",
    description:
      "Đối tác vận chuyển uy tín với coverage toàn 63 tỉnh thành. Mã vận đơn được gửi ngay khi bàn giao cho đơn vị vận chuyển. Đơn hàng giao thành công được xác nhận qua Zalo — hỗ trợ khiếu nại và đổi hàng nhanh chóng nếu phát sinh.",
  },
];

const content: Record<string, WholesaleContent> = {
  // ───────────────────────────────────────────────────────────────────────────
  // KHO ÁO THUN TRƠN
  // Focus: inventory, stock availability, warehouse
  // ───────────────────────────────────────────────────────────────────────────
  "kho-ao-thun-tron": {
    seoTitle: "Kho Áo Thun Trơn Số Lượng Lớn | Tồn Kho Sẵn Sàng | ATTD",
    metaDescription:
      "Kho áo thun trơn ATTD — tồn kho lớn, hàng chục màu sắc, đủ size S-4XL, giao hàng nhanh toàn quốc. Nguồn hàng ổn định cho đại lý, xưởng in và doanh nghiệp.",
    h1: "Kho Áo Thun Trơn Số Lượng Lớn",
    heroIntro:
      "ATTD duy trì kho áo thun trơn lớn với tồn kho thường trực — hàng chục màu sắc, đầy đủ size S-4XL, sẵn sàng xuất hàng ngay khi nhận đơn. Giải pháp nguồn hàng ổn định cho đại lý, xưởng in và doanh nghiệp trên toàn quốc.",
    intro: `<p>Bài toán khó nhất của xưởng in và đại lý không phải là thiếu đơn hàng — mà là <strong>thiếu hàng trơn khi có đơn</strong>. Khi khách đặt gấp, khi sự kiện sắp đến, khi mùa cao điểm bùng nổ — việc không tìm được nguồn có đủ hàng đúng màu đúng size có thể khiến bạn mất đơn, mất khách và mất uy tín. Đây chính là vấn đề mà kho áo thun trơn ATTD được xây dựng để giải quyết.</p>

<p>ATTD duy trì <strong>kho áo thun trơn thường trực</strong> với số lượng lớn cho từng màu cơ bản — trắng, đen, xám, navy, đỏ, xanh royal và nhiều màu trendng theo mùa. Mỗi màu đều có sẵn đủ dải size từ S đến 4XL, không phải chờ sản xuất hay chờ nhập hàng. Điều này giúp đối tác của ATTD có thể nhận đơn mà không cần lo về tồn kho phía sau.</p>

<p>Kho hàng ATTD được quản lý theo hệ thống FIFO (first in, first out) nghiêm ngặt — đảm bảo tính đồng đều về màu sắc trong từng lô hàng. Mỗi khi lô mới nhập về, đội ngũ QC kiểm tra màu vải, trọng lượng gsm và form dáng trước khi đưa vào kệ. Đây là quy trình đảm bảo rằng bạn không bao giờ nhận được hàng chênh màu giữa các chiếc trong cùng một đơn hàng.</p>

<p>Bên cạnh kho tồn thường xuyên, ATTD cũng vận hành hệ thống <strong>dự báo tồn kho theo mùa</strong> — tăng dự trữ trước Tết, mùa hội nghị cuối năm và các dịp cao điểm như khai trường. Đối tác thường xuyên có thể đăng ký thông báo tồn kho ưu tiên — nhận thông tin sớm khi màu sắp hết để kịp thời đặt hàng trước mùa cao điểm.</p>`,
    suitableCustomers: [
      {
        title: "Xưởng in và in ấn",
        description:
          "Xưởng in cần nguồn hàng trơn ổn định để nhận đơn liên tục mà không lo đứt hàng. Kho ATTD đảm bảo bạn luôn có áo thun trơn đúng màu, đúng size ngay khi cần — không chờ sản xuất, không chờ nhập hàng từ xa.",
      },
      {
        title: "Đại lý đồng phục",
        description:
          "Đại lý đồng phục cần tồn kho đệm để đáp ứng đơn gấp. Với kho hàng lớn của ATTD và giao hàng 2-3 ngày làm việc, đại lý có thể nhận đơn khách tự tin mà không cần duy trì kho hàng cồng kềnh của riêng mình.",
      },
      {
        title: "Xưởng thêu vi tính",
        description:
          "Thêu vi tính đòi hỏi vải mịn, bề mặt đều và màu sắc chuẩn để đường thêu không bị nhấp nhô. Áo thun trơn trong kho ATTD đáp ứng đầy đủ tiêu chí này với chất liệu cotton cao cấp được kiểm định trước khi nhập kho.",
      },
      {
        title: "Công ty quảng cáo và agency",
        description:
          "Agency thường có deadline ngặt nghèo từ phía khách hàng. Kho hàng sẵn sàng của ATTD giúp agency đáp ứng đơn sự kiện, activation và roadshow mà không cần lo về thời gian sản xuất hàng mới.",
      },
      {
        title: "Local brand và thương hiệu thời trang",
        description:
          "Brand nhỏ cần nguồn áo trơn để tạo BST theo mùa mà không muốn bỏ vốn sản xuất lớn. Kho ATTD cho phép local brand mua số lượng vừa phải, thử phản ứng thị trường rồi tái đặt nhanh khi bán chạy.",
      },
      {
        title: "Doanh nghiệp cần đồng phục gấp",
        description:
          "Khai trương, sự kiện nội bộ, tuyển dụng lớn — doanh nghiệp cần đồng phục nhanh trong 3-5 ngày. Kho hàng sẵn ATTD đáp ứng đơn gấp mà không cần chờ sản xuất, đảm bảo có hàng đúng thời điểm cần.",
      },
    ],
    whyAttd: [
      {
        title: "Tồn kho lớn, giao nhanh",
        description:
          "Hàng tồn kho thường trực cho tất cả màu cơ bản và size S-4XL. Đơn hàng dưới 200 chiếc giao trong 2-3 ngày làm việc, không cần chờ sản xuất. Kho dự trữ được tăng cường trước mùa cao điểm để không bao giờ hết hàng đúng lúc bạn cần nhất.",
      },
      {
        title: "Màu sắc đồng nhất theo lô",
        description:
          "Quy trình QC nghiêm ngặt đảm bảo không có chênh màu trong từng đơn hàng. Hệ thống quản lý lô hàng FIFO giúp đối tác tái đặt hàng bổ sung luôn nhận được màu khớp hoàn toàn với đơn trước — quan trọng cho xưởng in và đồng phục.",
      },
      {
        title: "Đa dạng màu sắc và size",
        description:
          "Hàng chục màu sắc từ basic trắng, đen, xám đến seasonal tone. Đủ dải size S-4XL trong kho — không cần đặt riêng size đặc biệt và chờ nhập hàng. Danh mục màu được cập nhật theo xu hướng mỗi quý.",
      },
      {
        title: "Ưu tiên kho cho đối tác thường xuyên",
        description:
          "Đối tác đặt hàng định kỳ được ưu tiên thông báo tồn kho sớm trước mùa cao điểm. Hệ thống đặt trước (pre-order) giúp bạn đảm bảo có hàng đúng màu đúng số lượng ngay cả khi thị trường đang khan hàng.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question: "Kho ATTD có bao nhiêu màu áo thun trơn luôn có sẵn?",
        answer:
          "ATTD duy trì kho thường trực cho khoảng 20-25 màu cơ bản và seasonal, bao gồm trắng, đen, xám nhạt, xám đậm, navy, xanh royal, đỏ, cam, vàng, xanh lá, hồng pastel và nhiều màu khác. Danh sách màu chính xác và số lượng tồn kho theo từng size được cập nhật trong báo giá — liên hệ ATTD để nhận bảng tồn kho mới nhất.",
      },
      {
        question:
          "Đặt hàng kho ATTD có thể giao trong bao nhiêu ngày làm việc?",
        answer:
          "Đơn hàng áo trơn (không in ấn) dưới 200 chiếc: 2-3 ngày làm việc. Đơn 200-500 chiếc: 3-5 ngày. Đơn trên 500 chiếc: lên kế hoạch giao hàng cụ thể khi xác nhận đơn. Thời gian trên tính từ lúc xác nhận đơn và đặt cọc.",
      },
      {
        question: "Khi màu sắc mình cần đang tạm hết kho, ATTD có thể làm gì?",
        answer:
          "ATTD sẽ thông báo ngay khi màu cần thiết sắp về kho — thường trong vòng 5-10 ngày làm việc. Bạn có thể đặt trước (pre-order) để được ưu tiên trong lô hàng kế tiếp. Ngoài ra, ATTD tư vấn màu tương đồng có sẵn nếu deadline gấp và bạn cần giải pháp thay thế ngay.",
      },
      {
        question:
          "ATTD có hỗ trợ đặt hàng nhiều màu khác nhau trong cùng một đơn không?",
        answer:
          "Có. Đơn đa màu rất phổ biến tại ATTD — bạn chỉ cần cung cấp bảng phân bổ số lượng theo màu và size. ATTD đóng gói và xuất kho theo từng màu riêng hoặc trộn theo yêu cầu. MOQ cho mỗi màu tối thiểu 30 chiếc.",
      },
      {
        question:
          "Có thể tái đặt hàng bổ sung sau 3-6 tháng với màu giống hệt lô cũ không?",
        answer:
          "Có. ATTD lưu thông tin lô hàng và mã màu cho từng đối tác. Khi cần bổ sung, chỉ cần cung cấp mã đơn hàng trước để ATTD tìm đúng lô màu tương đương — đảm bảo không chênh màu giữa đơn cũ và mới. Tính năng này đặc biệt quan trọng cho xưởng in có đơn tái tục.",
      },
      {
        question:
          "Giá mua từ kho ATTD có bao gồm phí vận chuyển không?",
        answer:
          "Giá báo cho hàng tại kho (ex-warehouse). Phí vận chuyển tính riêng theo trọng lượng đơn hàng và địa điểm giao hàng. Đơn từ 300 chiếc trở lên được hỗ trợ một phần phí vận chuyển. Đơn hàng định kỳ theo hợp đồng được đàm phán chi phí logistics riêng.",
      },
    ],
    ctaTitle: "Cần kiểm tra tồn kho áo thun trơn?",
    ctaDescription:
      "Liên hệ ATTD để nhận bảng tồn kho hiện tại, báo giá sỉ và đặt hàng ngay hôm nay. Hàng có sẵn kho, giao hàng toàn quốc trong 2-5 ngày làm việc.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron-si" },
      { label: "Nguồn hàng áo thun trơn", href: "/nguon-hang-ao-thun-tron" },
      { label: "Kho áo polo trơn", href: "/kho-ao-polo-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN TRƠN SỈ
  // Focus: wholesale price tiers, dealer registration, buying wholesale
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-tron-si": {
    seoTitle: "Áo Thun Trơn Sỉ Giá Tốt | Chính Sách Đại Lý Hấp Dẫn | ATTD",
    metaDescription:
      "Áo thun trơn sỉ ATTD — giá bậc thang theo số lượng, chiết khấu đại lý 10-20%, nhiều màu sẵn kho. Nguồn hàng B2B đáng tin cậy cho đại lý và xưởng in toàn quốc.",
    h1: "Áo Thun Trơn Sỉ Giá Tốt",
    heroIntro:
      "Mua sỉ áo thun trơn từ ATTD — chính sách giá bậc thang minh bạch, chiết khấu đại lý lên đến 20%, hàng sẵn kho nhiều màu nhiều size. Đối tác tin cậy của hàng trăm đại lý và xưởng in trên toàn quốc.",
    intro: `<p>Khi bạn tìm kiếm <strong>áo thun trơn sỉ</strong>, điều quan trọng nhất không chỉ là giá thấp — mà là tổng chi phí thực sự bao gồm chất lượng hàng, độ ổn định nguồn cung, thời gian giao hàng và dịch vụ sau bán. ATTD xây dựng chính sách mua sỉ minh bạch, rõ ràng theo từng bậc số lượng — giúp bạn tính toán chi phí chính xác và lập kế hoạch kinh doanh hiệu quả hơn.</p>

<p>Chính sách giá sỉ của ATTD hoạt động theo cơ chế bậc thang: số lượng mua càng nhiều, đơn giá mỗi chiếc càng thấp. <strong>Bậc 1</strong> từ 50-99 chiếc, <strong>bậc 2</strong> từ 100-299 chiếc, <strong>bậc 3</strong> từ 300-499 chiếc và <strong>bậc đặc biệt</strong> từ 500 chiếc trở lên với giá thương lượng. Đại lý chính thức đăng ký tài khoản còn được hưởng mức chiết khấu cố định 10-20% so với giá niêm yết bất kể số lượng — một lợi thế đáng kể trong dài hạn.</p>

<p>Ngoài giá cả, ATTD cam kết <strong>ổn định giá sỉ trong thời gian dài</strong>. Đối tác ký hợp đồng cung cấp 6 tháng hoặc 1 năm được bảo đảm giá không tăng trong thời gian hợp đồng — dù chi phí nguyên liệu hay vận chuyển có biến động. Đây là cam kết quan trọng giúp đại lý và xưởng in dự báo chi phí sản phẩm và định giá bán chính xác hơn.</p>

<p>Với kinh nghiệm phục vụ hơn 200 đối tác sỉ trên toàn quốc, ATTD hiểu rõ rằng mua sỉ không phải chỉ về giá đầu vào. Chúng tôi đồng hành cùng đối tác trong việc phân tích xu hướng màu sắc theo mùa, tư vấn phân bổ đơn hàng tối ưu để tận dụng bậc giá tốt nhất, và hỗ trợ kế hoạch nhập hàng định kỳ giúp đối tác luôn có hàng mà không ứ đọng vốn không cần thiết.</p>`,
    suitableCustomers: [
      {
        title: "Đại lý đồng phục và thời trang",
        description:
          "Đại lý mua sỉ áo thun trơn để bán lẻ hoặc tái phân phối. Chính sách giá bậc thang và chiết khấu đại lý chính thức của ATTD tạo biên lợi nhuận tốt — thường 30-50% tùy kênh phân phối và thị trường địa phương.",
      },
      {
        title: "Xưởng in nhận đơn hàng lẻ",
        description:
          "Xưởng in mua sỉ áo trơn để tích lũy tồn kho, sẵn sàng nhận đơn in khẩn từ khách hàng bán lẻ. Giá sỉ tốt từ ATTD giúp xưởng in định giá dịch vụ cạnh tranh hơn trong thị trường in ấn địa phương.",
      },
      {
        title: "Xưởng thêu và gia công",
        description:
          "Xưởng thêu nhập áo sỉ để cung cấp gói trọn gói (áo + thêu) cho doanh nghiệp. Biên lợi nhuận từ chênh lệch giá sỉ áo thun và giá bán trọn gói thường là nguồn doanh thu ổn định cho xưởng thêu quy mô nhỏ và vừa.",
      },
      {
        title: "Công ty quảng cáo và event",
        description:
          "Agency thường đặt áo thun trơn sỉ cho nhiều dự án cùng lúc để tận dụng bậc giá tốt nhất. ATTD hỗ trợ đặt hàng linh hoạt cho từng dự án riêng biệt mà vẫn được cộng dồn số lượng vào hạn mức bậc giá đã thoả thuận.",
      },
      {
        title: "Local brand độc lập",
        description:
          "Local brand mua sỉ áo trơn để làm nền tảng cho BST hoặc drop riêng. Giá sỉ tốt + chất lượng vải ổn định giúp brand tập trung vào thiết kế và marketing mà không cần lo về chất lượng đầu vào.",
      },
      {
        title: "Doanh nghiệp mua số lượng lớn",
        description:
          "Doanh nghiệp đặt đồng phục nội bộ số lượng lớn thường một lần mỗi năm. Bậc giá đặc biệt từ 500 chiếc và khả năng đàm phán giá theo hợp đồng giúp phòng mua hàng tối ưu ngân sách đồng phục hiệu quả.",
      },
    ],
    whyAttd: [
      {
        title: "Chính sách giá sỉ minh bạch",
        description:
          "Bảng giá bậc thang rõ ràng — bạn biết chính xác mình trả bao nhiêu cho từng bậc số lượng. Không có phụ phí ẩn, không thay đổi giá sau khi đã báo — ATTD cam kết giữ giá từ lúc xác nhận đến lúc giao hàng.",
      },
      {
        title: "Chiết khấu đại lý chính thức",
        description:
          "Đăng ký trở thành đại lý chính thức ATTD để nhận chiết khấu 10-20% cố định, ưu tiên tồn kho trong mùa cao điểm và hỗ trợ tư vấn xu hướng màu sắc theo mùa. Quy trình đăng ký đơn giản, không yêu cầu cam kết doanh thu tối thiểu.",
      },
      {
        title: "Cộng dồn số lượng theo đại lý",
        description:
          "ATTD tính bậc giá dựa trên tổng số lượng đặt hàng trong tháng hoặc quý — không phải theo từng đơn riêng lẻ. Agency và nhà phân phối có nhiều khách hàng nhỏ được hưởng bậc giá tốt hơn nhờ cộng dồn số lượng.",
      },
      {
        title: "Ổn định giá trong thời gian hợp đồng",
        description:
          "Đối tác ký hợp đồng cung cấp được bảo đảm giá không tăng trong thời gian hợp đồng. Đây là lợi thế quan trọng để lập kế hoạch tài chính và định giá bán ổn định mà không bị ảnh hưởng bởi biến động thị trường.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question:
          "Mua sỉ áo thun trơn ATTD, số lượng tối thiểu là bao nhiêu?",
        answer:
          "Bắt đầu từ 50 chiếc/đơn để được giá sỉ. Đơn dưới 50 chiếc vẫn được phục vụ nhưng theo giá lẻ. MOQ cho mỗi màu riêng là 30 chiếc — tức là đơn 90 chiếc có thể chia thành 3 màu khác nhau.",
      },
      {
        question: "Chính sách giá sỉ theo bậc số lượng cụ thể như thế nào?",
        answer:
          "ATTD có 4 bậc giá: bậc 1 (50-99 chiếc), bậc 2 (100-299 chiếc), bậc 3 (300-499 chiếc) và bậc đặc biệt (500+ chiếc). Mỗi bậc có mức giảm giá riêng so với giá niêm yết. Liên hệ để nhận bảng giá chi tiết theo từng sản phẩm và số lượng cụ thể.",
      },
      {
        question: "Đăng ký đại lý ATTD có điều kiện gì không?",
        answer:
          "Đại lý chính thức ATTD không yêu cầu cam kết doanh thu tối thiểu hay phí đăng ký. Chỉ cần điền form đăng ký, cung cấp thông tin doanh nghiệp và được phê duyệt. Sau khi được chấp thuận, đại lý được hưởng giá chiết khấu ngay từ đơn đầu tiên.",
      },
      {
        question: "ATTD có chương trình khuyến mãi hay flash sale định kỳ không?",
        answer:
          "ATTD có chương trình ưu đãi theo mùa — giảm giá thêm hoặc tặng kèm sản phẩm cho đơn hàng lớn vào dịp Tết, mùa khai trường và cuối năm. Đại lý đăng ký danh sách nhận tin được thông báo sớm trước khi ưu đãi mở rộng ra thị trường.",
      },
      {
        question:
          "Có thể trả hàng hoặc đổi size nếu đặt nhầm số lượng không?",
        answer:
          "ATTD chấp nhận đổi size trong vòng 7 ngày nhận hàng cho sản phẩm còn nguyên tem, chưa qua in ấn. Phí vận chuyển đổi hàng do khách chịu. Không nhận trả hàng với lý do đổi ý nếu hàng không có lỗi sản xuất. Khuyến nghị xác nhận kỹ phân bổ size trước khi đặt hàng.",
      },
      {
        question: "ATTD có hỗ trợ thanh toán trả chậm hoặc công nợ không?",
        answer:
          "Với đối tác đại lý chính thức đã hợp tác từ 3 tháng trở lên và có lịch sử đặt hàng tốt, ATTD có thể xem xét hạn mức công nợ ngắn hạn (7-14 ngày) theo từng trường hợp. Liên hệ trực tiếp để thảo luận điều kiện cụ thể.",
      },
    ],
    ctaTitle: "Muốn nhận bảng giá sỉ áo thun trơn?",
    ctaDescription:
      "Liên hệ ATTD để nhận bảng giá sỉ chi tiết theo số lượng, tìm hiểu chính sách đại lý và đăng ký trở thành đối tác chính thức ngay hôm nay.",
    internalLinks: [
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
      { label: "Nguồn hàng áo thun trơn", href: "/nguon-hang-ao-thun-tron" },
      { label: "Đăng ký đại lý", href: "/dai-ly" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // NGUỒN HÀNG ÁO THUN TRƠN
  // Focus: supply chain, reliability for print shops, B2B sourcing
  // ───────────────────────────────────────────────────────────────────────────
  "nguon-hang-ao-thun-tron": {
    seoTitle:
      "Nguồn Hàng Áo Thun Trơn Cho Xưởng In Và Đại Lý | ATTD",
    metaDescription:
      "Nguồn hàng áo thun trơn B2B ổn định — nhà cung cấp trực tiếp, chất liệu chuẩn cho in thêu, tồn kho sẵn sàng, giao hàng toàn quốc. Liên hệ ATTD ngay.",
    h1: "Nguồn Hàng Áo Thun Trơn Cho Xưởng In Và Đại Lý",
    heroIntro:
      "Tìm được nguồn hàng áo thun trơn ổn định, chất lượng nhất quán và giá cạnh tranh là nền tảng quan trọng của mọi xưởng in và đại lý thành công. ATTD là nhà cung cấp B2B trực tiếp — không qua trung gian, đảm bảo chất lượng từ gốc đến tay bạn.",
    intro: `<p>Một xưởng in hay đại lý đồng phục thành công phụ thuộc rất lớn vào chất lượng <strong>nguồn hàng áo thun trơn</strong> đầu vào. Áo thun không đạt chuẩn — vải nhăn, màu không đều, gsm không đủ — trực tiếp ảnh hưởng đến chất lượng thành phẩm in ấn và uy tín với khách hàng. Đây là lý do lựa chọn nhà cung cấp phù hợp là một trong những quyết định kinh doanh quan trọng nhất.</p>

<p>ATTD là <strong>nhà cung cấp nguồn hàng áo thun trơn B2B</strong> với định hướng phục vụ xưởng in, xưởng thêu và đại lý là ưu tiên hàng đầu. Chúng tôi làm việc trực tiếp với nhà máy sản xuất — không qua nhà phân phối trung gian — để đảm bảo giá tốt nhất và kiểm soát chất lượng chặt chẽ nhất. Mỗi lô hàng nhập về đều được QC về trọng lượng gsm, độ bền màu, form dáng và chất lượng may trước khi vào kho.</p>

<p>Điều quan trọng nhất khi chọn nguồn hàng cho xưởng in là <strong>tính ổn định màu theo lô</strong>. Nếu màu vải thay đổi giữa các lô, đơn hàng in tiếp theo không thể match với đơn hàng tái tục — gây ra vấn đề về màu sắc thành phẩm, khiếu nại từ khách và lãng phí công in. ATTD giải quyết vấn đề này bằng cách kiểm soát kenh sản xuất riêng và lưu mẫu màu chuẩn cho từng SKU để đảm bảo tính nhất quán tuyệt đối.</p>

<p>Ngoài áo thun trơn, ATTD cũng cung cấp <strong>áo polo trơn, nón, tote và bình giữ nhiệt</strong> — giúp xưởng in và đại lý có thể đơn giản hóa chuỗi cung ứng bằng cách làm việc với một đối tác thay vì phân tán nhiều nhà cung cấp khác nhau. Quản lý ít đối tác hơn, quy trình đặt hàng đơn giản hơn và dịch vụ tốt hơn — đây là mô hình cung ứng tối ưu cho doanh nghiệp vừa và nhỏ.</p>`,
    suitableCustomers: [
      {
        title: "Xưởng in lụa và in kỹ thuật số",
        description:
          "Nguồn hàng áo thun trơn ATTD được thiết kế đặc biệt cho xưởng in — bề mặt vải phẳng mịn nhận mực tốt, màu sắc ổn định giữa các lô, form dáng chuẩn đảm bảo vị trí in nhất quán trên từng chiếc áo.",
      },
      {
        title: "Xưởng thêu vi tính",
        description:
          "Chất liệu cotton mịn của ATTD phù hợp cho thêu vi tính mật độ cao. Vải không bị nhăn, căng đều trên khung thêu — đảm bảo đường thêu sắc nét và bám chắc không bị nhấp nhô. Phù hợp cả thêu flat và thêu 3D.",
      },
      {
        title: "Đại lý tìm nguồn hàng ổn định",
        description:
          "Đại lý cần nguồn hàng trơn để tự in/thêu hoặc bán lại cho xưởng con. ATTD là nhà cung cấp trực tiếp với giá tốt hơn so với mua qua trung gian, đồng thời đảm bảo chất lượng nhất quán cho uy tín của đại lý với khách hàng cuối.",
      },
      {
        title: "Công ty quảng cáo và sản xuất merchandise",
        description:
          "Agency và công ty merchandise cần nguồn hàng trơn chất lượng cao để sản xuất sản phẩm branded. ATTD cung cấp áo thun trơn phù hợp cho in in UV, in sublimation và các kỹ thuật in chuyên nghiệp khác.",
      },
      {
        title: "Nhà phân phối vùng và khu vực",
        description:
          "Nhà phân phối khu vực tìm nguồn hàng trực tiếp từ ATTD để phân phối lại cho xưởng in và đại lý trong vùng. Giá sỉ tốt từ nguồn trực tiếp giúp nhà phân phối duy trì biên lợi nhuận cạnh tranh.",
      },
      {
        title: "Local brand mới tạo sản phẩm",
        description:
          "Brand mới tìm nguồn áo trơn chất lượng để tạo dòng sản phẩm đầu tiên. ATTD hỗ trợ brand với MOQ thấp, tư vấn chất liệu phù hợp với định vị thương hiệu và cung cấp mẫu thử trước khi đặt số lượng lớn.",
      },
    ],
    whyAttd: [
      {
        title: "Nhà cung cấp trực tiếp, không qua trung gian",
        description:
          "ATTD làm việc trực tiếp với nhà máy sản xuất — loại bỏ chi phí trung gian, đảm bảo bạn nhận được giá tốt nhất và thông tin về nguồn gốc, chất lượng vật liệu rõ ràng nhất. Không qua đại lý, không qua nhập khẩu, không qua trung gian.",
      },
      {
        title: "Chất liệu chuẩn hóa cho in ấn",
        description:
          "Áo thun trơn ATTD được chuẩn hóa về gsm, loại cotton, cách dệt và xử lý hoàn tất — tất cả đều nhằm tối ưu cho in ấn và thêu thùa. Không phải thử nghiệm mực in hay điều chỉnh thông số máy thêu khi đổi lô hàng.",
      },
      {
        title: "Màu sắc ổn định tuyệt đối",
        description:
          "ATTD lưu mẫu màu chuẩn cho từng SKU và kiểm tra màu sắc theo lô. Tỷ lệ chênh màu giữa các lô dưới 1% — đảm bảo xưởng in không bao giờ gặp vấn đề màu sắc khi tái sản xuất đơn hàng có màu cụ thể.",
      },
      {
        title: "Hỗ trợ kỹ thuật in ấn",
        description:
          "Đội ngũ ATTD tư vấn kỹ thuật in phù hợp cho từng loại vải và từng kiểu thiết kế — giúp xưởng in tối ưu thông số in để đạt màu sắc và độ sắc nét tốt nhất, giảm hao phí mực và thời gian setup.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question: "Áo thun trơn ATTD phù hợp với những kỹ thuật in nào?",
        answer:
          "Áo thun cotton của ATTD phù hợp cho tất cả kỹ thuật in phổ biến: in lụa (screen printing) cho đơn màu đồng nhất, in kỹ thuật số (DTG/DTF) cho thiết kế nhiều màu phức tạp, in chuyển nhiệt (heat transfer) cho đơn nhỏ và in UV cho chất lượng cao cấp. Mỗi kỹ thuật cho ra chất lượng thành phẩm khác nhau — ATTD tư vấn kỹ thuật phù hợp dựa trên yêu cầu cụ thể của bạn.",
      },
      {
        question: "Gsm (trọng lượng vải) của áo thun trơn ATTD là bao nhiêu?",
        answer:
          "ATTD cung cấp áo thun ở 3 mức gsm: 160gsm (nhẹ, phù hợp sự kiện và mùa hè), 190gsm (cân bằng giữa chất lượng và giá, phổ biến nhất), và 220gsm (dày, bền, phù hợp đồng phục dài hạn). Mỗi mức gsm phù hợp với một phân khúc sử dụng và giá thành khác nhau.",
      },
      {
        question:
          "Làm thế nào để đảm bảo màu vải không thay đổi giữa các lô hàng?",
        answer:
          "ATTD lưu mẫu màu chuẩn (physical swatch) cho từng SKU và kiểm tra màu sắc của từng lô nhập về bằng cách so sánh trực tiếp với mẫu chuẩn. Nếu có chênh màu vượt ngưỡng chấp nhận, lô đó không được đưa vào kho. Tỷ lệ lô hàng bị từ chối vì chênh màu là dưới 3% — con số này minh chứng cho độ nghiêm ngặt của quy trình QC.",
      },
      {
        question: "ATTD có cung cấp mẫu thử (sample) trước khi đặt hàng lớn không?",
        answer:
          "Có. Khách hàng mới có thể yêu cầu mẫu thử (1-3 chiếc) để kiểm tra chất liệu, màu sắc và form dáng trước khi đặt đơn hàng lớn. Chi phí mẫu được tính vào đơn hàng đầu tiên khi hai bên tiến hành hợp tác. Liên hệ qua Zalo hoặc form để yêu cầu mẫu.",
      },
      {
        question:
          "Bao lâu thì ATTD nhập lô hàng mới? Làm sao theo dõi tồn kho?",
        answer:
          "ATTD nhập hàng định kỳ mỗi 2-4 tuần tùy mùa vụ và nhu cầu. Đối tác thường xuyên được đăng ký nhận thông báo tồn kho qua Zalo — nhận thông tin sớm khi một màu sắp về và khi có lô hàng mới. Bảng tồn kho realtime có thể yêu cầu qua email hoặc Zalo bất kỳ lúc nào.",
      },
      {
        question:
          "Nếu chất lượng áo thun nhận được khác với mẫu, ATTD xử lý thế nào?",
        answer:
          "ATTD cam kết đổi toàn bộ hàng không đạt tiêu chuẩn so với mẫu đã xác nhận trong vòng 7 ngày nhận hàng. Cần cung cấp ảnh/video chứng minh sự khác biệt. Nếu lỗi từ phía ATTD, toàn bộ chi phí vận chuyển đổi hàng do ATTD chịu. Trường hợp tranh chấp được giải quyết bằng kiểm tra mẫu lưu (physical swatch) tại kho.",
      },
    ],
    ctaTitle: "Tìm nguồn hàng áo thun trơn ổn định?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá B2B, tư vấn chất liệu phù hợp cho xưởng in và đặt mẫu thử chất lượng trước khi đặt số lượng lớn.",
    internalLinks: [
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron-si" },
      { label: "Xem danh mục", href: "/ao-thun-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // KHO ÁO POLO TRƠN
  // Focus: polo inventory, corporate supply
  // ───────────────────────────────────────────────────────────────────────────
  "kho-ao-polo-tron": {
    seoTitle: "Kho Áo Polo Trơn Số Lượng Lớn | Tồn Kho Sẵn Sàng | ATTD",
    metaDescription:
      "Kho áo polo trơn ATTD — tồn kho lớn pique cotton cao cấp, đa màu, đủ size S-4XL. Giao hàng nhanh cho đồng phục doanh nghiệp, xưởng in và đại lý toàn quốc.",
    h1: "Kho Áo Polo Trơn Số Lượng Lớn",
    heroIntro:
      "ATTD duy trì kho áo polo trơn với tồn kho thường trực — pique cotton cao cấp, màu sắc doanh nghiệp phong phú, đầy đủ size. Sẵn sàng giao hàng ngay cho đơn đồng phục, xưởng in và đại lý trên toàn quốc.",
    intro: `<p>Áo polo trơn là mặt hàng đồng phục có nhu cầu ổn định và cao nhất trong phân khúc doanh nghiệp tại Việt Nam. Từ văn phòng, ngân hàng đến chuỗi nhà hàng và trung tâm thương mại — áo polo mang đến vẻ ngoài lịch sự, thoải mái và dễ tùy chỉnh theo thương hiệu. ATTD nhận thấy nhu cầu này từ sớm và xây dựng <strong>kho áo polo trơn</strong> với tồn kho lớn, sẵn sàng phục vụ mọi quy mô đơn hàng.</p>

<p>Áo polo trong kho ATTD được sản xuất từ chất liệu <strong>pique cotton cao cấp</strong> — sợi đan chặt, bề mặt có cấu trúc lưới nhỏ đặc trưng của polo, giữ form dáng tốt và thấm hút mồ hôi hiệu quả. Bo cổ và tay dệt kỹ không bị giãn theo thời gian — đây là điểm quan trọng để áo polo giữ được vẻ ngoài chuyên nghiệp sau nhiều lần giặt và sử dụng.</p>

<p>Kho ATTD hiện duy trì <strong>màu sắc doanh nghiệp phổ biến</strong> trong tồn kho thường trực — trắng, đen, navy, xanh royal, xanh lá doanh nghiệp, đỏ và xám — đây đều là màu đồng phục được doanh nghiệp sử dụng nhiều nhất. Với đủ dải size từ S đến 4XL trong kho, đơn đồng phục có thể được hoàn thành và giao hàng trong 3-5 ngày làm việc thay vì phải chờ sản xuất 15-20 ngày như với hàng đặt riêng.</p>

<p>ATTD cũng duy trì kho <strong>áo polo màu mùa vụ</strong> — màu đất, màu pastel, olive và các tone trung tính theo xu hướng năm — phục vụ đại lý thời trang và local brand muốn tạo BST polo theo mùa với số lượng linh hoạt. Bảng màu được cập nhật mỗi quý để đối tác luôn có sản phẩm trending mà không cần sản xuất riêng.</p>`,
    suitableCustomers: [
      {
        title: "Xưởng in thêu đồng phục",
        description:
          "Xưởng cần kho polo trơn để nhận đơn in thêu logo doanh nghiệp số lượng lớn. Áo polo pique của ATTD với bề mặt vải đều phù hợp cho thêu vi tính mật độ cao và in lụa sắc nét — thành phẩm đẹp, logo rõ và bám chắc.",
      },
      {
        title: "Đại lý đồng phục văn phòng",
        description:
          "Đại lý phục vụ doanh nghiệp và văn phòng luôn cần tồn kho polo sẵn để đáp ứng đơn gấp. Kho ATTD đảm bảo đại lý có hàng đúng màu đúng size ngay khi cần — không mất đơn vì thiếu hàng.",
      },
      {
        title: "Công ty đồng phục trọn gói",
        description:
          "Công ty đồng phục nhận đơn trọn gói từ doanh nghiệp cần nguồn polo trơn chất lượng làm đầu vào. Giá sỉ tốt từ ATTD giúp công ty đồng phục duy trì biên lợi nhuận cạnh tranh trong thị trường đồng phục ngày càng cạnh tranh.",
      },
      {
        title: "Doanh nghiệp đặt đồng phục trực tiếp",
        description:
          "Doanh nghiệp không muốn qua trung gian có thể đặt polo trơn thẳng từ ATTD và tự chọn xưởng in/thêu. Tiết kiệm chi phí trung gian, chủ động hơn về chất lượng đầu vào và thời gian nhận hàng.",
      },
      {
        title: "Agency event và corporate branding",
        description:
          "Agency cần áo polo trơn cho sự kiện doanh nghiệp, activation thương hiệu và roadshow. Kho polo sẵn sàng của ATTD giúp agency đáp ứng deadline nghiêm ngặt từ phía khách hàng doanh nghiệp.",
      },
      {
        title: "Local brand phân khúc business casual",
        description:
          "Brand phân khúc business casual và workwear tìm nguồn polo trơn chất lượng để tạo dòng sản phẩm. Pique cotton cao cấp của ATTD phù hợp cho brand định vị ở phân khúc mid-to-premium với mức giá đầu vào hợp lý.",
      },
    ],
    whyAttd: [
      {
        title: "Pique cotton cao cấp luôn sẵn kho",
        description:
          "Không như nhiều nhà cung cấp chỉ có một loại polo, ATTD duy trì kho nhiều loại pique từ 180gsm nhẹ đến 220gsm cao cấp — phù hợp cho mọi phân khúc từ sự kiện đến đồng phục dài hạn. Tất cả đều sẵn kho, không chờ sản xuất.",
      },
      {
        title: "Màu doanh nghiệp phong phú",
        description:
          "Bộ sưu tập màu ATTD được thiết kế theo nhu cầu doanh nghiệp thực tế — không chỉ màu basic mà còn có các corporate tone như navy dệt, burgundy, forest green và stone grey. Màu sắc ổn định theo lô, dễ dàng bổ sung sau.",
      },
      {
        title: "Bo cổ và tay dệt bền chắc",
        description:
          "Kỹ thuật dệt bo cổ và tay ba lớp của ATTD đảm bảo không bị giãn, không bị vặn xoắn sau nhiều lần giặt. Đây là tiêu chuẩn quan trọng để áo polo giữ được hình dáng chuyên nghiệp trong suốt thời gian sử dụng.",
      },
      {
        title: "Thời gian giao hàng cạnh tranh",
        description:
          "Kho polo sẵn sàng giúp rút ngắn thời gian giao hàng từ 15-20 ngày (nếu phải sản xuất riêng) xuống còn 3-5 ngày làm việc cho đơn hàng có sẵn màu trong kho. Quan trọng cho đơn hàng đồng phục có deadline khai trương hoặc sự kiện.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question:
          "Kho ATTD có những màu polo nào luôn sẵn sàng giao hàng ngay?",
        answer:
          "Màu polo thường xuyên có sẵn kho: trắng, đen, xám nhạt, xám đậm, navy, xanh royal, đỏ, xanh lá doanh nghiệp và be. Màu mùa vụ (olive, burgundy, dusty rose, stone grey) thường có với số lượng giới hạn. Liên hệ để nhận bảng tồn kho màu polo mới nhất trước khi đặt hàng.",
      },
      {
        question: "Áo polo pique của ATTD có chất liệu như thế nào?",
        answer:
          "ATTD cung cấp polo pique cotton 100% (180gsm và 220gsm) và polo CVC pique (cotton 60% / polyester 40%, 200gsm). Cotton 100% thoáng mát hơn, phù hợp ngành dịch vụ và ngoài trời. CVC pique bền hơn, giữ màu tốt hơn qua nhiều lần giặt — phù hợp đồng phục văn phòng dài hạn.",
      },
      {
        question: "MOQ kho áo polo trơn sỉ là bao nhiêu?",
        answer:
          "Áo polo trơn sỉ từ 50 chiếc/đơn, MOQ theo màu từ 30 chiếc. Đơn đa màu: cộng tổng số lượng để tính bậc giá, với MOQ mỗi màu từ 30 chiếc. Đơn dưới 50 chiếc vẫn được phục vụ với giá niêm yết.",
      },
      {
        question: "Thời gian giao hàng đơn polo từ kho ATTD là bao lâu?",
        answer:
          "Đơn áo polo trơn không in ấn dưới 300 chiếc giao trong 3-5 ngày làm việc. Đơn 300-500 chiếc: 5-7 ngày. Đơn trên 500 chiếc: lên kế hoạch giao hàng cụ thể. Đơn có in/thêu logo thêm 7-14 ngày tùy kỹ thuật và số lượng.",
      },
      {
        question:
          "Áo polo ATTD có phù hợp cho thêu vi tính không? Mật độ thêu tối đa là bao nhiêu?",
        answer:
          "Pique cotton ATTD phù hợp cho thêu vi tính với mật độ đường thêu trung bình đến cao. Logo chuẩn kích thước 6×6cm đến 10×8cm có thể thêu với mật độ 8000-12000 mũi/cm² tùy phần mềm thêu và khung vải. Khuyến nghị dùng backing giấy chống nhô tươm để đường thêu phẳng và sắc nét nhất.",
      },
      {
        question: "Có thể đặt polo với bo cổ màu tương phản không?",
        answer:
          "Có. Polo cổ tương phản (contrast collar) — ví dụ thân trắng cổ navy, thân xanh cổ trắng — có thể đặt với đơn từ 100 chiếc/combo màu với thời gian sản xuất 15-20 ngày. Mẫu này không có sẵn kho mà sản xuất theo đơn đặt. Liên hệ để báo giá và xác nhận thời gian.",
      },
    ],
    ctaTitle: "Cần kiểm tra kho áo polo trơn?",
    ctaDescription:
      "Liên hệ ATTD để nhận bảng tồn kho polo, báo giá sỉ theo số lượng và đặt hàng ngay. Pique cotton cao cấp, giao hàng toàn quốc trong 3-5 ngày làm việc.",
    internalLinks: [
      { label: "Áo polo trơn sỉ", href: "/ao-polo-tron-si" },
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
      { label: "Xem danh mục polo", href: "/ao-polo-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO POLO TRƠN SỈ
  // Focus: polo wholesale pricing, dealer channel, buying polo wholesale
  // ───────────────────────────────────────────────────────────────────────────
  "ao-polo-tron-si": {
    seoTitle: "Áo Polo Trơn Sỉ Giá Tốt | Đại Lý & Xưởng In | ATTD",
    metaDescription:
      "Áo polo trơn sỉ ATTD — pique cotton cao cấp, giá bậc thang cạnh tranh, chiết khấu đại lý hấp dẫn. Nguồn hàng polo B2B cho xưởng in, đại lý và doanh nghiệp.",
    h1: "Áo Polo Trơn Sỉ Giá Tốt Cho Đại Lý Và Xưởng In",
    heroIntro:
      "Mua sỉ áo polo trơn từ ATTD — pique cotton cao cấp, chính sách giá minh bạch theo bậc số lượng, chiết khấu đại lý lên đến 20%. Đối tác cung cấp polo tin cậy của hàng trăm xưởng in và công ty đồng phục.",
    intro: `<p>Thị trường áo polo đồng phục tại Việt Nam tăng trưởng đều đặn mỗi năm khi ngày càng nhiều doanh nghiệp, trường học và tổ chức chọn polo làm trang phục đồng bộ. Điều này tạo ra cơ hội kinh doanh lớn cho xưởng in, đại lý đồng phục và nhà phân phối — và cũng đòi hỏi nguồn áo <strong>polo trơn sỉ</strong> chất lượng ổn định với giá cạnh tranh.</p>

<p>ATTD là đơn vị cung cấp áo polo trơn sỉ B2B với chính sách giá được thiết kế riêng cho từng nhóm khách hàng. <strong>Xưởng in và xưởng thêu</strong> được hưởng giá sỉ khi mua từ 50 chiếc, tập trung vào ổn định màu và chất lượng vải phù hợp in ấn. <strong>Đại lý chính thức</strong> đăng ký tài khoản được hưởng chiết khấu cố định 10-20% bất kể số lượng — đây là mức chiết khấu dài hạn giúp đại lý duy trì biên lợi nhuận ổn định.</p>

<p>Điểm quan trọng khi mua sỉ áo polo trơn là lựa chọn đúng <strong>loại pique và trọng lượng vải</strong> phù hợp với mục đích sử dụng. Đồng phục nhà hàng và dịch vụ ngoài trời cần pique cotton 180gsm thoáng mát. Đồng phục văn phòng và ngân hàng cần pique cotton 200-220gsm lịch sự và bền hơn. Polo sự kiện ngân sách thấp có thể dùng CVC pique với chi phí tốt hơn. ATTD tư vấn chi tiết để bạn chọn đúng sản phẩm ngay từ đầu.</p>

<p>Ngoài chính sách giá, ATTD còn hỗ trợ đại lý và xưởng in qua <strong>thông tin sản phẩm đầy đủ</strong>: bảng màu vật lý gửi theo yêu cầu, thông số kỹ thuật vải, hướng dẫn bảo quản và tư vấn kỹ thuật in thêu. Đây là những hỗ trợ giúp đối tác của ATTD phục vụ khách hàng cuối tốt hơn và xây dựng uy tín trong ngành đồng phục.</p>`,
    suitableCustomers: [
      {
        title: "Đại lý đồng phục polo",
        description:
          "Đại lý phân phối polo đồng phục cho doanh nghiệp và tổ chức. Chính sách chiết khấu đại lý chính thức ATTD tạo biên lợi nhuận bền vững — 30-50% tùy kênh bán và loại sản phẩm cuối.",
      },
      {
        title: "Xưởng in thêu đồng phục",
        description:
          "Xưởng nhận đơn in thêu polo từ doanh nghiệp cần nguồn polo trơn chất lượng ổn định. Pique cotton ATTD phù hợp cho mọi kỹ thuật in thêu phổ biến với màu sắc không bị biến đổi qua công đoạn gia công.",
      },
      {
        title: "Công ty đồng phục và tư vấn hình ảnh",
        description:
          "Công ty chuyên cung cấp giải pháp đồng phục toàn diện cho doanh nghiệp cần nguồn polo chất lượng cao, ổn định theo lô và có đủ màu doanh nghiệp. ATTD đáp ứng đầy đủ tiêu chí này với cam kết chất lượng cụ thể.",
      },
      {
        title: "Nhà phân phối khu vực",
        description:
          "Nhà phân phối vùng miền mua polo sỉ từ ATTD để phân phối lại cho xưởng in địa phương. Giá sỉ trực tiếp từ nguồn giúp nhà phân phối cạnh tranh tốt hơn trong thị trường khu vực.",
      },
      {
        title: "Local brand phân khúc business",
        description:
          "Brand tập trung vào phân khúc business casual và workwear cần polo chất lượng tốt, bề mặt đẹp và màu sắc phong phú. Pique cotton ATTD là nền tảng hoàn hảo để xây dựng dòng polo thương hiệu riêng với chi phí đầu vào hợp lý.",
      },
      {
        title: "Trường học và tổ chức giáo dục",
        description:
          "Trường học, trung tâm giáo dục và các tổ chức giáo dục thường đặt polo đồng phục định kỳ mỗi năm học. Giá sỉ tốt, màu ổn định và giao hàng đúng đầu năm học là những yêu cầu quan trọng mà ATTD đáp ứng tốt.",
      },
    ],
    whyAttd: [
      {
        title: "Chuyên polo pique, không phải hàng đa năng",
        description:
          "ATTD chuyên sâu vào polo pique cotton cao cấp — không phải nhà cung cấp hàng đa dạng làm tất cả mặt hàng nhưng không tốt ở mặt hàng nào. Sự chuyên môn hóa này giúp ATTD duy trì chất lượng và ổn định cao hơn cho từng SKU polo.",
      },
      {
        title: "Giá sỉ cạnh tranh, minh bạch",
        description:
          "Bảng giá sỉ polo ATTD được công bố rõ ràng theo bậc số lượng. Không có thương lượng lâu, không có giá ẩn. Bạn biết chính xác mình trả bao nhiêu trước khi đặt hàng — thuận tiện cho lập kế hoạch tài chính và tính giá bán.",
      },
      {
        title: "Hỗ trợ catalog màu vật lý",
        description:
          "ATTD gửi bảng màu vật lý (physical swatch) theo yêu cầu — giúp bạn chọn màu chính xác và chia sẻ với khách hàng cuối mà không gặp sự cố màu sắc hiển thị không trung thực trên màn hình.",
      },
      {
        title: "Tư vấn kỹ thuật thêu và in polo",
        description:
          "ATTD tư vấn chi tiết về thông số kỹ thuật phù hợp cho từng loại pique — giúp xưởng in thêu tối ưu kết quả thành phẩm và giảm tỷ lệ lỗi. Hỗ trợ kỹ thuật này là yếu tố tạo ra sự khác biệt quan trọng cho chất lượng đơn hàng cuối.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question:
          "Mua sỉ áo polo trơn ATTD, số lượng và bậc giá như thế nào?",
        answer:
          "Bậc giá polo sỉ ATTD: từ 50 chiếc (bậc 1), từ 100 chiếc (bậc 2), từ 300 chiếc (bậc 3), từ 500 chiếc (bậc đặc biệt, thương lượng). Đại lý chính thức được chiết khấu thêm 10-20% trên tất cả các bậc. MOQ theo màu từ 30 chiếc.",
      },
      {
        question: "Sự khác biệt giữa polo cotton 100% và polo CVC của ATTD?",
        answer:
          "Polo cotton 100%: thoáng mát hơn, cảm giác mặc tự nhiên hơn, giá cao hơn. Phù hợp ngành dịch vụ, nhà hàng, ngoài trời. Polo CVC (60% cotton / 40% polyester): bền hơn, giữ màu tốt hơn qua nhiều lần giặt, ít co rút hơn, giá thấp hơn. Phù hợp đồng phục văn phòng dài hạn và môi trường giặt máy thường xuyên.",
      },
      {
        question:
          "Đặt sỉ polo trơn ATTD có nhận được catalog màu vật lý không?",
        answer:
          "Có. Đối tác đặt hàng lần đầu có thể yêu cầu bảng màu vật lý (swatch book) qua bưu điện để chọn màu chính xác hơn. Phí gửi swatch book tính theo chi phí bưu điện thực tế và được miễn phí cho đơn từ 200 chiếc trở lên.",
      },
      {
        question: "Áo polo sỉ ATTD có bảo hành lỗi sản xuất không?",
        answer:
          "Có. Bảo hành 30 ngày cho lỗi sản xuất bao gồm: bo cổ và tay bị lỏng/sút chỉ, khuy nút bị bung, đường may bị hở hoặc màu vải không đều bên trong/bên ngoài. Phát hiện trong 30 ngày, cung cấp ảnh chứng minh và ATTD đổi hoặc hoàn tiền toàn phần.",
      },
      {
        question:
          "Có thể đặt polo sỉ với size fitting cho nữ (slimfit) không?",
        answer:
          "ATTD cung cấp cả polo unisex và polo nữ fit. Polo nữ fit (narrower shoulders, tapered waist) sẵn kho cho một số màu cơ bản. Với đơn từ 100 chiếc/màu, có thể sản xuất polo nữ fit theo màu yêu cầu trong 15-20 ngày. Liên hệ để báo giá chi tiết.",
      },
      {
        question: "Thời gian giao hàng đơn polo sỉ trên 500 chiếc là bao lâu?",
        answer:
          "Đơn 500+ chiếc màu cơ bản có sẵn kho: 5-7 ngày làm việc. Đơn 500+ chiếc màu đặc biệt không có kho: 15-20 ngày sản xuất. Với đơn cần in/thêu logo, cộng thêm 7-14 ngày gia công tùy kỹ thuật. ATTD lên lịch giao hàng cụ thể khi nhận đặt cọc.",
      },
    ],
    ctaTitle: "Muốn nhận báo giá sỉ áo polo trơn?",
    ctaDescription:
      "Liên hệ ATTD để nhận bảng giá sỉ polo theo số lượng, tư vấn chọn loại pique phù hợp và đăng ký đại lý chính thức hưởng chiết khấu tốt nhất.",
    internalLinks: [
      { label: "Kho áo polo trơn", href: "/kho-ao-polo-tron" },
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron-si" },
      { label: "Xem danh mục polo", href: "/ao-polo-tron" },
    ],
  },
};

export function getWholesaleContent(slug: string): WholesaleContent | null {
  return content[slug] ?? null;
}

export const WHOLESALE_SLUGS = Object.keys(content);
