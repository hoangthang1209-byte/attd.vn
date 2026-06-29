import type {
  DealerRFQArtworkStatus,
  DealerRFQPriority,
  DealerRFQProjectType,
  DealerRFQStatus,
} from "@prisma/client";
import {
  DEALER_RFQ_ARTWORK_STATUSES,
  DEALER_RFQ_PRIORITIES,
  DEALER_RFQ_PROJECT_TYPES,
  DEALER_RFQ_STATUSES,
} from "@/features/dealer/dealer-rfq.types";

export function isValidDealerRFQProjectType(value: string): value is DealerRFQProjectType {
  return (DEALER_RFQ_PROJECT_TYPES as string[]).includes(value);
}

export function isValidDealerRFQStatus(value: string): value is DealerRFQStatus {
  return (DEALER_RFQ_STATUSES as string[]).includes(value);
}

export function isValidDealerRFQPriority(value: string): value is DealerRFQPriority {
  return (DEALER_RFQ_PRIORITIES as string[]).includes(value);
}

export function isValidDealerRFQArtworkStatus(value: string): value is DealerRFQArtworkStatus {
  return (DEALER_RFQ_ARTWORK_STATUSES as string[]).includes(value);
}
