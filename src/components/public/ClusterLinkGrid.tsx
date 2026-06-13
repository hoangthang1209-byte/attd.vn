import PremiumCard from "@/components/public/PremiumCard";

type ClusterLink = {
  href: string;
  title: string;
  desc: string;
};

type ClusterLinkGridProps = {
  links: ClusterLink[];
};

export default function ClusterLinkGrid({ links }: ClusterLinkGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 20,
      }}
    >
      {links.map((item) => (
        <PremiumCard
          key={item.href}
          href={item.href}
          title={item.title}
          description={item.desc}
        />
      ))}
    </div>
  );
}
