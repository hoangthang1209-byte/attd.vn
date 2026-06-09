# ATTD Database Schema V1

## Mục tiêu

ATTD là nền tảng B2B quản lý:

* Sản phẩm
* SKU
* Lead
* Dealer
* Nội dung SEO

V1 chưa triển khai:

* Đơn hàng
* Báo giá
* ERP
* Kế toán

---

## Category

Ví dụ:

* Áo thun trơn
* Áo polo trơn
* Nón
* Tote bag
* Bandana
* Bình giữ nhiệt

---

## Product

Ví dụ:

* AT Basic 180
* AT Premium 220
* AT Premium 250
* AT Heavy 280

Product là sản phẩm gốc.

---

## Product Variant

Ví dụ:

AT Premium 220

* Đen / XS
* Đen / S
* Đen / M
* Trắng / XS
* Trắng / S
* Trắng / M

Variant là SKU thực tế.

---

## Product Image

Ảnh của sản phẩm.

Một Product có nhiều ảnh.

---

## Lead

Khách gửi yêu cầu:

* Báo giá
* OEM
* Đại lý

---

## Dealer

Thông tin đăng ký đại lý.

Trạng thái:

* PENDING
* APPROVED
* REJECTED

---

## Post

Bài viết SEO.

Ví dụ:

* Áo thun cotton 220gsm là gì
* Cách chọn áo đồng phục công ty

---

## User

Vai trò nội bộ:

* SUPER_ADMIN
* ADMIN
* SALES
* CONTENT
* WAREHOUSE
