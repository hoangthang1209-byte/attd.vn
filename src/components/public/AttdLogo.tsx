import Image from "next/image";
import Link from "next/link";

type AttdLogoProps = {
  variant?: "desktop" | "mobile";
  onClick?: () => void;
  className?: string;
};

const SIZES = {
  desktop: { height: 42, width: 168 },
  mobile: { height: 36, width: 144 },
} as const;

export default function AttdLogo({
  variant = "desktop",
  onClick,
  className = "",
}: AttdLogoProps) {
  const { height, width } = SIZES[variant];

  return (
    <Link
      href="/"
      className={`attd-logo-link ${className}`}
      onClick={onClick}
      aria-label="ATTD — Trang chủ"
    >
      <Image
        src="/attd-logo.svg"
        alt="ATTD"
        width={width}
        height={height}
        priority
        className="attd-logo-img"
        style={{ width: "auto", height }}
      />
    </Link>
  );
}
