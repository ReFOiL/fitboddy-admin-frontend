/** Shared helpers for trainer exercise load schemes. */

export type LoadSchemeValue = 'flat' | 'ascending' | 'descending' | 'custom'

export function getLoadSchemeOptions(isHold: boolean): Array<{ value: LoadSchemeValue; label: string }> {
  return [
    { value: 'flat', label: isHold ? 'Одинаковая длительность' : 'Одинаковый вес' },
    { value: 'ascending', label: 'Пирамида вверх' },
    { value: 'descending', label: 'Пирамида вниз' },
    { value: 'custom', label: 'Своя схема' },
  ]
}

export function parseSchemeStepsInput(raw: string): number[] {
  return raw
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
}

export function formatSchemeStepsInput(steps: number[] | null | undefined): string {
  if (!steps?.length) return ''
  return steps.join(', ')
}

export function previewSchemeSteps(
  scheme: LoadSchemeValue,
  sets: number,
  customSteps: number[],
): number[] {
  const safeSets = Math.max(1, sets)
  if (scheme === 'custom' && customSteps.length > 0) {
    if (customSteps.length >= safeSets) return customSteps.slice(0, safeSets)
    const last = customSteps[customSteps.length - 1]
    return [...customSteps, ...Array.from({ length: safeSets - customSteps.length }, () => last)]
  }
  if (scheme === 'ascending') {
    if (safeSets <= 1) return [1]
    return Array.from({ length: safeSets }, (_, index) =>
      Number((0.7 + (0.3 * index) / (safeSets - 1)).toFixed(3)),
    )
  }
  if (scheme === 'descending') {
    if (safeSets <= 1) return [1]
    return Array.from({ length: safeSets }, (_, index) =>
      Number((1 - (0.3 * index) / (safeSets - 1)).toFixed(3)),
    )
  }
  return Array.from({ length: safeSets }, () => 1)
}
