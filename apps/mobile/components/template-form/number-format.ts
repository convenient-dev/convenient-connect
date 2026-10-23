/**
 * Groups the integer part of a numeric string with thousands separators while
 * leaving whatever the user typed after the decimal point alone, so a value in
 * progress such as "1234." reads "1,234." and re-parses once the commas are
 * stripped. The form keeps the raw digits; only the display is grouped.
 */
export function formatThousands(raw: string): string {
  if (!raw) return "";
  const dot = raw.indexOf(".");
  const integer = dot === -1 ? raw : raw.slice(0, dot);
  const fraction = dot === -1 ? "" : raw.slice(dot);
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + fraction;
}
