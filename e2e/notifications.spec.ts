import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('настройки уведомлений: ссылка на Telegram и переключатель', async ({ page }) => {
  await signIn(page, TOKENS.anna)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  await expect(page.getByText('Не подключён', { exact: true })).toBeVisible()

  // window.open уводит на t.me. Ссылку проверяем на странице, вкладку не открываем.
  await page.evaluate(() => {
    window.open = () => null
  })
  await page.getByRole('button', { name: 'Подключить Telegram' }).click()
  const telegram = page.getByRole('link', { name: 'Открыть Telegram' })
  await expect(telegram).toBeVisible()
  await expect(telegram).toHaveAttribute('href', 'https://t.me/fitboddy_bot?start=Ab12Cd34')

  const saved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/plans/me/notifications/settings') &&
      response.request().method() === 'PUT' &&
      response.ok(),
  )
  const toggle = page.getByRole('switch', { name: /Уведомления/ })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  const response = await saved
  expect(response.request().postDataJSON()).toMatchObject({ notifications_enabled: false })
  await expect(page.getByText('Настройки уведомлений сохранены')).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Выключены')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible()
  await expect(page.getByRole('switch', { name: /Уведомления/ })).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('link', { name: 'Открыть Telegram' })).toHaveCount(0)
})
