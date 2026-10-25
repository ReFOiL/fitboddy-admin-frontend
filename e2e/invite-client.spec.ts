import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('приглашение по несуществующему логину показывает 404', async ({ page }) => {
  await signIn(page, TOKENS.trainer)
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: /Клиенты/ })).toBeVisible()

  await page.getByRole('link', { name: 'Пригласить' }).click()
  await expect(page.getByRole('heading', { name: 'Приглашение' })).toBeVisible()
  await expect(page.getByText('AB3K9Z', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /\/i\/AB3K9Z/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Скопировать ссылку' })).toBeVisible()
  const overflow = page.getByRole('button', { name: 'Ещё действия' })
  await overflow.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const triggerBox = await overflow.boundingBox()
  const menuBox = await menu.boundingBox()
  expect(triggerBox).toBeTruthy()
  expect(menuBox).toBeTruthy()
  if (triggerBox && menuBox) {
    expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1)
    expect(menuBox.y).toBeLessThan(triggerBox.y + triggerBox.height + 16)
    expect(Math.abs(menuBox.x + menuBox.width - (triggerBox.x + triggerBox.width))).toBeLessThan(8)
  }
  const viewport = page.viewportSize()
  if ((viewport?.width ?? 0) >= 1024) {
    const panelWidth = await page.getByRole('heading', { name: 'Приглашение' }).evaluate((el) => {
      return el.parentElement?.parentElement?.getBoundingClientRect().width ?? 0
    })
    expect(panelWidth).toBeGreaterThanOrEqual(420)
    expect(panelWidth).toBeLessThanOrEqual(520)
  }
  await page.getByRole('menuitem', { name: 'Пригласить по логину' }).click()
  const dialog = page.getByRole('dialog', { name: 'Пригласить клиента' })
  await dialog.getByLabel('Логин').fill('net.kto')
  await dialog.getByRole('button', { name: 'Отправить приглашение' }).click()
  await expect(dialog.getByText('Клиент с таким логином не найден.')).toBeVisible()
  await expect(dialog).toBeVisible()
})
