import { TOKENS } from './support/api-mock'
import { clickWithDialog } from './support/dialog'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('правила плана сохраняются явно и держат уход со страницы', async ({ page }) => {
  await signIn(page, TOKENS.trainer)
  await page.goto('/plan-rules')
  await expect(page.getByRole('heading', { name: 'Правила генератора' })).toBeVisible()
  await expect(page.getByText('Новичок получит 3 тренировки в неделю по 3–5 упражнений')).toBeVisible()

  await page.getByRole('button', { name: 'Больше: Новичок' }).click()
  await page.getByRole('button', { name: 'Больше: Новичок' }).click()
  await expect(page.getByText('Новичок получит 5 тренировок в неделю по 3–5 упражнений')).toBeVisible()
  await expect(page.getByText('Есть изменения')).toBeVisible()

  const stayMessage = await clickWithDialog(
    page,
    () => page.getByRole('link', { name: 'Клиенты' }).click(),
    'dismiss',
  )
  expect(stayMessage).toContain('Есть несохранённые изменения')
  await expect(page).toHaveURL(/\/plan-rules/)
  await expect(page.getByText('Новичок получит 5 тренировок в неделю по 3–5 упражнений')).toBeVisible()

  await page.getByRole('button', { name: 'Сохранить правила' }).click()
  await expect(page.getByText('Сохранено. Новые планы для клиентов уже учитывают эти правила.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Правила генератора' })).toBeVisible()
  await expect(page.getByText('Новичок получит 5 тренировок в неделю по 3–5 упражнений')).toBeVisible()

  let unexpectedDialog = false
  page.once('dialog', async (dialog) => {
    unexpectedDialog = true
    await dialog.accept()
  })
  await page.getByRole('link', { name: 'Клиенты' }).click()
  await expect(page.getByRole('heading', { name: /Клиенты/ })).toBeVisible()
  expect(unexpectedDialog).toBe(false)
})
