import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

test('приглашение по несуществующему логину показывает 404', async ({ page }) => {
  await signIn(page, TOKENS.trainer)
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: /Клиенты/ })).toBeVisible()

  await page.getByRole('button', { name: /Пригласить клиента/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Пригласить клиента' })
  await dialog.getByLabel('Логин').fill('net.kto')
  await dialog.getByRole('button', { name: 'Отправить приглашение' }).click()
  await expect(dialog.getByText('Клиент с таким логином не найден.')).toBeVisible()
  await expect(dialog).toBeVisible()
})
