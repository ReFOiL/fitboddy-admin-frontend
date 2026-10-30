import { TOKENS } from './support/api-mock'
import { signIn } from './support/session'
import { expect, test } from './support/test'

const unchangedOnly = {
  summary: { new_count: 0, media_update_count: 0, unchanged_count: 2 },
  add: [],
  update: [],
  unchanged: [
    { platform_exercise_id: 'plat-bench', trainer_exercise_id: 'row-bench', exercise_name: 'Жим лёжа' },
  ],
}

const mediaOnly = {
  summary: { new_count: 0, media_update_count: 1, unchanged_count: 2 },
  add: [],
  update: [
    {
      platform_exercise_id: 'plat-bench',
      trainer_exercise_id: 'row-bench',
      changed_fields: ['video_url'],
      trainer: {
        exercise_name: 'Жим лёжа',
        start_image_url: null,
        end_image_url: null,
        video_url: null,
      },
      platform: {
        exercise_name: 'Жим лёжа',
        start_image_url: null,
        end_image_url: null,
        video_url: '/videos/bench.mp4',
      },
    },
  ],
  unchanged: [],
}

const addOnly = {
  summary: { new_count: 1, media_update_count: 0, unchanged_count: 2 },
  add: [
    {
      platform_exercise_id: 'plat-row',
      exercise_name: 'Тяга в наклоне',
      primary_muscles: ['lats'],
      secondary_muscles: [],
      start_image_url: null,
    },
  ],
  update: [],
  unchanged: [],
}

test('точка синхронизации загорается только на новые и медиа и гаснет после применения', async ({ page, api }) => {
  api.setCatalogSyncPreview(unchangedOnly)
  await signIn(page, TOKENS.trainer)
  await page.goto('/exercises')

  const sync = page.getByRole('button', { name: 'Синхронизировать с системной базой' })
  await expect(sync).toHaveAttribute('data-sync-attention', 'clear')
  await expect(page.getByTestId('catalog-sync-pending-dot')).toHaveCount(0)

  api.setCatalogSyncPreview(mediaOnly)
  await page.reload()
  await expect(sync).toHaveAttribute('data-sync-attention', 'pending')
  const dot = page.getByTestId('catalog-sync-pending-dot')
  await expect(dot).toBeVisible()
  await expect(dot).toHaveText('')
  const box = await dot.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(0)
  expect(box?.width ?? 0).toBeLessThanOrEqual(12)
  expect(box?.height ?? 0).toBeLessThanOrEqual(12)
  await expect(sync).toHaveAccessibleName('Синхронизировать с системной базой')

  api.setCatalogSyncPreview(addOnly)
  await page.reload()
  await expect(sync).toHaveAttribute('data-sync-attention', 'pending')
  await sync.click()
  await page.getByRole('button', { name: 'Синхронизировать выбранное (1)' }).click()
  await expect(page.getByText('Каталог синхронизирован')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(sync).toHaveAttribute('data-sync-attention', 'clear')
  await expect(page.getByTestId('catalog-sync-pending-dot')).toHaveCount(0)
})
