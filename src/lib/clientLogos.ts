/** Client / partner logos — UI config only. Replace placeholders with real assets in /public/uploads/clients/ */

export type ClientLogo = {
  id: string;
  name: string;
  /** Filename in /public/uploads/clients/ or full URL path */
  logo?: string;
  url?: string;
};

export const CLIENT_LOGOS_SECTION = {
  title: "Khách hàng & đối tác",
  description:
    "Phục vụ đại lý, xưởng in, agency và doanh nghiệp trên toàn quốc.",
} as const;

export const CLIENT_LOGOS: ClientLogo[] = [
  { id: "c1", name: "Đại lý đồng phục Miền Bắc" },
  { id: "c2", name: "Xưởng in thêu TP.HCM" },
  { id: "c3", name: "Agency sự kiện doanh nghiệp" },
  { id: "c4", name: "Công ty quà tặng DN" },
  { id: "c5", name: "Thương hiệu thời trang B2B" },
  { id: "c6", name: "Đối tác phân phối vùng miền" },
  { id: "c7", name: "Xưởng gia công OEM" },
  { id: "c8", name: "Đại lý quà tặng doanh nghiệp" },
  { id: "c9", name: "Công ty tổ chức sự kiện" },
  { id: "c10", name: "Đối tác in ấn quảng cáo" },
  { id: "c11", name: "Nhà cung cấp đồng phục" },
  { id: "c12", name: "Đại lý blank apparel" },
];
