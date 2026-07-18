type MuscleAnatomyMapProps = {
  view: 'front' | 'back'
  primaryRegions: Set<string>
  secondaryRegions: Set<string>
  interactive?: boolean
  onRegionClick?: (regionKey: string) => void
}

function regionClass(
  regionKey: string,
  primaryRegions: Set<string>,
  secondaryRegions: Set<string>,
  interactive: boolean,
): string {
  const isPrimary = primaryRegions.has(regionKey)
  const isSecondary = secondaryRegions.has(regionKey)
  const base = interactive ? 'cursor-pointer transition' : 'pointer-events-none'
  if (isPrimary) return `${base} fill-primary stroke-primary-foreground/40`
  if (isSecondary) return `${base} fill-primary/40 stroke-primary/70`
  return `${base} fill-muted stroke-border hover:fill-secondary`
}

export function MuscleAnatomyMap({
  view,
  primaryRegions,
  secondaryRegions,
  interactive = false,
  onRegionClick,
}: MuscleAnatomyMapProps) {
  const cls = (region: string) => regionClass(region, primaryRegions, secondaryRegions, interactive)
  const click = (region: string) => {
    if (!interactive || !onRegionClick) return
    onRegionClick(region)
  }

  return (
    <svg
      viewBox="0 0 200 420"
      className="mx-auto h-auto w-full max-w-[220px]"
      role="img"
      aria-label={view === 'front' ? 'Силуэт спереди' : 'Силуэт сзади'}
    >
      <ellipse cx="100" cy="28" rx="22" ry="26" className="fill-secondary stroke-border" />
      <path
        d="M70 54 C70 70 74 84 78 96 L122 96 C126 84 130 70 130 54 Z"
        className="fill-secondary stroke-border"
      />

      {view === 'front' ? (
        <>
          <path d="M86 58 L100 72 L114 58 L110 90 L90 90 Z" className={cls('neck')} onClick={() => click('neck')} />
          <path d="M78 78 L90 86 L110 86 L122 78 L118 98 L82 98 Z" className={cls('traps_upper')} onClick={() => click('traps_upper')} />
          <path d="M78 98 L122 98 L120 150 L80 150 Z" className={cls('chest')} onClick={() => click('chest')} />
          <path d="M78 140 L86 150 L86 175 L74 160 Z" className={cls('serratus')} onClick={() => click('serratus')} />
          <path d="M114 150 L122 140 L126 160 L114 175 Z" className={cls('serratus')} onClick={() => click('serratus')} />
          <path d="M56 90 L78 98 L74 130 L52 124 Z" className={cls('shoulders_front')} onClick={() => click('shoulders_front')} />
          <path d="M122 98 L144 90 L148 124 L126 130 Z" className={cls('shoulders_front')} onClick={() => click('shoulders_front')} />
          <path d="M52 124 L74 130 L70 175 L48 168 Z" className={cls('biceps')} onClick={() => click('biceps')} />
          <path d="M126 130 L148 124 L152 168 L130 175 Z" className={cls('biceps')} onClick={() => click('biceps')} />
          <path d="M48 168 L70 175 L66 220 L44 210 Z" className={cls('forearms')} onClick={() => click('forearms')} />
          <path d="M130 175 L152 168 L156 210 L134 220 Z" className={cls('forearms')} onClick={() => click('forearms')} />
          <path d="M86 150 L114 150 L112 205 L88 205 Z" className={cls('abs')} onClick={() => click('abs')} />
          <path d="M80 150 L88 155 L88 205 L78 195 Z" className={cls('obliques')} onClick={() => click('obliques')} />
          <path d="M112 155 L120 150 L122 195 L112 205 Z" className={cls('obliques')} onClick={() => click('obliques')} />
          <path d="M88 205 L112 205 L118 230 L82 230 Z" className={cls('hip_flexors')} onClick={() => click('hip_flexors')} />
          <path d="M82 230 L98 232 L96 320 L78 315 Z" className={cls('quadriceps')} onClick={() => click('quadriceps')} />
          <path d="M102 232 L118 230 L122 315 L104 320 Z" className={cls('quadriceps')} onClick={() => click('quadriceps')} />
          <path d="M96 250 L104 250 L104 300 L96 300 Z" className={cls('adductors')} onClick={() => click('adductors')} />
          <path d="M78 315 L96 320 L94 390 L76 385 Z" className={cls('tibialis')} onClick={() => click('tibialis')} />
          <path d="M104 320 L122 315 L124 385 L106 390 Z" className={cls('tibialis')} onClick={() => click('tibialis')} />
        </>
      ) : (
        <>
          <path d="M78 78 L122 78 L118 110 L82 110 Z" className={cls('traps')} onClick={() => click('traps')} />
          <path d="M56 90 L78 98 L74 130 L52 124 Z" className={cls('shoulders_back')} onClick={() => click('shoulders_back')} />
          <path d="M122 98 L144 90 L148 124 L126 130 Z" className={cls('shoulders_back')} onClick={() => click('shoulders_back')} />
          <path d="M82 110 L118 110 L114 145 L86 145 Z" className={cls('rhomboids')} onClick={() => click('rhomboids')} />
          <path d="M78 110 L86 145 L80 200 L60 150 Z" className={cls('lats')} onClick={() => click('lats')} />
          <path d="M114 145 L122 110 L140 150 L120 200 Z" className={cls('lats')} onClick={() => click('lats')} />
          <path d="M86 145 L114 145 L112 205 L88 205 Z" className={cls('lower_back')} onClick={() => click('lower_back')} />
          <path d="M52 124 L74 130 L70 175 L48 168 Z" className={cls('triceps')} onClick={() => click('triceps')} />
          <path d="M126 130 L148 124 L152 168 L130 175 Z" className={cls('triceps')} onClick={() => click('triceps')} />
          <path d="M48 168 L70 175 L66 220 L44 210 Z" className={cls('forearms')} onClick={() => click('forearms')} />
          <path d="M130 175 L152 168 L156 210 L134 220 Z" className={cls('forearms')} onClick={() => click('forearms')} />
          <path d="M82 205 L118 205 L122 250 L78 250 Z" className={cls('glutes')} onClick={() => click('glutes')} />
          <path d="M78 250 L98 252 L96 320 L76 315 Z" className={cls('hamstrings')} onClick={() => click('hamstrings')} />
          <path d="M102 252 L122 250 L124 315 L104 320 Z" className={cls('hamstrings')} onClick={() => click('hamstrings')} />
          <path d="M76 315 L96 320 L94 390 L74 385 Z" className={cls('calves')} onClick={() => click('calves')} />
          <path d="M104 320 L124 315 L126 385 L106 390 Z" className={cls('calves')} onClick={() => click('calves')} />
        </>
      )}
    </svg>
  )
}
