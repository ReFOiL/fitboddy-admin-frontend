import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('шапка и вход показывают знак Fitboddy, иконка вкладки отдаётся', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/login')

  const loginLogo = page.getByRole('img', { name: 'Fitboddy' })
  await expect(loginLogo).toBeVisible()
  await expect(loginLogo).toHaveAttribute('src', /logo-wordmark-light/)

  await page.getByRole('button', { name: 'Включить тёмную тему' }).click()
  await expect(loginLogo).toHaveAttribute('src', /logo-wordmark-dark/)

  await signIn(page, TOKENS.trainer)
  await page.goto('/home')
  const brand = page.getByRole('link', { name: 'Fitboddy' })
  await expect(brand).toBeVisible()
  const wide = (page.viewportSize()?.width ?? 0) >= 768
  await expect(brand.locator('img:visible')).toHaveAttribute('src', wide ? /logo-wordmark-dark/ : /logo-mark/)

  for (const path of ['/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png']) {
    const response = await page.request.get(path)
    expect(response.ok(), path).toBeTruthy()
  }
})
