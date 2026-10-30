import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('меню аккаунта открывается под кнопкой с именем', async ({ page }) => {
  await signIn(page, TOKENS.trainer)
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: /Клиенты/ })).toBeVisible()

  const trigger = page.getByRole('button', { name: 'Марина' })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Профиль' })).toBeVisible()

  const triggerBox = await trigger.boundingBox()
  const menuBox = await menu.boundingBox()
  expect(triggerBox).toBeTruthy()
  expect(menuBox).toBeTruthy()
  if (triggerBox && menuBox) {
    expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1)
    expect(menuBox.y).toBeLessThan(triggerBox.y + triggerBox.height + 16)
    expect(Math.abs(menuBox.x + menuBox.width - (triggerBox.x + triggerBox.width))).toBeLessThan(8)
    const viewport = page.viewportSize()
    expect(menuBox.x).toBeGreaterThanOrEqual(8)
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual((viewport?.width ?? 0) - 8)
  }

  await menu.getByRole('menuitem', { name: 'Профиль' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(menu).toBeHidden()
})
