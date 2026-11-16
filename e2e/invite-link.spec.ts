import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('постоянная ссылка показывает код, лендинг — имя тренера', async ({ page }) => {
  await page.goto('/i/ab3k9z')
  await expect(page.getByRole('heading', { name: 'Тренер Марина Соколова приглашает вас' })).toBeVisible()
  await expect(page.getByText('Силовые тренировки и восстановление. Зал и онлайн.')).toBeVisible()
  await expect(page.locator('img[src="/favicon-32.png"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Зарегистрироваться' })).toHaveAttribute('href', '/login?tab=register')
  await expect(page.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login')

  await page.goto('/i/ZZZZZZ')
  await expect(page.getByRole('heading', { name: 'Приглашение не найдено' })).toBeVisible()
})

test('смена тренера называет текущего и оставляет его план', async ({ page }) => {
  await signIn(page, TOKENS.egor)
  await page.goto('/i/ab3k9z')
  await expect(page.getByRole('heading', { name: 'У вас уже есть тренер' })).toBeVisible()
  await expect(page.getByText('Сейчас ваш тренер — Олег Крылов.')).toBeVisible()
  await expect(page.getByText('План от текущего тренера останется у вас без изменений.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Перейти к Марина Соколова' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Остаться' })).toBeVisible()
})
