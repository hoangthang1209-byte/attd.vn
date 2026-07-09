/** Square ATTD brand mark extracted from public/attd-logo.svg and public/icons/attd-icon.svg */
export function AttdIconMark({ size }: { size: number }) {
  const fontSize = Math.round(size * 0.5);
  const borderRadius = Math.round(size * 0.25);

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#DC2626",
        borderRadius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontSize,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: 1,
      }}
    >
      A
    </div>
  );
}
