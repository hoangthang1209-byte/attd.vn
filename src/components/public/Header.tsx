import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#111827",
            fontWeight: 700,
            fontSize: "20px",
          }}
        >
          ATTD
        </Link>

        <nav
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <Link href="/ao-thun-tron">Áo thun</Link>

          <Link href="/ao-polo-tron">Áo polo</Link>

          <Link href="/non">Nón</Link>

          <Link href="/tote">Tote</Link>

          <Link href="/binh-giu-nhiet">
            Bình giữ nhiệt
          </Link>

          <Link href="/dai-ly">Đại lý</Link>

          <Link href="/lien-he">Liên hệ</Link>
        </nav>
      </div>
    </header>
  );
}