import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('пустая главная клиента без тренера и плана', async ({ page }) => {
  await signIn(page, TOKENS.egor)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Привет, Егор' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Начните тренироваться' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Тренироваться самостоятельно' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'выберите тренера' })).toBeVisible()
})

test('клиент начинает тренировку, отмечает подходы и завершает день', async ({ page, api }) => {
  api.useTodayWorkout()
  await signIn(page, TOKENS.anna)
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Привет, Анна' })).toBeVisible()
  await page.getByRole('button', { name: 'Начать тренировку' }).click()
  await expect(page.getByRole('heading', { name: /Сегодня/ })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Заменить' })).toHaveCount(0)

  await page.getByRole('link', { name: 'План' }).click()
  await expect(page.getByRole('heading', { name: 'План', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Начать тренировку' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Главная' }).click()
  await expect(page.getByRole('button', { name: 'Свернуть' })).toBeVisible()

  await page.getByRole('link', { name: /Жим лёжа/ }).click()
  await expect(page.getByRole('heading', { name: 'Жим лёжа' })).toBeVisible()
  await expect(page.getByText('Фото положения')).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.getByText('40 кг')).toBeVisible()
  await expect(page.getByText(/Подход 1 \/ 3/)).toBeVisible()
  await expect(page.getByText('1:30')).toBeVisible()

  await page.getByRole('button', { name: 'Ещё' }).click()
  await page.getByRole('menuitem', { name: 'Заменить' }).click()
  const replaceSheet = page.getByRole('dialog', { name: 'Заменить упражнение' })
  await expect(replaceSheet).toContainText('Поставить другое? Текущее уйдёт из сегодняшней тренировки')
  await replaceSheet.getByRole('button', { name: 'Оставить' }).click()
  await expect(replaceSheet).toBeHidden()

  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByText(/Подход 2 \/ 3/)).toBeVisible()
  await page.getByRole('button', { name: 'Пропустить' }).click()
  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByText(/Подход 3 \/ 3/)).toBeVisible()
  await page.getByRole('button', { name: 'Пропустить' }).click()
  const completed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/v1\/plans\/me\/days\/\d+\/complete$/.test(new URL(response.url()).pathname) &&
      response.ok(),
  )
  await page.getByRole('button', { name: 'Завершить тренировку' }).click()
  const response = await completed
  const payload = response.request().postDataJSON() as { started_at?: string }
  expect(payload.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  await expect(page.getByText('Тренировка отмечена выполненной')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Начать тренировку' })).toHaveCount(0)
})
