export type AdministrativeProvinceRecord = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

export type AdministrativeWardRecord = {
  id: string;
  code: string;
  provinceId: string;
  name: string;
  sortOrder: number;
};
