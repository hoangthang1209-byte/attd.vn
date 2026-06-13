import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/product-form";
import ProductAdminTable from "@/components/admin/ProductAdminTable";
import { getCategories } from "@/features/categories/services/category.service";
import { prisma } from "@/lib/prisma";

export default async function ProductsAdminPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        images: {
          select: { id: true, imageUrl: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getCategories(),
  ]);

  const rows = products.map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <AdminShell title="Quản lý sản phẩm">
      <ProductForm categories={categories} />
      <hr style={{ margin: "32px 0" }} />
      <ProductAdminTable products={rows} />
    </AdminShell>
  );
}
