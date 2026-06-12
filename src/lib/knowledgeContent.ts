/**
 * Static content registry for blank apparel knowledge cluster.
 *
 * Five educational pages targeting informational search queries from dealers,
 * printing shops and buyers researching fabric types, colors and sizing.
 *
 * These pages support the wholesale cluster (Sprint 18) by building topical
 * authority around the products ATTD sells.
 */

import type { FaqItem } from "@/components/seo/FaqSchema";
import type { ContentBenefit } from "@/components/seo/CollectionSEOContent";
import type { InternalLink } from "@/lib/industryContent";

export interface KnowledgeContent {
  seoTitle: string;
  /** 120-160 characters */
  metaDescription: string;
  h1: string;
  heroIntro: string;
  /** Long-form HTML intro — 3-4 <p> paragraphs */
  intro: string;
  /** Primary informational cards (characteristics, advantages, key points) */
  keyPoints: ContentBenefit[];
  /** Secondary cards (applications, comparisons, use cases) */
  details: ContentBenefit[];
  /** Min 6 FAQs */
  faq: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  internalLinks: InternalLink[];
}

const content: Record<string, KnowledgeContent> = {
  // ───────────────────────────────────────────────────────────────────────────
  // BẢNG MÀU ÁO THUN TRƠN
  // Target: màu áo thun trơn, bảng màu, màu đồng phục
  // ───────────────────────────────────────────────────────────────────────────
  "bang-mau-ao-thun-tron": {
    seoTitle: "Bảng Màu Áo Thun Trơn | Hướng Dẫn Chọn Màu Đồng Phục | ATTD",
    metaDescription:
      "Hướng dẫn chọn màu áo thun trơn cho đồng phục, sự kiện và xưởng in. Bảng màu phổ biến, tips phối màu theo thương hiệu và lưu ý khi đặt in. ATTD cung cấp.",
    h1: "Bảng Màu Áo Thun Trơn — Hướng Dẫn Chọn Màu Cho Đại Lý Và Xưởng In",
    heroIntro:
      "Chọn đúng màu áo thun trơn là bước quan trọng quyết định chất lượng thành phẩm in ấn và sự chuyên nghiệp của đồng phục. Hướng dẫn này tổng hợp bảng màu phổ biến nhất, cách phối màu áo với logo và những lưu ý kỹ thuật dành cho xưởng in và đại lý đồng phục.",
    intro: `<p>Bảng màu áo thun trơn là một trong những yếu tố then chốt mà xưởng in, đại lý đồng phục và doanh nghiệp cần nắm vững trước khi đặt hàng số lượng lớn. Màu vải ảnh hưởng trực tiếp đến <strong>chất lượng in ấn</strong> (màu nền tối cần mực lót trắng, màu sáng dễ in hơn), đến <strong>chi phí sản xuất</strong> (số lớp mực in) và quan trọng hơn là đến <strong>hình ảnh thương hiệu</strong> của doanh nghiệp cuối.</p>

<p>Tại ATTD, kho áo thun trơn được duy trì với <strong>hơn 20 màu sắc thường trực</strong>, bao gồm nhóm màu cơ bản (trắng, đen, xám), nhóm màu doanh nghiệp (navy, xanh royal, đỏ, xanh lá), nhóm màu pastel (hồng nhạt, xanh bạc hà, vàng chanh) và nhóm màu seasonal theo xu hướng từng quý. Ngoài ra, màu theo Pantone riêng có thể sản xuất với đơn từ 300 chiếc/màu cho doanh nghiệp có nhận diện thương hiệu nghiêm ngặt.</p>

<p>Điểm quan trọng cần hiểu là <strong>màu vải trên màn hình khác với màu vải thực tế</strong>. Ánh sáng màn hình (RGB) và màu vải dệt (CMYK/vật lý) có thể chênh lệch đáng kể — đặc biệt với các tone màu tối, màu bão hòa cao và các màu đặc biệt như cam, tím và olive. ATTD cung cấp bảng màu vật lý (swatch card) theo yêu cầu để đối tác chọn màu chính xác trước khi đặt đơn hàng lớn.</p>

<p>Với xưởng in, việc <strong>hiểu tương quan giữa màu vải và kỹ thuật in</strong> giúp tư vấn khách hàng chính xác hơn và tránh tranh chấp về màu sắc thành phẩm. Bài viết này cung cấp kiến thức nền tảng về bảng màu áo thun trơn, cách phân loại màu theo mục đích sử dụng và những lưu ý kỹ thuật mà xưởng in cần biết để đạt chất lượng in tối ưu trên từng nền màu vải.</p>`,
    keyPoints: [
      {
        title: "Nhóm màu cơ bản (Basic)",
        description:
          "Trắng, đen, xám nhạt (light grey), xám đậm (charcoal), be (beige/cream). Đây là 5 màu bán chạy nhất quanh năm, luôn có sẵn kho số lượng lớn. Trắng và đen là nền tảng cho hầu hết đơn in ấn — dễ in, màu sắc thành phẩm chuẩn, chi phí mực in thấp nhất.",
      },
      {
        title: "Nhóm màu doanh nghiệp (Corporate)",
        description:
          "Navy (xanh tím than), xanh royal (royal blue), đỏ truyền thống (red), xanh lá forest (forest green), tím (purple), nâu đất (khaki/tan). Đây là nhóm màu phổ biến nhất trong đơn đồng phục doanh nghiệp và tổ chức. Màu navy và xanh royal thường được ngân hàng, bảo hiểm và công ty tài chính chọn làm màu đồng phục chính.",
      },
      {
        title: "Nhóm màu sự kiện (Event / Bright)",
        description:
          "Đỏ tươi, cam, vàng, xanh lá cây sáng, hồng fuchsia, xanh cyan. Nhóm màu tươi sáng được ưa chuộng trong team building, sự kiện ngoài trời và roadshow. Cần lưu ý khi in trên màu vải tươi — một số mực in có thể bị chảy màu hoặc thay đổi tone khi tiếp xúc với nhiệt độ cao.",
      },
      {
        title: "Nhóm màu pastel và trend",
        description:
          "Hồng nhạt (baby pink), xanh bạc hà, lavender, vàng chanh, peach. Nhóm màu được local brand và thời trang yêu thích cho BST mùa xuân-hè. Kho ATTD cập nhật nhóm màu trend theo xu hướng mỗi quý — liên hệ để nhận bảng màu seasonal mới nhất.",
      },
    ],
    details: [
      {
        title: "Màu vải và kỹ thuật in lụa (screen printing)",
        description:
          "In lụa trên vải màu tối (đen, navy, charcoal) bắt buộc cần lớp mực lót trắng (white underbase) để màu in phía trên hiện rõ. Điều này tăng số lớp mực (từ 1 lên 2-3 lớp) và chi phí in. Trên vải màu sáng (trắng, be, xám nhạt) có thể bỏ qua lớp lót — in trực tiếp, ít lớp mực hơn và chi phí thấp hơn.",
      },
      {
        title: "Màu vải và in kỹ thuật số (DTG/DTF)",
        description:
          "Công nghệ DTG (Direct to Garment) cho kết quả tốt nhất trên vải trắng hoặc màu sáng. Trên vải màu tối, máy in DTG cần phun lớp tiền xử lý (pre-treatment) để mực bám và hiện màu chính xác. Công nghệ DTF (transfer film) linh hoạt hơn và cho kết quả tốt trên cả vải tối và sáng.",
      },
      {
        title: "Phối màu áo với logo thương hiệu",
        description:
          "Nguyên tắc cơ bản: logo sáng trên nền tối, logo tối trên nền sáng. Tránh đặt logo có nhiều màu sắc trên nền vải màu bão hòa — sẽ làm logo khó đọc. Với logo có màu branding cụ thể, nên chọn màu vải neutral (trắng, xám, navy) để logo nổi bật nhất.",
      },
      {
        title: "Màu sắc và sự kiện nhận diện thương hiệu",
        description:
          "Doanh nghiệp có brand guideline nghiêm ngặt (màu Pantone chính xác) cần đặt hàng sản xuất theo màu riêng — ATTD hỗ trợ với đơn từ 300 chiếc/màu. Với sự kiện không yêu cầu màu chính xác, có thể chọn màu gần nhất trong kho để tiết kiệm thời gian và không cần chờ sản xuất riêng.",
      },
    ],
    faq: [
      {
        question: "ATTD có bao nhiêu màu áo thun trơn luôn có sẵn trong kho?",
        answer:
          "ATTD duy trì kho thường trực cho khoảng 20-25 màu sắc, bao gồm đầy đủ nhóm basic, corporate và một số màu seasonal. Danh sách màu và số lượng tồn kho theo size được cập nhật thường xuyên — liên hệ để nhận bảng màu và tồn kho mới nhất trước khi đặt hàng.",
      },
      {
        question: "Màu vải khi xem trên máy tính có giống màu thực không?",
        answer:
          "Không hoàn toàn. Màn hình hiển thị màu theo chuẩn RGB, trong khi màu vải dệt là thực thể vật lý — hai hệ màu này có thể chênh lệch đáng kể, đặc biệt với màu tối và màu bão hòa cao. ATTD cung cấp bảng màu vật lý (swatch card) gửi qua bưu điện theo yêu cầu để bạn xem màu chính xác trước khi đặt hàng.",
      },
      {
        question: "In logo màu trắng trên áo đen có khó không?",
        answer:
          "Hoàn toàn có thể in được, nhưng cần kỹ thuật đúng. In lụa: dùng mực trắng lót dày, phơi đúng nhiệt độ. In kỹ thuật số (DTG): cần pre-treatment trước khi in. DTF transfer: không cần pre-treatment, cho kết quả sắc nét ngay cả trên vải đen. Trao đổi với xưởng in để chọn kỹ thuật phù hợp với thiết kế và ngân sách.",
      },
      {
        question: "Có thể đặt áo thun trơn theo màu Pantone riêng không?",
        answer:
          "Có, với điều kiện đặt hàng tối thiểu 300 chiếc/màu và thời gian sản xuất 20-25 ngày làm việc. Cần cung cấp mã màu Pantone chính xác và duyệt mẫu màu vật lý trước khi sản xuất đại trà. Phù hợp cho doanh nghiệp có brand guideline màu sắc nghiêm ngặt.",
      },
      {
        question: "Màu navy và xanh royal khác nhau như thế nào?",
        answer:
          "Navy (xanh tím than) là màu xanh đậm gần đen, trang trọng và thường dùng cho đồng phục văn phòng, ngân hàng và công ty tài chính. Xanh royal (royal blue) là màu xanh sáng tươi hơn, năng động và được dùng nhiều trong đồng phục thể thao, sự kiện và tổ chức NGO. Cả hai đều luôn có sẵn kho tại ATTD.",
      },
      {
        question: "Màu vải có bị phai sau nhiều lần giặt không?",
        answer:
          "Áo thun cotton ATTD qua xử lý định hình màu (color fixation) trước khi xuất kho. Với bảo quản đúng cách (giặt lạnh, không dùng thuốc tẩy, phơi tránh nắng trực tiếp), màu sắc duy trì tốt sau hàng chục lần giặt. Màu tươi sáng (đỏ, vàng, cam) có xu hướng phai nhanh hơn màu tối nếu không bảo quản đúng cách.",
      },
    ],
    ctaTitle: "Cần tư vấn chọn màu áo thun trơn?",
    ctaDescription:
      "Liên hệ ATTD để nhận bảng màu vật lý, tư vấn màu phù hợp thương hiệu và đặt mẫu thử trước khi đặt đơn hàng lớn. Hàng có sẵn kho hơn 20 màu.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
      { label: "Mua sỉ áo thun trơn", href: "/ao-thun-tron-si" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // SIZE ÁO THUN TRƠN
  // Target: size áo thun trơn, bảng size, size đồng phục
  // ───────────────────────────────────────────────────────────────────────────
  "size-ao-thun-tron": {
    seoTitle: "Bảng Size Áo Thun Trơn | Hướng Dẫn Chọn Size Đồng Phục | ATTD",
    metaDescription:
      "Bảng size áo thun trơn chuẩn — hướng dẫn đo số đo, chọn size đồng phục công ty và lập danh sách đặt hàng chính xác. Dành cho đại lý và doanh nghiệp.",
    h1: "Bảng Size Áo Thun Trơn — Hướng Dẫn Chọn Size Đồng Phục",
    heroIntro:
      "Chọn đúng size áo thun trơn giúp đồng phục mặc đẹp, thoải mái và chuyên nghiệp. Hướng dẫn này cung cấp bảng size chuẩn, cách đo số đo cơ thể và tips lập danh sách đặt hàng cho đại lý, xưởng in và doanh nghiệp.",
    intro: `<p>Một trong những thách thức phổ biến khi đặt áo thun đồng phục số lượng lớn là <strong>phân bổ size không chính xác</strong> — nhận hàng về thừa size M, thiếu size XL, hoặc nhân viên mặc áo không vừa vặn. Vấn đề này phát sinh từ việc không có bảng size chuẩn hoặc không đo số đo trước khi đặt hàng. Bài viết này giúp đại lý, xưởng in và doanh nghiệp giải quyết bài toán size một lần và mãi mãi.</p>

<p>Bảng size áo thun trơn tại Việt Nam hiện có <strong>hai hệ thống phổ biến</strong>: bảng size Việt Nam (nhỏ hơn một size so với size quốc tế) và bảng size quốc tế (Châu Âu/Mỹ). ATTD sử dụng bảng size Việt Nam được chuẩn hóa — kích thước này đã được điều chỉnh phù hợp với vóc dáng người Việt. Bảng size ATTD gồm các size từ S, M, L, XL, 2XL, 3XL và 4XL — đảm bảo mọi vóc dáng đều có size phù hợp.</p>

<p>Với đơn đồng phục doanh nghiệp, <strong>quy trình thu thập thông tin size</strong> từ nhân viên là bước quan trọng không thể bỏ qua. Cách đơn giản nhất là gửi bảng size hình ảnh (có minh họa cách đo) cho từng nhân viên tự chọn size, sau đó tổng hợp vào bảng Excel phân bổ size trước khi gửi cho ATTD. Cách chính xác hơn là cân đo thực tế: đo vòng ngực, chiều dài áo và rộng vai để chọn size phù hợp nhất.</p>

<p>Lưu ý quan trọng: <strong>áo thun cotton bị co rút nhẹ sau lần giặt đầu tiên</strong> (khoảng 2-3%). Nếu đơn đồng phục cần mặc ngay khi nhận, nên đặt size lớn hơn một bậc cho những người có vóc dáng borderline giữa hai size. Với đồng phục in ấn, co rút sau giặt không ảnh hưởng đến vị trí in nếu in trước khi giặt.</p>`,
    keyPoints: [
      {
        title: "Bảng size ATTD — Kích thước cơ bản",
        description:
          "Size S: vòng ngực 88cm, dài áo 67cm, rộng vai 42cm. Size M: ngực 92cm, dài 69cm, vai 44cm. Size L: ngực 96cm, dài 71cm, vai 46cm. Size XL: ngực 100cm, dài 73cm, vai 48cm. Size 2XL: ngực 106cm, dài 75cm, vai 50cm. Size 3XL: ngực 112cm, dài 77cm, vai 53cm. Size 4XL: ngực 118cm, dài 79cm, vai 56cm. Dung sai ±2cm.",
      },
      {
        title: "Cách đo số đo chọn size đúng",
        description:
          "Vòng ngực: đo ngang điểm rộng nhất của ngực, thước dây song song với sàn. Chọn size có số đo ngực lớn hơn số đo thực tế 4-6cm để áo thoải mái khi mặc. Chiều cao: người 155-162cm thường mặc S/M, 163-170cm mặc M/L, 171-178cm mặc L/XL, 179cm+ mặc XL/2XL. Cân nặng không phải yếu tố duy nhất — vóc dáng và chiều cao mới là yếu tố quyết định.",
      },
      {
        title: "Phân bổ size tiêu chuẩn cho đơn đồng phục",
        description:
          "Dựa trên thống kê thực tế đơn hàng đồng phục doanh nghiệp Việt Nam, phân bổ size phổ biến nhất là: S (10%), M (25%), L (30%), XL (20%), 2XL (10%), 3XL (4%), 4XL (1%). Tỷ lệ này thay đổi tùy ngành — ngành logistics và kho vận thường cần nhiều size lớn hơn so với ngành văn phòng.",
      },
      {
        title: "Size nữ và size unisex",
        description:
          "Áo thun unisex (cắt rộng, dáng thẳng) phù hợp cho cả nam và nữ — nữ thường chọn nhỏ hơn một size so với nam cùng vóc dáng. Áo thun nữ (women fit — ôm hơn, eo thon hơn) có kích thước riêng. ATTD cung cấp cả hai loại — cần chỉ định rõ khi đặt hàng để tránh nhầm lẫn.",
      },
    ],
    details: [
      {
        title: "Tips đặt hàng đồng phục theo size cho doanh nghiệp",
        description:
          "Gửi bảng size hình minh họa cho nhân viên tự chọn 1-2 tuần trước khi đặt hàng. Thu thập qua Google Form hoặc bảng Excel đơn giản. Cộng thêm 5-10% buffer cho size phổ biến (M, L, XL) để dự phòng nhân viên mới. Lưu danh sách size của từng nhân viên để tái đặt hàng bổ sung khớp chính xác.",
      },
      {
        title: "Size áo thun cho xưởng in nhận đơn lẻ",
        description:
          "Xưởng in cần tồn kho đệm cho các size phổ biến (S-XL) để nhận đơn in khẩn. ATTD hỗ trợ xưởng in đặt hàng lẻ từng size theo nhu cầu thực tế, không bắt buộc mua đủ bộ. Hệ thống quản lý đơn hàng ATTD ghi nhận phân bổ size chi tiết cho từng đơn.",
      },
      {
        title: "Xử lý size không vừa sau khi nhận hàng",
        description:
          "Áo chưa qua in/thêu và còn nguyên tem có thể đổi size trong vòng 7 ngày nhận hàng. Sau khi in ấn, không thể đổi trả trừ lỗi sản xuất. Do đó, kiểm tra kỹ phân bổ size trước khi duyệt đơn và gửi đi sản xuất là bước không thể bỏ qua.",
      },
      {
        title: "Size và co rút vải sau giặt",
        description:
          "Cotton 100% co rút 2-3% sau lần giặt đầu. CVC (cotton/polyester) co rút ít hơn, khoảng 1-2%. TC (polyester nhiều hơn) co rút ít nhất, dưới 1%. Nếu sản phẩm cần kích thước chính xác sau giặt (ví dụ đồng phục may đo), cần giặt trước khi may hoặc đặt size lớn hơn một bậc.",
      },
    ],
    faq: [
      {
        question: "ATTD có cung cấp áo thun size 4XL và 5XL không?",
        answer:
          "ATTD cung cấp áo thun đến size 4XL trong kho thường trực. Size 5XL có thể sản xuất theo đơn đặt hàng với MOQ tối thiểu 30 chiếc/size và thời gian sản xuất thêm 10-15 ngày. Size đặc biệt này thường phổ biến trong đơn đồng phục ngành logistics và bảo vệ.",
      },
      {
        question: "Kích thước in logo trên áo thun nên bao nhiêu cm?",
        answer:
          "Logo ngực trái (chest logo): thường 8×8cm đến 10×10cm. Logo giữa ngực lớn: 20×20cm đến 28×25cm phù hợp. Logo sau lưng (back print): 25×30cm đến 32×35cm là kích thước phổ biến nhất. Logo tay: 5×5cm đến 7×7cm. Kích thước tối ưu phụ thuộc vào độ phức tạp thiết kế và size áo — áo size S nên in nhỏ hơn áo size XL để cân xứng.",
      },
      {
        question: "Làm thế nào để biết size áo thun của mình ở ATTD?",
        answer:
          "Đo vòng ngực của bạn (đo ngang điểm rộng nhất, không siết chặt). Thêm 5-6cm vào số đo. Đối chiếu với bảng size: ngực ≤94cm → M, ≤98cm → L, ≤102cm → XL, ≤108cm → 2XL. Nếu borderline giữa hai size, chọn size lớn hơn để áo thoải mái hơn. Có thể yêu cầu mẫu thử size trước khi đặt đơn hàng lớn.",
      },
      {
        question: "Đơn đồng phục 200 người cần làm gì để phân bổ size chính xác?",
        answer:
          "Bước 1: Lập Google Form với hình minh họa bảng size, gửi cho 200 nhân viên trong vòng 1 tuần. Bước 2: Tổng hợp kết quả vào bảng Excel theo size và phòng ban. Bước 3: Thêm 5-10 chiếc buffer cho size M, L, XL để dự phòng. Bước 4: Gửi bảng phân bổ cuối cùng cho ATTD để xác nhận tồn kho và đặt hàng.",
      },
      {
        question: "Áo thun trơn ATTD có bị co rút sau giặt không? Co bao nhiêu %?",
        answer:
          "Áo thun cotton 100% ATTD qua xử lý pre-shrunk — co rút tối đa 2-3% sau lần giặt đầu tiên. Sau đó ổn định và không co thêm nếu giặt đúng cách. Với size L (dài 71cm), co rút tối đa khoảng 1.5-2cm. Áo CVC co rút ít hơn (<2%), áo TC co rút ít nhất (<1%).",
      },
      {
        question: "Có thể đặt riêng một size duy nhất không (ví dụ chỉ đặt 50 chiếc size XL)?",
        answer:
          "Có. ATTD không bắt buộc đặt đủ bộ size. Bạn có thể đặt chỉ một hoặc vài size cụ thể — ví dụ 50 chiếc size XL và 30 chiếc size 2XL để bổ sung kho. MOQ tổng đơn hàng từ 30 chiếc, không giới hạn cách phân bổ size.",
      },
    ],
    ctaTitle: "Cần tư vấn size và lập danh sách đặt hàng?",
    ctaDescription:
      "Liên hệ ATTD để nhận bảng size chi tiết kèm hình minh họa, mẫu bảng Excel phân bổ size và tư vấn đặt hàng đồng phục đúng size từ đầu.",
    internalLinks: [
      { label: "Áo thun trơn — xem sản phẩm", href: "/ao-thun-tron" },
      { label: "Kho áo thun trơn", href: "/kho-ao-thun-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // VẢI COTTON 2 CHIỀU
  // Target: vải cotton 2 chiều, cotton 2 chiều là gì, áo thun cotton 2 chiều
  // ───────────────────────────────────────────────────────────────────────────
  "vai-cotton-2-chieu": {
    seoTitle: "Vải Cotton 2 Chiều Là Gì? | Ưu Nhược Điểm Và Ứng Dụng | ATTD",
    metaDescription:
      "Vải cotton 2 chiều là gì? Tìm hiểu đặc điểm, ưu nhược điểm, ứng dụng và so sánh với CVC, TC. Hướng dẫn chọn vải phù hợp cho áo thun đồng phục và in ấn.",
    h1: "Vải Cotton 2 Chiều Là Gì? Đặc Điểm, Ưu Nhược Điểm Và Ứng Dụng",
    heroIntro:
      "Vải cotton 2 chiều là chất liệu phổ biến nhất trong áo thun trơn tại Việt Nam. Bài viết này giải thích chi tiết cấu trúc vải, ưu nhược điểm, ứng dụng phù hợp và cách phân biệt với các loại vải cotton khác — giúp xưởng in và đại lý tư vấn khách hàng chính xác hơn.",
    intro: `<p>"Cotton 2 chiều" là tên gọi phổ biến tại Việt Nam cho loại vải <strong>jersey cotton</strong> — vải dệt kim một mặt từ sợi cotton 100%, có khả năng co giãn theo chiều ngang (left-right) khoảng 25-35%. Cái tên "2 chiều" phân biệt với "4 chiều" (co giãn theo cả 2 chiều dọc và ngang), giúp người mua hiểu rõ tính chất co giãn của vải trước khi đặt hàng.</p>

<p>Về mặt kỹ thuật, cotton 2 chiều là <strong>vải single jersey</strong> — kiểu dệt kim đơn giản nhất, tạo ra bề mặt mịn một phía và mặt kia có cấu trúc móc vòng nhỏ. Đây là loại vải cơ bản nhất được dùng cho áo thun (T-shirt), không phải vải polo (dùng pique) và không phải vải nỉ (dùng fleece). GSM phổ biến của cotton 2 chiều dao động từ 150gsm (mỏng, nhẹ) đến 220gsm (dày, bền).</p>

<p>Trong bối cảnh B2B tại Việt Nam, khi khách hàng (xưởng in, đại lý đồng phục) hỏi về "áo thun cotton 2 chiều" — họ đang hỏi về loại áo phổ biến nhất trên thị trường, sử dụng vải jersey cotton 100%, không co giãn nhiều, <strong>phù hợp nhất cho in lụa, in kỹ thuật số và thêu vi tính</strong>. Đây là sản phẩm nền tảng mà ATTD cung cấp với đầy đủ màu sắc và size trong kho thường trực.</p>

<p>Để tránh nhầm lẫn: "cotton 2 chiều" khác với "cotton 4 chiều" (spandex cotton, có sợi elastane co giãn mạnh) và khác với "cotton co giãn" (biệt ngữ thị trường, thường chỉ vải có một tỷ lệ nhỏ elastane). Khi đặt hàng, nên xác nhận rõ loại vải và tỷ lệ co giãn để tránh nhận nhầm sản phẩm.</p>`,
    keyPoints: [
      {
        title: "Đặc điểm cấu trúc vải",
        description:
          "Cotton 2 chiều (single jersey) có bề mặt phẳng, mịn một phía — bề mặt in. Phía sau có cấu trúc móc vòng đặc trưng. Vải có khả năng co giãn ngang 25-35%, đủ để mặc thoải mái nhưng không quá đàn hồi như vải 4 chiều. Trọng lượng phổ biến: 160gsm (mỏng), 190gsm (trung bình), 220gsm (dày).",
      },
      {
        title: "Ưu điểm chính",
        description:
          "Bề mặt phẳng mịn là ưu điểm số 1 — lý tưởng cho in lụa, DTG và thêu vi tính. Chi phí vải thấp hơn cotton 4 chiều và pique. Thoáng mát, thấm hút tốt với khí hậu nhiệt đới Việt Nam. Bền màu tốt khi dùng đúng kỹ thuật giặt. Màu sắc đa dạng, dễ sản xuất số lượng lớn.",
      },
      {
        title: "Nhược điểm cần lưu ý",
        description:
          "Co giãn ngang tốt nhưng chiều dọc ít co giãn hơn — không phù hợp cho trang phục thể thao cường độ cao cần tự do vận động. Dễ bị xù lông (pilling) nếu chất lượng cotton không đủ tốt hoặc giặt quá nóng. Nếp nhăn có thể xuất hiện sau giặt nếu không phơi đúng cách. Cotton 100% co rút 2-3% sau giặt đầu tiên.",
      },
      {
        title: "So sánh với cotton 4 chiều",
        description:
          "Cotton 4 chiều (thường là cotton + elastane/spandex) có khả năng co giãn theo cả 2 chiều — lý tưởng cho trang phục vận động. Tuy nhiên, bề mặt vải 4 chiều khó in lụa hơn (dễ bị nứt mực khi kéo giãn) và giá thành cao hơn. Với đồng phục thông thường không cần vận động nhiều, cotton 2 chiều là lựa chọn kinh tế và kỹ thuật tốt hơn.",
      },
    ],
    details: [
      {
        title: "Ứng dụng phù hợp nhất",
        description:
          "Áo thun đồng phục công ty, sự kiện, team building. Áo thun in logo, thiết kế nghệ thuật cho local brand. Áo thun nhân viên ngành dịch vụ (nhà hàng, bán lẻ, dịch vụ). Áo thun quảng cáo và promotional items. Áo thun trơn làm nền cho xưởng in gia công đơn lẻ.",
      },
      {
        title: "Không phù hợp khi nào?",
        description:
          "Trang phục thể thao cường độ cao (chạy bộ, gym, bóng đá) — cần vải 4 chiều có moisture-wicking. Đồng phục lịch sự văn phòng cao cấp — nên dùng pique hoặc vải oxford lịch sự hơn. Trang phục làm việc trong môi trường nhiều hóa chất — cần vải kỹ thuật chuyên dụng.",
      },
      {
        title: "Lưu ý kỹ thuật in trên vải cotton 2 chiều",
        description:
          "Để in lụa đạt chất lượng tốt: cố định áo trên bàn in để vải không bị dịch chuyển, dùng kẹp hoặc keo tản nhiệt. Với DTG: thực hiện pre-treatment đầy đủ, đặc biệt với màu tối. Thêu vi tính: dùng lót giấy (stabilizer) phía sau để vải không bị kéo và đường thêu phẳng.",
      },
      {
        title: "Cách nhận biết chất lượng vải",
        description:
          "Kéo nhẹ vải theo chiều ngang — cotton 2 chiều chất lượng tốt co trở lại ngay, không bị kéo dài vĩnh viễn. Kiểm tra bề mặt: vải tốt có bề mặt đều, không có sợi thừa, không thấy lỗ hổng trong cấu trúc dệt. GSM: cân một mảnh vải 10×10cm và nhân 100 để tính gsm thực tế — so sánh với gsm công bố.",
      },
    ],
    faq: [
      {
        question: "Áo thun cotton 2 chiều khác áo thun cotton 4 chiều như thế nào?",
        answer:
          "Cotton 2 chiều (single jersey) chỉ co giãn theo chiều ngang, bề mặt phẳng phù hợp in ấn, giá thấp hơn. Cotton 4 chiều có elastane/spandex co giãn theo 2 chiều, phù hợp hoạt động thể chất, giá cao hơn và khó in hơn. Cho đồng phục thông thường và áo thun in ấn, cotton 2 chiều là lựa chọn tối ưu về cả chất lượng lẫn chi phí.",
      },
      {
        question: "GSM 160 và 190 và 220 khác nhau như thế nào?",
        answer:
          "GSM (gram/m²) là độ dày/nặng của vải. 160gsm: mỏng, nhẹ, thoáng mát — phù hợp sự kiện, mùa hè, ngân sách thấp. 190gsm: cân bằng giữa thoáng mát và độ bền — phổ biến nhất cho đồng phục đa năng. 220gsm: dày, bền, ấm hơn — phù hợp đồng phục dài hạn, mùa thu-đông, ngân sách cao hơn.",
      },
      {
        question: "Vải cotton 2 chiều có bị nhăn sau giặt không?",
        answer:
          "Cotton 100% có thể bị nhăn nhẹ nếu phơi sai cách. Để tránh nhăn: lấy áo ra khỏi máy giặt ngay khi giặt xong, kéo căng nhẹ và phơi trên móc. Tránh vắt quá mạnh. Không cần là/ủi áo thun mặc thường ngày — nếu cần phẳng, là ở chế độ cotton vừa với khăn ẩm phủ lên.",
      },
      {
        question: "Vải cotton 2 chiều có phù hợp cho thêu vi tính không?",
        answer:
          "Có. Bề mặt mịn và phẳng của cotton single jersey phù hợp cho thêu vi tính. Để đường thêu đẹp nhất: dùng lót giấy tear-away phía trong áo trước khi đặt vào khung thêu. Loại cotton 190gsm trở lên cho kết quả thêu tốt hơn cotton 160gsm do vải dày hơn, ít bị kéo nhăn.",
      },
      {
        question: "ATTD có bán áo thun cotton 2 chiều 100% không? GSM bao nhiêu?",
        answer:
          "ATTD cung cấp áo thun trơn cotton 100% single jersey (2 chiều) ở 3 mức GSM: 160gsm, 190gsm và 220gsm. Tất cả đều có sẵn kho đa màu, đủ size S-4XL. Liên hệ để nhận bảng báo giá và chọn gsm phù hợp với nhu cầu cụ thể của bạn.",
      },
      {
        question: "Vải cotton 2 chiều có bị xù lông (pilling) sau sử dụng không?",
        answer:
          "Cotton chất lượng cao (combed cotton hoặc ring-spun cotton) ít bị xù lông hơn cotton thông thường (carded cotton). ATTD sử dụng cotton cao cấp cho áo thun trơn — xù lông thường chỉ xuất hiện sau hàng chục lần giặt nếu dùng máy giặt quá mạnh. Giặt lật trái và chế độ delicate giúp kéo dài tuổi thọ vải.",
      },
    ],
    ctaTitle: "Cần nguồn hàng áo thun cotton 2 chiều số lượng lớn?",
    ctaDescription:
      "ATTD cung cấp áo thun trơn cotton 2 chiều sỉ — 160gsm, 190gsm và 220gsm, đa màu sẵn kho, giao hàng toàn quốc. Liên hệ để nhận báo giá ngay.",
    internalLinks: [
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
      { label: "Vải CVC là gì?", href: "/vai-cvc-la-gi" },
      { label: "Vải TC là gì?", href: "/vai-tc-la-gi" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // VẢI CVC LÀ GÌ
  // Target: vải cvc là gì, cvc cotton, chất liệu cvc
  // ───────────────────────────────────────────────────────────────────────────
  "vai-cvc-la-gi": {
    seoTitle: "Vải CVC Là Gì? | Đặc Điểm, Ưu Nhược Điểm Và Ứng Dụng | ATTD",
    metaDescription:
      "Vải CVC (Chief Value Cotton) là gì? Thành phần, ưu nhược điểm, so sánh với cotton 100% và TC. Hướng dẫn chọn vải CVC cho áo thun đồng phục và in ấn.",
    h1: "Vải CVC Là Gì? Thành Phần, Đặc Điểm Và So Sánh Với Cotton Và TC",
    heroIntro:
      "CVC là loại vải phổ biến trong áo thun đồng phục cao cấp tại Việt Nam — kết hợp ưu điểm của cotton tự nhiên với độ bền của polyester. Bài viết giải thích chi tiết thành phần, đặc điểm và hướng dẫn chọn CVC cho từng ứng dụng cụ thể.",
    intro: `<p><strong>CVC</strong> là viết tắt của "<strong>Chief Value Cotton</strong>" — loại vải hỗn hợp trong đó cotton chiếm tỷ lệ cao hơn polyester. Công thức phổ biến nhất là <strong>60% cotton / 40% polyester</strong>, mặc dù một số nhà sản xuất dùng 65/35 hay 70/30 vẫn gọi là CVC. Điểm quan trọng là cotton luôn là thành phần chính — điều này phân biệt CVC với vải TC (trong đó polyester chiếm phần lớn hơn).</p>

<p>Vải CVC được phát triển để giải quyết nhược điểm của từng loại vải đơn thuần. <strong>Cotton 100%</strong> thoáng mát và tự nhiên nhưng co rút, nhăn, bạc màu nhanh và kém bền hơn khi giặt thường xuyên. <strong>Polyester 100%</strong> bền nhưng bí, nóng và cảm giác mặc không tự nhiên. Bằng cách pha trộn 60/40, CVC đạt được điểm cân bằng: <strong>thoáng mát và cảm giác cotton tự nhiên</strong> từ thành phần cotton, cộng với <strong>độ bền màu, chống nhăn và bền giặt</strong> từ thành phần polyester.</p>

<p>Trong ngành in ấn và đồng phục tại Việt Nam, CVC thường được mô tả là "vải cao cấp hơn cotton thường" vì độ bền cao hơn và màu sắc giữ lâu hơn. Tuy nhiên, cảm giác mặc của CVC hơi khác cotton 100% — ít thấm hút hơn một chút và đôi khi cảm giác hơi "tổng hợp" hơn. Đây là trade-off cần cân nhắc tùy theo mục đích sử dụng và yêu cầu của khách hàng cuối.</p>

<p>Về kỹ thuật in ấn, <strong>CVC có bề mặt phù hợp cho hầu hết kỹ thuật in</strong> tương tự cotton 2 chiều. Tuy nhiên, thành phần polyester đòi hỏi chú ý đặc biệt với kỹ thuật in nhiệt — một số loại mực in có thể bị chảy màu khi gặp nhiệt độ cao (hiện tượng dye migration). Xưởng in nên kiểm tra nhiệt độ ép phù hợp với vải CVC cụ thể trước khi sản xuất đại trà.</p>`,
    keyPoints: [
      {
        title: "Thành phần và cấu trúc",
        description:
          "CVC tiêu chuẩn: 60% cotton / 40% polyester. Một số biến thể: 65/35 và 70/30. Vải được dệt theo kỹ thuật blended yarn — sợi cotton và polyester được xoắn cùng nhau trước khi dệt, tạo ra vải có tính chất đồng đều hơn so với đan xen hai loại sợi riêng biệt. Kết quả: bề mặt mịn và đồng nhất trên toàn diện tích vải.",
      },
      {
        title: "Ưu điểm của vải CVC",
        description:
          "Bền màu vượt trội — polyester giúp màu sắc giữ lâu hơn cotton 100%, đặc biệt sau nhiều lần giặt máy. Chống nhăn tốt — không cần là/ủi thường xuyên. Co rút ít hơn cotton thuần — chỉ 1-2% so với 2-3% của cotton 100%. Bền giặt — chịu được giặt máy mạnh mà không bị hỏng cấu trúc. Giá thành cạnh tranh hơn cotton 100% cùng GSM.",
      },
      {
        title: "Nhược điểm và hạn chế",
        description:
          "Thấm hút kém hơn cotton 100% do thành phần polyester. Cảm giác mặc không hoàn toàn tự nhiên như cotton nguyên chất — một số khách hàng nhạy cảm có thể nhận ra. Kỹ thuật in nhiệt (heat press, sublimation) cần lưu ý nhiệt độ để tránh dye migration từ polyester. Khó tái chế hơn cotton 100% từ góc độ môi trường.",
      },
      {
        title: "So sánh tổng thể với Cotton 100% và TC",
        description:
          "Cotton 100%: thoáng mát nhất, cảm giác tốt nhất, co rút nhiều nhất, kém bền màu nhất. CVC (60/40): cân bằng tốt giữa thoáng mát và bền, bền màu tốt, it co rút. TC (35/65): bền nhất, ít co rút nhất, kém thoáng mát nhất, giá thấp nhất. Chọn loại nào phụ thuộc vào môi trường sử dụng, tần suất giặt và yêu cầu cảm giác mặc.",
      },
    ],
    details: [
      {
        title: "Ứng dụng phù hợp nhất cho CVC",
        description:
          "Đồng phục văn phòng dài hạn — cần độ bền màu tốt qua nhiều lần giặt. Đồng phục chuỗi bán lẻ và nhà hàng — giặt máy thường xuyên với chất giặt tẩy. Đồng phục nhân viên kho vận và logistics — cần bền, ít co rút. Áo thun cao cấp cho doanh nghiệp muốn bền hơn cotton thường mà không cần polyester 100%.",
      },
      {
        title: "Lưu ý kỹ thuật in trên CVC",
        description:
          "In lụa: tương tự cotton, không có vấn đề đặc biệt. DTG: pre-treatment nhẹ hơn cotton tối, polyester hấp thụ mực khác cotton nên cần hiệu chỉnh cài đặt máy. In nhiệt (heat transfer): để tránh dye migration, dùng nhiệt độ thấp hơn và thời gian ngắn hơn so với cotton 100%. Thêu vi tính: tương tự cotton, dùng lót giấy phù hợp.",
      },
      {
        title: "Cách phân biệt CVC với cotton 100% và TC ngoài thực tế",
        description:
          "Thử đốt: cotton 100% cháy nhanh, mùi như giấy cháy, tàn mềm. CVC cháy chậm hơn, có mùi nhẹ tổng hợp. TC cháy chậm nhất, co rút đầu sợi, có mùi tổng hợp rõ hơn. Kiểm tra nhãn: nhà cung cấp uy tín ghi rõ thành phần trên nhãn hàng. Cảm giác tay: cotton tự nhiên hơn, CVC nhẹ tổng hợp hơn, TC tổng hợp nhất.",
      },
      {
        title: "Bảo quản áo thun CVC đúng cách",
        description:
          "Giặt máy chế độ thường với nước ấm (dưới 40°C). Tránh thuốc tẩy chlorine — dùng oxy bleach nếu cần làm sáng màu. Sấy ở nhiệt độ thấp hoặc phơi tự nhiên. Lật trái khi giặt để bảo vệ màu in nếu có. Không giặt chung với quần áo có khóa kim loại có thể gây trầy xước.",
      },
    ],
    faq: [
      {
        question: "CVC 60/40 và CVC 65/35 khác nhau như thế nào?",
        answer:
          "CVC 65/35 (65% cotton, 35% polyester) thoáng mát hơn và cảm giác tự nhiên hơn CVC 60/40. CVC 60/40 bền màu hơn và chống co rút tốt hơn một chút. Sự khác biệt không quá lớn trong thực tế sử dụng — cả hai đều được gọi là CVC trên thị trường. Khi đặt hàng, nên xác nhận tỷ lệ chính xác với nhà cung cấp.",
      },
      {
        question: "In lụa trên vải CVC có khó không?",
        answer:
          "In lụa trên CVC không khác nhiều so với cotton thuần — kỹ thuật và mực tương tự. Điểm cần lưu ý: tránh sấy khô bằng hơi nóng cao (>160°C) vì có thể làm biến dạng thành phần polyester. Dùng nhiệt độ sấy vừa phải (130-150°C) để mực bám chắc mà không ảnh hưởng vải.",
      },
      {
        question: "Vải CVC có thấm mồ hôi tốt không?",
        answer:
          "CVC thấm mồ hôi ít hơn cotton 100% do thành phần polyester không thấm hút tự nhiên. Tuy nhiên, với tỷ lệ 60% cotton, CVC vẫn đủ thoáng mát để mặc hàng ngày. Với đồng phục văn phòng và công việc nhẹ, CVC đáp ứng tốt. Với công việc ngoài trời nặng nhọc hoặc vận động nhiều, cotton 100% hoặc vải moisture-wicking chuyên dụng phù hợp hơn.",
      },
      {
        question: "Áo thun CVC có thể giặt máy thường xuyên không?",
        answer:
          "Đây là một trong những ưu điểm lớn nhất của CVC — bền với giặt máy. Thành phần polyester giúp áo giữ form dáng và màu sắc tốt hơn cotton thuần sau hàng chục đến hàng trăm lần giặt. Khuyến nghị: nhiệt độ nước dưới 40°C, chế độ bình thường, không giặt với chất tẩy mạnh để duy trì chất lượng tốt nhất.",
      },
      {
        question: "ATTD có bán áo thun CVC trơn không?",
        answer:
          "Có. ATTD cung cấp áo thun polo pique CVC (60/40) trong kho thường trực — đây là loại phổ biến nhất cho đồng phục văn phòng và doanh nghiệp. Áo thun jersey CVC cũng có theo đơn đặt hàng. Liên hệ để nhận báo giá và thông số kỹ thuật chi tiết cho từng loại CVC.",
      },
      {
        question: "Dye migration là gì và có ảnh hưởng áo thun CVC không?",
        answer:
          "Dye migration (chảy màu thuốc nhuộm polyester) là hiện tượng thuốc nhuộm trong sợi polyester bị kích hoạt bởi nhiệt và di chuyển vào lớp mực in phía trên, làm thay đổi màu sắc in ấn. Hiện tượng này xảy ra nhiều nhất khi dùng nhiệt độ cao trong quá trình sản xuất (in nhiệt, sấy). Dùng mực in có rào cản (barrier ink) và nhiệt độ sản xuất phù hợp có thể ngăn chặn hiệu quả.",
      },
    ],
    ctaTitle: "Cần nguồn hàng áo thun và polo CVC số lượng lớn?",
    ctaDescription:
      "ATTD cung cấp áo polo pique CVC và áo thun CVC sỉ số lượng lớn — đa màu sẵn kho, phù hợp đồng phục dài hạn và in ấn chuyên nghiệp.",
    internalLinks: [
      { label: "Vải cotton 2 chiều là gì?", href: "/vai-cotton-2-chieu" },
      { label: "Vải TC là gì?", href: "/vai-tc-la-gi" },
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // VẢI TC LÀ GÌ
  // Target: vải tc là gì, chất liệu tc, tc cotton polyester
  // ───────────────────────────────────────────────────────────────────────────
  "vai-tc-la-gi": {
    seoTitle: "Vải TC Là Gì? | Thành Phần, So Sánh Với CVC Và Cotton | ATTD",
    metaDescription:
      "Vải TC (polyester/cotton) là gì? Thành phần, ưu nhược điểm, so sánh chi tiết với CVC và cotton 100%. Hướng dẫn chọn vải TC phù hợp cho áo thun và đồng phục.",
    h1: "Vải TC Là Gì? Thành Phần, Ưu Nhược Điểm Và So Sánh Với CVC",
    heroIntro:
      "Vải TC là loại vải pha trộn polyester và cotton với polyester chiếm ưu thế — bền, ít co rút và giá thành thấp. Bài viết phân tích chi tiết thành phần, ưu nhược điểm thực tế và hướng dẫn khi nào nên và không nên dùng TC cho đồng phục và in ấn.",
    intro: `<p><strong>TC</strong> là viết tắt của "<strong>Teteron Cotton</strong>" hoặc "<strong>Polyester Cotton</strong>" — loại vải hỗn hợp trong đó <strong>polyester chiếm tỷ lệ cao hơn cotton</strong>. Công thức phổ biến nhất là <strong>65% polyester / 35% cotton</strong>, ngược với CVC (60% cotton / 40% polyester). Đây là điểm phân biệt quan trọng nhất giữa TC và CVC — cùng là vải pha trộn, nhưng thành phần chủ đạo khác nhau dẫn đến đặc tính sử dụng rất khác nhau.</p>

<p>TC được phát triển với mục tiêu chính là <strong>giảm chi phí vải mà vẫn đảm bảo độ bền</strong>. Polyester rẻ hơn cotton tự nhiên, bền hơn với giặt giũ và ít co rút hơn. Bằng cách tăng tỷ lệ polyester lên 65%, nhà sản xuất tạo ra vải vừa đủ thoáng mát (nhờ 35% cotton) vừa rất bền và ít co rút (nhờ 65% polyester). Đây là lý do TC phổ biến trong phân khúc đồng phục <strong>ngân sách thấp và sử dụng ngắn hạn</strong> như áo sự kiện một lần, áo quảng cáo và áo phát cho nhân viên thời vụ.</p>

<p>Tại Việt Nam, TC đôi khi bị bán với tên gọi "cotton pha" hoặc thậm chí chỉ là "cotton" mà không ghi rõ tỷ lệ — điều này gây nhầm lẫn cho người mua không có kinh nghiệm. Khi nhận hàng, áo TC thường có <strong>cảm giác khô hơn, ít mịn hơn cotton 100%</strong> và đôi khi hơi "sáng bóng" do bề mặt polyester. Biết cách phân biệt giúp đại lý và xưởng in tránh nhận sai hàng và tư vấn khách hàng chính xác hơn.</p>

<p>Về mặt ứng dụng, TC không phải lựa chọn tồi — chỉ cần dùng đúng mục đích. Với đơn hàng cần <strong>kiểm soát chi phí chặt chẽ</strong> và không yêu cầu chất lượng cao cấp (áo sự kiện phát một lần, áo quảng cáo ngắn hạn), TC là lựa chọn hợp lý. Với đồng phục dài hạn hoặc sản phẩm thương hiệu cần ấn tượng tốt, cotton 100% hay CVC là lựa chọn đúng hơn.</p>`,
    keyPoints: [
      {
        title: "Thành phần và nhận diện",
        description:
          "TC tiêu chuẩn: 65% polyester / 35% cotton. Một số biến thể: 67/33, 70/30. Nhận biết nhanh: áo TC thường nhẹ hơn cùng size so với cotton thuần, bề mặt hơi bóng nhẹ, cảm giác tay hơi khô. Giá thành TC thường thấp hơn CVC 15-20% và thấp hơn cotton 100% 25-35% ở cùng GSM.",
      },
      {
        title: "Ưu điểm của vải TC",
        description:
          "Giá thành thấp nhất trong 3 loại vải phổ biến (cotton, CVC, TC). Ít co rút nhất — dưới 1% sau giặt, giữ kích thước ổn định. Bền màu tốt nhờ polyester chiếm ưu thế. Khô nhanh sau giặt — polyester không giữ nước như cotton. Kháng nhăn tốt — ít cần là ủi.",
      },
      {
        title: "Nhược điểm thực tế",
        description:
          "Kém thoáng mát nhất trong 3 loại — polyester chiếm 65%, ít thấm hút mồ hôi. Cảm giác mặc kém tự nhiên nhất — nhiều người nhạy cảm có thể cảm thấy bí và khó chịu hơn cotton. In nhiệt (heat press) trên TC rủi ro cao nhất về dye migration do polyester nhiều. Ít thân thiện môi trường nhất — khó tái chế, sợi polyester tách ra khi giặt gây ô nhiễm vi nhựa.",
      },
      {
        title: "So sánh chi tiết TC vs CVC vs Cotton 100%",
        description:
          "Thoáng mát: Cotton 100% > CVC > TC. Bền màu: TC ≈ CVC > Cotton. Co rút: TC < CVC < Cotton. Giá: TC < CVC < Cotton (giá tăng dần). Cảm giác: Cotton > CVC > TC (từ tốt nhất đến kém nhất). In nhiệt an toàn: Cotton > CVC > TC. Thân thiện môi trường: Cotton > CVC > TC.",
      },
    ],
    details: [
      {
        title: "Khi nào nên dùng vải TC?",
        description:
          "Áo sự kiện phát một lần (rally, lễ hội, activation thương hiệu) — cần kiểm soát chi phí, không cần bền lâu dài. Áo quảng cáo số lượng lớn với ngân sách eo hẹp. Áo học sinh một năm học. Áo tình nguyện phát cho đông người. Với những mục đích này, TC là lựa chọn hợp lý về mặt chi phí.",
      },
      {
        title: "Khi nào KHÔNG nên dùng TC?",
        description:
          "Đồng phục nhân viên mặc hàng ngày — TC sẽ gây khó chịu, bí hơi, ảnh hưởng hiệu suất làm việc. Trang phục thể thao hoặc outdoor — cần thoáng mát. Áo thun thương hiệu muốn tạo ấn tượng tốt — TC cảm giác rẻ. Đồng phục phục vụ ngành ăn uống, bệnh viện — cần vệ sinh cao, thoáng mát.",
      },
      {
        title: "Lưu ý in ấn trên vải TC",
        description:
          "In lụa: được, nhưng cần lưu ý nhiệt độ sấy. In DTG: khó hơn cotton vì polyester không hấp thụ mực nước tốt — cần pre-treatment đặc biệt cho vải TC. In nhiệt (heat press, sublimation): rủi ro dye migration cao nhất — dùng nhiệt độ thấp, thời gian ngắn và test trước. DTF transfer: an toàn hơn các kỹ thuật khác cho TC.",
      },
      {
        title: "Phân biệt TC với cotton và CVC khi mua hàng",
        description:
          "Hỏi nhà cung cấp về tỷ lệ thành phần chính xác và yêu cầu ghi trên nhãn hàng. Cảm nhận tay: TC khô và hơi bóng hơn cotton. Thử đốt: TC cháy chậm hơn cotton, sợi polyester co và vón lại. Giá: TC rẻ bất thường so với GSM tương đương của cotton nên cảnh báo về thành phần. Mua mẫu thử và kiểm tra trước khi đặt số lượng lớn.",
      },
    ],
    faq: [
      {
        question: "Vải TC và vải CVC khác nhau như thế nào?",
        answer:
          "Sự khác biệt chính là tỷ lệ thành phần. CVC: 60% cotton / 40% polyester (cotton là chủ). TC: 65% polyester / 35% cotton (polyester là chủ). Do thành phần khác nhau, CVC thoáng mát hơn, cảm giác tự nhiên hơn và phù hợp cho in nhiệt hơn TC. TC rẻ hơn, ít co rút hơn và khô nhanh hơn. Với đồng phục dài hạn, CVC luôn là lựa chọn tốt hơn TC.",
      },
      {
        question: "TC viết tắt của từ gì?",
        answer:
          "TC là viết tắt của 'Teteron Cotton' hoặc 'T/C Blend' (Polyester Cotton Blend). 'Teteron' là tên thương mại của sợi polyester polyethylene terephthalate được Toray (Nhật Bản) giới thiệu vào thập niên 1960. Ngày nay, TC được dùng như thuật ngữ chung chỉ vải pha trộn polyester/cotton trong đó polyester chiếm tỷ lệ cao hơn.",
      },
      {
        question: "Áo thun TC có in lụa được không?",
        answer:
          "In lụa trên TC được, nhưng cần cẩn thận hơn so với cotton. Dùng nhiệt độ sấy vừa phải (130-145°C), không nên sấy quá nóng vì có thể làm biến dạng polyester. Dùng mực in có độ đàn hồi (elasticity) phù hợp với vải TC. Test một số chiếc trước khi sản xuất đại trà để kiểm tra độ bám mực và màu sắc.",
      },
      {
        question: "Tại sao áo thun TC rẻ hơn cotton?",
        answer:
          "Polyester rẻ hơn cotton nguyên liệu thô do được sản xuất từ dầu mỏ (nguồn gốc tổng hợp) thay vì nông nghiệp (cotton cần đất, nước, lao động nhiều). Bằng cách thay thế 65% cotton bằng polyester, chi phí nguyên liệu giảm đáng kể trong khi khả năng dệt vải vẫn đảm bảo. Đây là lý do TC phổ biến trong phân khúc giá thấp.",
      },
      {
        question: "ATTD có cung cấp áo thun TC trơn không?",
        answer:
          "ATTD tập trung vào áo thun cotton 100% và polo CVC cao cấp để đảm bảo chất lượng tốt nhất cho đối tác. Với nhu cầu áo TC số lượng lớn cho sự kiện hoặc ngân sách thấp, liên hệ ATTD để được tư vấn và giới thiệu nguồn phù hợp. ATTD ưu tiên chất lượng và sẽ tư vấn lựa chọn phù hợp nhất với từng mục đích.",
      },
      {
        question: "Áo thun TC giặt như thế nào để bền nhất?",
        answer:
          "Mặc dù TC ít co rút và bền hơn cotton, vẫn cần giặt đúng cách để bền lâu: Giặt nước lạnh đến ấm (<40°C). Lật trái trước khi giặt. Tránh chất tẩy chlorine mạnh. Sấy nhiệt thấp hoặc phơi tự nhiên. Không ủi trực tiếp trên bề mặt vải TC — dùng khăn ẩm phủ giữa bàn là và áo.",
      },
    ],
    ctaTitle: "Tìm nguồn hàng áo thun chất lượng cho xưởng in?",
    ctaDescription:
      "ATTD cung cấp áo thun cotton 100% và polo CVC chất lượng cao — phù hợp cho mọi kỹ thuật in ấn và đồng phục doanh nghiệp dài hạn. Liên hệ để nhận báo giá.",
    internalLinks: [
      { label: "Vải cotton 2 chiều là gì?", href: "/vai-cotton-2-chieu" },
      { label: "Vải CVC là gì?", href: "/vai-cvc-la-gi" },
      { label: "Áo thun trơn sỉ", href: "/ao-thun-tron" },
    ],
  },
};

export function getKnowledgeContent(slug: string): KnowledgeContent | null {
  return content[slug] ?? null;
}

export const KNOWLEDGE_SLUGS = Object.keys(content);
