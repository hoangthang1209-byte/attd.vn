"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";

type MarketplaceSearchBarProps = {
  placeholder?: string;
  defaultValue?: string;
  size?: "default" | "large";
  className?: string;
};

export default function MarketplaceSearchBar({
  placeholder = "Tìm áo thun trơn, polo, nón, tote, bình giữ nhiệt…",
  defaultValue = "",
  size = "default",
  className = "",
}: MarketplaceSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/san-pham?q=${encodeURIComponent(q)}` : "/san-pham");
  }

  return (
    <form
      className={`mp-search${size === "large" ? " mp-search--large" : ""} ${className}`.trim()}
      role="search"
      onSubmit={handleSubmit}
    >
      <Search size={size === "large" ? 20 : 18} className="mp-search-icon" aria-hidden />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="mp-search-input"
        aria-label="Tìm sản phẩm nguồn hàng"
      />
      <button type="submit" className="mp-search-btn">
        Tìm kiếm
      </button>
    </form>
  );
}
