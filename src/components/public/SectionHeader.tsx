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
      className={`section-header${isCenter ? " section-header--center" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <h2 className="section-title">
        {title}
      </h2>
      {description && (
        <p className="section-description">
          {description}
        </p>
      )}
    </div>
  );
}
