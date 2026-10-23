/** Shared wizard constants for the create-service flow. */

/** Fixed picker steps before the template-driven form: provider type, category, subcategory. */
export const CREATE_SERVICE_BASE_STEPS = 3;

/**
 * Total shown on every wizard screen: the picker steps, one form step, and
 * review. The form's pages come from the template (fetched after the category
 * and subcategory are chosen) and can change as values change, so they count
 * as a single step with sub-progress instead of shifting the total mid-wizard.
 */
export const CREATE_SERVICE_DISPLAY_TOTAL_STEPS = CREATE_SERVICE_BASE_STEPS + 2;

/** Wizard step number of the template-driven form (all of its pages). */
export const CREATE_SERVICE_FORM_STEP = CREATE_SERVICE_BASE_STEPS + 1;

/** Wizard step number of the review page. */
export const CREATE_SERVICE_REVIEW_STEP = CREATE_SERVICE_BASE_STEPS + 2;

/** Route params carried through every create-service screen. */
export type CreateServiceContextParams = {
  providerType: "individual" | "business";
  businessId?: string;
  businessName?: string;
};
