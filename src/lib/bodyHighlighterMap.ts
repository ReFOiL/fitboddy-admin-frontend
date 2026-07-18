import type { Slug } from 'react-muscle-highlighter'

/** Our region_key → library slug */
export const REGION_TO_SLUG: Partial<Record<string, Slug>> = {
  neck: 'neck',
  traps_upper: 'trapezius',
  chest: 'chest',
  shoulders_front: 'deltoids',
  biceps: 'biceps',
  forearms: 'forearm',
  abs: 'abs',
  obliques: 'obliques',
  quadriceps: 'quadriceps',
  adductors: 'adductors',
  tibialis: 'tibialis',
  traps: 'trapezius',
  shoulders_back: 'deltoids',
  rhomboids: 'upper-back',
  lats: 'upper-back',
  lower_back: 'lower-back',
  triceps: 'triceps',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  calves: 'calves',
  // nearest proxies (no dedicated polygons)
  serratus: 'obliques',
  hip_flexors: 'quadriceps',
}

/** Library slug click → our region_key */
export function slugToRegion(slug: Slug, facing: 'front' | 'back'): string | null {
  switch (slug) {
    case 'neck':
      return 'neck'
    case 'trapezius':
      return facing === 'front' ? 'traps_upper' : 'traps'
    case 'chest':
      return 'chest'
    case 'deltoids':
      return facing === 'front' ? 'shoulders_front' : 'shoulders_back'
    case 'biceps':
      return 'biceps'
    case 'triceps':
      return 'triceps'
    case 'forearm':
      return 'forearms'
    case 'abs':
      return 'abs'
    case 'obliques':
      return 'obliques'
    case 'upper-back':
      return 'lats'
    case 'lower-back':
      return 'lower_back'
    case 'gluteal':
      return 'glutes'
    case 'hamstring':
      return 'hamstrings'
    case 'quadriceps':
      return 'quadriceps'
    case 'adductors':
      return 'adductors'
    case 'tibialis':
      return 'tibialis'
    case 'calves':
      return 'calves'
    default:
      return null
  }
}

export function regionsToSlugs(regions: Set<string>): Slug[] {
  const out = new Set<Slug>()
  for (const region of regions) {
    const slug = REGION_TO_SLUG[region]
    if (slug) out.add(slug)
  }
  return [...out]
}
