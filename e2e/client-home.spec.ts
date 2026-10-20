import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('пустая главная клиента без тренера и плана', async ({ page }) => {
  await signIn(page, TOKENS.egor)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Привет, Егор' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Начни тренироваться' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Тренироваться самостоятельно' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'выбрать тренера' })).toBeVisible()
})

test('клиент начинает тренировку, отмечает подходы и завершает день', async ({ page, api }) => {
  api.useTodayWorkout()
  await signIn(page, TOKENS.anna)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Привет, Анна' })).toBeVisible()
  await page.getByRole('button', { name: 'Начать тренировку' }).click()
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()

  await page.getByRole('link', { name: /Жим лёжа/ }).click()
  await expect(page.getByRole('heading', { name: 'Жим лёжа' })).toBeVisible()

  // Подходы живут на карточке упражнения. Возврат на главную сбрасывает сессию, её начинают снова.
  const firstSet = page.getByRole('button', { name: /Подход 1/ }).filter({ hasNotText: 'сделан' })
  const secondSet = page.getByRole('button', { name: /Подход 2/ }).filter({ hasNotText: 'сделан' })
  await firstSet.click()
  await expect(firstSet).toContainText('✓')
  await secondSet.click()
  await expect(secondSet).toContainText('✓')

  await page.getByRole('button', { name: 'Назад' }).click()
  await page.getByRole('button', { name: 'Начать тренировку' }).click()
  // Пока упражнение не отмечено, «Завершить» — текстовая ссылка под липкой панелью.
  // Ждём отметку, чтобы нажать большую кнопку над таб-баром.
  await page.getByRole('button', { name: 'Отметить выполненным' }).click()
  await expect(page.getByRole('button', { name: 'Снять отметку' })).toBeVisible()
  const completed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/v1\/plans\/me\/days\/\d+\/complete$/.test(new URL(response.url()).pathname) &&
      response.ok(),
  )
  await page.getByRole('button', { name: 'Завершить тренировку' }).click()
  await completed
  await expect(page.getByText('Тренировка отмечена выполненной')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Начать тренировку' })).toHaveCount(0)
})
