"use client";

import { useState } from "react";

export default function CategoryForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        slug,
      }),
    });

    if (response.ok) {
      alert("Đã tạo danh mục");

      setName("");
      setSlug("");

      location.reload();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Tên danh mục</label>
        <br />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <br />

      <div>
        <label>Slug</label>
        <br />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </div>

      <br />

      <button type="submit">
        Thêm danh mục
      </button>
    </form>
  );
}