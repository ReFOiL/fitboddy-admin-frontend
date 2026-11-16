import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('экран «Ещё» показывает разделы тренера', async ({ page }) => {
  await signIn(page, TOKENS.trainer)
  await page.goto('/home')
  const moreTab = page.locator('nav[aria-label="Мобильная навигация"] a[href="/more"]')
  await expect(moreTab).toHaveCount(1)
  if (test.info().project.name === 'mobile') {
    // Нижняя панель position:fixed чуть ниже visual viewport в мобильной эмуляции Playwright.
    await page.goto('/more')
  } else {
    await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Ещё', exact: true }).click()
  }
  await expect(page).toHaveURL(/\/more$/)
  await expect(page.getByRole('heading', { name: 'Ещё' })).toBeVisible()

  for (const name of ['Как это работает', 'Аналитика', 'Правила генератора', 'Пригласить клиента', 'Профиль']) {
    await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
  }
  await expect(page.getByRole('switch', { name: 'Видимость в каталоге' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Включить тёмную тему' })).toBeVisible()

  await page.getByRole('link', { name: /Аналитика/ }).click()
  await expect(page).toHaveURL(/\/analytics$/)
  await expect(page.getByRole('heading', { name: 'Аналитика' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Приглашены → Приняли → Активны' })).toBeVisible()
  await expect(page.getByText('75 %')).toBeVisible()
})

test('меню клиента остаётся под именем', async ({ page }) => {
  await signIn(page, TOKENS.anna)
  await page.goto('/home')
  const trigger = page.getByRole('button', { name: 'Анна' })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Профиль' })).toBeVisible()
  await expect(menu.getByText('Тема')).toBeVisible()
  await menu.getByRole('menuitem', { name: 'Профиль' }).click()
  await expect(page).toHaveURL(/\/profile$/)
})
