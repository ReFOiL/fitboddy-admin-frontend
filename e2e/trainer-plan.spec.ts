import type { Page } from '@playwright/test'

import { IDS, TOKENS } from './support/api-mock'
import { clickWithDialog } from './support/dialog'
import { signIn } from './support/session'
import { expect, test } from './support/test'

async function openAnna(page: Page) {
  await signIn(page, TOKENS.trainer)
  await page.goto(`/clients/profile?clientUserId=${encodeURIComponent(IDS.anna)}`)
  await expect(page.getByRole('heading', { name: 'Анна Иванова' })).toBeVisible()
}

test('тренер собирает план: день, упражнение, дозировка, заметка, сохранение', async ({ page, api }) => {
  api.clearPlan(IDS.anna)
  await openAnna(page)
  await expect(page.getByText('Плана ещё нет')).toBeVisible()

  await page.getByRole('button', { name: 'Добавить день' }).click()
  await expect(page.getByRole('button', { name: 'Пн' })).toBeVisible()

  await page.getByRole('button', { name: 'Добавить день' }).click()
  await page.getByRole('button', { name: 'Вт' }).click()
  await page.getByRole('button', { name: /Добавить упражнение/ }).click()
  await page.getByRole('textbox', { name: 'Поиск упражнения' }).fill('Тяга')
  await page.getByRole('button', { name: /Тяга верхнего блока/ }).click()
  await page.getByRole('button', { name: /Готово · добавлено 1/ }).click()

  await page.getByRole('button', { name: /Тяга верхнего блока/ }).click()
  await page.getByRole('button', { name: 'Больше: Подходы' }).click()
  await page.getByRole('button', { name: 'Больше: Повторы' }).click()
  await page.getByRole('button', { name: 'Больше: Вес, кг' }).click()
  await expect(page.getByRole('group', { name: 'Подходы' })).toContainText('4')
  await expect(page.getByRole('group', { name: 'Повторы' })).toContainText('9')
  await expect(page.getByRole('group', { name: 'Вес, кг' })).toContainText('42.5')
  await page.getByLabel('Заметка').fill('Лопатки свести, не отрывать таз')
  await page.getByRole('button', { name: 'Готово', exact: true }).click()

  const row = page.getByRole('button', { name: /Тяга верхнего блока/ })
  await expect(row).toContainText('4×9')
  await expect(row).toContainText('42.5 кг')
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('План сохранён')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Анна Иванова' })).toBeVisible()
  await page.getByRole('button', { name: 'Вт' }).click()
  await expect(page.getByRole('button', { name: /Тяга верхнего блока/ })).toContainText('42.5 кг')
  await page.getByRole('button', { name: /Тяга верхнего блока/ }).click()
  await expect(page.getByLabel('Заметка')).toHaveValue('Лопатки свести, не отрывать таз')
  await expect(page.getByRole('group', { name: 'Подходы' })).toContainText('4')
  await expect(page.getByRole('group', { name: 'Повторы' })).toContainText('9')
  await expect(page.getByRole('group', { name: 'Вес, кг' })).toContainText('42.5')
})

test('копирует день и неделю, после сохранения черновик остаётся', async ({ page }) => {
  await openAnna(page)
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()

  await page.getByRole('button', { name: 'Ещё' }).click()
  await page.getByRole('menuitem', { name: 'Копировать день' }).click()
  await page.getByRole('dialog', { name: 'Куда скопировать день' }).getByRole('button', { name: 'Неделя 1 · Ср' }).click()
  await page.getByRole('button', { name: 'Ср' }).click()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Приседания со штангой/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Ещё' }).click()
  await page.getByRole('menuitem', { name: 'Копировать неделю' }).click()
  const weekDialog = page.getByRole('dialog', { name: 'Куда скопировать неделю' })
  await weekDialog.getByRole('button', { name: 'Неделя 2' }).click()
  await expect(weekDialog).toBeHidden()
  await page.getByRole('button', { name: 'Неделя 2' }).click()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Скручивания/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('План сохранён')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Анна Иванова' })).toBeVisible()
  await page.getByRole('button', { name: 'Ср' }).click()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Приседания со штангой/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Неделя 2' }).click()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Скручивания/ })).toHaveCount(0)
})

test('сборка из каталога спрашивает подтверждение перед заменой плана', async ({ page }) => {
  await signIn(page, TOKENS.trainer)
  const profileReady = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/profiles/${IDS.anna}`) && response.ok(),
  )
  await page.goto(`/clients/profile?clientUserId=${encodeURIComponent(IDS.anna)}`)
  await profileReady
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()

  await page.getByRole('button', { name: 'Ещё' }).click()
  const dismissedMessage = await clickWithDialog(
    page,
    () => page.getByRole('menuitem', { name: /Собрать из каталога/ }).click(),
    'dismiss',
  )
  expect(dismissedMessage).toContain('Текущий план будет заменён')
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()

  await page.getByRole('button', { name: 'Ещё' }).click()
  const acceptedMessage = await clickWithDialog(
    page,
    () => page.getByRole('menuitem', { name: /Собрать из каталога/ }).click(),
    'accept',
  )
  expect(acceptedMessage).toContain('Текущий план будет заменён')
  await expect(page.getByRole('button', { name: /Отжимания на брусьях/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toHaveCount(0)
})

test('на 390px кнопка сохранения выше таб-бара', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'проверка только для мобильной ширины 390px')
  await openAnna(page)
  await page.getByRole('button', { name: /Жим лёжа/ }).click()
  await page.getByRole('button', { name: 'Больше: Подходы' }).click()
  await page.getByRole('button', { name: 'Готово', exact: true }).click()

  const save = page.getByRole('button', { name: 'Сохранить' })
  const tabs = page.getByRole('navigation', { name: 'Мобильная навигация' })
  await expect(save).toBeVisible()
  await expect(save).toBeEnabled()
  await expect(tabs).toBeVisible()

  const saveBox = await save.boundingBox()
  const tabsBox = await tabs.boundingBox()
  expect(saveBox).not.toBeNull()
  expect(tabsBox).not.toBeNull()
  if (!saveBox || !tabsBox) return

  const viewport = page.viewportSize()
  expect(viewport?.width).toBe(390)
  expect(saveBox.y).toBeGreaterThanOrEqual(0)
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(tabsBox.y + 1)
  expect(tabsBox.y + tabsBox.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1)

  const hit = await save.evaluate((button) => {
    const rect = button.getBoundingClientRect()
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return top?.closest('button') === button
  })
  expect(hit).toBe(true)
})
