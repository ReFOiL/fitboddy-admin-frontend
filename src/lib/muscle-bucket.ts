export type MuscleBucket = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'other'

const CORE = new Set(['abs', 'obliques', 'core', 'lower_back'])
const CHEST = new Set(['chest', 'chest_upper', 'chest_lower', 'pectoralis_minor', 'serratus'])
const BACK = new Set(['lats', 'traps', 'traps_upper', 'traps_mid', 'rhomboids', 'teres'])
const LEGS = new Set([
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
  'tibialis',
  'soleus',
  'gastrocnemius',
  'hip_flexors',
])
const SHOULDERS = new Set([
  'anterior_deltoid',
  'lateral_deltoid',
  'rear_deltoid',
  'rotator_cuff',
  'infraspinatus',
  'subscapularis',
  'levator_scapulae',
])
const ARMS = new Set(['biceps', 'triceps', 'forearms', 'brachialis', 'brachioradialis', 'wrist_flexors', 'wrist_extensors'])

function intersects(slugs: string[], group: Set<string>): boolean {
  return slugs.some((slug) => group.has(slug))
}

/**
 * Группа для фильтра каталога в студии плана.
 * Корпус (в том числе поясница) не попадает в «Руки».
 */
export function muscleBucket(exercise: { primary_muscles: string[]; workout_category: string }): MuscleBucket {
  const slugs = exercise.primary_muscles.map((item) => item.trim().toLowerCase()).filter(Boolean)
  // Без мышц упражнение не относится к груди: иначе фильтр «Грудь» собирает всё неизвестное.
  if (slugs.length === 0) {
    if (exercise.workout_category === 'core') return 'core'
    if (exercise.workout_category === 'lower') return 'legs'
    return 'other'
  }
  if (intersects(slugs, CORE) || exercise.workout_category === 'core') return 'core'
  if (intersects(slugs, CHEST)) return 'chest'
  if (intersects(slugs, BACK)) return 'back'
  if (intersects(slugs, LEGS)) return 'legs'
  if (intersects(slugs, SHOULDERS)) return 'shoulders'
  if (intersects(slugs, ARMS)) return 'arms'
  if (exercise.workout_category === 'lower') return 'legs'
  return 'other'
}
