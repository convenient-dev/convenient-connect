/**
 * "My Services (9)". The count is omitted when zero so headers and tabs stay
 * clean before data loads and when a section is empty.
 */
export function withCount(label: string, total: number | undefined): string {
  return total ? `${label} (${total})` : label;
}
