import type { SupportTicketStatus } from "@/api/support";

export const TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

/** Label for a status string from the API; unknown values are shown as-is. */
export function ticketStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  return TICKET_STATUS_LABEL[status as SupportTicketStatus] ?? status;
}

/** "Oct 22, 2026" from an ISO timestamp; empty when missing or invalid. */
export function formatSupportDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Oct 22, 2026, 10:00 AM" for message timestamps. */
export function formatSupportDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
