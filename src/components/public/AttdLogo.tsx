import Image from "next/image";
import Link from "next/link";

const DEFAULT_LOGO_SRC = "/attd-logo.svg";

type AttdLogoProps = {
  variant?: "desktop" | "mobile";
  src?: string | null;
  onClick?: () => void;
  className?: string;
};

const SIZES = {
  desktop: { height: 42, width: 168 },
  mobile: { height: 36, width: 144 },
} as const;

export default function AttdLogo({
  variant = "desktop",
  src,
  onClick,
  className = "",
}: AttdLogoProps) {
  const { height, width } = SIZES[variant];
  const logoSrc = src?.trim() || DEFAULT_LOGO_SRC;
  const isDefaultSvg = logoSrc === DEFAULT_LOGO_SRC || logoSrc.endsWith(".svg");

  return (
    <Link
      href="/"
      className={`attd-logo-link ${className}`}
      onClick={onClick}
      aria-label="ATTD — Trang chủ"
    >
      {isDefaultSvg ? (
        <Image
          src={logoSrc}
          alt="ATTD"
          width={width}
          height={height}
          priority
          className="attd-logo-img"
          style={{ width: "auto", height }}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoSrc}
          alt="ATTD"
          className="attd-logo-img"
          style={{ width: "auto", height }}
        />
      )}
    </Link>
  );
}
