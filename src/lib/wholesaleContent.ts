/**
 * Static content registry for wholesale áo trơn SEO cluster.
 *
 * Pages each target a distinct commercial search intent within the
 * kho / trơn / sỉ / nguồn hàng keyword cluster.
 *
 * Commercial claims (MOQ, price tiers, discounts, lead time, capacity,
 * partner counts) must stay safe — quote via CRM, do not invent numbers.
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
    title: "Gửi nhu cầu nguồn hàng",
    description:
      "Cho ATTD biết nhóm khách (xưởng in, đại lý, agency, local brand), form áo, chất liệu quan tâm, màu/size dự kiến và mục đích sử dụng (in lụa, DTF, thêu, bán lại).",
  },
  {
    step: 2,
    title: "Nhận tư vấn và báo giá",
    description:
      "Team ATTD đối chiếu tồn kho thực tế, gợi ý form/chất liệu phù hợp kỹ thuật in-thêu, rồi gửi báo giá theo số lượng và điều kiện giao nhận cụ thể của đơn.",
  },
  {
    step: 3,
    title: "Xác nhận mẫu và phân bổ",
    description:
      "Chốt mẫu khi cần, xác nhận bảng màu/size và địa chỉ giao. Đơn lớn có thể chia nhiều đợt theo kế hoạch sản xuất in/thêu của bạn.",
  },
  {
    step: 4,
    title: "Chuẩn bị và kiểm hàng",
    description:
      "ATTD chuẩn bị hàng theo đơn đã xác nhận, kiểm đếm màu/size trước khi xuất kho và đóng gói phù hợp vận chuyển B2B.",
  },
  {
    step: 5,
    title: "Giao hàng và hỗ trợ tái nhập",
    description:
      "Giao theo địa chỉ đã chốt. Sau đơn đầu, ATTD hỗ trợ tái nhập màu/size bán chạy để bạn giữ nguồn áo trơn ổn định cho các đợt sau.",
  },
];

const content: Record<string, WholesaleContent> = {
  // ───────────────────────────────────────────────────────────────────────────
  // KHO ÁO THUN TRƠN
  // Focus: inventory, stock availability, warehouse
  // ───────────────────────────────────────────────────────────────────────────
  "kho-ao-thun-tron": {
    seoTitle: "Kho áo thun trơn sẵn kho | Nguồn hàng áo trơn B2B | ATTD.vn",
    metaDescription:
      "Kho áo thun trơn ATTD cho xưởng in, đại lý và agency. Kiểm tra danh mục thực tế, đối chiếu màu/size và nhận báo giá theo tồn kho tại thời điểm yêu cầu.",
    h1: "Kho áo thun trơn sẵn kho",
    heroIntro:
      "ATTD vận hành nguồn áo thun trơn theo hướng hàng sẵn kho: bạn xem catalogue thật, gửi nhu cầu màu/size, rồi nhận tư vấn và báo giá theo tồn kho hiện có — không cam kết số liệu cố định trên trang.",
    intro: `<p>Xưởng in và đại lý thường gặp đúng một vấn đề: <strong>thiếu áo thun trơn đúng màu/size khi đơn đến</strong>. Trang kho này giúp bạn hiểu cách ATTD tổ chức nguồn hàng áo trơn sẵn kho — tập trung vào kiểm tra catalogue, lấy mẫu khi cần, và tái nhập màu core — thay vì hứa số ngày giao hay số màu cố định.</p>

<p>Hàng trong kho được phản ánh qua <a href="/ao-thun-tron">danh mục áo thun trơn</a> và các dòng sản phẩm đang ACTIVE. Tồn kho thay đổi theo đơn; vì vậy ATTD gửi bảng tồn/báo giá theo thời điểm bạn hỏi, không niêm yết “luôn đủ mọi màu/size” trên landing.</p>

<p>Khi nhập từ kho, ưu tiên màu core (trắng, đen, xám, navy…) và size curve dựa trên lịch sử đơn của bạn. Màu campaign chỉ nên ôm khi đã có brief. Xem thêm hub thương mại <a href="/ao-thun-tron-si">áo thun trơn sỉ</a> nếu bạn đang so sánh góc mua sỉ.</p>

<p>Điều kiện MOQ, lịch giao và phí vận chuyển phụ thuộc sản phẩm, số lượng và địa chỉ nhận — trao đổi qua <a href="/lien-he">yêu cầu báo giá</a>.</p>`,
    suitableCustomers: [
      {
        title: "Xưởng in",
        description:
          "Cần nguồn áo thun trơn để nhận đơn in; ưu tiên màu/size core tái nhập được và mẫu thử trước khi đổ vốn.",
      },
      {
        title: "Đại lý đồng phục",
        description:
          "Nhập đệm kho hoặc giao thẳng theo đơn khách; cần catalogue rõ và hỗ trợ tái đơn theo màu đã bán.",
      },
      {
        title: "Xưởng thêu",
        description:
          "Cần phôi trơn ổn định mặt vải/cổ áo để thêu logo; nên lấy mẫu thêu trên đúng dòng sẽ nhập.",
      },
      {
        title: "Agency & shop in",
        description:
          "Nhiều brief ngắn hạn: cần linh hoạt màu theo campaign và báo giá theo từng dự án.",
      },
      {
        title: "Local brand",
        description:
          "Dùng hàng sẵn để ra drop nhanh; chuyển OEM khi cần tem/nhãn hoặc form riêng.",
      },
      {
        title: "Doanh nghiệp mua số lượng lớn",
        description:
          "Đồng phục hoặc quà tặng nội bộ — cần tư vấn chất liệu, size curve và lộ trình lấy mẫu trước khi chốt.",
      },
    ],
    whyAttd: [
      {
        title: "Catalogue gắn với hàng thực",
        description:
          "Bạn đối chiếu sản phẩm/category đang vận hành trước khi yêu cầu báo giá — giảm rủi ro “có ảnh nhưng không có hàng”.",
      },
      {
        title: "Tư vấn theo mục đích in-thêu",
        description:
          "Regular/oversize, cotton/CVC/polyester — chọn theo kỹ thuật trang trí và khách cuối, không chỉ theo giá.",
      },
      {
        title: "Báo giá theo tồn kho thời điểm",
        description:
          "Không công bố MOQ hay lead time cố định trên trang. Điều kiện thương mại đi kèm báo giá/CRM.",
      },
      {
        title: "Kết nối sang sỉ / đại lý / OEM",
        description:
          "Cùng hệ thống nguồn hàng: bắt đầu từ kho áo trơn, mở rộng kênh đại lý hoặc OEM khi brief yêu cầu.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question: "Làm sao biết màu/size nào đang có trong kho?",
        answer:
          "Gửi nhu cầu qua form liên hệ hoặc xem danh mục sản phẩm trước. ATTD phản hồi theo tồn kho tại thời điểm báo giá — không niêm yết bảng tồn công khai cố định trên trang này.",
      },
      {
        question: "Thời gian giao hàng từ kho là bao lâu?",
        answer:
          "Phụ thuộc sản phẩm còn hàng, số lượng, địa chỉ nhận và lịch điều phối. Thời gian cụ thể được xác nhận khi báo giá — không cam kết số ngày cố định trên landing.",
      },
      {
        question: "Nếu màu cần tạm hết thì sao?",
        answer:
          "ATTD có thể gợi ý màu tương đương đang có, hoặc trao đổi phương án chờ nhập/tái cung ứng tùy từng dòng. Không nên mặc định mọi màu luôn sẵn.",
      },
      {
        question: "Có đặt nhiều màu trong một đơn được không?",
        answer:
          "Được, nếu phân bổ màu/size rõ. Điều kiện theo từng màu phụ thuộc tồn kho và chính sách báo giá của đơn.",
      },
      {
        question: "Có lấy mẫu trước khi nhập số lượng lớn không?",
        answer:
          "Nên lấy mẫu để kiểm form, cảm giác vải và thử in/thêu. Điều kiện mẫu trao đổi theo dòng sản phẩm.",
      },
      {
        question: "Giá kho có gồm vận chuyển không?",
        answer:
          "Báo giá nêu rõ phạm vi (hàng tại kho hay đã gồm vận chuyển). Phí giao nhận được tính theo địa điểm và quy mô đơn khi chốt.",
      },
    ],
    ctaTitle: "Cần kiểm tra kho áo thun trơn?",
    ctaDescription:
      "Gửi màu/size và mục đích in-thêu — ATTD đối chiếu tồn kho và gửi báo giá phù hợp xưởng in, đại lý hoặc agency.",
    primaryCta: { label: "Yêu cầu báo giá", href: "/lien-he" },
    secondaryCta: { label: "Tìm nguồn hàng", href: "/ao-thun-tron-si" },
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron-si" },
      { label: "Nguồn hàng áo thun trơn", href: "/nguon-hang-ao-thun-tron" },
      { label: "Danh mục áo thun trơn", href: "/ao-thun-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ÁO THUN TRƠN SỈ
  // Focus: wholesale price tiers, dealer registration, buying wholesale
  // ───────────────────────────────────────────────────────────────────────────
  "ao-thun-tron-si": {
    seoTitle: "Áo thun trơn sỉ | Nguồn hàng áo trơn sẵn kho | ATTD.vn",
    metaDescription:
      "Nguồn áo thun trơn sỉ sẵn kho cho xưởng in, đại lý, agency và local brand. Tư vấn form, chất liệu, màu/size và nhận báo giá theo nhu cầu thực tế.",
    h1: "Áo thun trơn sỉ — nguồn hàng áo trơn sẵn kho",
    heroIntro:
      "ATTD cung cấp nguồn áo thun trơn sỉ cho xưởng in, đại lý, agency và local brand. Tập trung hàng sẵn kho, form/chất liệu phù hợp in-thêu, và báo giá theo nhu cầu thực tế — không chỉ so giá đơn chiếc.",
    intro: `<p>Khi tìm <strong>áo thun trơn sỉ</strong>, điều quan trọng không chỉ là đơn giá thấp nhất. Xưởng in và đại lý cần nguồn hàng ổn định: form đều giữa các lô, màu/size tái nhập được, và chất liệu phù hợp kỹ thuật in lụa, DTF hay thêu. ATTD định vị là <strong>nguồn hàng áo trơn B2B</strong> — kết nối kho thực tế với nhu cầu nhập theo dự án hoặc nhập định kỳ.</p>

<p>Trên trang này bạn sẽ tìm được hướng đi thương mại: chọn form regular hoặc oversize, đối chiếu chất liệu cotton/CVC/polyester theo mục đích in, rồi chuyển sang danh mục sản phẩm và yêu cầu báo giá. Các bài hướng dẫn đi kèm giải thích tiêu chí chọn nguồn cho xưởng in và cách cân nhắc chất liệu khi nhập số lượng lớn.</p>

<p>ATTD không công bố MOQ, bậc giá hay chiết khấu cố định trên trang công khai vì điều kiện phụ thuộc tồn kho, màu/size và quy mô đơn. Bạn nhận <strong>báo giá cụ thể</strong> sau khi gửi nhu cầu — kèm tư vấn phân bổ màu/size để giảm rủi ro ứ kho hoặc thiếu size bán chạy.</p>

<p>Nếu bạn cần mở rộng sang áo polo trơn, OEM hoặc đăng ký đại lý, các liên kết nội bộ bên dưới giữ đúng vai trò: trang này là <strong>commercial hub</strong> cho cụm “áo thun trơn sỉ / nguồn hàng áo trơn”, còn blog hỗ trợ intent giáo dục.</p>`,
    suitableCustomers: [
      {
        title: "Xưởng in",
        description:
          "Cần áo thun trơn sẵn kho để nhận đơn in nhanh, giữ màu/size core và tái nhập ổn định theo mùa cao điểm.",
      },
      {
        title: "Đại lý / nhà phân phối",
        description:
          "Nhập sỉ để bán lại hoặc cung cấp cho shop in. Ưu tiên nguồn có catalogue rõ, form ổn định và hỗ trợ tái đơn.",
      },
      {
        title: "Agency & shop in áo",
        description:
          "Triển khai nhiều campaign/event: cần linh hoạt màu, chia size theo brief và báo giá theo từng dự án.",
      },
      {
        title: "Local brand",
        description:
          "Dùng hàng sẵn để ra drop nhanh, hoặc chuyển dần sang OEM khi cần tem/nhãn và form riêng.",
      },
      {
        title: "Xưởng thêu / gia công",
        description:
          "Cần phôi trơn ổn định độ dày cổ, đường may và mặt vải phù hợp thêu logo đồng phục hoặc merchandise.",
      },
      {
        title: "Doanh nghiệp mua số lượng lớn",
        description:
          "Đặt áo trơn cho đồng phục nội bộ hoặc quà tặng — cần tư vấn chất liệu, size curve và lộ trình lấy mẫu trước khi chốt.",
      },
    ],
    whyAttd: [
      {
        title: "Hàng áo trơn sẵn kho",
        description:
          "Tập trung các dòng áo thun trơn đang vận hành trong catalogue — bạn kiểm tra sản phẩm/category thực tế trước khi yêu cầu báo giá.",
      },
      {
        title: "Tư vấn theo kỹ thuật in-thêu",
        description:
          "Cotton, CVC hay polyester; regular hay oversize — ATTD hỗ trợ chọn theo mục đích in lụa, DTF, thêu và điều kiện sử dụng.",
      },
      {
        title: "Báo giá theo nhu cầu thật",
        description:
          "Không niêm yết số liệu thương mại chung chung. Báo giá dựa trên màu/size, số lượng dự kiến và điều kiện giao nhận của đơn.",
      },
      {
        title: "Kết nối đại lý & OEM khi cần",
        description:
          "Cùng một hệ thống nguồn hàng: bắt đầu từ áo trơn sỉ sẵn kho, mở rộng sang chính sách đại lý hoặc OEM/private label khi brief yêu cầu.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question: "ATTD có bán áo thun trơn sỉ cho xưởng in không?",
        answer:
          "Có. Xưởng in là nhóm khách chính của cụm nguồn hàng áo trơn. Bạn có thể xem danh mục áo thun trơn và gửi nhu cầu để nhận tư vấn form/chất liệu phù hợp kỹ thuật in.",
      },
      {
        question: "MOQ áo thun trơn sỉ là bao nhiêu?",
        answer:
          "MOQ phụ thuộc sản phẩm, màu/size và tồn kho tại thời điểm báo giá. ATTD không công bố một con số cố định trên trang này — hãy gửi nhu cầu để nhận điều kiện cụ thể.",
      },
      {
        question: "Giá sỉ có theo bậc số lượng không?",
        answer:
          "Đơn lớn thường được xem xét theo quy mô và điều kiện hợp tác. Bảng giá chi tiết được gửi qua báo giá/CRM sau khi xác nhận sản phẩm và số lượng.",
      },
      {
        question: "Có thể lấy mẫu trước khi nhập số lượng lớn không?",
        answer:
          "Nên lấy mẫu để kiểm tra form, cảm giác vải và độ phù hợp với kỹ thuật in/thêu. Điều kiện mẫu được trao đổi theo từng dòng sản phẩm.",
      },
      {
        question: "Regular và oversize khác nhau thế nào khi nhập sỉ?",
        answer:
          "Regular phù hợp đồng phục và nhiều đơn in tiêu chuẩn. Oversize thường dùng cho local brand, streetwear và một số campaign. Chọn form theo khách cuối, không chỉ theo xu hướng ảnh.",
      },
      {
        question: "Làm sao để nhận báo giá hoặc đăng ký đại lý?",
        answer:
          "Dùng CTA “Yêu cầu báo giá” hoặc “Tìm nguồn hàng” trên trang để vào form liên hệ/CRM. Nếu bạn cần kênh đại lý dài hạn, chuyển sang trang đăng ký đại lý sau khi đã xác định nhóm sản phẩm.",
      },
    ],
    ctaTitle: "Cần nguồn áo thun trơn sỉ?",
    ctaDescription:
      "Gửi nhu cầu theo form/chất liệu/màu-size — ATTD tư vấn nguồn hàng sẵn kho và gửi báo giá phù hợp xưởng in, đại lý, agency hoặc local brand.",
    primaryCta: { label: "Yêu cầu báo giá", href: "/lien-he" },
    secondaryCta: { label: "Tìm nguồn hàng", href: "/ao-thun-tron" },
    internalLinks: [
      { label: "Danh mục áo thun trơn", href: "/ao-thun-tron" },
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
      { label: "Nguồn hàng áo thun trơn", href: "/nguon-hang-ao-thun-tron" },
      { label: "Áo polo trơn", href: "/ao-polo-tron" },
      { label: "Đăng ký đại lý", href: "/dai-ly" },
      { label: "OEM & Private Label", href: "/oem" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // NGUỒN HÀNG ÁO THUN TRƠN
  // Focus: supply chain, reliability for print shops, B2B sourcing
  // ───────────────────────────────────────────────────────────────────────────
  "nguon-hang-ao-thun-tron": {
    seoTitle: "Nguồn hàng áo thun trơn cho xưởng in & đại lý | ATTD.vn",
    metaDescription:
      "Nguồn hàng áo thun trơn B2B cho xưởng in, đại lý và agency. Tư vấn form, chất liệu, tương thích in-thêu và báo giá theo nhu cầu — không bịa MOQ hay lead time.",
    h1: "Nguồn hàng áo thun trơn cho xưởng in và đại lý",
    heroIntro:
      "Chọn nguồn áo thun trơn ổn định quan trọng hơn so đơn giá thấp nhất. ATTD hỗ trợ xưởng in và đại lý đối chiếu catalogue, lấy mẫu và nhận báo giá theo nhu cầu thực tế.",
    intro: `<p>Chất lượng <strong>nguồn hàng áo thun trơn</strong> quyết định phần lớn rủi ro của xưởng in: form lệch làm lệch vị trí in, màu không đều giữa hai lô, hoặc vải không chịu được kỹ thuật bạn đang bán. Trang này tập trung vào tiêu chí chọn nguồn — không thay hub mua sỉ <a href="/ao-thun-tron-si">áo thun trơn sỉ</a>.</p>

<p>ATTD định vị là nguồn hàng áo trơn B2B gắn với catalogue sản phẩm đang ACTIVE. Bạn nên bắt đầu từ nhu cầu in/thêu và khách cuối, rồi mới chọn form và chất liệu. Các bài hướng dẫn trong cụm R1 giải thích góc xưởng in, chất liệu và form regular/oversize.</p>

<p>ATTD không công bố trên trang này các cam kết số học về MOQ, chiết khấu, tỷ lệ chênh màu hay lịch nhập cố định. Mọi điều kiện thương mại đi kèm báo giá sau khi xác nhận sản phẩm và số lượng.</p>

<p>Nếu bạn cần kiểm tra hướng hàng sẵn kho, xem thêm <a href="/kho-ao-thun-tron">kho áo thun trơn</a> và <a href="/ao-thun-tron">danh mục áo thun trơn</a>.</p>`,
    suitableCustomers: [
      {
        title: "Xưởng in lụa / DTF",
        description:
          "Cần phôi trơn phù hợp mặt in, ổn định form và tái nhập màu core để nhận đơn liên tục.",
      },
      {
        title: "Xưởng thêu",
        description:
          "Cần cổ áo và thân vải đủ ổn định để thêu logo; nên thử thêu trên mẫu đúng dòng nhập.",
      },
      {
        title: "Đại lý nguồn hàng",
        description:
          "Nhập để bán lại hoặc cung cấp cho xưởng con; ưu tiên catalogue rõ và hỗ trợ tái đơn.",
      },
      {
        title: "Agency merchandise",
        description:
          "Nhiều brief ngắn: cần linh hoạt màu/form theo campaign và báo giá theo dự án.",
      },
      {
        title: "Shop in áo",
        description:
          "Cần hàng trơn sẵn để nhận đơn lẻ/gấp; ưu tiên màu bán chạy và size curve thực tế.",
      },
      {
        title: "Local brand",
        description:
          "Dùng hàng sẵn để ra mắt nhanh; chuyển OEM khi cần nhãn/form riêng.",
      },
    ],
    whyAttd: [
      {
        title: "Góc nhìn sourcing cho người mua B2B",
        description:
          "Tư vấn theo kỹ thuật trang trí và phân khúc khách cuối — không chỉ đẩy một dòng “rẻ nhất”.",
      },
      {
        title: "Sản phẩm là nguồn sự thật",
        description:
          "Catalogue và tồn kho thực dẫn dắt báo giá. Landing không thay dữ liệu sản phẩm.",
      },
      {
        title: "Mẫu trước khi đổ vốn",
        description:
          "Khuyến nghị lấy mẫu và thử in/thêu trước khi nhập màu chủ lực số lượng lớn.",
      },
      {
        title: "Mở rộng khi brief đổi",
        description:
          "Từ áo trơn sẵn kho sang đại lý dài hạn hoặc OEM khi cần tem/nhãn và form riêng.",
      },
    ],
    process: standardProcess,
    faq: [
      {
        question: "Áo thun trơn ATTD phù hợp kỹ thuật in nào?",
        answer:
          "Tùy dòng vải và định lượng. In lụa, DTF, chuyển nhiệt hoặc thêu đều cần thử trên mẫu đúng sản phẩm sẽ nhập — không suy diễn từ tên chất liệu chung.",
      },
      {
        question: "Gsm áo thun trơn ATTD là bao nhiêu?",
        answer:
          "Gsm theo từng sản phẩm trong catalogue (ví dụ các dòng cotton có ghi định lượng trên trang sản phẩm). Không có một “gsm chuẩn duy nhất” cho mọi SKU trên landing này.",
      },
      {
        question: "Làm sao giảm rủi ro lệch màu giữa các lần nhập?",
        answer:
          "Giữ cùng mã sản phẩm, ghi nhận lô/màu đã dùng, và xác nhận tồn kho trước khi tái đơn. Khi đổi nhà cung cấp hoặc đổi mã vải, luôn lấy mẫu lại.",
      },
      {
        question: "Có hỗ trợ mẫu trước khi đặt lớn không?",
        answer:
          "Có thể yêu cầu mẫu theo dòng quan tâm. Điều kiện mẫu được trao đổi khi liên hệ — không niêm yết phí/số lượng mẫu cố định tại đây.",
      },
      {
        question: "Nguồn hàng sẵn khác OEM chỗ nào?",
        answer:
          "Hàng sẵn phù hợp giao theo tồn kho và ra drop nhanh. OEM phù hợp khi cần màu/tem/form riêng theo brief — xem thêm trang OEM khi brief yêu cầu.",
      },
      {
        question: "Bắt đầu tìm nguồn từ đâu?",
        answer:
          "Xác định kỹ thuật in-thêu và khách cuối → chọn form/chất liệu → xem danh mục → gửi yêu cầu báo giá qua form liên hệ.",
      },
    ],
    ctaTitle: "Tìm nguồn hàng áo thun trơn?",
    ctaDescription:
      "Gửi brief in-thêu, form và màu/size dự kiến — ATTD tư vấn nguồn hàng và báo giá theo catalogue thực tế.",
    primaryCta: { label: "Nhận tư vấn nguồn hàng", href: "/lien-he" },
    secondaryCta: { label: "Xem áo thun trơn sỉ", href: "/ao-thun-tron-si" },
    internalLinks: [
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron-si" },
      { label: "Danh mục áo thun trơn", href: "/ao-thun-tron" },
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
