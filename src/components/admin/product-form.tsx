"use client";

import { useState } from "react";

type Category = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: Category[];
};

export default function ProductForm({
  categories,
}: ProductFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          categoryId,
        }),
      });

      const data = await response.json();

      console.log("API Response:", data);

      if (!response.ok) {
        alert("Lỗi tạo sản phẩm");
        console.error(data);
        return;
      }

      alert("Đã tạo sản phẩm");

      setName("");
      setSlug("");
      setCategoryId("");

      location.reload();
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">
          Tên sản phẩm
        </label>
        <br />
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <br />

      <div>
        <label htmlFor="slug">
          Slug
        </label>
        <br />
        <input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </div>

      <br />

      <div>
        <label htmlFor="category">
          Danh mục
        </label>
        <br />
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">
            Chọn danh mục
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <br />

      <button type="submit">
        Lưu sản phẩm
      </button>
    </form>
  );
}