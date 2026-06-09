# ATTD Platform - PROJECT.md

## Vision

ATTD là nền tảng B2B cung cấp nguồn hàng đồng phục và quà tặng doanh nghiệp toàn quốc.

Mục tiêu:
- Quản lý sản phẩm, SKU, tồn kho, đại lý, lead.
- Website SEO mạnh.
- CMS nội bộ dễ dùng.
- AI hỗ trợ nhập liệu và tạo nội dung.

---

## Scope V1

### Website
- Trang chủ
- Danh mục sản phẩm
- Chi tiết sản phẩm
- OEM
- Đại lý
- Blog
- Liên hệ

### CMS
- Dashboard
- Product Management
- Category Management
- Lead CRM
- Dealer Management
- Blog Management
- Banner Management

### AI
- Product Description Generator
- SEO Generator
- FAQ Generator
- Blog Generator

---

## User Roles

### Super Admin
Toàn quyền hệ thống

### Admin
Quản lý dữ liệu

### Sales
Xử lý lead và dealer

### Content
Sản phẩm và bài viết

### Warehouse
Cập nhật tình trạng hàng

### Dealer
Tài khoản đại lý

---

## Business Rules

### Giá
- Khách thường không thấy giá
- Dealer thấy giá dealer
- VIP Dealer thấy giá VIP

### Tồn kho
Chỉ hiển thị:
- Còn hàng
- Sắp hết
- Hết hàng

Không hiển thị số lượng thực tế.

### Lead
Trạng thái:
- Mới
- Đang xử lý
- Đã báo giá
- Đã chốt
- Huỷ

---

## Sitemap

/
/ao-thun-tron
/ao-polo-tron
/non
/tote
/binh-giu-nhiet
/oem
/dai-ly
/blog
/lien-he

---

## Technology Stack

Frontend:
- Next.js 15
- TypeScript
- TailwindCSS
- shadcn/ui

Backend:
- Next.js Fullstack
- Server Actions
- Route Handlers

Database:
- PostgreSQL
- Prisma ORM

Infrastructure:
- Redis
- Cloudflare R2
- Meilisearch
- Coolify

AI:
- OpenAI API
- Anthropic API

---

## Core Entities

Products
Product Variants
Categories
Leads
Dealers
Users
Posts
Pages
Banners

---

## Sprint 01

### Week 1
- Repository setup
- Auth
- Prisma schema
- CMS layout

### Week 2
- Products
- Categories
- Leads
- Dealers

### Week 3
- Homepage
- Category pages
- Product pages

### Week 4
- AI Generator
- SEO
- Launch Beta

---

## Success Metrics

60 ngày đầu:
- 100 SKU
- 50 bài viết
- 20 dealer
- 30 lead/tháng
- 100-300 triệu doanh thu/tháng

12 tháng:
- 500+ SKU
- 300+ bài viết
- 100 dealer hoạt động
