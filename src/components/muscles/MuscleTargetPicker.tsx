import { useMemo, useState } from 'react'

import { MuscleAnatomyMap } from './MuscleAnatomyMap'
import {
  REGION_DEFAULT_SLUG,
  regionsForSlugs,
  type Muscle,
  type MuscleRoleMode,
} from '../../lib/muscles'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

type MuscleTargetPickerProps = {
  muscles: Muscle[]
  primary: string[]
  secondary: string[]
  readOnly?: boolean
  onChange?: (next: { primary: string[]; secondary: string[] }) => void
}

export function MuscleTargetPicker({
  muscles,
  primary,
  secondary,
  readOnly = false,
  onChange,
}: MuscleTargetPickerProps) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const [roleMode, setRoleMode] = useState<MuscleRoleMode>('primary')
  const [query, setQuery] = useState('')

  const nameBySlug = useMemo(() => new Map(muscles.map((item) => [item.slug, item.name_ru])), [muscles])
  const primaryRegions = useMemo(() => regionsForSlugs(muscles, primary), [muscles, primary])
  const secondaryRegions = useMemo(() => regionsForSlugs(muscles, secondary), [muscles, secondary])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ru-RU')
    return muscles
      .filter((item) => {
        if (!needle) return true
        return (
          item.name_ru.toLocaleLowerCase('ru-RU').includes(needle) || item.slug.includes(needle)
        )
      })
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [muscles, query])

  const catalogForView = useMemo(
    () =>
      query.trim()
        ? filtered
        : muscles.filter((item) => item.body_view === view).sort((a, b) => a.sort_order - b.sort_order),
    [filtered, muscles, query, view],
  )

  function toggleSlug(slug: string, role: MuscleRoleMode = roleMode) {
    if (readOnly || !onChange) return
    const inPrimary = primary.includes(slug)
    const inSecondary = secondary.includes(slug)
    let nextPrimary = [...primary]
    let nextSecondary = [...secondary]

    if (role === 'primary') {
      if (inPrimary) {
        nextPrimary = nextPrimary.filter((item) => item !== slug)
      } else {
        nextSecondary = nextSecondary.filter((item) => item !== slug)
        nextPrimary = [...nextPrimary, slug]
      }
    } else if (inSecondary) {
      nextSecondary = nextSecondary.filter((item) => item !== slug)
    } else {
      nextPrimary = nextPrimary.filter((item) => item !== slug)
      nextSecondary = [...nextSecondary, slug]
    }
    onChange({ primary: nextPrimary, secondary: nextSecondary })
  }

  function onRegionClick(regionKey: string) {
    const slug = REGION_DEFAULT_SLUG[regionKey]
    if (!slug) return
    toggleSlug(slug)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
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
              view === value
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background hover:bg-secondary/40',
            ].join(' ')}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['primary', 'Основные'],
              ['secondary', 'Вспомогательные'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={[
                'rounded-full px-3 py-1.5 text-sm',
                roleMode === value
                  ? 'bg-primary/20 text-foreground ring-1 ring-primary'
                  : 'border border-border bg-background hover:bg-secondary/40',
              ].join(' ')}
              onClick={() => setRoleMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-border/70 bg-secondary/15 p-3">
        <MuscleAnatomyMap
          view={view}
          primaryRegions={primaryRegions}
          secondaryRegions={secondaryRegions}
          interactive={!readOnly}
          onRegionClick={onRegionClick}
        />
      </div>

      {(primary.length > 0 || secondary.length > 0) && (
        <div className="grid gap-2">
          {primary.length > 0 ? (
            <div>
              <p className="mb-1 text-xs text-secondary-foreground">Основные</p>
              <div className="flex flex-wrap gap-2">
                {primary.map((slug) => (
                  <button
                    key={`p-${slug}`}
                    type="button"
                    disabled={readOnly}
                    className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-100"
                    onClick={() => toggleSlug(slug, 'primary')}
                  >
                    {nameBySlug.get(slug) ?? slug}
                    {!readOnly ? ' ×' : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {secondary.length > 0 ? (
            <div>
              <p className="mb-1 text-xs text-secondary-foreground">Вспомогательные</p>
              <div className="flex flex-wrap gap-2">
                {secondary.map((slug) => (
                  <button
                    key={`s-${slug}`}
                    type="button"
                    disabled={readOnly}
                    className="rounded-full bg-primary/25 px-3 py-1 text-sm disabled:opacity-100"
                    onClick={() => toggleSlug(slug, 'secondary')}
                  >
                    {nameBySlug.get(slug) ?? slug}
                    {!readOnly ? ' ×' : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!readOnly ? (
        <div className="grid gap-2">
          <Label htmlFor="muscle-search">Поиск мышцы</Label>
          <Input
            id="muscle-search"
            placeholder="Поиск мышцы…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {catalogForView.map((item) => {
              const selectedPrimary = primary.includes(item.slug)
              const selectedSecondary = secondary.includes(item.slug)
              return (
                <button
                  key={item.slug}
                  type="button"
                  className={[
                    'rounded-full border px-3 py-1.5 text-sm',
                    selectedPrimary
                      ? 'border-primary bg-primary text-primary-foreground'
                      : selectedSecondary
                        ? 'border-primary/50 bg-primary/20'
                        : 'border-border bg-background hover:bg-secondary/40',
                  ].join(' ')}
                  onClick={() => toggleSlug(item.slug)}
                >
                  {item.name_ru}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {readOnly && primary.length === 0 && secondary.length === 0 ? (
        <p className="text-sm text-secondary-foreground">Группы мышц не указаны</p>
      ) : null}
    </div>
  )
}
