import { useEffect, useMemo, useState } from 'react'
import Body, { type ExtendedBodyPart } from 'react-muscle-highlighter'

import {
  regionsToSlugs,
  slugToRegion,
  type BodyGender,
} from '../../lib/bodyHighlighterMap'

type MuscleAnatomyMapProps = {
  primaryRegions: Set<string>
  secondaryRegions: Set<string>
  interactive?: boolean
  onRegionClick?: (regionKey: string) => void
  onFacingChange?: (view: 'front' | 'back') => void
  /** Silhouette from profile questionnaire; user can still toggle. */
  defaultGender?: BodyGender
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
  defaultGender,
  bodyColor = '#3d4a5c',
  primaryColor = '#3b82f6',
  secondaryColor = '#60a5fa',
}: MuscleAnatomyMapProps) {
  const [facing, setFacing] = useState<'front' | 'back'>('front')
  const [manualGender, setManualGender] = useState<BodyGender | null>(null)
  const gender = manualGender ?? defaultGender ?? 'male'

  useEffect(() => {
    onFacingChange?.(facing)
  }, [facing, onFacingChange])

  const data = useMemo((): ExtendedBodyPart[] => {
    const secondary = regionsToSlugs(secondaryRegions)
    const primary = new Set(regionsToSlugs(primaryRegions))
    const parts: ExtendedBodyPart[] = []

    for (const slug of secondary) {
      if (primary.has(slug)) continue
      parts.push({ slug, color: secondaryColor })
    }
    for (const slug of primary) {
      parts.push({ slug, color: primaryColor })
    }
    return parts
  }, [primaryColor, primaryRegions, secondaryColor, secondaryRegions])

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
            ['male', 'Муж'],
            ['female', 'Жен'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={[
              'rounded-full px-3 py-1.5 text-sm',
              gender === value
                ? 'bg-primary/20 text-foreground ring-1 ring-primary'
                : 'border border-border bg-background hover:bg-secondary/40',
            ].join(' ')}
            onClick={() => setManualGender(value)}
          >
            {label}
          </button>
        ))}
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
                ? 'bg-primary/20 text-foreground ring-1 ring-primary'
                : 'border border-border bg-background hover:bg-secondary/40',
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
          defaultFill={bodyColor}
          defaultStroke="none"
          border="none"
          colors={[secondaryColor, primaryColor]}
          onBodyPartPress={interactive ? onPartPress : undefined}
        />
      </div>
    </div>
  )
}
