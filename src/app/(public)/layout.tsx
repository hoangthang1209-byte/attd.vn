import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import MobileActionBar from "@/components/public/MobileActionBar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />

      <div className="public-main">{children}</div>

      <Footer />
      <MobileActionBar />
    </>
  );
}