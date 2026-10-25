import { expect, test } from './support/test'

test('постоянная ссылка показывает код, лендинг — имя тренера', async ({ page }) => {
  await page.goto('/i/ab3k9z')
  await expect(page.getByRole('heading', { name: 'Тренер Марина Соколова приглашает вас' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Зарегистрироваться' })).toHaveAttribute('href', '/login?tab=register')
  await expect(page.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login')

  await page.goto('/i/ZZZZZZ')
  await expect(page.getByRole('heading', { name: 'Приглашение не найдено' })).toBeVisible()
})
