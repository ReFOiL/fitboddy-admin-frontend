import { TOKENS } from './support/api-mock'
import { notificationsE2eEnabled } from './support/notifications-flag'
import { signIn } from './support/session'
import { expect, test } from './support/test'

const notificationsOn = notificationsE2eEnabled()

test.describe('уведомления выключены', () => {
  test.beforeEach(() => {
    test.skip(notificationsOn, 'Флаг VITE_NOTIFICATIONS_ENABLED включён, блок уведомлений на экране.')
  })

  test('профиль не показывает уведомления и не вызывает их API', async ({ page }) => {
    const hits: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/plans/me/notifications')) {
        hits.push(`${request.method()} ${request.url()}`)
      }
    })

    await signIn(page, TOKENS.anna)
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Уведомления' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Подключить Telegram' })).toHaveCount(0)
    await expect(page.getByRole('switch', { name: /Уведомления/ })).toHaveCount(0)
    // Запрос настроек уходит из эффекта после отрисовки. Даём ему время проявиться.
    await page.waitForTimeout(1000)
    expect(hits).toEqual([])
  })
})

test.describe('уведомления включены', () => {
  test.beforeEach(() => {
    test.skip(!notificationsOn, 'Уведомления выключены флагом VITE_NOTIFICATIONS_ENABLED.')
  })

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
})
