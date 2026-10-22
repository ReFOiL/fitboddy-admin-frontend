import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('первый визит следует системной тёмной теме и не пишет localStorage', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await signIn(page, TOKENS.trainer)
  await page.goto('/home')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fitboddy-theme'))).toBeNull()
})

test('переключатель темы запоминает выбор и переживает перезагрузку', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page, TOKENS.trainer)
  await page.goto('/home')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: 'Включить тёмную тему' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(24, 29, 36)')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fitboddy-theme'))).toBe('dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Включить светлую тему' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(242, 244, 246)')
})

test('сохранённая светлая тема важнее системной тёмной', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await signIn(page, TOKENS.anna)
  await page.addInitScript(() => {
    localStorage.setItem('fitboddy-theme', 'light')
  })
  await page.goto('/home')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
