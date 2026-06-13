import SectionHeader from "@/components/public/SectionHeader";

export default function Section({
  title,
  description,
  children,
  alt = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section className={alt ? "section-alt section-compact" : "section-compact"}>
      <div className="container">
        <SectionHeader title={title} description={description} />
        {children}
      </div>
    </section>
  );
}
