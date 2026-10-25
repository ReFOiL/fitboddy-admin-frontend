import { describe, expect, it } from 'vitest'

import { muscleBucket } from '../src/lib/muscle-bucket'

describe('muscleBucket', () => {
  it('относит корпус к корпусу, а не к рукам', () => {
    expect(muscleBucket({ primary_muscles: ['abs'], workout_category: 'core' })).toBe('core')
    expect(muscleBucket({ primary_muscles: ['lower_back'], workout_category: 'upper' })).toBe('core')
    expect(muscleBucket({ primary_muscles: [], workout_category: 'core' })).toBe('core')
  })

  it('не путает дельты с широчайшими из-за куска названия', () => {
    expect(muscleBucket({ primary_muscles: ['lateral_deltoid'], workout_category: 'upper' })).toBe('shoulders')
    expect(muscleBucket({ primary_muscles: ['biceps'], workout_category: 'upper' })).toBe('arms')
    expect(muscleBucket({ primary_muscles: ['lats'], workout_category: 'upper' })).toBe('back')
  })
})
