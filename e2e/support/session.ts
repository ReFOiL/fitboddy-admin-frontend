import type { Page } from '@playwright/test'

/** Кладёт токены до первой загрузки, чтобы ProtectedRoute не уводил на /login. */
export async function signIn(page: Page, accessToken: string): Promise<void> {
  await page.addInitScript((access: string) => {
    localStorage.setItem('platform_access_token', access)
    localStorage.setItem('platform_refresh_token', `${access}-refresh`)
  }, accessToken)
}
