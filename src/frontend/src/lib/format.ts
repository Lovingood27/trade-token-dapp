import type { Timestamp } from "@/backend";

/** Convert a Motoko nanosecond timestamp into a JS Date, or null when invalid. */
export function timestampToDate(timestamp: Timestamp): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a backend timestamp as a short, readable date (e.g. "Jun 14, 2024"). */
export function formatDate(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** Format a backend timestamp as a full date and time. */
export function formatDateTime(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a whole-unit money amount with thousands separators and currency code. */
export function formatMoney(amount: bigint, currency = "USD"): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/** Format a whole-unit money amount without a currency suffix. */
export function formatAmount(amount: bigint): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a 0–1 funding ratio as a whole percentage string. */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${Math.round(ratio * 100)}%`;
}

/** Clamp a 0–1 funding ratio into a 0–100 width value for progress bars. */
export function progressWidth(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(100, Math.max(0, ratio * 100));
}

/** Shorten a principal for display in dense ledger rows. */
export function shortPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-4)}`;
}

/** Human-readable label for a token kind. */
export function tokenKindLabel(kind: string): string {
  return kind === "purchaseOrder" ? "Purchase Order" : "Invoice";
}

/** Human-readable label for a token status. */
export function tokenStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "funded":
      return "Funded";
    case "matured":
      return "Matured";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/** Human-readable label for a ledger event kind. */
export function eventKindLabel(kind: string): string {
  switch (kind) {
    case "mint":
      return "Minted";
    case "use":
      return "Used";
    case "burn":
      return "Burned";
    default:
      return kind;
  }
}

/** Human-readable label for an invoice category. */
export function invoiceCategoryLabel(category: string): string {
  switch (category) {
    case "materialOrder":
      return "Material Order";
    case "heavyEquipmentRental":
      return "Heavy Equipment Rental";
    case "handAndPowerTools":
      return "Hand & Power Tools";
    default:
      return category;
  }
}

/** Human-readable label for an invoice review status. */
export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case "pendingReview":
      return "Pending Review";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}
