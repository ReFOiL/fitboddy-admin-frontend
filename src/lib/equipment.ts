export type EquipmentOption = {
  value: string
  label: string
}

/** Short preset list for trainer forms. Rare gear = custom display name. */
export const CANONICAL_EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { value: 'none', label: 'Без инвентаря' },
  { value: 'dumbbells', label: 'Гантели' },
  { value: 'barbell', label: 'Штанга' },
  { value: 'kettlebell', label: 'Гиря' },
  { value: 'resistance_bands', label: 'Эспандеры / резинки' },
  { value: 'treadmill', label: 'Беговая дорожка' },
]

export const CUSTOM_EQUIPMENT_SENTINEL = '__custom__'

const NAME_RE = /^[\p{L}\p{N}](?:[\p{L}\p{N} \-']{0,62}[\p{L}\p{N}])?$/u

export function isCanonicalEquipment(value: string): boolean {
  return CANONICAL_EQUIPMENT_OPTIONS.some((option) => option.value === value)
}

/** Normalize to a canon slug or cleaned custom display name. */
export function normalizeEquipmentName(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, ' ')
  if (!value) return null

  const folded = value.toLocaleLowerCase('ru-RU')
  if (folded === 'none') return null

  for (const option of CANONICAL_EQUIPMENT_OPTIONS) {
    if (option.value === 'none') continue
    if (folded === option.value || folded === option.label.toLocaleLowerCase('ru-RU')) {
      return option.value
    }
  }

  if (value.length < 2 || value.length > 64) return null
  if (!NAME_RE.test(value)) return null
  return value
}

/** @deprecated use normalizeEquipmentName */
export function normalizeEquipmentSlug(raw: string): string | null {
  return normalizeEquipmentName(raw)
}

export function normalizeEquipmentValue(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!raw) return 'none'
  if (raw.toLocaleLowerCase('ru-RU') === 'none') return 'none'
  return normalizeEquipmentName(raw) ?? 'none'
}

export function formatEquipmentLabel(code: string, metaOptions?: EquipmentOption[]): string {
  const key = code.trim()
  const folded = key.toLocaleLowerCase('ru-RU')
  const fromMeta = metaOptions?.find((item) => item.value === key || item.value.toLocaleLowerCase('ru-RU') === folded)?.label
  if (fromMeta) return fromMeta
  const fromCanon = CANONICAL_EQUIPMENT_OPTIONS.find(
    (item) => item.value === key || item.value.toLocaleLowerCase('ru-RU') === folded,
  )?.label
  if (fromCanon) return fromCanon
  return key
}

export function collectCatalogEquipmentTags(
  exercises: Array<{ equipment: string; is_active?: boolean }>,
): string[] {
  const tags = new Map<string, string>()
  for (const exercise of exercises) {
    if (exercise.is_active === false) continue
    const name = normalizeEquipmentName(exercise.equipment)
    if (!name) continue
    const key = name.toLocaleLowerCase('ru-RU')
    if (!tags.has(key)) tags.set(key, name)
  }
  return Array.from(tags.values()).sort((a, b) => a.localeCompare(b, 'ru'))
}
