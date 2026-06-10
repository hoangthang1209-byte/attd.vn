"use client";

import { deleteCategory } from "@/features/categories/actions/category.action";

export default function DeleteCategoryButton({
  id,
}: {
  id: string;
}) {
  return (
    <button
      onClick={async () => {
        if (
          confirm("Xóa danh mục?")
        ) {
          await deleteCategory(id);
        }
      }}
    >
      Xóa
    </button>
  );
}