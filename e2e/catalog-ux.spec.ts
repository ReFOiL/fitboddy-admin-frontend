import { mkdirSync } from 'node:fs'

import { expect, test } from './support/test'
import { signIn } from './support/session'
import { TOKENS } from './support/api-mock'

const shots = '/opt/cursor/artifacts'

test('каталог: один заголовок, отдельное создание и компактная карточка', async ({ page }) => {
  test.setTimeout(90_000)
  mkdirSync(shots, { recursive: true })
  const mobile = test.info().project.name === 'mobile'

  await signIn(page, TOKENS.trainer)
  await page.goto('/exercises')
  await expect(page.getByRole('heading', { name: 'Упражнения' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Список упражнений' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Поиск по названию')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Активные' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Архив' })).toBeVisible()
  await expect(page.getByText('Choose File')).toHaveCount(0)

  if (mobile) await page.screenshot({ path: `${shots}/catalog-list-390.png`, fullPage: true })

  await page.getByRole('button', { name: 'Синхронизировать с системной базой' }).click()
  await expect(page.getByText('Нечего добавить')).toBeVisible()
  await expect(page.getByRole('status')).not.toHaveAccessibleName(/~/)
  if (mobile) await page.screenshot({ path: `${shots}/catalog-sync-empty-390.png` })
  await page.getByRole('button', { name: 'Отмена' }).click()

  await page.getByRole('button', { name: 'Включить тёмную тему' }).click()
  if (mobile) await page.screenshot({ path: `${shots}/catalog-list-dark-390.png`, fullPage: true })
  await page.getByRole('button', { name: 'Включить светлую тему' }).click()

  await page.getByRole('link', { name: 'Создать упражнение' }).click()
  await expect(page).toHaveURL(/\/exercises\/new$/)
  await expect(page.getByRole('heading', { name: 'Новое упражнение' })).toBeVisible()
  await expect(page.getByText('Загрузить фото').first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Сохранение упражнения' })).toBeVisible()
  if (mobile) await page.screenshot({ path: `${shots}/catalog-create-390.png`, fullPage: true })

  await page.getByLabel('Название').fill('Болгарские выпады')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('Упражнение создано — добавьте видео')).toBeVisible()
  await expect(page).toHaveURL(/\/exercises\/row-new$/)
  await expect(page.getByRole('heading', { name: 'Болгарские выпады' })).toBeVisible()
  await expect(page.getByText(/Видео не загружено/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Фото и видео' })).toBeVisible()
  await expect(page.getByText('Choose File')).toHaveCount(0)
  await expect(page.getByText('No file chosen')).toHaveCount(0)
  if (mobile) await page.screenshot({ path: `${shots}/catalog-details-390.png`, fullPage: true })
})
