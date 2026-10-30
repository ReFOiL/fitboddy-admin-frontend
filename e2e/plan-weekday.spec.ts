import type { Page } from '@playwright/test'

import { IDS, TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

async function openAnna(page: Page) {
  await signIn(page, TOKENS.trainer)
  await page.goto(`/clients/profile?clientUserId=${encodeURIComponent(IDS.anna)}`)
  await expect(page.getByRole('heading', { name: 'Анна Иванова' })).toBeVisible()
}

test('меняет свободный день недели и меняет занятый местами', async ({ page }) => {
  await openAnna(page)
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()

  await page.getByRole('button', { name: 'Пн', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'День недели' })
  await expect(menu.getByRole('button', { name: 'Среда, занят' })).toBeVisible()
  await menu.getByRole('button', { name: 'Четверг, свободен' }).click()
  await expect(page.getByText('День недели изменён')).toBeVisible()
  await expect(menu).toBeHidden()
  await expect(page.getByRole('button', { name: 'Чт', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Пн', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()

  await page.getByRole('button', { name: 'Ср', exact: true }).click()
  await page.getByRole('button', { name: 'Ср', exact: true }).click()
  await page.getByRole('dialog', { name: 'День недели' }).getByRole('button', { name: 'Четверг, занят' }).click()
  const swap = page.getByRole('dialog', { name: 'Поменять местами' })
  await expect(swap).toContainText('Ср ↔ Чт')
  await swap.getByRole('button', { name: 'Отмена' }).click()
  await expect(swap).toBeHidden()

  await page.getByRole('button', { name: 'Ср', exact: true }).click()
  await page.getByRole('dialog', { name: 'День недели' }).getByRole('button', { name: 'Четверг, занят' }).click()
  await page.getByRole('dialog', { name: 'Поменять местами' }).getByRole('button', { name: 'Поменять' }).click()
  await expect(page.getByText('Дни поменялись местами')).toBeVisible()
  await expect(page.getByRole('button', { name: /Приседания со штангой/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Анна Иванова' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ср', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Чт', exact: true }).click()
  await expect(page.getByRole('button', { name: /Приседания со штангой/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Жим лёжа/ })).toHaveCount(0)
})
