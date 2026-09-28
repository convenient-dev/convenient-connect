/**
 * Laravel services-management API (My Services): templates, create, list,
 * details, edit, pricing, status, files and delete.
 *
 * This is distinct from `api/services.ts`, which serves the business-management
 * category picker (`/business/services`).
 *
 * Storage paths for portfolio, certificate and category images are resolved to
 * absolute URLs. Dynamic file paths inside `answers_json` are left as returned,
 * because `DELETE /services/{id}/files` needs the exact stored `file_path`.
 */
import {
  buildQuery,
  laravelFetch,
  laravelFetchWithMeta,
  toAbsoluteUrl,
  type PaginatedResult,
  type PaginationMeta,
} from "./client";
import type { components, paths } from "./generated/api-types";

const SERVICES_PREFIX = "/service-provider/services";
const TEMPLATE_PATH = "/service-provider/service-form-template";

// ---------------------------------------------------------------------------
// Types (from generated OpenAPI schemas)
// ---------------------------------------------------------------------------

type Schemas = components["schemas"];

type JsonData<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends {
    responses: { 200: { content: { "application/json": { data?: infer D } } } };
  }
    ? NonNullable<D>
    : never;

export type ProviderType = "individual" | "business";

export type ServiceCategoryItem = JsonData<
  "/service-provider/services/categories",
  "get"
>[number];
export type ServiceSubcategoryItem = JsonData<
  "/service-provider/services/categories/{categoryId}/subcategories",
  "get"
>[number];

export type ServiceFormTemplate = Schemas["ServiceFormTemplatePayload"];
export type ServiceFormTemplateField = Schemas["ServiceFormTemplateField"];
export type ServiceFormTemplateSection = Schemas["ServiceFormTemplateSection"];
export type ServiceFormSubmitAs = Schemas["ServiceFormSubmitAs"];
export type ProviderListingCapability = Schemas["ProviderListingCapability"];
export type ProviderListingCapabilitySummary =
  Schemas["ProviderListingCapabilitySummary"];
export type ProviderPublishability = Schemas["ProviderPublishability"];

export type ServiceListItem = Schemas["ServiceListItem"];
export type ServiceListTab = NonNullable<
  paths["/service-provider/services"]["get"]["parameters"]["query"]
>["tab"];
export type ServiceListStatus = NonNullable<
  paths["/service-provider/services"]["get"]["parameters"]["query"]
>["status"];

export type ServiceDetails = Schemas["ServiceDetailsData"];
export type ServicePricingData = Schemas["ServicePricingData"];
export type ServicePricingRecord = Schemas["ServicePricingRecord"];
export type ServicePricingUpdateRequest = Schemas["ServicePricingUpdateRequest"];
export type ServiceDynamicAnswer = Schemas["ServiceDynamicAnswer"];
export type ServiceFulfillmentOption = Schemas["ServiceFulfillmentOption"];

export type ServiceStatusData = NonNullable<
  Schemas["ServiceStatusResponse"]["data"]
>;
export type ServiceDeleteReason = Schemas["ServiceDeleteReason"];
export type ServiceDeleteRequest = Schemas["ServiceDeleteRequest"];
export type ServiceFileDeleteRequest = Schemas["ServiceFileDeleteRequest"];
export type ServiceFileDeleteData = NonNullable<
  Schemas["ServiceFileDeleteResponse"]["data"]
>;

/** A stored portfolio or certificate file. */
export interface ServiceStoredFile {
  id?: number;
  url?: string | null;
  sort_order?: number;
}

/** One shared description with its files. */
export interface ServiceCertificate {
  id?: number;
  description?: string | null;
  files?: ServiceStoredFile[];
}

// api-doc.json types the nested objects below as plain `object`. The keys come
// from the integration guide (sections 23-25 and 41); treat them as optional.
export interface ServiceInformationCurrentValues {
  title?: string;
  fulfillment_type_ids?: number[];
  description?: string;
  additional_information?: string | null;
  tagline?: string | null;
  address_id?: number | null;
  address?: string | null;
  service_radius?: string | number | null;
  service_radius_unit?: "mile" | "km" | null;
  information_accuracy_acknowledgement?: boolean;
  answers_json?: Record<string, unknown>;
  portfolio_images?: ServiceStoredFile[];
  certificate?: ServiceCertificate | null;
  [key: string]: unknown;
}

type ServiceInformationRaw = NonNullable<
  Schemas["ServiceInformationResponse"]["data"]
>;

export type ServiceInformation = Omit<ServiceInformationRaw, "current_values"> & {
  current_values?: ServiceInformationCurrentValues;
};

type ServiceEditOverviewRaw = NonNullable<
  Schemas["ServiceEditOverviewResponse"]["data"]
>;

export type ServiceEditOverview = Omit<
  ServiceEditOverviewRaw,
  "service_type" | "search_setting" | "sections"
> & {
  service_type?: Record<string, unknown>;
  search_setting?: { is_active?: boolean; can_update?: boolean };
  sections?: { key?: string; [key: string]: unknown }[];
};

type ServiceCategoryRaw = NonNullable<Schemas["ServiceCategoryResponse"]["data"]>;

export type ServiceCategoryInfo = Omit<
  ServiceCategoryRaw,
  "category" | "subcategory"
> & {
  category?: Schemas["ServiceFormTemplateCategory"];
  subcategory?: Schemas["ServiceFormTemplateSubcategory"];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapStoredFile(file: ServiceStoredFile): ServiceStoredFile {
  return { ...file, url: toAbsoluteUrl(file.url) };
}

function mapCertificate(
  certificate: ServiceCertificate | null | undefined,
): ServiceCertificate | null {
  if (!certificate) return null;
  return {
    ...certificate,
    files: (certificate.files ?? []).map(mapStoredFile),
  };
}

function mapServiceDetails(data: ServiceDetails): ServiceDetails {
  const portfolio = (data.portfolio_images ?? []) as ServiceStoredFile[];
  const certificate = data.certificate as ServiceCertificate | null | undefined;
  return {
    ...data,
    portfolio_images: portfolio.map(mapStoredFile) as ServiceDetails["portfolio_images"],
    certificate: mapCertificate(certificate) as ServiceDetails["certificate"],
  };
}

function mapServiceInformation(data: ServiceInformation): ServiceInformation {
  const current = data.current_values;
  if (!current) return data;
  return {
    ...data,
    current_values: {
      ...current,
      portfolio_images: (current.portfolio_images ?? []).map(mapStoredFile),
      certificate: mapCertificate(current.certificate),
    },
  };
}

// ---------------------------------------------------------------------------
// Category pickers
// ---------------------------------------------------------------------------

/**
 * Active service categories. Pass `businessId` for a business provider so only
 * categories assigned to that business are returned.
 */
export async function listServiceCategories(
  businessId?: number,
): Promise<ServiceCategoryItem[]> {
  const data = await laravelFetch<ServiceCategoryItem[]>(
    `${SERVICES_PREFIX}/categories${buildQuery({ business_id: businessId })}`,
  );
  return (data ?? []).map((item) => ({
    ...item,
    category_logo: toAbsoluteUrl(item.category_logo),
  }));
}

/**
 * Active subcategories for one category, limited to the business's assigned
 * subcategories when `businessId` is given.
 */
export async function listServiceSubcategories(
  categoryId: number,
  businessId?: number,
): Promise<ServiceSubcategoryItem[]> {
  const data = await laravelFetch<ServiceSubcategoryItem[]>(
    `${SERVICES_PREFIX}/categories/${categoryId}/subcategories${buildQuery({ business_id: businessId })}`,
  );
  return (data ?? []).map((item) => ({
    ...item,
    sub_category_logo: toAbsoluteUrl(item.sub_category_logo),
  }));
}

// ---------------------------------------------------------------------------
// Template + create
// ---------------------------------------------------------------------------

/**
 * Resolved create-form template for the selected context. `businessId` is
 * required for `business` and must be omitted for `individual`.
 */
export async function getServiceFormTemplate(params: {
  categoryId: number;
  subcategoryId: number;
  providerType: ProviderType;
  businessId?: number;
}): Promise<ServiceFormTemplate> {
  return laravelFetch<ServiceFormTemplate>(
    `${TEMPLATE_PATH}${buildQuery({
      category_id: params.categoryId,
      subcategory_id: params.subcategoryId,
      provider_type: params.providerType,
      business_id:
        params.providerType === "business" ? params.businessId : undefined,
    })}`,
  );
}

/**
 * Creates a service from a multipart body built against the template. A new
 * service is `pending_review` (status 3). Throws a publishability `ApiError`
 * (see `isCommercialPublishabilityError`) when the listing is not publishable.
 */
export async function createService(
  formData: FormData,
): Promise<ServiceDetails> {
  const data = await laravelFetch<ServiceDetails>(SERVICES_PREFIX, {
    method: "POST",
    body: formData,
    isFormData: true,
  });
  return mapServiceDetails(data);
}

// ---------------------------------------------------------------------------
// List + read
// ---------------------------------------------------------------------------

/**
 * Lightweight My Services cards with pagination meta. `tab` maps the UI tabs:
 * `independent` is individual, `affiliated` is business.
 */
export async function listMyServices(params: {
  tab?: ServiceListTab;
  status?: ServiceListStatus;
  search?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<PaginatedResult<ServiceListItem[], PaginationMeta>> {
  const result = await laravelFetchWithMeta<ServiceListItem[], PaginationMeta>(
    `${SERVICES_PREFIX}${buildQuery({
      tab: params.tab,
      status: params.status,
      search: params.search,
      page: params.page,
      per_page: params.perPage,
    })}`,
  );
  return {
    ...result,
    data: (result.data ?? []).map((item) => ({
      ...item,
      portfolio: item.portfolio
        ? { ...item.portfolio, url: toAbsoluteUrl(item.portfolio.url) ?? undefined }
        : item.portfolio,
    })),
  };
}

/** Complete read-only service details. */
export async function getServiceDetails(
  serviceId: number,
): Promise<ServiceDetails> {
  const data = await laravelFetch<ServiceDetails>(
    `${SERVICES_PREFIX}/${serviceId}`,
  );
  return mapServiceDetails(data);
}

/** First Edit Service screen: status, search setting and editable sections. */
export async function getServiceEditOverview(
  serviceId: number,
): Promise<ServiceEditOverview> {
  return laravelFetch<ServiceEditOverview>(`${SERVICES_PREFIX}/${serviceId}/edit`);
}

/** Immutable category and subcategory of a saved service. */
export async function getServiceCategory(
  serviceId: number,
): Promise<ServiceCategoryInfo> {
  return laravelFetch<ServiceCategoryInfo>(
    `${SERVICES_PREFIX}/${serviceId}/category`,
  );
}

// ---------------------------------------------------------------------------
// Information + candidate
// ---------------------------------------------------------------------------

/**
 * Template-driven information for editing. `template` has pricing removed (for
 * an information-only screen); `candidate_template` is the full template.
 */
export async function getServiceInformation(
  serviceId: number,
): Promise<ServiceInformation> {
  const data = await laravelFetch<ServiceInformation>(
    `${SERVICES_PREFIX}/${serviceId}/information`,
  );
  return mapServiceInformation(data);
}

/**
 * Updates information and files only. Do not include identity, pricing or the
 * accuracy acknowledgement in `formData`.
 */
export async function updateServiceInformation(
  serviceId: number,
  formData: FormData,
): Promise<ServiceInformation> {
  const data = await laravelFetch<ServiceInformation>(
    `${SERVICES_PREFIX}/${serviceId}/information`,
    { method: "POST", body: formData, isFormData: true },
  );
  return mapServiceInformation(data);
}

/**
 * Saves the complete listing (information, pricing, dynamic answers and files)
 * atomically. `formData` must include `answers_mode=replace`.
 */
export async function saveServiceCandidate(
  serviceId: number,
  formData: FormData,
): Promise<ServiceDetails> {
  const data = await laravelFetch<ServiceDetails>(
    `${SERVICES_PREFIX}/${serviceId}/candidate`,
    { method: "POST", body: formData, isFormData: true },
  );
  return mapServiceDetails(data);
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/** Saved pricing plus the capability needed to resolve allowed units. */
export async function getServicePricing(
  serviceId: number,
): Promise<ServicePricingRecord> {
  return laravelFetch<ServicePricingRecord>(
    `${SERVICES_PREFIX}/${serviceId}/pricing`,
  );
}

/**
 * Updates pricing only. Send `price_unit_id` for quote-required too, and
 * `profile_pricing_scope` only when the capability state allows it.
 */
export async function updateServicePricing(
  serviceId: number,
  body: ServicePricingUpdateRequest,
): Promise<ServicePricingRecord> {
  return laravelFetch<ServicePricingRecord>(
    `${SERVICES_PREFIX}/${serviceId}/pricing`,
    { method: "POST", body },
  );
}

// ---------------------------------------------------------------------------
// Status, files, delete
// ---------------------------------------------------------------------------

/**
 * Flips active <-> inactive. Pending-review services return 422. Activation
 * can fail with a publishability `ApiError`.
 */
export async function toggleServiceStatus(
  serviceId: number,
): Promise<ServiceStatusData> {
  return laravelFetch<ServiceStatusData>(
    `${SERVICES_PREFIX}/${serviceId}/status`,
    { method: "POST" },
  );
}

/**
 * Deletes one stored file. Portfolio and certificate files use `file_id`;
 * dynamic files use `field_key` and the exact stored `file_path`.
 */
export async function deleteServiceFile(
  serviceId: number,
  body: ServiceFileDeleteRequest,
): Promise<ServiceFileDeleteData> {
  return laravelFetch<ServiceFileDeleteData>(
    `${SERVICES_PREFIX}/${serviceId}/files`,
    { method: "DELETE", body },
  );
}

/** Reasons to offer before deleting a service. */
export async function listDeleteReasons(): Promise<ServiceDeleteReason[]> {
  const data = await laravelFetch<ServiceDeleteReason[]>(
    `${SERVICES_PREFIX}/delete-reasons`,
  );
  return data ?? [];
}

/**
 * Logically deletes a service (status 2). `other_reason` is required only when
 * a selected reason has `is_other`.
 */
export async function deleteService(
  serviceId: number,
  body: ServiceDeleteRequest,
): Promise<ServiceStatusData> {
  return laravelFetch<ServiceStatusData>(`${SERVICES_PREFIX}/${serviceId}`, {
    method: "DELETE",
    body,
  });
}
