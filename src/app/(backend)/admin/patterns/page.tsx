import { redirect } from "next/navigation";
import { PATTERN_ADMIN_LIST_PATH } from "@/features/patterns/pattern-admin-routes";

export default function PatternsAliasPage() {
  redirect(PATTERN_ADMIN_LIST_PATH);
}
