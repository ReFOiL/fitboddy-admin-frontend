import { useEffect, useMemo, useState } from 'react'
import Body, { type ExtendedBodyPart } from 'react-muscle-highlighter'

import { useTheme } from '../../hooks/use-theme'
import {
  regionsToSlugs,
  slugToRegion,
  type BodyGender,
} from '../../lib/bodyHighlighterMap'

// Подсветка мышц в цветах темы: пыльный синий вместо яркого #3b82f6.
const MUSCLE_PALETTE = {
  light: { body: '#C5D0DA', primary: '#5A7891', secondary: '#8FAAC2' },
  dark: { body: '#3D4C5C', primary: '#8FAAC2', secondary: '#5A7891' },
} as const

type MuscleAnatomyMapProps = {
  primaryRegions: Set<string>
  secondaryRegions: Set<string>
  interactive?: boolean
  onRegionClick?: (regionKey: string) => void
  onFacingChange?: (view: 'front' | 'back') => void
  /** Силуэт из анкеты профиля. */
  gender?: BodyGender
  bodyColor?: string
  primaryColor?: string
  secondaryColor?: string
}

export function MuscleAnatomyMap({
  primaryRegions,
  secondaryRegions,
  interactive = false,
  onRegionClick,
  onFacingChange,
  gender = 'male',
  bodyColor,
  primaryColor,
  secondaryColor,
}: MuscleAnatomyMapProps) {
  const { theme } = useTheme()
  const palette = MUSCLE_PALETTE[theme]
  const resolvedBody = bodyColor ?? palette.body
  const resolvedPrimary = primaryColor ?? palette.primary
  const resolvedSecondary = secondaryColor ?? palette.secondary
  const [facing, setFacing] = useState<'front' | 'back'>('front')

  useEffect(() => {
    onFacingChange?.(facing)
  }, [facing, onFacingChange])

  const data = useMemo((): ExtendedBodyPart[] => {
    const secondary = regionsToSlugs(secondaryRegions)
    const primary = new Set(regionsToSlugs(primaryRegions))
    const parts: ExtendedBodyPart[] = []

    for (const slug of secondary) {
      if (primary.has(slug)) continue
      parts.push({ slug, color: resolvedSecondary })
    }
    for (const slug of primary) {
      parts.push({ slug, color: resolvedPrimary })
    }
    return parts
  }, [primaryRegions, resolvedPrimary, resolvedSecondary, secondaryRegions])

  function onPartPress(part: ExtendedBodyPart) {
    if (!interactive || !onRegionClick || !part.slug) return
    const region = slugToRegion(part.slug, facing)
    if (region) onRegionClick(region)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            ['front', 'Спереди'],
            ['back', 'Сзади'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={[
              'rounded-full px-3 py-1.5 text-sm',
              facing === value
                ? 'bg-secondary text-foreground ring-1 ring-primary'
                : 'border border-border bg-card text-secondary-foreground hover:bg-secondary',
            ].join(' ')}
            onClick={() => setFacing(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-[280px] justify-center [&_svg]:max-h-[420px] [&_svg]:w-full">
        <Body
          data={data}
          side={facing}
          gender={gender}
          scale={1.35}
          defaultFill={resolvedBody}
          defaultStroke="none"
          border="none"
          colors={[resolvedSecondary, resolvedPrimary]}
          onBodyPartPress={interactive ? onPartPress : undefined}
        />
      </div>
    </div>
  )
}
