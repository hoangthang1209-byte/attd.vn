import type { HomepageProofIcon } from "@prisma/client";
import {
  Package,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export const HOMEPAGE_PROOF_ICONS: Record<HomepageProofIcon, LucideIcon> = {
  PACKAGE: Package,
  SETTINGS: Settings,
  USERS: Users,
  TRUCK: Truck,
};
