import { getCategories } from "@/features/categories/services/category.service";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1>Danh mục</h1>

      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            {category.name}
          </li>
        ))}
      </ul>
    </div>
  );
}