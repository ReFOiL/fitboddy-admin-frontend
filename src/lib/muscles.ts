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
