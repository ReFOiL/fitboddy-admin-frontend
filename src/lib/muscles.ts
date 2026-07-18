export type Muscle = {
  slug: string
  name_ru: string
  sort_order: number
  body_view: 'front' | 'back' | string
  region_key: string
}

export type MuscleRoleMode = 'primary' | 'secondary'

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
