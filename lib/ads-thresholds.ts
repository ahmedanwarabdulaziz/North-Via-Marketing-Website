// Shared by server code and client components.
/** Minimum conversions in a period before conversion numbers are shown; fewer usually means tracking isn't set up. */
export const MIN_CONVERSIONS_TO_SHOW = 5;

/** Conversions are shown only with enough of them and a conversion rate above 0%. */
export function conversionsMeaningful(conversions: number, clicks: number) {
  const rate = clicks > 0 ? (conversions / clicks) * 100 : 0;
  return conversions >= MIN_CONVERSIONS_TO_SHOW && Math.round(rate * 10) / 10 > 0;
}
