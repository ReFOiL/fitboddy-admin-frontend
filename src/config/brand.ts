export const APP_BRAND_NAME = 'Fitboddy'

export function formatPageTitle(pageTitle?: string): string {
  if (!pageTitle?.trim()) return APP_BRAND_NAME
  return `${APP_BRAND_NAME} — ${pageTitle.trim()}`
}
