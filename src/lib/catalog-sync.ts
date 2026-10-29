import { formatMuscleName } from './muscles'

export type CatalogSyncMedia = {
  start_image_url: string | null
  end_image_url: string | null
  video_url: string | null
}

/** Поля медиа из `changed_fields` предпросмотра plan-service. */
export type CatalogSyncMediaField = 'video_url' | 'start_image_url' | 'end_image_url'

export type CatalogSyncAddItem = {
  /** platform_exercise_id. Уходит в apply.add_ids. */
  id: string
  exercise_name: string
  muscles: string[]
  start_image_url: string | null
}

export type CatalogSyncUpdateItem = {
  /** platform_exercise_id. Уходит в apply.update_ids. */
  id: string
  trainer_exercise_id: string
  exercise_name: string
  yours: CatalogSyncMedia
  system: CatalogSyncMedia
  changed_fields: CatalogSyncMediaField[]
  changes: string[]
}

export type CatalogSyncSummary = {
  new_count: number
  media_update_count: number
  unchanged_count: number
}

export type CatalogSyncPreview = {
  summary: CatalogSyncSummary
  add: CatalogSyncAddItem[]
  update: CatalogSyncUpdateItem[]
  unchanged_count: number
}

export type CatalogSyncApplyRequest = {
  add_ids: string[]
  update_ids: string[]
  include_media: boolean
}

export type CatalogSyncApplyResult = {
  added_count: number
  updated_count: number
  added_ids: string[]
  updated_ids: string[]
}

export type CatalogSyncSelection = {
  includeMedia: boolean
  addIds: string[]
  updateIds: string[]
}

export type CheckState = 'all' | 'none' | 'some'

export type MediaSlot = 'start' | 'end' | 'video'

const EMPTY_MEDIA: CatalogSyncMedia = {
  start_image_url: null,
  end_image_url: null,
  video_url: null,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function readNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.trunc(value))
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value) {
    const text = readString(item)
    if (text) result.push(text)
  }
  return result
}

function readMuscles(record: Record<string, unknown>): string[] {
  const raw = [...readStringList(record.primary_muscles), ...readStringList(record.secondary_muscles)]
  const labels: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const label = formatMuscleName(item)
    if (!label) continue
    const key = label.toLocaleLowerCase('ru-RU')
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

function readMedia(value: unknown): CatalogSyncMedia {
  if (!isRecord(value)) return EMPTY_MEDIA
  return {
    start_image_url: readString(value.start_image_url),
    end_image_url: readString(value.end_image_url),
    video_url: readString(value.video_url),
  }
}

function isMediaField(value: string): value is CatalogSyncMediaField {
  switch (value) {
    case 'video_url':
    case 'start_image_url':
    case 'end_image_url':
      return true
    default:
      return false
  }
}

function readChangedFields(value: unknown): CatalogSyncMediaField[] {
  const fields: CatalogSyncMediaField[] = []
  const seen = new Set<CatalogSyncMediaField>()
  for (const item of readStringList(value)) {
    if (!isMediaField(item) || seen.has(item)) continue
    seen.add(item)
    fields.push(item)
  }
  return fields
}

function photoChange(label: string, yours: string | null, system: string | null): string | null {
  if (!yours && system) return `+ ${label}`
  if (yours && !system) return `без ${label}`
  if (yours && system && yours !== system) return `обновлено ${label}`
  return null
}

function fieldSlot(field: CatalogSyncMediaField): MediaSlot {
  switch (field) {
    case 'start_image_url':
      return 'start'
    case 'end_image_url':
      return 'end'
    case 'video_url':
      return 'video'
    default: {
      const unexpected: never = field
      return unexpected
    }
  }
}

function fieldLabel(field: CatalogSyncMediaField): string {
  switch (field) {
    case 'start_image_url':
      return 'start-фото'
    case 'end_image_url':
      return 'end-фото'
    case 'video_url':
      return 'видео'
    default: {
      const unexpected: never = field
      return unexpected
    }
  }
}

export function slotsForChangedFields(fields: readonly CatalogSyncMediaField[]): MediaSlot[] {
  return fields.map((field) => fieldSlot(field))
}

export function notesForChangedFields(
  fields: readonly CatalogSyncMediaField[],
  yours: CatalogSyncMedia,
  system: CatalogSyncMedia,
): string[] {
  const notes: string[] = []
  for (const field of fields) {
    const note = photoChange(fieldLabel(field), mediaSlotUrl(yours, fieldSlot(field)), mediaSlotUrl(system, fieldSlot(field)))
    if (note) notes.push(note)
  }
  return notes
}

export function mediaSlotCaption(slot: MediaSlot): string {
  switch (slot) {
    case 'start':
      return 'start-фото'
    case 'end':
      return 'end-фото'
    case 'video':
      return 'видео'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

export function mediaSlotMissing(slot: MediaSlot): string {
  switch (slot) {
    case 'start':
      return 'нет start-фото.'
    case 'end':
      return 'нет end-фото.'
    case 'video':
      return 'нет видео.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

export function mediaSlotUrl(media: CatalogSyncMedia, slot: MediaSlot): string | null {
  switch (slot) {
    case 'start':
      return media.start_image_url
    case 'end':
      return media.end_image_url
    case 'video':
      return media.video_url
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function readAddItems(value: unknown): CatalogSyncAddItem[] {
  if (!Array.isArray(value)) return []
  const items: CatalogSyncAddItem[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const id = readString(entry.platform_exercise_id)
    const exerciseName = readString(entry.exercise_name)
    if (!id || !exerciseName || seen.has(id)) continue
    seen.add(id)
    items.push({
      id,
      exercise_name: exerciseName,
      muscles: readMuscles(entry),
      start_image_url: readString(entry.start_image_url),
    })
  }
  return items
}

function readUpdateItems(value: unknown): CatalogSyncUpdateItem[] {
  if (!Array.isArray(value)) return []
  const items: CatalogSyncUpdateItem[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const id = readString(entry.platform_exercise_id)
    const trainerExerciseId = readString(entry.trainer_exercise_id)
    const trainer = isRecord(entry.trainer) ? entry.trainer : null
    const platform = isRecord(entry.platform) ? entry.platform : null
    const exerciseName = (trainer && readString(trainer.exercise_name)) || (platform && readString(platform.exercise_name))
    if (!id || !trainerExerciseId || !exerciseName || seen.has(id)) continue
    seen.add(id)
    const yours = readMedia(trainer)
    const system = readMedia(platform)
    const changedFields = readChangedFields(entry.changed_fields)
    items.push({
      id,
      trainer_exercise_id: trainerExerciseId,
      exercise_name: exerciseName,
      yours,
      system,
      changed_fields: changedFields,
      changes: notesForChangedFields(changedFields, yours, system),
    })
  }
  return items
}

export function normalizeCatalogSyncPreview(payload: unknown): CatalogSyncPreview {
  if (!isRecord(payload) || !isRecord(payload.summary)) {
    throw new Error('Catalog sync preview payload is not an object')
  }
  const summary = payload.summary
  const add = readAddItems(payload.add)
  const update = readUpdateItems(payload.update)
  const unchanged = readNumber(summary.unchanged_count) ?? 0
  return {
    summary: {
      new_count: readNumber(summary.new_count) ?? add.length,
      media_update_count: readNumber(summary.media_update_count) ?? update.length,
      unchanged_count: unchanged,
    },
    add,
    update,
    unchanged_count: unchanged,
  }
}

/** Сервер отвечает 422, если update_ids пришли с include_media: false. */
export function catalogSyncApplyBody(payload: CatalogSyncApplyRequest): CatalogSyncApplyRequest {
  if (payload.include_media) return payload
  return {
    add_ids: payload.add_ids,
    update_ids: [],
    include_media: false,
  }
}

export function normalizeCatalogSyncApplyResult(
  payload: unknown,
  request: CatalogSyncApplyRequest,
): CatalogSyncApplyResult {
  const body = catalogSyncApplyBody(request)
  const fallback: CatalogSyncApplyResult = {
    added_count: body.add_ids.length,
    updated_count: body.update_ids.length,
    added_ids: body.add_ids,
    updated_ids: body.update_ids,
  }
  if (!isRecord(payload)) return fallback
  const addedIds = Array.isArray(payload.added_ids) ? readStringList(payload.added_ids) : null
  const updatedIds = Array.isArray(payload.updated_ids) ? readStringList(payload.updated_ids) : null
  return {
    added_count: readNumber(payload.added_count) ?? fallback.added_count,
    updated_count: readNumber(payload.updated_count) ?? fallback.updated_count,
    added_ids: addedIds ?? fallback.added_ids,
    updated_ids: updatedIds ?? fallback.updated_ids,
  }
}

export function ruPlural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last === 1) return one
  if (last > 1 && last < 5) return few
  return many
}

export function syncSummaryParts(summary: CatalogSyncSummary): { added: string; media: string; unchanged: string } {
  const mediaWord = ruPlural(summary.media_update_count, 'обновление', 'обновления', 'обновлений')
  return {
    added: `+${summary.new_count} новых`,
    media: `~${summary.media_update_count} ${mediaWord} медиа`,
    unchanged: `${summary.unchanged_count} без изменений`,
  }
}

export function formatSyncSummary(summary: CatalogSyncSummary): string {
  const parts = syncSummaryParts(summary)
  return `${parts.added} · ${parts.media} · ${parts.unchanged}`
}

export function initialCatalogSyncSelection(preview: CatalogSyncPreview): CatalogSyncSelection {
  return {
    includeMedia: false,
    addIds: preview.add.map((item) => item.id),
    updateIds: [],
  }
}

export function checkState(allIds: readonly string[], selectedIds: readonly string[]): CheckState {
  if (allIds.length === 0) return 'none'
  const chosen = new Set(selectedIds)
  let selected = 0
  for (const id of allIds) {
    if (chosen.has(id)) selected += 1
  }
  if (selected === 0) return 'none'
  if (selected === allIds.length) return 'all'
  return 'some'
}

export function toggleListedId(selectedIds: readonly string[], id: string): string[] {
  return selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]
}

export function toggleSelectAll(allIds: readonly string[], selectedIds: readonly string[]): string[] {
  return checkState(allIds, selectedIds) === 'all' ? [] : [...allIds]
}

export function selectedIdsInOrder(items: readonly { id: string }[], selectedIds: readonly string[]): string[] {
  const chosen = new Set(selectedIds)
  return items.map((item) => item.id).filter((id) => chosen.has(id))
}

export function withMediaToggle(
  selection: CatalogSyncSelection,
  includeMedia: boolean,
  updateIds: readonly string[],
): CatalogSyncSelection {
  return {
    ...selection,
    includeMedia,
    updateIds: includeMedia ? [...updateIds] : [],
  }
}

export function catalogSyncSelectionCount(preview: CatalogSyncPreview, selection: CatalogSyncSelection): number {
  const addCount = selectedIdsInOrder(preview.add, selection.addIds).length
  const updateCount = selection.includeMedia ? selectedIdsInOrder(preview.update, selection.updateIds).length : 0
  return addCount + updateCount
}

export function toCatalogSyncApplyRequest(
  preview: CatalogSyncPreview,
  selection: CatalogSyncSelection,
): CatalogSyncApplyRequest {
  return catalogSyncApplyBody({
    add_ids: selectedIdsInOrder(preview.add, selection.addIds),
    update_ids: selection.includeMedia ? selectedIdsInOrder(preview.update, selection.updateIds) : [],
    include_media: selection.includeMedia,
  })
}

export function formatCatalogSyncSuccessDescription(added: number, updated: number): string | undefined {
  const parts: string[] = []
  if (added > 0) parts.push(`добавлено ${added}`)
  if (updated > 0) parts.push(`обновлено ${updated}`)
  if (parts.length === 0) return undefined
  return `${parts.join(', ')}.`
}
