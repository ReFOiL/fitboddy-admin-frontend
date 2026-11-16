import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getTrainerGenerationPolicy, upsertTrainerGenerationPolicy } from '../api/plans'
import { listTrainerExercises } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../hooks/use-auth'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import {
  applyGenerationPreset,
  beginnerGeneratorExample,
  DEFAULT_SESSION_BOUNDS,
  GENERATION_PRESET_ORDER,
  GENERATION_PRESETS,
  isGenerationPolicyDirty,
  matchingGenerationPreset,
  normalizeGenerationPolicy,
  type GenerationPresetId,
} from '../lib/generation-policy'
import { getUserErrorMessage } from '../lib/user-error-message'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { StickySaveBar } from '../components/plan/StickySaveBar'
import { QueryState } from '../components/shared'
import { Button } from '../components/ui/button'
import { Chip, Stepper } from '../components/ui/kit'
import { PageSkeleton } from '../components/ui/skeleton'
import type { TrainerExercise } from '../types/exercise'
import type { GenerationPolicy } from '../types/generation-policy'

const PAGE_TITLE = 'Правила генератора'

const CATEGORIES = [
  { value: 'full_body', label: 'Всё тело' },
  { value: 'upper', label: 'Верх' },
  { value: 'lower', label: 'Низ' },
  { value: 'core', label: 'Корпус' },
] as const

const LEVELS = [
  { value: 'beginner', label: 'Новичок' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
] as const

const GOALS = [
  { value: 'maintenance', label: 'Поддержание формы' },
  { value: 'weight_loss', label: 'Похудение' },
  { value: 'muscle_gain', label: 'Набор мышц' },
  { value: 'endurance', label: 'Выносливость' },
  { value: 'rehabilitation', label: 'Восстановление' },
] as const

type CategoryValue = (typeof CATEGORIES)[number]['value']

function splitKey(goal: string, level: string): string {
  return `${goal}|${level}`
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((item) => item.value === value)?.label ?? value
}

const SESSION_SLOTS = [
  { value: 'default', label: 'Обычный цикл (не первый план)' },
  { value: 'beginner', label: 'Первый план · новичок' },
  { value: 'intermediate', label: 'Первый план · средний' },
  { value: 'advanced', label: 'Первый план · продвинутый' },
  { value: 'rehabilitation', label: 'Первый план · восстановление' },
] as const

function SplitEditor({
  categories,
  onChange,
}: {
  categories: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            type="button"
            className="inline-flex h-12 items-center rounded-full border border-border bg-card px-4 text-[15px] font-semibold"
            onClick={() => onChange([...categories, category.value])}
          >
            + {category.label}
          </button>
        ))}
        {categories.length > 0 ? (
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full border border-border px-4 text-[15px] font-semibold text-secondary-foreground"
            onClick={() => onChange([])}
          >
            Очистить
          </button>
        ) : null}
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-secondary-foreground">Пока пусто — генератор сам выберет порядок зон.</p>
      ) : (
        <ol className="flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <li
              key={`${category}-${index}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-4 text-[17px]"
            >
              <span className="text-secondary-foreground">{index + 1}.</span>
              <span>{categoryLabel(category)}</span>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-secondary-foreground hover:text-destructive"
                aria-label="Убрать день"
                onClick={() => onChange(categories.filter((_, itemIndex) => itemIndex !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function PageHeading() {
  return (
    <div className="flex items-start justify-between gap-3">
      <h1 className="text-[28px] font-bold">{PAGE_TITLE}</h1>
      <ThemeToggle className="md:hidden" />
    </div>
  )
}

export function PlanRulesPage() {
  const { user } = useAuth()
  const trainerUserId = user?.user_id ?? ''

  const policyQuery = useQuery({
    queryKey: queryKeys.plans.trainerGenerationPolicy(trainerUserId),
    queryFn: () => getTrainerGenerationPolicy(trainerUserId),
    enabled: Boolean(trainerUserId),
  })
  const catalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    queryFn: () => listTrainerExercises(trainerUserId, false),
    enabled: Boolean(trainerUserId),
  })

  if (!trainerUserId) {
    return (
      <section className="space-y-3">
        <PageHeading />
        <p className="text-secondary-foreground">Нужно войти как тренер.</p>
      </section>
    )
  }

  if (policyQuery.isLoading) {
    return (
      <section className="space-y-3">
        <PageHeading />
        <PageSkeleton />
      </section>
    )
  }

  if (policyQuery.isError || !policyQuery.data) {
    return (
      <section className="space-y-3">
        <PageHeading />
        <QueryState
          isError
          errorTitle="Не удалось загрузить правила генератора"
          onRetry={() => void policyQuery.refetch()}
        >
          {null}
        </QueryState>
      </section>
    )
  }

  const exercises = (Array.isArray(catalogQuery.data) ? catalogQuery.data : []).filter((item) => item.is_active)

  return (
    <PlanRulesEditor
      trainerUserId={trainerUserId}
      initialPolicy={normalizeGenerationPolicy(policyQuery.data)}
      exercises={exercises}
      catalogError={catalogQuery.isError ? catalogQuery.error : null}
      catalogLoading={catalogQuery.isLoading}
      onRetryCatalog={() => {
        void catalogQuery.refetch()
      }}
    />
  )
}

function PlanRulesEditor({
  trainerUserId,
  initialPolicy,
  exercises,
  catalogError,
  catalogLoading,
  onRetryCatalog,
}: {
  trainerUserId: string
  initialPolicy: GenerationPolicy
  exercises: TrainerExercise[]
  catalogError: unknown
  catalogLoading: boolean
  onRetryCatalog: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(initialPolicy)
  const [savedPolicy, setSavedPolicy] = useState(initialPolicy)
  const [pairLeft, setPairLeft] = useState('')
  const [pairRight, setPairRight] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<(typeof GOALS)[number]['value']>('maintenance')
  const isDirty = isGenerationPolicyDirty(savedPolicy, draft)
  const activePreset = matchingGenerationPreset(draft)

  const saveMutation = useMutation({
    mutationFn: async (payload: GenerationPolicy) => upsertTrainerGenerationPolicy(trainerUserId, payload),
    onSuccess: (saved) => {
      const normalized = normalizeGenerationPolicy(saved)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plans.trainerGenerationPolicy(trainerUserId),
      })
      setSavedPolicy(normalized)
      setDraft(normalized)
      setErrorText(null)
      setMessage('Сохранено. Новые планы для клиентов уже учитывают эти правила.')
    },
    onError: (error) => {
      setMessage(null)
      setErrorText(getUserErrorMessage(error, 'Не удалось сохранить. Попробуйте ещё раз.'))
    },
  })

  useUnsavedChangesGuard(isDirty && !saveMutation.isPending)

  const exerciseName = new Map(exercises.map((item) => [item.row_id, item.exercise_name]))

  function updateSplit(goal: string, level: string, categories: string[]) {
    const key = splitKey(goal, level)
    setDraft((current) => {
      const nextSplits = { ...current.default_splits }
      const normalized = categories.filter((item): item is CategoryValue =>
        CATEGORIES.some((category) => category.value === item),
      )
      if (normalized.length === 0) {
        delete nextSplits[key]
      } else {
        nextSplits[key] = normalized
      }
      return { ...current, default_splits: nextSplits }
    })
  }

  function setWorkouts(level: string, next: number) {
    setDraft((current) => ({
      ...current,
      default_workouts_per_week: {
        ...current.default_workouts_per_week,
        [level]: next,
      },
    }))
  }

  function setSessionBound(slot: string, edge: 'min' | 'max', next: number) {
    setDraft((current) => {
      const currentBounds = current.exercises_per_session[slot] ?? DEFAULT_SESSION_BOUNDS[slot] ?? { min: 1, max: 1 }
      const min = edge === 'min' ? next : Math.min(currentBounds.min, next)
      const max = edge === 'max' ? next : Math.max(currentBounds.max, next)
      return {
        ...current,
        exercises_per_session: {
          ...current.exercises_per_session,
          [slot]: { min, max },
        },
      }
    })
  }

  function applyPreset(presetId: GenerationPresetId) {
    setDraft((current) => applyGenerationPreset(current, presetId))
  }

  const selectedGoalLabel = GOALS.find((item) => item.value === selectedGoal)?.label ?? selectedGoal

  return (
    <section className="space-y-5 pb-40 md:pb-0">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">{PAGE_TITLE}</h1>
          <p className="mt-1 max-w-3xl text-sm text-secondary-foreground sm:text-base">
            Здесь задаётся, как генератор собирает новые планы: сколько тренировок в неделю и сколько
            упражнений в одной тренировке.
          </p>
        </div>
        <ThemeToggle className="md:hidden" />
      </header>

      {errorText ? (
        <p role="alert" className="text-sm text-destructive">
          {errorText}
        </p>
      ) : message && !isDirty ? (
        <p role="status" className="text-sm text-secondary-foreground">
          {message}
        </p>
      ) : null}

      <article className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Готовый набор</h2>
          <p className="mt-1 text-sm text-secondary-foreground">Набор подставляет числа. Каждое можно поправить ниже.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Готовые наборы">
          {GENERATION_PRESET_ORDER.map((presetId) => (
            <Chip key={presetId} active={activePreset === presetId} aria-pressed={activePreset === presetId} onClick={() => applyPreset(presetId)}>
              {GENERATION_PRESETS[presetId].label}
            </Chip>
          ))}
        </div>
        <p className="text-[17px]" aria-live="polite">
          {beginnerGeneratorExample(draft)}
        </p>
      </article>

      <article className="space-y-2 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Сколько тренировок в неделю</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Сколько тренировок в неделю вы ставите клиентам.
          </p>
        </div>
        {LEVELS.map((level) => (
          <Stepper
            key={level.value}
            label={level.label}
            min={1}
            max={7}
            value={draft.default_workouts_per_week[level.value] ?? 3}
            onChange={(next) => setWorkouts(level.value, next)}
          />
        ))}
      </article>

      <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Сколько упражнений в тренировке</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Сколько упражнений ставить в одну тренировку: от и до. Для первого плана можно задать отдельные рамки.
          </p>
        </div>
        {SESSION_SLOTS.map((slot) => {
          const bounds = draft.exercises_per_session[slot.value] ?? DEFAULT_SESSION_BOUNDS[slot.value]
          return (
            <div key={slot.value} className="rounded-xl border border-border bg-background px-3">
              <div className="pt-3 text-sm font-medium">{slot.label}</div>
              <Stepper
                label="Минимум"
                min={1}
                max={12}
                value={bounds.min}
                onChange={(next) => setSessionBound(slot.value, 'min', next)}
              />
              <Stepper
                label="Максимум"
                min={1}
                max={12}
                value={bounds.max}
                onChange={(next) => setSessionBound(slot.value, 'max', next)}
              />
            </div>
          )
        })}
      </article>

      {catalogError ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить каталог упражнений."
          onRetry={onRetryCatalog}
        >
          {null}
        </QueryState>
      ) : null}

      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-border bg-card px-4 text-left text-[17px] font-semibold"
        aria-expanded={advancedOpen}
        onClick={() => setAdvancedOpen((current) => !current)}
      >
        Дополнительно
        <span aria-hidden>{advancedOpen ? '▴' : '▾'}</span>
      </button>

      {advancedOpen ? (
        <>
          <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-medium sm:text-xl">Какие зоны тела в какие дни</h2>
              <p className="mt-1 text-sm text-secondary-foreground">
                Для каждой цели и уровня соберите порядок тренировочных дней. Например: Верх → Низ → Всё тело.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  className={[
                    'inline-flex h-12 items-center rounded-full px-4 text-[15px] font-semibold transition',
                    selectedGoal === goal.value
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background hover:bg-secondary/70',
                  ].join(' ')}
                  onClick={() => setSelectedGoal(goal.value)}
                >
                  {goal.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-secondary-foreground">Цель: {selectedGoalLabel}</h3>
              {LEVELS.map((level) => {
                const key = splitKey(selectedGoal, level.value)
                const categories = draft.default_splits[key] ?? []
                return (
                  <div key={key} className="rounded-xl border border-border bg-background p-4">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-secondary-foreground">
                        {categories.length > 0
                          ? `${categories.length} ${categories.length === 1 ? 'день' : 'дней'} в неделе`
                          : 'автоматический порядок'}
                      </div>
                    </div>
                    <SplitEditor categories={categories} onChange={(next) => updateSplit(selectedGoal, level.value, next)} />
                  </div>
                )
              })}
            </div>
          </article>

          <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-medium sm:text-xl">Что не ставить вместе</h2>
              <p className="mt-1 text-sm text-secondary-foreground">
                Выберите два упражнения, которые не должны оказаться в одной тренировке.
              </p>
            </div>
            {catalogLoading ? <p className="text-sm text-secondary-foreground">Загружаем каталог…</p> : null}
            {catalogError ? null : (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <select
                  className="w-full flex-1 rounded-xl border border-border bg-background px-3 py-2"
                  value={pairLeft}
                  onChange={(event) => setPairLeft(event.target.value)}
                >
                  <option value="">Первое упражнение</option>
                  {exercises.map((item) => (
                    <option key={item.row_id} value={item.row_id}>
                      {item.exercise_name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full flex-1 rounded-xl border border-border bg-background px-3 py-2"
                  value={pairRight}
                  onChange={(event) => setPairRight(event.target.value)}
                >
                  <option value="">Второе упражнение</option>
                  {exercises.map((item) => (
                    <option key={item.row_id} value={item.row_id}>
                      {item.exercise_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-4"
                  onClick={() => {
                    if (!pairLeft || !pairRight || pairLeft === pairRight) return
                    setDraft((current) => {
                      const exists = current.excluded_pairs.some(
                        ([left, right]) =>
                          (left === pairLeft && right === pairRight) || (left === pairRight && right === pairLeft),
                      )
                      if (exists) return current
                      return {
                        ...current,
                        excluded_pairs: [...current.excluded_pairs, [pairLeft, pairRight]],
                      }
                    })
                    setPairLeft('')
                    setPairRight('')
                  }}
                >
                  Добавить запрет
                </button>
              </div>
            )}
            <ul className="space-y-2 text-sm">
              {draft.excluded_pairs.length === 0 ? (
                <li className="text-secondary-foreground">Запретов пока нет — можно ставить любые упражнения вместе.</li>
              ) : (
                draft.excluded_pairs.map(([left, right]) => (
                  <li
                    key={`${left}-${right}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span>
                      {exerciseName.get(left) ?? 'Упражнение'} и {exerciseName.get(right) ?? 'упражнение'}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-12 items-center px-3 text-[15px] font-semibold text-destructive"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          excluded_pairs: current.excluded_pairs.filter(
                            (pair) => !(pair[0] === left && pair[1] === right),
                          ),
                        }))
                      }
                    >
                      Убрать
                    </button>
                  </li>
                ))
              )}
            </ul>
          </article>
        </>
      ) : null}

      <StickySaveBar ariaLabel="Сохранение правил">
        <div className="flex items-center gap-3">
          <span className={isDirty ? 'text-sm font-medium' : 'text-sm text-secondary-foreground'} aria-live="polite">
            {isDirty ? 'Есть изменения' : 'Нет изменений'}
          </span>
          <Button
            type="button"
            size="lg"
            className="ml-auto min-h-11 flex-1 md:flex-none"
            disabled={saveMutation.isPending || !isDirty}
            onClick={() => {
              setMessage(null)
              saveMutation.mutate(draft)
            }}
          >
            {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить правила'}
          </Button>
        </div>
      </StickySaveBar>
    </section>
  )
}
