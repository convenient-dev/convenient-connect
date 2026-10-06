/** Shared wizard constants for the create-service flow. */

/** Fixed picker steps before the template-driven form: provider type, category, subcategory. */
export const CREATE_SERVICE_BASE_STEPS = 3;

/**
 * Total shown on the picker screens. Sections come from the template, so the
 * real total is only known on the form screen; assume one form step + review.
 */
export const CREATE_SERVICE_DISPLAY_TOTAL_STEPS = CREATE_SERVICE_BASE_STEPS + 2;

/** Route params carried through every create-service screen. */
export type CreateServiceContextParams = {
  providerType: "individual" | "business";
  businessId?: string;
  businessName?: string;
};
