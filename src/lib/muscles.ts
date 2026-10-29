export type Muscle = {
  slug: string
  name_ru: string
  sort_order: number
  body_view: 'front' | 'back' | string
  region_key: string
}

export type MuscleRoleMode = 'primary' | 'secondary'
export type WorkoutCategory = 'upper' | 'lower' | 'core' | 'full_body'
export type MuscleZone = 'upper' | 'lower' | 'core'

/** slug → body zone (keep in sync with plan-service muscle_catalog.py) */
export const MUSCLE_ZONE_BY_SLUG: Record<string, MuscleZone> = {
  neck: 'upper',
  traps_upper: 'upper',
  chest_upper: 'upper',
  chest: 'upper',
  chest_lower: 'upper',
  serratus: 'upper',
  anterior_deltoid: 'upper',
  lateral_deltoid: 'upper',
  biceps: 'upper',
  brachialis: 'upper',
  forearms: 'upper',
  abs: 'core',
  obliques: 'core',
  hip_flexors: 'lower',
  quadriceps: 'lower',
  adductors: 'lower',
  tibialis: 'lower',
  traps: 'upper',
  traps_mid: 'upper',
  rear_deltoid: 'upper',
  rhomboids: 'upper',
  lats: 'upper',
  teres: 'upper',
  lower_back: 'core',
  triceps: 'upper',
  glutes: 'lower',
  hamstrings: 'lower',
  calves: 'lower',
  soleus: 'lower',
  rotator_cuff: 'upper',
  pectoralis_minor: 'upper',
  core: 'core',
  abductors: 'lower',
  gastrocnemius: 'lower',
  wrist_flexors: 'upper',
  wrist_extensors: 'upper',
  levator_scapulae: 'upper',
  infraspinatus: 'upper',
  subscapularis: 'upper',
  brachioradialis: 'upper',
}

/** slug → Russian name (keep in sync with plan-service MUSCLE_SEED). */
const MUSCLE_NAME_BY_SLUG: Record<string, string> = {
  neck: 'Шея',
  traps_upper: 'Трапеции (верх)',
  chest_upper: 'Грудь (верх)',
  chest: 'Грудь',
  chest_lower: 'Грудь (низ)',
  serratus: 'Передняя зубчатая',
  anterior_deltoid: 'Передняя дельта',
  lateral_deltoid: 'Средняя дельта',
  biceps: 'Бицепс',
  brachialis: 'Плечевая мышца',
  forearms: 'Предплечья',
  abs: 'Пресс',
  obliques: 'Косые мышцы живота',
  hip_flexors: 'Сгибатели бедра',
  quadriceps: 'Квадрицепсы',
  adductors: 'Приводящие бедра',
  tibialis: 'Передняя большеберцовая',
  traps: 'Трапеции',
  traps_mid: 'Трапеции (середина)',
  rear_deltoid: 'Задняя дельта',
  rhomboids: 'Ромбовидные',
  lats: 'Широчайшие',
  teres: 'Круглая мышца спины',
  lower_back: 'Разгибатели спины',
  triceps: 'Трицепс',
  glutes: 'Ягодицы',
  hamstrings: 'Бицепс бедра',
  calves: 'Икры',
  soleus: 'Камбаловидная',
  rotator_cuff: 'Вращательная манжета',
  pectoralis_minor: 'Малая грудная',
  core: 'Кор (стабилизаторы)',
  abductors: 'Отводящие бедра',
  gastrocnemius: 'Икроножная',
  wrist_flexors: 'Сгибатели запястья',
  wrist_extensors: 'Разгибатели запястья',
  levator_scapulae: 'Мышца, поднимающая лопатку',
  infraspinatus: 'Подостная',
  subscapularis: 'Подлопаточная',
  brachioradialis: 'Плечелучевая',
}

const MUSCLE_NAME_BY_FOLDED_LABEL = new Map(
  Object.values(MUSCLE_NAME_BY_SLUG).map((name) => [name.toLocaleLowerCase('ru-RU'), name]),
)

/** Slug из каталога или уже готовая подпись. Неизвестное значение остаётся как пришло. */
export function formatMuscleName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const known = MUSCLE_NAME_BY_SLUG[trimmed.toLowerCase()]
  if (known) return known
  return MUSCLE_NAME_BY_FOLDED_LABEL.get(trimmed.toLocaleLowerCase('ru-RU')) ?? trimmed
}

export function deriveWorkoutCategory(primaryMuscles: string[]): WorkoutCategory {
  const zones = new Set<MuscleZone>()
  for (const slug of primaryMuscles) {
    const zone = MUSCLE_ZONE_BY_SLUG[slug.trim().toLowerCase()]
    if (zone) zones.add(zone)
  }
  if (zones.size === 0) return 'full_body'
  const hasUpper = zones.has('upper')
  const hasLower = zones.has('lower')
  const hasCore = zones.has('core')
  if (hasUpper && hasLower) return 'full_body'
  if (hasUpper) return 'upper'
  if (hasLower) return 'lower'
  if (hasCore) return 'core'
  return 'full_body'
}

export function formatWorkoutCategory(value: string): string {
  const labels: Record<string, string> = {
    upper: 'Верх тела',
    lower: 'Низ тела',
    core: 'Корпус',
    full_body: 'Все тело',
  }
  return labels[value] ?? value
}

/** region_key → default muscle slug when clicking the silhouette */
export const REGION_DEFAULT_SLUG: Record<string, string> = {
  neck: 'neck',
  traps_upper: 'traps_upper',
  chest: 'chest',
  serratus: 'serratus',
  shoulders_front: 'anterior_deltoid',
  biceps: 'biceps',
  forearms: 'forearms',
  abs: 'abs',
  obliques: 'obliques',
  hip_flexors: 'hip_flexors',
  quadriceps: 'quadriceps',
  adductors: 'adductors',
  tibialis: 'tibialis',
  traps: 'traps',
  shoulders_back: 'rear_deltoid',
  rhomboids: 'rhomboids',
  lats: 'lats',
  lower_back: 'lower_back',
  triceps: 'triceps',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  calves: 'calves',
}

export function regionsForSlugs(muscles: Muscle[], slugs: string[]): Set<string> {
  const bySlug = new Map(muscles.map((item) => [item.slug, item]))
  const regions = new Set<string>()
  for (const slug of slugs) {
    const muscle = bySlug.get(slug)
    if (muscle) regions.add(muscle.region_key)
  }
  return regions
}
