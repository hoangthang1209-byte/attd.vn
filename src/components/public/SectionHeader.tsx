type SectionHeaderProps = {
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export default function SectionHeader({
  title,
  description,
  align = "left",
  className = "",
}: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className={className}
      style={{
        marginBottom: "48px",
        textAlign: isCenter ? "center" : "left",
      }}
    >
      <h2 className="section-title" style={isCenter ? { margin: "0 auto 16px" } : undefined}>
        {title}
      </h2>
      {description && (
        <p
          className="section-description"
          style={isCenter ? { margin: "0 auto" } : undefined}
        >
          {description}
        </p>
      )}
    </div>
  );
}
