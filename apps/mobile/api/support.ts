/**
 * Provider support (`/service-provider/support/*`): FAQ topics and articles,
 * and the provider's own support tickets (list, create, detail, reply, mark
 * read, close).
 *
 * Ticket routes are keyed by `ticket_number` (for example `P-10001`), never
 * the numeric id. Create and reply accept files, so both are sent as
 * multipart/form-data. Attachment storage paths are resolved to absolute URLs
 * so screens can open them directly.
 */
import {
  buildQuery,
  laravelFetch,
  laravelFetchWithMeta,
  toAbsoluteUrl,
  type PaginatedResult,
  type PaginationMeta,
} from "./client";
import type { components } from "./generated/api-types";
import { buildFormData, type MultipartFile } from "./multipart";

type Schemas = components["schemas"];

const SUPPORT_PREFIX = "/service-provider/support";

export type SupportTopic = Schemas["ProviderSupportTopic"];
export type SupportFaq = Schemas["ProviderFaq"];
export type SupportTicketListItem = Schemas["ProviderSupportTicketListItem"];
export type SupportTicketDetail = Schemas["ProviderSupportTicketDetail"];
export type SupportTicketMessage = Schemas["ProviderTicketMessage"];
export type SupportTicketAttachment = Schemas["ProviderTicketAttachment"];
export type SupportTicketStatusHistoryItem =
  Schemas["ProviderTicketStatusHistoryItem"];
export type SupportTicketStatus = NonNullable<SupportTicketDetail["status"]>;
export type SupportTicketStatusFilter = "all" | SupportTicketStatus;
export type SupportReply = NonNullable<
  Schemas["ProviderSupportReplyResponse"]["data"]
>;

/** Attachment rules shared by create and reply (api-doc.json). */
export const SUPPORT_ATTACHMENT_LIMIT = 5;
export const SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

/** The booking reference is collected only for a bookings topic. */
export function isBookingTopic(
  topic: Pick<SupportTopic, "name" | "slug"> | null | undefined,
): boolean {
  if (!topic) return false;
  return /booking/i.test(topic.name ?? "") || /booking/i.test(topic.slug ?? "");
}

/**
 * Client-side check mirroring the server's attachment rules so a bad file is
 * rejected before upload. Returns the server's wording, or null when valid.
 */
export function attachmentProblem(
  files: MultipartFile[],
  existingCount = 0,
): string | null {
  if (existingCount + files.length > SUPPORT_ATTACHMENT_LIMIT) {
    return `You can attach a maximum of ${SUPPORT_ATTACHMENT_LIMIT} files.`;
  }
  if (files.some((f) => f.size !== undefined && f.size > SUPPORT_ATTACHMENT_MAX_BYTES)) {
    return "Each file must be 10MB or smaller.";
  }
  if (files.some((f) => !SUPPORT_ATTACHMENT_TYPES.includes(f.type))) {
    return "Allowed types: jpg, jpeg, png, pdf.";
  }
  return null;
}

/**
 * Random key for `idempotency_key` (max 64 chars) so a retried submit
 * returns the existing ticket instead of creating a duplicate.
 */
export function newIdempotencyKey(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${Date.now().toString(16)}-${hex()}${hex()}-${hex()}${hex()}-${hex()}${hex()}`;
}

function resolveAttachment(file: SupportTicketAttachment): SupportTicketAttachment {
  return { ...file, url: toAbsoluteUrl(file.url) ?? file.url };
}

function resolveTicket(ticket: SupportTicketDetail): SupportTicketDetail {
  return {
    ...ticket,
    attachments: (ticket.attachments ?? []).map(resolveAttachment),
    messages: (ticket.messages ?? []).map((message) => ({
      ...message,
      attachments: (message.attachments ?? []).map(resolveAttachment),
    })),
  };
}

// ---------------------------------------------------------------------------
// Topics and FAQs
// ---------------------------------------------------------------------------

export function listSupportTopics(): Promise<SupportTopic[]> {
  return laravelFetch<SupportTopic[]>(`${SUPPORT_PREFIX}/topics`);
}

export function listSupportFaqs(topicId: number): Promise<SupportFaq[]> {
  return laravelFetch<SupportFaq[]>(`${SUPPORT_PREFIX}/faqs/${topicId}`);
}

/** `q` is required, 1 to 100 characters; the API returns at most 20 FAQs. */
export function searchSupportFaqs(query: string): Promise<SupportFaq[]> {
  return laravelFetch<SupportFaq[]>(
    `${SUPPORT_PREFIX}/faqs/search${buildQuery({ q: query.slice(0, 100) })}`,
  );
}

/** Each call increments the FAQ's view count. */
export function getSupportFaq(id: number): Promise<SupportFaq> {
  return laravelFetch<SupportFaq>(`${SUPPORT_PREFIX}/faqs/detail/${id}`);
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export function listSupportTickets(params: {
  status?: SupportTicketStatusFilter;
  page?: number;
  perPage?: number;
} = {}): Promise<PaginatedResult<SupportTicketListItem[], PaginationMeta>> {
  return laravelFetchWithMeta<SupportTicketListItem[], PaginationMeta>(
    `${SUPPORT_PREFIX}/tickets${buildQuery({
      status: params.status,
      page: params.page,
      per_page: params.perPage,
    })}`,
  );
}

export interface CreateSupportTicketInput {
  topicId: number;
  subject: string;
  description: string;
  /** Only for a bookings topic; omitted otherwise. */
  bookingId?: string | null;
  idempotencyKey?: string;
  attachments?: MultipartFile[];
}

/** `POST /tickets` (201). The response is the full ticket detail. */
export async function createSupportTicket(
  input: CreateSupportTicketInput,
): Promise<SupportTicketDetail> {
  const body = buildFormData({
    topic_id: input.topicId,
    subject: input.subject,
    description: input.description,
    booking_id: input.bookingId || undefined,
    idempotency_key: input.idempotencyKey,
    attachments: input.attachments?.length ? input.attachments : undefined,
  });
  const data = await laravelFetch<SupportTicketDetail>(`${SUPPORT_PREFIX}/tickets`, {
    method: "POST",
    body,
    isFormData: true,
  });
  return resolveTicket(data);
}

export async function getSupportTicket(ticketNumber: string): Promise<SupportTicketDetail> {
  const data = await laravelFetch<SupportTicketDetail>(
    `${SUPPORT_PREFIX}/tickets/${encodeURIComponent(ticketNumber)}`,
  );
  return resolveTicket(data);
}

/**
 * `POST /tickets/{ticket_number}/reply` (201). A reply on a resolved ticket
 * reopens it; a reply on a closed ticket is rejected with 422.
 */
export function replyToSupportTicket(
  ticketNumber: string,
  input: { body: string; attachments?: MultipartFile[] },
): Promise<SupportReply> {
  const body = buildFormData({
    body: input.body,
    attachments: input.attachments?.length ? input.attachments : undefined,
  });
  return laravelFetch<SupportReply>(
    `${SUPPORT_PREFIX}/tickets/${encodeURIComponent(ticketNumber)}/reply`,
    { method: "POST", body, isFormData: true },
  );
}

/** Clears the provider unread flag. Idempotent. */
export async function markSupportTicketRead(ticketNumber: string): Promise<void> {
  await laravelFetch<unknown>(
    `${SUPPORT_PREFIX}/tickets/${encodeURIComponent(ticketNumber)}/mark-read`,
    { method: "POST" },
  );
}

/** Closes the provider's own ticket. Idempotent; returns the updated detail. */
export async function closeSupportTicket(ticketNumber: string): Promise<SupportTicketDetail> {
  const data = await laravelFetch<SupportTicketDetail>(
    `${SUPPORT_PREFIX}/tickets/${encodeURIComponent(ticketNumber)}/close`,
    { method: "POST" },
  );
  return resolveTicket(data);
}
