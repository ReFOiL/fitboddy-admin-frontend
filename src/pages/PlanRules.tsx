import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getTrainerGenerationPolicy, upsertTrainerGenerationPolicy } from '../api/plans'
import { listTrainerExercises } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../hooks/use-auth'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import {
  clampBoundedInt,
  DEFAULT_SESSION_BOUNDS,
  isGenerationPolicyDirty,
  normalizeGenerationPolicy,
} from '../lib/generation-policy'
import { getUserErrorMessage } from '../lib/user-error-message'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { StickySaveBar } from '../components/plan/StickySaveBar'
import type { TrainerExercise } from '../types/exercise'
import type { GenerationPolicy } from '../types/generation-policy'

const CATEGORIES = [
  { value: 'full_body', label: 'Всё тело' },
  { value: 'upper', label: 'Верх' },
  { value: 'lower', label: 'Низ' },
  { value: 'core', label: 'Кор' },
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
            className="rounded-full border border-border bg-card px-3 py-1 text-sm hover:bg-secondary"
            onClick={() => onChange([...categories, category.value])}
          >
            + {category.label}
          </button>
        ))}
        {categories.length > 0 ? (
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1 text-sm text-secondary-foreground hover:bg-secondary/70"
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
                className="text-secondary-foreground hover:text-destructive"
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
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[28px] font-bold">Настройки плана</h1>
          <ThemeToggle className="md:hidden" />
        </div>
        <p className="text-secondary-foreground">Нужно войти как тренер.</p>
      </section>
    )
  }

  if (policyQuery.isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[28px] font-bold">Настройки плана</h1>
          <ThemeToggle className="md:hidden" />
        </div>
        <p className="text-secondary-foreground">Загрузка…</p>
      </section>
    )
  }

  if (policyQuery.isError || !policyQuery.data) {
    return (
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[28px] font-bold">Настройки плана</h1>
          <ThemeToggle className="md:hidden" />
        </div>
        <p className="text-destructive">Не удалось загрузить. Попробуй ещё раз.</p>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2"
          onClick={() => void policyQuery.refetch()}
        >
          Повторить
        </button>
      </section>
    )
  }

  const exercises = (Array.isArray(catalogQuery.data) ? catalogQuery.data : []).filter(
    (item) => item.is_active,
  )

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
  const [selectedGoal, setSelectedGoal] = useState<(typeof GOALS)[number]['value']>('maintenance')
  const isDirty = isGenerationPolicyDirty(savedPolicy, draft)

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
      setErrorText(getUserErrorMessage(error, 'Не удалось сохранить. Попробуй ещё раз.'))
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

  const selectedGoalLabel = GOALS.find((item) => item.value === selectedGoal)?.label ?? selectedGoal

  return (
    <section className="space-y-5 pb-40 md:pb-0">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">Настройки плана</h1>
          <p className="mt-1 max-w-3xl text-sm text-secondary-foreground sm:text-base">
            Здесь задаётся, как собираются планы для ваших клиентов: сколько тренировок в неделю, какие
            зоны тела в какие дни и какие упражнения нельзя ставить рядом.
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

      <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Сколько тренировок в неделю</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Базовое число дней. Потом генератор может чуть увеличить или уменьшить его по adherence
            прошлого цикла.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <label key={level.value} className="space-y-1 text-sm">
              <span className="font-medium">{level.label}</span>
              <input
                type="number"
                min={1}
                max={7}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={draft.default_workouts_per_week[level.value] ?? 3}
                onChange={(event) => {
                  const next = clampBoundedInt(event.target.value, 1, 7, 3)
                  setDraft((current) => ({
                    ...current,
                    default_workouts_per_week: {
                      ...current.default_workouts_per_week,
                      [level.value]: next,
                    },
                  }))
                }}
              />
              <span className="text-xs text-secondary-foreground">дней в неделю</span>
            </label>
          ))}
        </div>
      </article>

      <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Сколько упражнений в тренировке</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Диапазон min–max: генератор выбирает число внутри него для каждой сессии. Для первого плана
            можно задать отдельные рамки по уровню и для цели «восстановление».
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SESSION_SLOTS.map((slot) => {
            const bounds = draft.exercises_per_session[slot.value] ?? DEFAULT_SESSION_BOUNDS[slot.value]
            return (
              <div key={slot.value} className="rounded-xl border border-border bg-background p-3">
                <div className="mb-2 text-sm font-medium">{slot.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-secondary-foreground">минимум</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                      value={bounds.min}
                      onChange={(event) => {
                        const raw = event.target.value
                        setDraft((current) => {
                          const currentBounds =
                            current.exercises_per_session[slot.value] ?? DEFAULT_SESSION_BOUNDS[slot.value]
                          const min = clampBoundedInt(raw, 1, 12, currentBounds.min)
                          return {
                            ...current,
                            exercises_per_session: {
                              ...current.exercises_per_session,
                              [slot.value]: {
                                min,
                                max: Math.max(min, currentBounds.max),
                              },
                            },
                          }
                        })
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-secondary-foreground">максимум</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                      value={bounds.max}
                      onChange={(event) => {
                        const raw = event.target.value
                        setDraft((current) => {
                          const currentBounds =
                            current.exercises_per_session[slot.value] ?? DEFAULT_SESSION_BOUNDS[slot.value]
                          const max = clampBoundedInt(raw, 1, 12, currentBounds.max)
                          return {
                            ...current,
                            exercises_per_session: {
                              ...current.exercises_per_session,
                              [slot.value]: {
                                min: Math.min(currentBounds.min, max),
                                max,
                              },
                            },
                          }
                        })
                      }}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </article>

      <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Какие зоны тела в какие дни</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Для каждой цели и уровня собери порядок тренировочных дней. Например: Верх → Низ → Всё
            тело.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              className={[
                'rounded-full px-3 py-1.5 text-sm transition',
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
                <SplitEditor
                  categories={categories}
                  onChange={(next) => updateSplit(selectedGoal, level.value, next)}
                />
              </div>
            )
          })}
        </div>
      </article>

      <article className="space-y-4 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-medium sm:text-xl">Не ставить в один день</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Выбери два упражнения из своего каталога, которые нельзя давать вместе в одной
            тренировке.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {catalogError ? (
            <div role="alert" className="text-sm text-destructive">
              <p>{getUserErrorMessage(catalogError, 'Не удалось загрузить каталог упражнений.')}</p>
              <button type="button" className="mt-2 underline" onClick={onRetryCatalog}>
                Повторить
              </button>
            </div>
          ) : catalogLoading ? (
            <p className="text-sm text-secondary-foreground">Загружаем каталог…</p>
          ) : null}
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2"
            onClick={() => {
              if (!pairLeft || !pairRight || pairLeft === pairRight) return
              setDraft((current) => {
                const exists = current.excluded_pairs.some(
                  ([left, right]) =>
                    (left === pairLeft && right === pairRight) ||
                    (left === pairRight && right === pairLeft),
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
        <ul className="space-y-2 text-sm">
          {draft.excluded_pairs.length === 0 ? (
            <li className="text-secondary-foreground">
              Запретов пока нет — можно ставить любые упражнения вместе.
            </li>
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
                  className="text-destructive"
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

      <StickySaveBar ariaLabel="Сохранение правил">
        <div className="flex items-center gap-3">
          <span className={isDirty ? 'text-sm font-medium' : 'text-sm text-secondary-foreground'} aria-live="polite">
            {isDirty ? 'Есть изменения' : 'Сохранено'}
          </span>
          <button
            type="button"
            className="ml-auto inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-primary-foreground disabled:opacity-60 md:flex-none pb-[env(safe-area-inset-bottom)] md:pb-2.5"
            disabled={saveMutation.isPending || !isDirty}
            onClick={() => {
              setMessage(null)
              saveMutation.mutate(draft)
            }}
          >
            {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить правила'}
          </button>
        </div>
      </StickySaveBar>
    </section>
  )
}
