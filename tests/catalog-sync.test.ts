import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '../src/api/client'
import { applyTrainerCatalogSync, previewTrainerCatalogSync } from '../src/api/exercises'
import {
  catalogSyncApplyBody,
  catalogSyncHasPendingChanges,
  catalogSyncPreviewAfterApply,
  catalogSyncSelectionCount,
  checkState,
  formatSyncSummary,
  initialCatalogSyncSelection,
  normalizeCatalogSyncApplyResult,
  normalizeCatalogSyncPreview,
  notesForChangedFields,
  ruPlural,
  slotsForChangedFields,
  toCatalogSyncApplyRequest,
  toggleSelectAll,
  withMediaToggle,
  type CatalogSyncMedia,
} from '../src/lib/catalog-sync'

vi.mock('../src/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const yours: CatalogSyncMedia = {
  start_image_url: '/you/start.jpg',
  end_image_url: null,
  video_url: '/you/old.mp4',
}

const system: CatalogSyncMedia = {
  start_image_url: '/you/start.jpg',
  end_image_url: '/system/end.jpg',
  video_url: '/system/new.mp4',
}

describe('catalog sync preview', () => {
  it('reads platform exercise ids, slug muscles, and changed media fields', () => {
    const preview = normalizeCatalogSyncPreview({
      summary: { new_count: 1, media_update_count: 1, unchanged_count: 40 },
      add: [
        {
          platform_exercise_id: 'plat-squat',
          exercise_name: 'Приседания со штангой',
          primary_muscles: ['quadriceps', 'quadriceps'],
          secondary_muscles: ['glutes', 'hamstrings'],
          start_image_url: '/api/v1/trainers/media/squat?expires=1&signature=ab',
          end_image_url: null,
          video_url: null,
        },
        { platform_exercise_id: 'plat-squat', exercise_name: 'Дубль' },
      ],
      update: [
        {
          platform_exercise_id: 'plat-bench',
          trainer_exercise_id: 'tr-bench',
          changed_fields: ['end_image_url', 'video_url', 'not_a_field'],
          trainer: {
            exercise_name: 'Жим лёжа',
            primary_muscles: ['chest'],
            secondary_muscles: [],
            ...yours,
          },
          platform: {
            exercise_name: 'Жим лёжа',
            primary_muscles: ['chest'],
            secondary_muscles: [],
            ...system,
          },
        },
      ],
    })

    expect(preview.summary).toEqual({ new_count: 1, media_update_count: 1, unchanged_count: 40 })
    expect(preview.add).toEqual([
      {
        id: 'plat-squat',
        exercise_name: 'Приседания со штангой',
        muscles: ['Квадрицепсы', 'Ягодицы', 'Бицепс бедра'],
        start_image_url: '/api/v1/trainers/media/squat?expires=1&signature=ab',
      },
    ])
    expect(preview.update[0]).toMatchObject({
      id: 'plat-bench',
      trainer_exercise_id: 'tr-bench',
      exercise_name: 'Жим лёжа',
      changed_fields: ['end_image_url', 'video_url'],
      changes: ['+ end-фото', 'обновлено видео'],
    })
    expect(formatSyncSummary(preview.summary)).toBe('+1 новых · ~1 обновление медиа · 40 без изменений')
    expect(slotsForChangedFields(preview.update[0]?.changed_fields ?? [])).toEqual(['end', 'video'])
  })

  it('rejects a payload that is not the preview object', () => {
    expect(() => normalizeCatalogSyncPreview(null)).toThrow(/not an object/)
    expect(() => normalizeCatalogSyncPreview([])).toThrow(/not an object/)
    expect(() => normalizeCatalogSyncPreview({ add: [], update: [] })).toThrow(/not an object/)
  })

  it('pluralizes the media summary', () => {
    expect(ruPlural(1, 'обновление', 'обновления', 'обновлений')).toBe('обновление')
    expect(ruPlural(3, 'обновление', 'обновления', 'обновлений')).toBe('обновления')
    expect(ruPlural(5, 'обновление', 'обновления', 'обновлений')).toBe('обновлений')
    expect(ruPlural(11, 'обновление', 'обновления', 'обновлений')).toBe('обновлений')
    expect(ruPlural(21, 'обновление', 'обновления', 'обновлений')).toBe('обновление')
    expect(formatSyncSummary({ new_count: 12, media_update_count: 3, unchanged_count: 40 })).toBe(
      '+12 новых · ~3 обновления медиа · 40 без изменений',
    )
  })

  it('turns changed_fields into media notes without treating equal urls as a change', () => {
    expect(notesForChangedFields(['end_image_url', 'video_url'], yours, system)).toEqual([
      '+ end-фото',
      'обновлено видео',
    ])
    expect(notesForChangedFields(['start_image_url'], yours, system)).toEqual([])
  })
})

describe('catalog sync attention', () => {
  const preview = normalizeCatalogSyncPreview({
    summary: { new_count: 2, media_update_count: 1, unchanged_count: 4 },
    add: [
      { platform_exercise_id: 'a', exercise_name: 'А' },
      { platform_exercise_id: 'b', exercise_name: 'Б' },
    ],
    update: [
      {
        platform_exercise_id: 'plat-u',
        trainer_exercise_id: 'tr-u',
        changed_fields: ['video_url'],
        trainer: { exercise_name: 'В', video_url: null, start_image_url: null, end_image_url: null },
        platform: { exercise_name: 'В', video_url: '/v.mp4', start_image_url: null, end_image_url: null },
      },
    ],
  })

  it('counts adds and media updates, and ignores unchanged exercises', () => {
    expect(catalogSyncHasPendingChanges(preview)).toBe(true)
    expect(
      catalogSyncHasPendingChanges({
        summary: { new_count: 0, media_update_count: 0, unchanged_count: 9 },
        add: [],
        update: [],
      }),
    ).toBe(false)
    expect(
      catalogSyncHasPendingChanges({
        summary: { new_count: 0, media_update_count: 2, unchanged_count: 9 },
        add: [],
        update: [],
      }),
    ).toBe(true)
    expect(
      catalogSyncHasPendingChanges({
        summary: { new_count: 0, media_update_count: 0, unchanged_count: 0 },
        add: [{ id: 'orphan', exercise_name: 'Орфан', muscles: [], start_image_url: null }],
        update: [],
      }),
    ).toBe(true)
  })

  it('clears applied ids and leaves a dot while media updates remain', () => {
    const afterAdds = catalogSyncPreviewAfterApply(preview, { add_ids: ['a', 'b'], update_ids: [] })
    expect(afterAdds.add).toEqual([])
    expect(afterAdds.summary).toEqual({ new_count: 0, media_update_count: 1, unchanged_count: 4 })
    expect(catalogSyncHasPendingChanges(afterAdds)).toBe(true)

    const afterMedia = catalogSyncPreviewAfterApply(afterAdds, { add_ids: [], update_ids: ['plat-u'] })
    expect(afterMedia.update).toEqual([])
    expect(afterMedia.summary.unchanged_count).toBe(4)
    expect(catalogSyncHasPendingChanges(afterMedia)).toBe(false)
  })
})

describe('catalog sync selection', () => {
  const preview = normalizeCatalogSyncPreview({
    summary: { new_count: 2, media_update_count: 1, unchanged_count: 4 },
    add: [
      { platform_exercise_id: 'a', exercise_name: 'А' },
      { platform_exercise_id: 'b', exercise_name: 'Б' },
    ],
    update: [
      {
        platform_exercise_id: 'plat-u',
        trainer_exercise_id: 'tr-u',
        changed_fields: ['video_url'],
        trainer: { exercise_name: 'В', video_url: null, start_image_url: null, end_image_url: null },
        platform: { exercise_name: 'В', video_url: '/v.mp4', start_image_url: null, end_image_url: null },
      },
    ],
  })

  it('starts with every new exercise selected and updates off', () => {
    const selection = initialCatalogSyncSelection(preview)
    expect(selection).toEqual({ includeMedia: false, addIds: ['a', 'b'], updateIds: [] })
    expect(catalogSyncSelectionCount(preview, selection)).toBe(2)
    expect(toCatalogSyncApplyRequest(preview, selection)).toEqual({
      add_ids: ['a', 'b'],
      update_ids: [],
      include_media: false,
    })
    expect(checkState(['a', 'b'], selection.addIds)).toBe('all')
  })

  it('select-all clears a full section and fills a partial one', () => {
    expect(toggleSelectAll(['a', 'b'], ['a', 'b'])).toEqual([])
    expect(toggleSelectAll(['a', 'b'], ['a'])).toEqual(['a', 'b'])
    expect(checkState(['a', 'b'], ['a'])).toBe('some')
    expect(checkState(['a', 'b'], [])).toBe('none')
  })

  it('turns media updates on as a selected group and drops them when the toggle goes off', () => {
    const on = withMediaToggle(initialCatalogSyncSelection(preview), true, preview.update.map((item) => item.id))
    expect(catalogSyncSelectionCount(preview, on)).toBe(3)
    expect(toCatalogSyncApplyRequest(preview, { ...on, addIds: ['b'] })).toEqual({
      add_ids: ['b'],
      update_ids: ['plat-u'],
      include_media: true,
    })
    const off = withMediaToggle(on, false, preview.update.map((item) => item.id))
    expect(off.updateIds).toEqual([])
    expect(toCatalogSyncApplyRequest(preview, { ...off, updateIds: ['plat-u'] })).toEqual({
      add_ids: ['a', 'b'],
      update_ids: [],
      include_media: false,
    })
  })
})

describe('catalog sync api', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
  })

  it('loads the preview from the trainer sync path', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        summary: { new_count: 1, media_update_count: 0, unchanged_count: 0 },
        add: [{ platform_exercise_id: 'plat 1', exercise_name: 'Жим' }],
        update: [],
      },
    })

    const preview = await previewTrainerCatalogSync('trainer 1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/trainers/trainer%201/exercises/sync-preview')
    expect(preview.add[0]?.id).toBe('plat 1')
  })

  it('posts platform ids and drops update ids when media is off', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { added_count: 1, updated_count: 0, added_ids: ['plat 1'], updated_ids: [] },
    })
    const payload = { add_ids: ['plat 1'], update_ids: ['plat 2'], include_media: false }

    const result = await applyTrainerCatalogSync('trainer 1', payload)

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/trainers/trainer%201/exercises/sync', {
      add_ids: ['plat 1'],
      update_ids: [],
      include_media: false,
    })
    expect(result).toEqual({ added_count: 1, updated_count: 0, added_ids: ['plat 1'], updated_ids: [] })
    expect(catalogSyncApplyBody({ add_ids: ['a'], update_ids: ['b'], include_media: true })).toEqual({
      add_ids: ['a'],
      update_ids: ['b'],
      include_media: true,
    })
    expect(normalizeCatalogSyncApplyResult('', { add_ids: ['plat 1'], update_ids: ['plat 2'], include_media: true })).toEqual({
      added_count: 1,
      updated_count: 1,
      added_ids: ['plat 1'],
      updated_ids: ['plat 2'],
    })
  })
})
