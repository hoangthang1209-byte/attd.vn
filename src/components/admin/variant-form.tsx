"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
};

type VariantFormProps = {
  products: Item[];
  colors: Item[];
  sizes: Item[];
};

export default function VariantForm({
  products,
  colors,
  sizes,
}: VariantFormProps) {
  const [productId, setProductId] = useState("");
  const [colorId, setColorId] = useState("");
  const [sizeId, setSizeId] = useState("");

  const [sku, setSku] = useState("");

  const [dealerPrice, setDealerPrice] =
    useState("");

  const [vipPrice, setVipPrice] =
    useState("");

  useEffect(() => {
    const product = products.find(
      (item) => item.id === productId
    );

    const color = colors.find(
      (item) => item.id === colorId
    );

    const size = sizes.find(
      (item) => item.id === sizeId
    );

    if (!product || !color || !size) {
      setSku("");
      return;
    }

    const productCode = product.name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    const colorCode = color.name
      .replaceAll(" ", "-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("Đ", "D")
      .replaceAll("đ", "d")
      .toUpperCase();

    setSku(
      `${productCode}-${colorCode}-${size.name.toUpperCase()}`
    );
  }, [productId, colorId, sizeId, products, colors, sizes]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    try {
      const response = await fetch("/api/variants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          colorId,
          sizeId,
          sku,
          dealerPrice: Number(dealerPrice),
          vipPrice: Number(vipPrice),
        }),
      });

      const data = await response.json();

      console.log("Variant Response:", data);

      if (!response.ok) {
        alert("Lỗi tạo SKU");
        return;
      }

      alert("Đã tạo SKU");

      setProductId("");
      setColorId("");
      setSizeId("");
      setSku("");
      setDealerPrice("");
      setVipPrice("");

      location.reload();
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Sản phẩm</label>
        <br />

        <select
          value={productId}
          onChange={(e) =>
            setProductId(
              e.target.value
            )
          }
        >
          <option value="">
            Chọn sản phẩm
          </option>

          {products.map(
            (product) => (
              <option
                key={product.id}
                value={
                  product.id
                }
              >
                {product.name}
              </option>
            )
          )}
        </select>
      </div>

      <br />

      <div>
        <label>Màu sắc</label>
        <br />

        <select
          value={colorId}
          onChange={(e) =>
            setColorId(
              e.target.value
            )
          }
        >
          <option value="">
            Chọn màu
          </option>

          {colors.map(
            (color) => (
              <option
                key={color.id}
                value={
                  color.id
                }
              >
                {color.name}
              </option>
            )
          )}
        </select>
      </div>

      <br />

      <div>
        <label>Size</label>
        <br />

        <select
          value={sizeId}
          onChange={(e) =>
            setSizeId(
              e.target.value
            )
          }
        >
          <option value="">
            Chọn size
          </option>

          {sizes.map((size) => (
            <option
              key={size.id}
              value={size.id}
            >
              {size.name}
            </option>
          ))}
        </select>
      </div>

      <br />

      <div>
        <label>SKU (tự động)</label>
        <br />

        <input
          value={sku}
          readOnly
        />
      </div>

      <br />

      <div>
        <label>
          Giá đại lý
        </label>
        <br />

        <input
          value={dealerPrice}
          onChange={(e) =>
            setDealerPrice(
              e.target.value
            )
          }
        />
      </div>

      <br />

      <div>
        <label>Giá VIP</label>
        <br />

        <input
          value={vipPrice}
          onChange={(e) =>
            setVipPrice(
              e.target.value
            )
          }
        />
      </div>

      <br />

      <button type="submit">
        Lưu SKU
      </button>
    </form>
  );
}