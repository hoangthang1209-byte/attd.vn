import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  href?: string;
  label?: string;
};

/** Secondary back navigation for admin detail pages. */
export default function AdminBackLink({
  href = "/admin/orders",
  label = "Quay lại danh sách đơn hàng",
}: Props) {
  return (
    <Link href={href} className="admin-back-link">
      <ArrowLeft size={16} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
