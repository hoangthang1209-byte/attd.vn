/**
 * Static SEO content registry for category landing pages.
 *
 * Each entry keyed by category slug overrides the DB description and provides
 * rich long-form SEO content without requiring a Prisma schema change.
 *
 * intro accepts an HTML string so paragraphs can be separated by <p> tags.
 */

import type { FaqItem } from "@/components/seo/FaqSchema";
import type { ContentBenefit } from "@/components/seo/CollectionSEOContent";

export interface WholesaleClusterLink {
  label: string;
  href: string;
}

export interface WholesaleCluster {
  title: string;
  links: WholesaleClusterLink[];
}

export interface CollectionContent {
  /** Overrides the DB seoTitle — used in <title> and OpenGraph */
  seoTitle: string;
  /** Overrides the DB seoDescription — used in <meta name="description"> */
  metaDescription: string;
  /** H1 display name (falls back to cat.name if absent) */
  displayName?: string;
  /** Short intro paragraph shown below H1 */
  shortIntro: string;
  /** Full intro HTML shown in the SEO content section below products */
  intro: string;
  benefits: ContentBenefit[];
  applications: ContentBenefit[];
  faq: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  /** Optional wholesale cluster links shown as a contextual section on category pages */
  wholesaleCluster?: WholesaleCluster;
  /** Optional knowledge cluster links (fabric, size, color guides) */
  knowledgeCluster?: WholesaleCluster;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

const content: Record<string, CollectionContent> = {
  // ─────────────────────────────────────────────────────────────────────────
  // ÁO THUN TRƠN
  // ─────────────────────────────────────────────────────────────────────────
  "ao-thun-tron": {
    seoTitle: "Áo thun trơn | Danh mục nguồn hàng áo trơn | ATTD.vn",
    metaDescription:
      "Danh mục áo thun trơn ATTD cho xưởng in, đại lý, agency và local brand. Xem sản phẩm thực, chọn form/chất liệu rồi yêu cầu báo giá theo nhu cầu.",
    displayName: "Áo thun trơn",
    shortIntro:
      "Danh mục áo thun trơn sẵn kho — điểm vào để chọn sản phẩm thật trước khi yêu cầu báo giá nguồn hàng.",
    intro: `<p><strong>Áo thun trơn</strong> là category thương mại gắn với sản phẩm đang ACTIVE tại ATTD. Đây là nơi xem form, chất liệu và dòng hàng cụ thể — khác hub mua sỉ <a href="/ao-thun-tron-si">áo thun trơn sỉ</a> (góc giao dịch) và khác blog giáo dục (cách chọn nguồn/chất liệu/form).</p>

<p>Khi chọn áo thun trơn cho xưởng in hoặc đại lý, hãy đối chiếu mục đích trang trí (in lụa, DTF, thêu), cảm giác mặc của khách cuối và khả năng tái nhập màu/size. Đừng chỉ so ảnh catalogue.</p>

<p>ATTD không niêm yết trên trang category các số liệu thương mại cố định như MOQ, chiết khấu hay lead time. Điều kiện đi kèm <a href="/lien-he">yêu cầu báo giá</a> theo sản phẩm và số lượng thực tế.</p>

<p>Cần góc kho hoặc sourcing? Xem thêm <a href="/kho-ao-thun-tron">kho áo thun trơn</a> và <a href="/nguon-hang-ao-thun-tron">nguồn hàng áo thun trơn</a>.</p>`,
    benefits: [
      {
        title: "Sản phẩm là nguồn sự thật",
        description:
          "Mỗi dòng trong danh mục phản ánh catalogue đang vận hành — bạn chọn SKU cụ thể trước khi hỏi giá.",
      },
      {
        title: "Phù hợp nhiều kỹ thuật trang trí",
        description:
          "Cotton, CVC hay blend — chọn theo brief in/thêu và thử trên mẫu đúng dòng sẽ nhập.",
      },
      {
        title: "Kết nối hub sỉ & kho",
        description:
          "Từ category đi sang áo thun trơn sỉ hoặc kho áo thun trơn tùy intent mua hàng hay kiểm tra hướng sẵn kho.",
      },
      {
        title: "Báo giá theo nhu cầu",
        description:
          "Không chiết khấu/MOQ cố định trên trang. Báo giá theo màu, size, số lượng và điều kiện giao nhận.",
      },
    ],
    applications: [
      {
        title: "Xưởng in",
        description:
          "Chọn phôi trơn theo kỹ thuật in và giữ màu core để nhận đơn nhanh.",
      },
      {
        title: "Đại lý",
        description:
          "Nhập các dòng bán chạy, theo dõi tái đơn theo size curve thực tế.",
      },
      {
        title: "Đồng phục / merchandise",
        description:
          "Dùng áo thun trơn làm nền in logo cho nội bộ, event hoặc quà tặng.",
      },
      {
        title: "Local brand",
        description:
          "Ra drop từ hàng sẵn; chuyển OEM khi cần tem/form riêng.",
      },
    ],
    faq: [
      {
        question: "MOQ áo thun trơn là bao nhiêu?",
        answer:
          "MOQ phụ thuộc sản phẩm, màu/size và tồn kho lúc báo giá. Category không công bố một con số cố định — hãy gửi nhu cầu để nhận điều kiện cụ thể.",
      },
      {
        question: "Làm sao chọn đúng dòng trong danh mục?",
        answer:
          "Xác định khách cuối và kỹ thuật in-thêu trước, rồi lọc theo form (regular/oversize) và chất liệu. Lấy mẫu khi đơn lớn hoặc kỹ thuật khó.",
      },
      {
        question: "Có lấy mẫu trước khi đặt không?",
        answer:
          "Nên lấy mẫu để kiểm form và thử in/thêu. Điều kiện mẫu trao đổi khi liên hệ.",
      },
      {
        question: "Thời gian giao hàng thế nào?",
        answer:
          "Phụ thuộc tồn kho, số lượng và địa chỉ nhận. Thời gian cụ thể xác nhận trong báo giá — không cam kết số ngày cố định tại đây.",
      },
    ],
    ctaTitle: "Cần nguồn áo thun trơn?",
    ctaDescription:
      "Chọn sản phẩm trong danh mục hoặc gửi nhu cầu — ATTD tư vấn và báo giá theo tồn kho thực tế.",
    primaryCta: { label: "Yêu cầu báo giá", href: "/lien-he" },
    secondaryCta: { label: "Xem áo thun trơn sỉ", href: "/ao-thun-tron-si" },
    wholesaleCluster: {
      title: "Nguồn hàng áo thun trơn",
      links: [
        { label: "Áo thun trơn sỉ", href: "/ao-thun-tron-si" },
        { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
        { label: "Nguồn hàng cho xưởng in", href: "/nguon-hang-ao-thun-tron" },
      ],
    },
    knowledgeCluster: {
      title: "Kiến thức áo thun trơn",
      links: [
        { label: "Bảng màu áo thun trơn", href: "/bang-mau-ao-thun-tron" },
        { label: "Bảng size áo thun trơn", href: "/size-ao-thun-tron" },
        { label: "Vải cotton 2 chiều là gì?", href: "/vai-cotton-2-chieu" },
        { label: "Vải CVC là gì?", href: "/vai-cvc-la-gi" },
        { label: "Vải TC là gì?", href: "/vai-tc-la-gi" },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ÁO POLO TRƠN
  // ─────────────────────────────────────────────────────────────────────────
  "ao-polo-tron": {
    seoTitle:
      "Nguồn Sỉ Áo Polo Trơn Giá Tốt Cho Đại Lý Và Doanh Nghiệp | ATTD",
    metaDescription:
      "Áo polo trơn sỉ chất lượng cao — pique cotton, phù hợp in thêu logo đồng phục. Nguồn hàng ổn định cho đại lý, doanh nghiệp và xưởng in. Giao hàng toàn quốc.",
    shortIntro:
      "Nguồn hàng áo polo trơn cao cấp cho đại lý, doanh nghiệp và xưởng in. Chất liệu pique cotton, phù hợp in thêu đồng phục và tạo sản phẩm thương hiệu.",
    intro: `<p>Áo polo trơn là lựa chọn đồng phục hàng đầu của doanh nghiệp Việt Nam — vừa lịch sự, vừa thoải mái, lại dễ tùy chỉnh theo thương hiệu. ATTD cung cấp <strong>áo polo trơn sỉ</strong> với chất liệu pique cotton cao cấp, phù hợp cho đặt in thêu số lượng lớn theo yêu cầu doanh nghiệp và đại lý.</p>

<p>Đặc điểm nổi bật của áo polo ATTD là cổ bẻ đứng form chuẩn, bo cổ và tay dệt chắc chắn, màu sắc phong phú từ basic trắng, đen, navy đến các tone màu doanh nghiệp theo yêu cầu riêng. Bề mặt vải đều, sợi pique dày — phù hợp cho cả in kỹ thuật số và thêu vi tính với mật độ mũi cao.</p>

<p>Với kinh nghiệm phục vụ hàng trăm doanh nghiệp và đại lý trên cả nước, ATTD hiểu rõ yêu cầu về tiến độ, chất lượng và giá cả phù hợp với từng phân khúc thị trường. Từ đơn hàng đồng phục 100 bộ cho doanh nghiệp vừa đến đơn OEM 5.000 chiếc cho thương hiệu thời trang, ATTD đều có thể đáp ứng với cam kết chất lượng nhất quán.</p>

<p>Áo polo ATTD đặc biệt phù hợp cho <strong>chương trình OEM và private label</strong> — doanh nghiệp muốn tạo dòng sản phẩm riêng mang nhãn hiệu của mình. Với hỗ trợ kỹ thuật từ khâu chọn chất liệu đến hoàn thiện sản phẩm, ATTD giúp thương hiệu của bạn đến tay người dùng với chất lượng tốt nhất và chi phí tối ưu nhất.</p>`,
    benefits: [
      {
        title: "Chất liệu pique cao cấp",
        description:
          "Vải pique cotton thoáng mát, bo cổ dệt chắc chắn không bị giãn, phù hợp cho mặc hàng ngày và sự kiện doanh nghiệp. Chất liệu giữ form dáng tốt sau nhiều lần giặt, duy trì vẻ ngoài chuyên nghiệp suốt vòng đời sản phẩm.",
      },
      {
        title: "Phù hợp in thêu chuyên nghiệp",
        description:
          "Mặt vải đều, mật độ sợi cao — phù hợp cho thêu vi tính mật độ cao và in kỹ thuật số sắc nét. Logo thêu không bị nhăn, màu in không bị loang, đảm bảo chất lượng thành phẩm đồng phục đồng đều qua từng chiếc.",
      },
      {
        title: "Đa dạng màu sắc doanh nghiệp",
        description:
          "Bộ sưu tập màu rộng từ basic đến corporate: trắng, đen, xám, navy, khaki, xanh lá, đỏ và nhiều tone trung tính. Với đơn từ 300 chiếc/màu có thể sản xuất theo Pantone theo yêu cầu thương hiệu.",
      },
      {
        title: "Sản lượng lớn, tiến độ đảm bảo",
        description:
          "ATTD cam kết tiến độ sản xuất cho đơn hàng 500+ chiếc trong 15-20 ngày làm việc. Đơn hàng có hợp đồng được ưu tiên lịch sản xuất và kiểm định chất lượng trước khi xuất kho.",
      },
    ],
    applications: [
      {
        title: "Đồng phục nhân viên văn phòng",
        description:
          "Áo polo là trang phục đồng phục phổ biến nhất tại doanh nghiệp Việt Nam — vừa lịch sự khi gặp khách hàng, vừa thoải mái khi làm việc. ATTD phục vụ hàng trăm doanh nghiệp từ startup đến tập đoàn lớn với giải pháp đồng phục toàn diện.",
      },
      {
        title: "Đồng phục sự kiện và hội nghị",
        description:
          "Màu sắc nhất quán, logo thêu sắc nét tạo ấn tượng chuyên nghiệp và nhận diện thương hiệu mạnh mẽ trong các sự kiện, hội nghị, triển lãm và roadshow trên toàn quốc.",
      },
      {
        title: "Áo polo thương hiệu OEM",
        description:
          "Doanh nghiệp muốn tạo dòng sản phẩm polo mang nhãn hiệu riêng có thể hợp tác OEM với ATTD. Hỗ trợ từ thiết kế kỹ thuật, chọn chất liệu đến hoàn thiện sản phẩm với MOQ linh hoạt.",
      },
      {
        title: "Quà tặng doanh nghiệp",
        description:
          "Áo polo có logo là món quà tặng phổ biến cho đối tác chiến lược, khách hàng VIP và nhân viên nhân dịp kỷ niệm thành lập, tổng kết năm và các sự kiện đặc biệt.",
      },
    ],
    faq: [
      {
        question: "ATTD có hỗ trợ dịch vụ thêu logo trên áo polo không?",
        answer:
          "ATTD chuyên cung cấp áo polo trơn (blank) cho đối tác tự in/thêu hoặc kết hợp với xưởng gia công. Đối với đơn hàng OEM trọn gói, ATTD có thể hỗ trợ kết nối xưởng thêu vi tính uy tín để hoàn thiện sản phẩm có logo theo yêu cầu doanh nghiệp.",
      },
      {
        question: "Có thể đặt riêng màu theo Pantone không?",
        answer:
          "Với đơn hàng từ 300 chiếc/màu, ATTD có thể sản xuất theo mã màu Pantone theo yêu cầu với thời gian sản xuất 20-25 ngày. Cần cung cấp mã Pantone chính xác và duyệt mẫu màu trước khi sản xuất đại trà.",
      },
      {
        question: "Chính sách đổi trả hàng lỗi như thế nào?",
        answer:
          "ATTD cam kết đổi toàn bộ sản phẩm có lỗi do sản xuất (đường may lệch, vải thiếu màu, bo cổ lỏng) trong vòng 7 ngày kể từ ngày nhận hàng. Hàng lỗi do vận chuyển được xử lý trong 48 giờ với sự hỗ trợ của đội ngũ CSKH.",
      },
      {
        question: "Đại lý áo polo có được hỗ trợ gì từ ATTD?",
        answer:
          "Đại lý chính thức của ATTD được hưởng giá chiết khấu 10-20%, ưu tiên đặt hàng trong mùa cao điểm, hỗ trợ tư vấn xu hướng màu sắc và chính sách marketing theo mùa. Xem thêm chính sách đại lý chi tiết tại trang Chính sách đại lý.",
      },
    ],
    ctaTitle: "Cần nguồn hàng áo polo số lượng lớn?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ, tư vấn đồng phục và khám phá giải pháp OEM private label phù hợp với thương hiệu của bạn. Giao hàng toàn quốc.",
    wholesaleCluster: {
      title: "Nguồn hàng áo polo trơn",
      links: [
        { label: "Kho áo polo trơn số lượng lớn", href: "/kho-ao-polo-tron" },
        { label: "Áo polo trơn sỉ giá tốt", href: "/ao-polo-tron-si" },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NÓN
  // ─────────────────────────────────────────────────────────────────────────
  non: {
    seoTitle: "Nguồn Sỉ Nón Đồng Phục Và Nón Trơn Giá Tốt | ATTD",
    metaDescription:
      "Nón trơn sỉ đa kiểu dáng — nón lưỡi trai, bucket hat, snapback. Phù hợp đồng phục, sự kiện và nón quảng cáo in thêu logo. Giao hàng toàn quốc nhanh chóng.",
    shortIntro:
      "Nguồn hàng nón trơn đa kiểu dáng cho đại lý, xưởng in và doanh nghiệp. Chất liệu cao cấp, phù hợp in thêu đồng phục và nón sự kiện số lượng lớn.",
    intro: `<p>ATTD cung cấp <strong>nón trơn sỉ</strong> đa dạng kiểu dáng — nón lưỡi trai 6-panel, nón bucket, nón snapback và nón trucker — phục vụ nhu cầu đồng phục, sự kiện và nón quảng cáo thương hiệu số lượng lớn. Với kinh nghiệm nhiều năm trong ngành B2B, chúng tôi hiểu rõ yêu cầu khắt khe về chất liệu, form dáng và sự đồng đều màu sắc giữa các lô hàng.</p>

<p>Nón tại ATTD được sản xuất từ vải twill cotton, canvas dày dặn và polyester thoáng khí — từng chất liệu phù hợp với từng mục đích sử dụng và phân khúc giá. Phần khung nón cứng cáp, đai điều chỉnh phía sau đa dạng từ snap button, velcro đến strap da tổng hợp cao cấp. Mặt trước phẳng rộng — diện tích thêu và in lớn — lý tưởng cho logo doanh nghiệp sắc nét.</p>

<p>Đặc biệt phù hợp cho <strong>đơn hàng nón sự kiện</strong> theo mùa — ATTD có thể giao hàng nhanh với số lượng lớn nhờ kho dự trữ luôn sẵn sàng. Với <strong>đại lý thời trang</strong>, nón trơn từ ATTD dễ dàng tạo dòng sản phẩm phụ kiện với MOQ thấp và margin tốt.</p>

<p>Màu sắc phong phú từ basic đến seasonal tone — ATTD cập nhật bộ sưu tập màu theo xu hướng mỗi quý để đại lý luôn có sản phẩm mới mẻ. Hàng xuất kho đều được kiểm tra form dáng, đường may và màu sắc để đảm bảo đồng đều giữa các chiếc trong cùng một đơn hàng.</p>`,
    benefits: [
      {
        title: "Đa dạng kiểu dáng và phong cách",
        description:
          "Nón lưỡi trai 6-panel classic, 5-panel streetwear, bucket hat trend và trucker hat thoáng mát — mỗi kiểu dáng phù hợp cho thị trường mục tiêu khác nhau. ATTD cập nhật bộ sưu tập theo xu hướng thời trang để đại lý luôn có hàng mới.",
      },
      {
        title: "Vải chất lượng cao, bền màu",
        description:
          "Twill cotton bền màu và chắc chắn, polyester thoáng khí thích hợp ngoài trời, canvas cứng cáp dùng bền — mỗi loại vải được chọn phù hợp với từng kiểu nón và mục đích sử dụng. Màu sắc ổn định qua nhiều lần giặt.",
      },
      {
        title: "Diện tích in thêu rộng",
        description:
          "Mặt trước phẳng, cứng — diện tích thêu từ 6×6cm đến 10×8cm tùy kiểu nón, phù hợp cho logo doanh nghiệp, tên thương hiệu và thiết kế màu sắc phức tạp. Viền nón cũng là khu vực in thêu bổ sung phổ biến.",
      },
      {
        title: "Giá sỉ cạnh tranh cho mọi quy mô",
        description:
          "Bậc giá từ 30-50-100-300+ chiếc với chiết khấu tăng dần. Đơn hàng sự kiện lớn từ 500 chiếc được hỗ trợ giá đặc biệt và vận chuyển ưu đãi. Đại lý chính thức được hưởng giá tốt nhất và ưu tiên kho hàng.",
      },
    ],
    applications: [
      {
        title: "Đồng phục nhân viên và chuỗi cửa hàng",
        description:
          "Nhiều chuỗi bán lẻ, nhà hàng, coffee shop và cơ sở dịch vụ chọn nón có logo là một phần đồng phục nhận diện thương hiệu. Màu sắc nhất quán, form dáng đẹp giúp nhân viên tạo ấn tượng chuyên nghiệp với khách hàng.",
      },
      {
        title: "Nón sự kiện và hội nghị",
        description:
          "Nón sự kiện là item phổ biến trong gói welcome kit và goodie bag. Đơn hàng sự kiện thường từ 200-2000 chiếc với yêu cầu in đồng nhất và giao hàng theo thời hạn nghiêm ngặt — ATTD đáp ứng tốt cả hai tiêu chí này.",
      },
      {
        title: "Nón quảng cáo thương hiệu",
        description:
          "Nón in logo là quà tặng quảng cáo có tần suất sử dụng cao và thời gian hiển thị thương hiệu lâu dài. Chi phí thấp, hiệu quả nhận diện cao — lựa chọn lý tưởng cho chiến dịch brand activation và chương trình khách hàng thân thiết.",
      },
      {
        title: "Bán lẻ qua đại lý thời trang",
        description:
          "Nón trơn từ ATTD dễ dàng tạo dòng sản phẩm phụ kiện thời trang cho đại lý với MOQ thấp. Màu sắc trendy, chất lượng tốt, giá sỉ hấp dẫn — biên lợi nhuận bán lẻ từ 40-60% tùy kênh phân phối.",
      },
    ],
    faq: [
      {
        question: "Nón có đủ size cho người lớn và trẻ em không?",
        answer:
          "ATTD cung cấp nón size người lớn (56-60cm chu vi đầu) và size trẻ em (50-54cm). Các kiểu nón có đai snapback hoặc velcro điều chỉnh kích thước linh hoạt, phù hợp cho cả người đầu to lẫn đầu nhỏ mà không cần sản xuất nhiều size khác nhau.",
      },
      {
        question: "MOQ nón trơn bán sỉ là bao nhiêu?",
        answer:
          "Nón trơn bán sỉ từ 30 chiếc/màu/kiểu tùy model. Đơn hàng in thêu logo có MOQ riêng tùy xưởng gia công, thường từ 50-100 chiếc để đảm bảo chất lượng in đồng đều. Liên hệ ATTD để được báo giá và tư vấn giải pháp phù hợp ngân sách.",
      },
      {
        question: "Thời gian giao hàng đơn 500 nón in thêu là bao lâu?",
        answer:
          "Nón trơn có sẵn kho giao trong 3-5 ngày làm việc. Đơn in thêu 500 chiếc thường mất 10-15 ngày làm việc tùy số màu thêu và độ phức tạp của thiết kế. ATTD phối hợp chặt chẽ với xưởng thêu để đảm bảo tiến độ theo yêu cầu sự kiện.",
      },
      {
        question: "Màu sắc nón có ổn định sau nhiều lần giặt không?",
        answer:
          "Vải twill cotton tại ATTD qua xử lý định hình màu trước khi may, đảm bảo độ bền màu tốt. Để duy trì màu sắc, khuyến nghị giặt tay hoặc giặt máy chế độ nhẹ với nước lạnh, không ngâm lâu và không phơi trực tiếp dưới nắng gắt.",
      },
    ],
    ctaTitle: "Cần nguồn hàng nón số lượng lớn?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ, tư vấn nón đồng phục và nón sự kiện theo yêu cầu. Hàng có sẵn kho, giao hàng toàn quốc nhanh chóng.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOTE BAG
  // ─────────────────────────────────────────────────────────────────────────
  tote: {
    seoTitle: "Nguồn Sỉ Túi Tote Canvas Và Tote Trơn Giá Tốt | ATTD",
    metaDescription:
      "Túi tote canvas sỉ chất lượng cao — đa kích thước, phù hợp in logo và quà tặng doanh nghiệp. Tote trơn cho xưởng in và đại lý. Giao hàng toàn quốc.",
    shortIntro:
      "Nguồn hàng túi tote canvas và tote trơn số lượng lớn cho đại lý, xưởng in và doanh nghiệp. Thân thiện môi trường, phù hợp in logo và quà tặng doanh nghiệp.",
    intro: `<p>Túi tote trơn là sản phẩm đa năng, được ưa chuộng rộng rãi trong lĩnh vực <strong>quà tặng doanh nghiệp</strong>, túi sự kiện và túi thương hiệu. ATTD cung cấp túi tote canvas và tote vải bố số lượng lớn, với đa dạng kích thước, màu sắc và độ dày vải phù hợp cho từng mục đích sử dụng và phân khúc giá.</p>

<p>Túi tote tại ATTD có kết cấu chắc chắn với quai vải dày, đường may kỹ thuật chịu tải — đảm bảo sức chứa từ 5-10kg tùy loại. Bề mặt vải đều, phẳng và có độ thấm hút tốt — lý tưởng cho in lụa màu sắc phong phú, in kỹ thuật số sắc nét và thêu logo bền chắc.</p>

<p>Với xu hướng xanh hóa trong kinh doanh ngày càng mạnh mẽ, <strong>túi tote canvas tái sử dụng</strong> trở thành lựa chọn quà tặng doanh nghiệp thông minh — vừa thể hiện trách nhiệm với môi trường, vừa là kênh quảng bá thương hiệu hiệu quả trên đường phố và trong không gian công cộng.</p>

<p>ATTD cung cấp tote cho nhiều phân khúc: từ tote vải bố basic 8oz cho sự kiện ngân sách thấp, đến tote canvas 12oz cao cấp cho quà tặng VIP. Đội ngũ tư vấn sẵn sàng hỗ trợ bạn chọn đúng sản phẩm theo ngân sách và mục đích sử dụng.</p>`,
    benefits: [
      {
        title: "Đa dạng chất liệu và độ dày",
        description:
          "Canvas 8oz nhẹ phù hợp sự kiện ngân sách thấp, canvas 10oz cân bằng chất lượng-giá thành, canvas 12oz cao cấp cho quà tặng VIP. Vải kaki cotton và cotton oxford cũng có sẵn cho nhu cầu đặc biệt.",
      },
      {
        title: "Kích thước linh hoạt theo nhu cầu",
        description:
          "Từ mini tote 25×20cm đựng phụ kiện đến tote lớn 40×35cm chứa tài liệu và hàng hóa. Với đơn từ 200 chiếc trở lên, ATTD sản xuất tote theo kích thước tùy chỉnh — chiều rộng, chiều cao và độ sâu đáy theo yêu cầu.",
      },
      {
        title: "Thân thiện môi trường",
        description:
          "Túi tote canvas tái sử dụng được hàng trăm lần — thay thế hàng nghìn túi nhựa dùng một lần. Phù hợp cho doanh nghiệp muốn truyền thông thông điệp xanh và tạo ấn tượng tích cực với khách hàng hiện đại.",
      },
      {
        title: "In ấn sắc nét, thêu bền chắc",
        description:
          "Bề mặt vải phẳng đều — nhận mực in lụa và in kỹ thuật số rất tốt. Màu in bền qua nhiều lần giặt khi dùng mực chuyên dụng cho vải. Thêu vi tính trên canvas cũng cho kết quả sắc nét và chắc chắn.",
      },
    ],
    applications: [
      {
        title: "Quà tặng hội nghị và sự kiện",
        description:
          "Túi tote in logo là item được yêu thích nhất trong gói welcome kit và goodie bag. Thực dụng, đẹp, giá thành hợp lý — khách tham dự sự kiện dùng lại nhiều lần, giúp logo thương hiệu xuất hiện liên tục trong cuộc sống hàng ngày.",
      },
      {
        title: "Túi thương hiệu cho chuỗi bán lẻ",
        description:
          "Nhiều thương hiệu thời trang, F&B và lifestyle sử dụng tote có logo làm túi đựng hàng mua sắm. Đây là cách marketing chi phí thấp nhưng hiệu quả cao — mỗi chiếc tote là một billboard di động trên đường phố.",
      },
      {
        title: "Quà tặng doanh nghiệp cuối năm",
        description:
          "Bộ quà tặng kết hợp tote canvas + sản phẩm thương hiệu là xu hướng tặng quà doanh nghiệp ngày càng phổ biến. Tiết kiệm chi phí đóng gói và tạo ấn tượng chuyên nghiệp, đồng thời truyền tải thông điệp môi trường.",
      },
      {
        title: "Túi đựng quà và túi mua sắm",
        description:
          "Tote canvas bền đẹp, giá phải chăng — phổ biến với học sinh, sinh viên, người đi làm và người mua sắm. Đại lý thời trang và shop phụ kiện dễ dàng tạo dòng sản phẩm tote với biên lợi nhuận tốt.",
      },
    ],
    faq: [
      {
        question: "Túi tote chịu được tải bao nhiêu kg?",
        answer:
          "Tote canvas 10oz với quai đôi chịu tải 5-8kg. Tote canvas 12oz hoặc loại có đáy cứng chịu được 8-12kg. Điểm chịu lực chính là điểm nối quai vào thân túi — ATTD may hai lớp và dùng chỉ chắc tại vị trí này để đảm bảo độ bền tối đa.",
      },
      {
        question: "Có thể đặt tote với kích thước và hình dáng tùy chỉnh không?",
        answer:
          "Có. Với đơn hàng từ 200 chiếc trở lên, ATTD sản xuất tote theo kích thước tùy chỉnh — chiều rộng, chiều cao, độ sâu đáy và vị trí quai theo yêu cầu. Thời gian sản xuất từ 15-20 ngày sau khi duyệt mẫu. Liên hệ để nhận báo giá chi tiết.",
      },
      {
        question: "MOQ tote trơn bán sỉ là bao nhiêu?",
        answer:
          "Tote trơn bán sỉ từ 50 chiếc/màu/kích thước. Đối tác đại lý và doanh nghiệp đặt từ 200 chiếc trở lên được hưởng giá đặc biệt và ưu tiên kho hàng trong mùa cao điểm cuối năm.",
      },
      {
        question: "Vải canvas có bị phai màu khi giặt không?",
        answer:
          "Canvas được xử lý định hình màu trước khi cắt may. Với bảo quản đúng cách, màu sắc duy trì tốt trong nhiều năm. Khuyến nghị giặt tay hoặc giặt máy chế độ nhẹ với nước lạnh, không dùng chất tẩy mạnh và không sấy khô bằng máy sấy.",
      },
    ],
    ctaTitle: "Cần nguồn hàng tote số lượng lớn?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ tote canvas, tư vấn in logo và giải pháp quà tặng doanh nghiệp phù hợp ngân sách. Giao hàng toàn quốc.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BÌNH GIỮ NHIỆT
  // ─────────────────────────────────────────────────────────────────────────
  "binh-giu-nhiet": {
    seoTitle: "Nguồn Sỉ Bình Giữ Nhiệt In Logo Doanh Nghiệp | ATTD",
    metaDescription:
      "Bình giữ nhiệt sỉ inox 304 an toàn thực phẩm — phù hợp in logo, khắc tên, quà tặng doanh nghiệp và sự kiện. Nguồn hàng ổn định, giao hàng toàn quốc.",
    shortIntro:
      "Nguồn hàng bình giữ nhiệt trơn chất lượng cao cho đại lý, xưởng in và doanh nghiệp. Inox 304 an toàn thực phẩm, phù hợp khắc tên và in logo quà tặng.",
    intro: `<p>Bình giữ nhiệt in logo đang trở thành một trong những <strong>quà tặng doanh nghiệp</strong> được ưa chuộng nhất tại Việt Nam. Thực dụng, sang trọng và mang tính cá nhân hóa cao — bình giữ nhiệt có khắc tên hoặc in logo tạo ấn tượng sâu sắc với người nhận và duy trì nhận diện thương hiệu mỗi ngày.</p>

<p>ATTD cung cấp <strong>bình giữ nhiệt trơn (blank)</strong> — không có logo — số lượng lớn cho doanh nghiệp và xưởng in tự gia công theo yêu cầu khách hàng. Bình đa dạng dung tích từ 350ml đến 1000ml, chất liệu inox 304 thực phẩm hoặc nhựa PP cao cấp không BPA, lớp chân không giữ nhiệt hiệu quả từ 8-24 giờ tùy model.</p>

<p>Thiết kế của bình giữ nhiệt ATTD đơn giản, hiện đại với bề mặt inox bóng mờ hoặc sơn phủ màu — phù hợp cho nhiều kỹ thuật trang trí: khắc laser CNC sắc nét, in UV màu sắc phong phú, dán nhiệt cao cấp và in silk truyền thống. Mỗi kỹ thuật cho ra thành phẩm với vẻ ngoài riêng biệt, phù hợp cho từng phân khúc quà tặng.</p>

<p>Với kinh nghiệm phục vụ hàng nghìn đơn hàng quà tặng doanh nghiệp mỗi năm, ATTD cam kết cung cấp nguồn hàng ổn định, chất lượng đồng đều và thời gian giao hàng đúng hẹn — đặc biệt quan trọng trong mùa cao điểm quà tặng cuối năm.</p>`,
    benefits: [
      {
        title: "Inox 304 an toàn thực phẩm",
        description:
          "Thép không gỉ 304 (18/8 stainless steel) đạt tiêu chuẩn thực phẩm quốc tế. Không chứa BPA, không gỉ, không ảnh hưởng đến mùi vị thức uống — an toàn cho nước uống nóng lẫn lạnh và đồ uống có tính axit.",
      },
      {
        title: "Giữ nhiệt hiệu quả lâu dài",
        description:
          "Công nghệ chân không hai lớp giữ nóng 8-12 giờ, giữ lạnh 16-24 giờ tùy model và dung tích. Tính năng thực tế này được người nhận đánh giá cao và tạo liên tưởng tích cực với thương hiệu tặng quà.",
      },
      {
        title: "Phù hợp đa dạng kỹ thuật in ấn",
        description:
          "Bề mặt inox phù hợp cho khắc laser CNC, in UV, dán nhiệt và in silk. Bề mặt sơn phủ màu phù hợp in UV và dán nhiệt với màu sắc sống động. Mỗi kỹ thuật cho kết quả khác nhau để phù hợp ngân sách và yêu cầu thẩm mỹ.",
      },
      {
        title: "Giá sỉ cạnh tranh từ nguồn trực tiếp",
        description:
          "ATTD làm việc trực tiếp với nhà máy sản xuất — không qua trung gian — đảm bảo giá sỉ tốt nhất thị trường B2B. Đơn hàng từ 100 chiếc trở lên được hưởng giá đặc biệt và ưu tiên trong mùa cao điểm.",
      },
    ],
    applications: [
      {
        title: "Quà tặng cuối năm cho nhân viên và đối tác",
        description:
          "Bình giữ nhiệt in logo là top 3 quà tặng doanh nghiệp phổ biến nhất, kết hợp tính thực dụng cao với hình ảnh thương hiệu. Đặc biệt phổ biến trong mùa Tết và dịp kỷ niệm thành lập công ty.",
      },
      {
        title: "Quà tặng hội nghị và sự kiện doanh nghiệp",
        description:
          "Phù hợp cho hội thảo, kickoff meeting, annual conference và các sự kiện doanh nghiệp quy mô lớn. Bình giữ nhiệt vừa thực dụng trong suốt sự kiện vừa là vật kỷ niệm mang về nhà.",
      },
      {
        title: "Quà tri ân khách hàng VIP",
        description:
          "Bình giữ nhiệt inox cao cấp có khắc tên cá nhân là quà tặng tạo ấn tượng sâu sắc với khách hàng quan trọng. Giá trị cảm nhận cao, chi phí hợp lý — lựa chọn lý tưởng cho chương trình tri ân khách hàng thân thiết.",
      },
      {
        title: "Bán lẻ qua đại lý và shop online",
        description:
          "Bình giữ nhiệt là sản phẩm có biên lợi nhuận tốt cho đại lý, dễ bán online trên các sàn thương mại điện tử và mạng xã hội. ATTD hỗ trợ đại lý với giá sỉ cạnh tranh và thông tin sản phẩm đầy đủ.",
      },
    ],
    faq: [
      {
        question: "Bình giữ nhiệt có an toàn thực phẩm không?",
        answer:
          "Tất cả bình inox tại ATTD sử dụng thép không gỉ 304 (18/8 stainless steel) đạt tiêu chuẩn thực phẩm quốc tế. Lớp bên trong không chứa BPA, không gỉ và không phản ứng với thức uống. An toàn cho nước uống nóng đến 95°C và lạnh đến 5°C.",
      },
      {
        question: "ATTD có dịch vụ in logo sẵn trên bình không?",
        answer:
          "ATTD chuyên cung cấp bình giữ nhiệt trơn (blank) cho đối tác tự gia công hoặc đặt xưởng in theo yêu cầu. Nếu cần dịch vụ trọn gói bao gồm in/khắc logo, ATTD có thể giới thiệu xưởng gia công uy tín đã hợp tác lâu năm để đảm bảo chất lượng thành phẩm.",
      },
      {
        question: "MOQ bình giữ nhiệt là bao nhiêu chiếc?",
        answer:
          "Bình giữ nhiệt trơn bán sỉ từ 50 chiếc/model. Đơn hàng quà tặng có in/khắc logo thường từ 100 chiếc trở lên để đảm bảo chất lượng in đồng đều và tiết kiệm chi phí setup. Liên hệ để báo giá theo số lượng cụ thể.",
      },
      {
        question: "Bình giữ nhiệt có bảo hành không?",
        answer:
          "ATTD bảo hành 6 tháng cho lỗi kỹ thuật do sản xuất: nắp bị rò rỉ, bong tróc bề mặt do lỗi vật liệu, chân không kém hiệu quả từ đầu. Không bảo hành cho hư hỏng do va đập, sử dụng không đúng cách hoặc vệ sinh không đúng hướng dẫn.",
      },
    ],
    ctaTitle: "Cần nguồn hàng bình giữ nhiệt số lượng lớn?",
    ctaDescription:
      "Liên hệ ATTD để nhận báo giá sỉ bình giữ nhiệt, tư vấn giải pháp quà tặng doanh nghiệp và sự kiện. Inox 304 an toàn, giao hàng toàn quốc.",
  },
};

export function getCollectionContent(slug: string): CollectionContent | null {
  return content[slug] ?? null;
}
