import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type ResponsiveGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  minItemWidth?: number;
  gap?: number;
};

export default function ResponsiveGrid({
  children,
  minItemWidth = 240,
  gap = 16,
  className = "",
  style,
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      className={`responsive-grid${className ? ` ${className}` : ""}`}
      style={
        {
          "--responsive-grid-min": `${minItemWidth}px`,
          "--responsive-grid-gap": `${gap}px`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}
