import { laravelFetch, toAbsoluteUrl } from "./client";

const BUSINESS_PREFIX = "/service-provider/business";

export interface ServiceSubCategory {
  sub_category_id: number;
  sub_category_name: string;
  sub_category_logo: string | null;
}

export interface ServiceCategory {
  category_id: number;
  category_name: string;
  category_logo: string | null;
  sub_category_list: ServiceSubCategory[];
}

/**
 * Get service categories and subcategories.
 * @param search Optional search term to filter by category or subcategory name
 * @returns Array of categories with their subcategories
 */
export async function getServiceCategories(
  search?: string,
): Promise<ServiceCategory[]> {
  const params = new URLSearchParams();

  if (search) {
    params.append("search", search);
  }

  const url = `${BUSINESS_PREFIX}/services?${params.toString()}`;
  const response = await laravelFetch<ServiceCategory[]>(url);

  return (response ?? []).map((category) => ({
    ...category,
    category_logo: toAbsoluteUrl(category.category_logo),
    sub_category_list: (category.sub_category_list ?? []).map((sub) => ({
      ...sub,
      sub_category_logo: toAbsoluteUrl(sub.sub_category_logo),
    })),
  }));
}

export type CategoryLogoIndex = Record<string, string | null>;

let categoryLogoIndexPromise: Promise<CategoryLogoIndex> | null = null;

// Normalizes a category name so lookups tolerate case and trailing
// punctuation differences between backends (e.g. "Misc." vs "misc").
function categoryLogoKey(name: string): string {
  return name.trim().toLowerCase().replace(/\.+$/, "");
}

/**
 * Index of category name -> logo URL built from the services endpoint,
 * for screens whose own data only carries category names. Cached for the
 * app session so multiple screens don't refetch.
 */
export function getCategoryLogoIndex(): Promise<CategoryLogoIndex> {
  if (!categoryLogoIndexPromise) {
    categoryLogoIndexPromise = getServiceCategories()
      .then((categories) => {
        const index: CategoryLogoIndex = {};
        for (const category of categories) {
          index[categoryLogoKey(category.category_name)] =
            category.category_logo;
        }
        return index;
      })
      .catch((error) => {
        categoryLogoIndexPromise = null;
        throw error;
      });
  }
  return categoryLogoIndexPromise;
}

/** Look up a category's logo URL by name. */
export function lookupCategoryLogo(
  index: CategoryLogoIndex,
  name: string,
): string | null {
  return index[categoryLogoKey(name)] ?? null;
}
