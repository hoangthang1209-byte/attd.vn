import AdminPageTitle from "@/components/admin/AdminPageTitle";
import type {
  ManufacturingAssetStatus,
  ManufacturingVisibility,
} from "@prisma/client";
import ManufacturingAssetList from "@/components/admin/manufacturing-library/ManufacturingAssetList";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import {
  type ManufacturingAssetAdminSort,
  listManufacturingAssetsAdmin,
  listManufacturingLookupsAdmin,
} from "@/features/manufacturing-library/manufacturing-admin.service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function ManufacturingLibraryAdminPage({ searchParams }: PageProps) {
  await requireAdminPermissionPage("manufacturingAsset.view");
  const params = await searchParams;
  const filters = {
    search: first(params.search),
    categoryId: first(params.categoryId),
    status: first(params.status),
    visibility: first(params.visibility),
    featured: first(params.featured),
    displayLocationId: first(params.displayLocationId),
    sort: first(params.sort) || "updated-desc",
    page: first(params.page) || "1",
  };
  const [list, lookups] = await Promise.all([
    listManufacturingAssetsAdmin({
      search: filters.search,
      categoryId: filters.categoryId,
      status: filters.status as ManufacturingAssetStatus | "",
      visibility: filters.visibility as ManufacturingVisibility | "",
      featured: filters.featured as "true" | "false" | "",
      displayLocationId: filters.displayLocationId,
      sort: filters.sort as ManufacturingAssetAdminSort,
      page: Number(filters.page),
      pageSize: 25,
    }),
    listManufacturingLookupsAdmin(),
  ]);

  return (
    <>
      <AdminPageTitle title="Thư viện sản xuất" />
      <ManufacturingAssetList
        assets={serializable(list.assets)}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        filters={filters}
        categories={serializable(lookups.categories)}
        displayLocations={serializable(lookups.displayLocations)}
      />
    </>
  );
}
