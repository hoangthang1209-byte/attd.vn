export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="quote-document-pdf-root">{children}</div>;
}
