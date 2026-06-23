import { legacyFetch, LEGACY_API_BASE_URL } from "./client";

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export function getUserServices(userId: number, deleted = false) {
  return legacyFetch<any[]>(
    `/users/${userId}/services?deleted=${deleted}`,
  );
}

export function getService(userId: number, serviceId: number | string) {
  return legacyFetch<any>(`/users/${userId}/services/${serviceId}`);
}

export function createService(userId: number, body: Record<string, unknown>) {
  return legacyFetch<any>(`/users/${userId}/services`, {
    method: "POST",
    body,
  });
}

export function updateService(
  userId: number,
  serviceId: number | string,
  body: Record<string, unknown>,
) {
  return legacyFetch<any>(`/users/${userId}/services/${serviceId}`, {
    method: "PUT",
    body,
  });
}

export function deleteService(userId: number, serviceId: number | string) {
  return legacyFetch<any>(`/users/${userId}/services/${serviceId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export function getAvailability(userId: number) {
  return legacyFetch<any>(`/users/${userId}/availability`);
}

export function toggleAvailability(userId: number, body: Record<string, unknown>) {
  return legacyFetch<any>(`/users/${userId}/availability`, {
    method: "POST",
    body,
  });
}

export function setWeeklySlots(userId: number, body: Record<string, unknown>) {
  return legacyFetch<any>(`/users/${userId}/availability/weekly`, {
    method: "PUT",
    body,
  });
}

export function setOverrides(userId: number, body: Record<string, unknown>) {
  return legacyFetch<any>(`/users/${userId}/availability/overrides`, {
    method: "PUT",
    body,
  });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function getCategories() {
  return legacyFetch<any[]>("/categories");
}

export function getSubcategories(categoryId: number | string) {
  return legacyFetch<any[]>(`/categories/${categoryId}/subcategories`);
}

export function getSubcategory(subcategoryId: number | string) {
  return legacyFetch<any>(`/subcategories/${subcategoryId}`);
}

export function getUserCategories(userId: number) {
  return legacyFetch<any[]>(`/users/${userId}/categories`);
}

// ---------------------------------------------------------------------------
// Affiliations
// ---------------------------------------------------------------------------

export function getUserAffiliations(userId: number) {
  return legacyFetch<any[]>(`/users/${userId}/affiliations`);
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export function getTickets(userId: number) {
  return legacyFetch<any[]>(`/users/${userId}/tickets`);
}

export function getTicket(userId: number, ticketId: number | string) {
  return legacyFetch<any>(`/users/${userId}/tickets/${ticketId}`);
}

export function createTicket(userId: number, body: Record<string, unknown>) {
  return legacyFetch<any>(`/users/${userId}/tickets`, {
    method: "POST",
    body,
  });
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export async function uploadImage(formData: FormData) {
  const res = await fetch(`${LEGACY_API_BASE_URL}/uploads/images`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Image upload failed");
  return res.json();
}

export async function deleteImage(imageId: number | string) {
  const res = await fetch(`${LEGACY_API_BASE_URL}/uploads/images/${imageId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Image delete failed");
  return res.json();
}

export async function uploadPdf(formData: FormData) {
  const res = await fetch(`${LEGACY_API_BASE_URL}/uploads/pdfs`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("PDF upload failed");
  return res.json();
}

export async function deletePdf(pdfId: number | string) {
  const res = await fetch(`${LEGACY_API_BASE_URL}/uploads/pdfs/${pdfId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("PDF delete failed");
  return res.json();
}

export async function uploadBusinessDoc(formData: FormData) {
  const res = await fetch(`${LEGACY_API_BASE_URL}/uploads/business-docs`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Upload failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export function getFaq() {
  return legacyFetch<any[]>("/frequent-questions");
}

// ---------------------------------------------------------------------------
// Profile-type change (business signup flow)
// ---------------------------------------------------------------------------

export function submitProfileTypeChange(
  userId: number,
  body: Record<string, unknown>,
) {
  return legacyFetch<any>(`/users/${userId}/profile-type-change`, {
    method: "PUT",
    body,
  });
}

// ---------------------------------------------------------------------------
// Legacy user fetch (for screens not yet on Laravel)
// ---------------------------------------------------------------------------

export function getLegacyUser(userId: number) {
  return legacyFetch<any>(`/users/${userId}`);
}
