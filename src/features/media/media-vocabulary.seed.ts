export type MediaVocabularyTypeSeed =
  | "SUBJECT"
  | "MATERIAL"
  | "COLOR"
  | "TECHNIQUE"
  | "INDUSTRY"
  | "AUDIENCE"
  | "USE_CASE";

export type VocabularySeedTerm = {
  type: MediaVocabularyTypeSeed;
  code: string;
  name: string;
  aliases?: string[];
  sortOrder: number;
};

/** Conservative ATTD.vn system vocabulary seed (idempotent by type+name). */
export const MEDIA_VOCABULARY_SYSTEM_SEEDS: VocabularySeedTerm[] = [
  // Subjects
  { type: "SUBJECT", code: "AO_THUN", name: "Áo thun", aliases: ["t-shirt", "tee"], sortOrder: 10 },
  { type: "SUBJECT", code: "AO_POLO", name: "Áo polo", aliases: ["polo"], sortOrder: 20 },
  { type: "SUBJECT", code: "HOODIE", name: "Hoodie", aliases: ["áo hoodie"], sortOrder: 30 },
  { type: "SUBJECT", code: "SWEATER", name: "Sweater", aliases: ["áo sweater"], sortOrder: 40 },
  { type: "SUBJECT", code: "AO_KHOAC", name: "Áo khoác", aliases: ["jacket"], sortOrder: 50 },
  { type: "SUBJECT", code: "NON", name: "Nón", aliases: ["mũ", "cap", "hat"], sortOrder: 60 },
  { type: "SUBJECT", code: "TUI_TOTE", name: "Túi tote", aliases: ["tote bag"], sortOrder: 70 },
  { type: "SUBJECT", code: "BANDANA", name: "Bandana", sortOrder: 80 },
  { type: "SUBJECT", code: "BINH_GIU_NHIET", name: "Bình giữ nhiệt", aliases: ["tumbler"], sortOrder: 90 },
  { type: "SUBJECT", code: "DONG_PHUC", name: "Đồng phục", aliases: ["uniform"], sortOrder: 100 },
  {
    type: "SUBJECT",
    code: "QUA_TANG_DOANH_NGHIEP",
    name: "Quà tặng doanh nghiệp",
    aliases: ["corporate gift"],
    sortOrder: 110,
  },
  { type: "SUBJECT", code: "VAI", name: "Vải", aliases: ["fabric"], sortOrder: 120 },
  { type: "SUBJECT", code: "LOGO", name: "Logo", sortOrder: 130 },
  { type: "SUBJECT", code: "NHA_MAY", name: "Nhà máy", aliases: ["factory"], sortOrder: 140 },
  { type: "SUBJECT", code: "CONG_NHAN", name: "Công nhân", aliases: ["worker"], sortOrder: 150 },
  { type: "SUBJECT", code: "MAY_MOC", name: "Máy móc", aliases: ["machine"], sortOrder: 160 },
  { type: "SUBJECT", code: "BAO_BI", name: "Bao bì", aliases: ["packaging"], sortOrder: 170 },
  { type: "SUBJECT", code: "NHAN_MAC", name: "Nhãn mác", aliases: ["label", "tag"], sortOrder: 180 },

  // Materials
  { type: "MATERIAL", code: "COTTON", name: "Cotton", aliases: ["cotton 100%"], sortOrder: 10 },
  { type: "MATERIAL", code: "POLYESTER", name: "Polyester", sortOrder: 20 },
  { type: "MATERIAL", code: "COTTON_PHA", name: "Cotton pha", aliases: ["TC", "CVC"], sortOrder: 30 },
  { type: "MATERIAL", code: "THUN_CA_SAU", name: "Thun cá sấu", aliases: ["pique"], sortOrder: 40 },
  { type: "MATERIAL", code: "NI", name: "Nỉ", aliases: ["fleece"], sortOrder: 50 },
  { type: "MATERIAL", code: "JEAN_DENIM", name: "Jean / Denim", aliases: ["denim", "jean"], sortOrder: 60 },
  { type: "MATERIAL", code: "CANVAS", name: "Canvas", sortOrder: 70 },
  { type: "MATERIAL", code: "LUA", name: "Lụa", aliases: ["silk"], sortOrder: 80 },
  { type: "MATERIAL", code: "KIM_LOAI", name: "Kim loại", aliases: ["metal"], sortOrder: 90 },
  { type: "MATERIAL", code: "NHUA", name: "Nhựa", aliases: ["plastic"], sortOrder: 100 },
  { type: "MATERIAL", code: "GIAY", name: "Giấy", aliases: ["paper"], sortOrder: 110 },

  // Colors
  { type: "COLOR", code: "TRANG", name: "Trắng", aliases: ["white"], sortOrder: 10 },
  { type: "COLOR", code: "DEN", name: "Đen", aliases: ["black"], sortOrder: 20 },
  { type: "COLOR", code: "XAM", name: "Xám", aliases: ["grey", "gray"], sortOrder: 30 },
  { type: "COLOR", code: "DO", name: "Đỏ", aliases: ["red"], sortOrder: 40 },
  { type: "COLOR", code: "DO_DO", name: "Đỏ đô", aliases: ["maroon", "burgundy"], sortOrder: 50 },
  { type: "COLOR", code: "XANH_NAVY", name: "Xanh navy", aliases: ["navy"], sortOrder: 60 },
  { type: "COLOR", code: "XANH_DUONG", name: "Xanh dương", aliases: ["blue"], sortOrder: 70 },
  { type: "COLOR", code: "XANH_LA", name: "Xanh lá", aliases: ["green"], sortOrder: 80 },
  { type: "COLOR", code: "XANH_NGOC", name: "Xanh ngọc", aliases: ["teal", "cyan"], sortOrder: 90 },
  { type: "COLOR", code: "VANG", name: "Vàng", aliases: ["yellow"], sortOrder: 100 },
  { type: "COLOR", code: "CAM", name: "Cam", aliases: ["orange"], sortOrder: 110 },
  { type: "COLOR", code: "HONG", name: "Hồng", aliases: ["pink"], sortOrder: 120 },
  { type: "COLOR", code: "TIM", name: "Tím", aliases: ["purple"], sortOrder: 130 },
  { type: "COLOR", code: "BE", name: "Be", aliases: ["beige"], sortOrder: 140 },
  { type: "COLOR", code: "NAU", name: "Nâu", aliases: ["brown"], sortOrder: 150 },
  { type: "COLOR", code: "NHIEU_MAU", name: "Nhiều màu", aliases: ["multicolor"], sortOrder: 160 },

  // Techniques
  { type: "TECHNIQUE", code: "IN_LUA", name: "In lụa", aliases: ["screen print"], sortOrder: 10 },
  { type: "TECHNIQUE", code: "IN_CHUYEN_NHIET", name: "In chuyển nhiệt", aliases: ["sublimation"], sortOrder: 20 },
  { type: "TECHNIQUE", code: "IN_DTG", name: "In DTG", aliases: ["DTG"], sortOrder: 30 },
  { type: "TECHNIQUE", code: "IN_DTF", name: "In DTF", aliases: ["DTF"], sortOrder: 40 },
  { type: "TECHNIQUE", code: "THEU", name: "Thêu", aliases: ["embroidery"], sortOrder: 50 },
  { type: "TECHNIQUE", code: "EP_NHIET", name: "Ép nhiệt", aliases: ["heat press"], sortOrder: 60 },
  { type: "TECHNIQUE", code: "WASH", name: "Wash", aliases: ["giặt wash"], sortOrder: 70 },
  { type: "TECHNIQUE", code: "MAY", name: "May", aliases: ["sewing"], sortOrder: 80 },
  { type: "TECHNIQUE", code: "CAT", name: "Cắt", aliases: ["cutting"], sortOrder: 90 },
  { type: "TECHNIQUE", code: "KIEM_HANG", name: "Kiểm hàng", aliases: ["QC"], sortOrder: 100 },
  { type: "TECHNIQUE", code: "DONG_GOI", name: "Đóng gói", aliases: ["packing"], sortOrder: 110 },

  // Industries
  { type: "INDUSTRY", code: "DOANH_NGHIEP", name: "Doanh nghiệp", aliases: ["corporate"], sortOrder: 10 },
  { type: "INDUSTRY", code: "BAN_LE", name: "Bán lẻ", aliases: ["retail"], sortOrder: 20 },
  { type: "INDUSTRY", code: "FB", name: "F&B", aliases: ["food and beverage"], sortOrder: 30 },
  { type: "INDUSTRY", code: "GIAO_DUC", name: "Giáo dục", aliases: ["education"], sortOrder: 40 },
  { type: "INDUSTRY", code: "Y_TE", name: "Y tế", aliases: ["healthcare", "hospital"], sortOrder: 50 },
  { type: "INDUSTRY", code: "NGAN_HANG", name: "Ngân hàng", aliases: ["banking"], sortOrder: 60 },
  { type: "INDUSTRY", code: "BAT_DONG_SAN", name: "Bất động sản", aliases: ["real estate"], sortOrder: 70 },
  { type: "INDUSTRY", code: "CONG_NGHE", name: "Công nghệ", aliases: ["tech"], sortOrder: 80 },
  { type: "INDUSTRY", code: "SU_KIEN", name: "Sự kiện", aliases: ["event"], sortOrder: 90 },
  { type: "INDUSTRY", code: "GIAI_TRI", name: "Giải trí", aliases: ["entertainment"], sortOrder: 100 },
  { type: "INDUSTRY", code: "THE_THAO", name: "Thể thao", aliases: ["sports"], sortOrder: 110 },
  { type: "INDUSTRY", code: "DU_LICH", name: "Du lịch", aliases: ["tourism"], sortOrder: 120 },
  { type: "INDUSTRY", code: "NHA_HANG", name: "Nhà hàng", aliases: ["restaurant"], sortOrder: 130 },
  { type: "INDUSTRY", code: "KHACH_SAN", name: "Khách sạn", aliases: ["hotel"], sortOrder: 140 },
  { type: "INDUSTRY", code: "SAN_XUAT", name: "Sản xuất", aliases: ["manufacturing"], sortOrder: 150 },

  // Audiences
  { type: "AUDIENCE", code: "NAM", name: "Nam", aliases: ["men"], sortOrder: 10 },
  { type: "AUDIENCE", code: "NU", name: "Nữ", aliases: ["women"], sortOrder: 20 },
  { type: "AUDIENCE", code: "UNISEX", name: "Unisex", sortOrder: 30 },
  { type: "AUDIENCE", code: "TRE_EM", name: "Trẻ em", aliases: ["kids"], sortOrder: 40 },
  { type: "AUDIENCE", code: "NHAN_VIEN", name: "Nhân viên", aliases: ["staff", "employee"], sortOrder: 50 },
  { type: "AUDIENCE", code: "CONG_NHAN", name: "Công nhân", aliases: ["worker"], sortOrder: 60 },
  { type: "AUDIENCE", code: "KHACH_HANG", name: "Khách hàng", aliases: ["customer"], sortOrder: 70 },
  { type: "AUDIENCE", code: "DAI_LY", name: "Đại lý", aliases: ["dealer", "agent"], sortOrder: 80 },
  { type: "AUDIENCE", code: "DOANH_NGHIEP", name: "Doanh nghiệp", aliases: ["enterprise"], sortOrder: 90 },

  // Use cases
  {
    type: "USE_CASE",
    code: "DONG_PHUC_CONG_TY",
    name: "Đồng phục công ty",
    aliases: ["company uniform"],
    sortOrder: 10,
  },
  {
    type: "USE_CASE",
    code: "DONG_PHUC_SU_KIEN",
    name: "Đồng phục sự kiện",
    aliases: ["event uniform"],
    sortOrder: 20,
  },
  { type: "USE_CASE", code: "MERCHANDISE", name: "Merchandise", aliases: ["merch"], sortOrder: 30 },
  {
    type: "USE_CASE",
    code: "QUA_TANG_KHACH_HANG",
    name: "Quà tặng khách hàng",
    aliases: ["customer gift"],
    sortOrder: 40,
  },
  {
    type: "USE_CASE",
    code: "QUA_TANG_NHAN_VIEN",
    name: "Quà tặng nhân viên",
    aliases: ["staff gift"],
    sortOrder: 50,
  },
  { type: "USE_CASE", code: "TEAM_BUILDING", name: "Team building", sortOrder: 60 },
  {
    type: "USE_CASE",
    code: "RA_MAT_SAN_PHAM",
    name: "Ra mắt sản phẩm",
    aliases: ["product launch"],
    sortOrder: 70,
  },
  { type: "USE_CASE", code: "CONCERT", name: "Concert", sortOrder: 80 },
  { type: "USE_CASE", code: "BAN_LE", name: "Bán lẻ", aliases: ["retail"], sortOrder: 90 },
  { type: "USE_CASE", code: "NOI_DUNG_SEO", name: "Nội dung SEO", aliases: ["SEO content"], sortOrder: 100 },
  { type: "USE_CASE", code: "LANDING_PAGE", name: "Landing page", sortOrder: 110 },
  { type: "USE_CASE", code: "TRANG_CHU", name: "Trang chủ", aliases: ["homepage"], sortOrder: 120 },
  { type: "USE_CASE", code: "SOCIAL_MEDIA", name: "Social media", aliases: ["mạng xã hội"], sortOrder: 130 },
  {
    type: "USE_CASE",
    code: "CATALOGUE_SAN_PHAM",
    name: "Catalogue sản phẩm",
    aliases: ["catalog"],
    sortOrder: 140,
  },
  {
    type: "USE_CASE",
    code: "HO_SO_NANG_LUC",
    name: "Hồ sơ năng lực",
    aliases: ["company profile"],
    sortOrder: 150,
  },
];
