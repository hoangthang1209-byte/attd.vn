// Force every admin page to render on every request so that new DB records
// always appear without a redeploy.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}