import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { listTrainerExercises, queryKeys } from '../../api'
import { APP_PATHS } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useUnsavedChangesGuard } from '../../hooks/use-unsaved-changes-guard'
import { useManualPlan } from '../../hooks/use-manual-plan'
import { useClientLoads, usePlans } from '../../hooks/use-plans'
import { useProfile } from '../../hooks/use-profile'
import { useTrainerRelations } from '../../hooks/use-relations'
import { formatMonthDay, localTodayIso } from '../../lib/dates'
import { formatEquipmentLabel } from '../../lib/equipment'
import { formatWeekday, formatWeekdayShort } from '../../lib/plan-formatters'
import {
  copyDayDraft,
  copyWeekDraft,
  dirtyDayIndexes,
  draftsFromPlan,
  formatDosage,
  type DayDraft,
  type DraftSlot,
} from '../../lib/plan-draft'
import { formatWorkoutCategory } from '../../lib/muscles'
import { clientDisplayName } from '../../lib/person'
import { lastCompletedDay } from '../../lib/roster'
import { isProfileCompleted } from '../../lib/profile-completion'
import type { TrainerExercise } from '../../types/exercise'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Chip,
  ExerciseThumb,
  OverflowMenu,
  Row,
  ScreenHeader,
  Sheet,
  Stepper,
  StickyActionBar,
  type OverflowItem,
} from '../ui/kit'
import { ClientProgress } from './ClientProgress'

type StudioScreen = 'plan' | 'progress' | 'add' | 'edit' | 'weights' | 'questionnaire'
type Picker = 'none' | 'copy-day' | 'copy-week'

const MUSCLE_CHIPS = [
  { id: 'all', label: 'Все' },
  { id: 'chest', label: 'Грудь' },
  { id: 'back', label: 'Спина' },
  { id: 'legs', label: 'Ноги' },
  { id: 'shoulders', label: 'Плечи' },
  { id: 'arms', label: 'Руки' },
] as const

export function PlanStudio({ clientUserId, initialScreen }: { clientUserId: string; initialScreen: StudioScreen }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const todayIso = localTodayIso()
  const manual = useManualPlan(clientUserId, trainerUserId)
  const { activePlanQuery, generatePlanMutation } = usePlans(clientUserId)
  const { profileQuery, metaQuery } = useProfile(clientUserId)
  const { trainerClientsQuery, leaveRelationMutation, trainerFunnelQuery } = useTrainerRelations({ trainerUserId })
  const catalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    queryFn: async () => listTrainerExercises(trainerUserId, false),
    enabled: Boolean(trainerUserId),
  })

  const relation = (trainerClientsQuery.data ?? []).find((item) => item.client_user_id === clientUserId)
  const clientName = relation ? clientDisplayName(relation) : 'Клиент'
  const editablePlan = manual.planQuery.data
  const fallbackPlan = !manual.planQuery.isLoading && manual.isMissing ? activePlanQuery.data : undefined
  const plan = editablePlan ?? fallbackPlan
  const readOnly = !editablePlan && Boolean(fallbackPlan)

  const [stored, setStored] = useState<{ id: string; updatedAt: string; baseline: DayDraft[]; draft: DayDraft[] } | null>(null)
  const [screen, setScreen] = useState<StudioScreen>(initialScreen)
  const [week, setWeek] = useState<number | null>(null)
  const [dayIndex, setDayIndex] = useState<number | null>(null)
  const [lineKey, setLineKey] = useState<string | null>(null)
  const [picker, setPicker] = useState<Picker>('none')
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<(typeof MUSCLE_CHIPS)[number]['id']>('all')
  const [picked, setPicked] = useState<string[]>([])
  const [restOpen, setRestOpen] = useState(false)

  // Черновик сбрасывается, когда с сервера приходит другой план или новая версия.
  if (
    editablePlan &&
    (!stored || stored.id !== editablePlan.plan_id || stored.updatedAt !== editablePlan.updated_at)
  ) {
    const next = draftsFromPlan(editablePlan)
    setStored({ id: editablePlan.plan_id, updatedAt: editablePlan.updated_at, baseline: next, draft: next })
    setWeek(next[0]?.week ?? null)
    setDayIndex(next[0]?.dayIndex ?? null)
  }

  const draft = stored?.draft ?? []
  const baseline = stored?.baseline ?? []
  const dirty = stored ? dirtyDayIndexes(baseline, draft) : []
  const isDirty = dirty.length > 0
  useUnsavedChangesGuard(isDirty && !manual.saveMutation.isPending)

  const weeks = [...new Set(draft.map((day) => day.week))]
  const activeWeek = week ?? weeks[0] ?? 1
  const weekDays = draft.filter((day) => day.week === activeWeek)
  const selectedDay = draft.find((day) => day.dayIndex === dayIndex) ?? weekDays[0] ?? null
  const catalog = (catalogQuery.data ?? []).filter((item) => item.is_active)
  const media = useMemo(() => new Map(catalog.map((item) => [item.row_id, item])), [catalog])

  const goBack = () => {
    if (screen !== 'plan') {
      setScreen('plan')
      return
    }
    navigate(APP_PATHS.clients)
  }

  const updateDay = (index: number, recipe: (day: DayDraft) => DayDraft) => {
    setStored((current) => {
      if (!current) return current
      return { ...current, draft: current.draft.map((day) => (day.dayIndex === index ? recipe(day) : day)) }
    })
  }

  const save = () => {
    if (!stored) return
    const payload = stored.draft.filter((day) => dirty.includes(day.dayIndex))
    manual.saveMutation.mutate(payload)
  }

  const assemble = () => {
    const profile = profileQuery.data
    if (!profile || !isProfileCompleted(profile)) {
      window.alert('Сначала нужна заполненная анкета клиента.')
      return
    }
    if (plan && !window.confirm('Собрать из каталога? Текущий план будет заменён.')) return
    generatePlanMutation.mutate(
      {
        source: 'trainer',
        trainer_user_id: trainerUserId,
        user_id: clientUserId,
        goal: profile.goal ?? 'maintenance',
        level: profile.experience_level ?? 'intermediate',
        workout_location: profile.workout_location ?? 'both',
        unavailable_equipment: profile.unavailable_equipment ?? [],
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.plans.trainerClientPlan(clientUserId, trainerUserId),
          })
        },
      },
    )
  }

  const menuItems: OverflowItem[] = [
    { id: 'copy-day', label: 'Копировать день', onSelect: () => setPicker('copy-day') },
    { id: 'copy-week', label: 'Копировать неделю', onSelect: () => setPicker('copy-week') },
    {
      id: 'assemble',
      label: 'Собрать из каталога',
      hint: 'Заменит текущий план',
      hintTone: 'danger',
      onSelect: assemble,
    },
    { id: 'rules', label: 'Настройки плана', onSelect: () => navigate(APP_PATHS.planRules) },
    { id: 'weights', label: 'Рабочие веса', onSelect: () => setScreen('weights') },
    { id: 'profile', label: 'Анкета', onSelect: () => setScreen('questionnaire') },
    {
      id: 'leave',
      label: 'Завершить сопровождение',
      hintTone: 'danger',
      onSelect: () => {
        if (!relation) return
        if (!window.confirm('Завершить сопровождение этого клиента?')) return
        leaveRelationMutation.mutate({ relationId: relation.relation_id }, { onSuccess: () => navigate(APP_PATHS.clients) })
      },
    },
  ]

  if (manual.planQuery.isLoading || (manual.isMissing && activePlanQuery.isLoading)) {
    return <p className="py-8 text-[17px]">Загрузка…</p>
  }

  if (manual.planQuery.isError && !manual.isMissing) {
    return (
      <div className="space-y-4 py-6">
        <p className="text-[17px]">Не удалось загрузить план.</p>
        <Button type="button" variant="secondary" onClick={() => void manual.planQuery.refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  if (screen === 'progress') {
    return (
      <ClientProgress
        name={clientName}
        plan={plan ?? null}
        todayIso={todayIso}
        funnel={trainerFunnelQuery.data}
        onBack={() => setScreen('plan')}
        onWrite={() => navigate(`${APP_PATHS.messages}?peerUserId=${encodeURIComponent(clientUserId)}`)}
      />
    )
  }

  if (screen === 'add' && selectedDay) {
    return (
      <AddExerciseScreen
        dayLabel={formatWeekdayShort(selectedDay.dayOfWeek)}
        catalog={catalog}
        search={search}
        muscle={muscle}
        picked={picked}
        onSearch={setSearch}
        onMuscle={setMuscle}
        onToggle={(rowId) =>
          setPicked((current) => (current.includes(rowId) ? current.filter((item) => item !== rowId) : [...current, rowId]))
        }
        onBack={() => setScreen('plan')}
        onDone={() => {
          const chosen = catalog.filter((item) => picked.includes(item.row_id))
          updateDay(selectedDay.dayIndex, (day) => ({
            ...day,
            slots: [
              ...day.slots,
              ...chosen.map((exercise, index) => slotFromCatalog(exercise, `${day.dayIndex}-${day.slots.length + index}`)),
            ],
          }))
          setPicked([])
          setScreen('plan')
        }}
      />
    )
  }

  if (screen === 'edit' && selectedDay) {
    const slot = selectedDay.slots.find((item) => item.key === lineKey)
    if (!slot) {
      return (
        <ScreenHeader title={formatWeekdayShort(selectedDay.dayOfWeek)} onBack={() => setScreen('plan')} />
      )
    }
    return (
      <EditSlotScreen
        dayLabel={formatWeekday(selectedDay.dayOfWeek)}
        slot={slot}
        media={media.get(slot.exerciseId)}
        restOpen={restOpen}
        onToggleRest={() => setRestOpen((current) => !current)}
        onChange={(next) =>
          updateDay(selectedDay.dayIndex, (day) => ({
            ...day,
            slots: day.slots.map((item) => (item.key === slot.key ? next : item)),
          }))
        }
        onDelete={() => {
          updateDay(selectedDay.dayIndex, (day) => ({ ...day, slots: day.slots.filter((item) => item.key !== slot.key) }))
          setScreen('plan')
        }}
        onBack={() => setScreen('plan')}
      />
    )
  }

  if (screen === 'weights') {
    return <WeightsScreen clientUserId={clientUserId} trainerUserId={trainerUserId} catalog={catalog} onBack={() => setScreen('plan')} />
  }

  if (screen === 'questionnaire') {
    return (
      <QuestionnaireScreen
        name={clientName}
        profile={profileQuery.data}
        meta={metaQuery.data}
        onBack={() => setScreen('plan')}
      />
    )
  }

  const last = plan ? lastCompletedDay(plan) : null
  const weekMarks = weekDays

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title={clientName} onBack={goBack} menu={<OverflowMenu items={readOnly ? menuItems.filter((item) => item.id !== 'copy-day' && item.id !== 'copy-week') : menuItems} />} />
      <div className="mt-4 flex items-center justify-between gap-3 text-[15px]">
        <span>{last ? `Последняя тренировка: ${formatWeekdayShort(last.day_of_week).toLowerCase()}, ${formatMonthDay(last.scheduled_for)}` : 'Тренировок пока нет'}</span>
        <button type="button" className="font-semibold underline" onClick={() => setScreen('progress')}>
          Прогресс
        </button>
      </div>
      {readOnly ? <p className="mt-3 text-[15px] text-secondary-foreground">Этот план нельзя править по слотам. Собрать новый можно из меню.</p> : null}
      {weekMarks.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[13px] font-semibold">
          {weekMarks.map((day) => {
            const missed = day.scheduledFor < todayIso && !day.isCompleted
            return (
              <div key={day.dayId}>
                <div>{formatWeekdayShort(day.dayOfWeek)}</div>
                <div className={`mt-1 flex h-12 items-center justify-center rounded-xl border-2 ${missed ? 'border-destructive text-destructive' : day.isCompleted ? 'border-foreground bg-foreground text-background' : 'border-foreground'}`}>
                  {day.isCompleted ? '✓' : missed ? '×' : ''}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {weeks.length > 1 ? (
        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-foreground">
          {weeks.map((item) => (
            <button
              key={item}
              type="button"
              className={`h-12 text-[17px] font-semibold ${item === activeWeek ? 'bg-foreground text-background' : ''}`}
              onClick={() => {
                setWeek(item)
                const first = draft.find((day) => day.week === item)
                if (first) setDayIndex(first.dayIndex)
              }}
            >
              Неделя {item}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {weekDays.map((day) => (
          <Chip key={day.dayId} active={selectedDay?.dayId === day.dayId} onClick={() => setDayIndex(day.dayIndex)}>
            {formatWeekdayShort(day.dayOfWeek)}
          </Chip>
        ))}
      </div>

      {!plan ? (
        <div className="px-1 py-10 text-center">
          <p className="text-[22px] font-bold">Плана ещё нет</p>
          <p className="mt-2 text-[17px] text-secondary-foreground">Соберите программу из каталога.</p>
        </div>
      ) : null}

      <div className="mt-2">
        {selectedDay?.slots.map((slot) => {
          const exercise = media.get(slot.exerciseId)
          return (
            <Row
              key={slot.key}
              title={slot.exerciseName}
              subtitle={formatDosage(slot)}
              leading={<ExerciseThumb imageUrl={exercise?.start_image_url} hasVideo={Boolean(exercise?.video_url)} />}
              onClick={
                readOnly
                  ? undefined
                  : () => {
                      setLineKey(slot.key)
                      setRestOpen(false)
                      setScreen('edit')
                    }
              }
            />
          )
        })}
      </div>

      {!readOnly && selectedDay ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => {
            setSearch('')
            setMuscle('all')
            setPicked([])
            setScreen('add')
          }}
        >
          + Добавить упражнение
        </Button>
      ) : null}

      {!readOnly && selectedDay ? (
        <StickyActionBar>
          <Button type="button" size="lg" className="w-full" disabled={!isDirty || manual.saveMutation.isPending} onClick={save}>
            {manual.saveMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </StickyActionBar>
      ) : null}
      {!plan ? (
        <StickyActionBar>
          <Button type="button" size="lg" className="w-full" disabled={generatePlanMutation.isPending} onClick={assemble}>
            {generatePlanMutation.isPending ? 'Собираем…' : 'Собрать из каталога'}
          </Button>
        </StickyActionBar>
      ) : null}

      {picker !== 'none' && selectedDay ? (
        <Sheet title={picker === 'copy-day' ? 'Куда скопировать день' : 'Куда скопировать неделю'} onClose={() => setPicker('none')}>
          <div className="grid gap-2">
            {picker === 'copy-day'
              ? draft
                  .filter((day) => day.dayIndex !== selectedDay.dayIndex)
                  .map((day) => (
                    <Button
                      key={day.dayId}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setStored((current) =>
                          current ? { ...current, draft: copyDayDraft(current.draft, selectedDay.dayIndex, day.dayIndex) } : current,
                        )
                        setPicker('none')
                      }}
                    >
                      Неделя {day.week} · {formatWeekdayShort(day.dayOfWeek)}
                    </Button>
                  ))
              : weeks
                  .filter((item) => item !== activeWeek)
                  .map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setStored((current) => (current ? { ...current, draft: copyWeekDraft(current.draft, activeWeek, item) } : current))
                        setPicker('none')
                      }}
                    >
                      Неделя {item}
                    </Button>
                  ))}
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}

function slotFromCatalog(exercise: TrainerExercise, suffix: string): DraftSlot {
  return {
    key: `new-${exercise.row_id}-${suffix}`,
    exerciseId: exercise.row_id,
    exerciseName: exercise.exercise_name,
    sets: exercise.default_sets > 0 ? exercise.default_sets : 1,
    reps: exercise.default_reps,
    durationSeconds: exercise.default_duration_seconds,
    restSeconds: exercise.default_rest_seconds,
    weightKg: exercise.default_weight_kg,
  }
}

function muscleBucket(exercise: TrainerExercise): string {
  const muscles = exercise.primary_muscles.join(' ')
  if (/chest|pector/.test(muscles)) return 'chest'
  if (/lat|trap|rhomb|lower_back|teres/.test(muscles)) return 'back'
  if (/quad|hamstring|glute|calv|adductor|abductor/.test(muscles)) return 'legs'
  if (/delt/.test(muscles)) return 'shoulders'
  if (/bicep|tricep|forearm|brach/.test(muscles)) return 'arms'
  if (exercise.workout_category === 'lower') return 'legs'
  if (exercise.workout_category === 'core') return 'arms'
  return 'chest'
}

const GROUP_LABEL: Record<string, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
}

function AddExerciseScreen({
  dayLabel,
  catalog,
  search,
  muscle,
  picked,
  onSearch,
  onMuscle,
  onToggle,
  onBack,
  onDone,
}: {
  dayLabel: string
  catalog: TrainerExercise[]
  search: string
  muscle: (typeof MUSCLE_CHIPS)[number]['id']
  picked: string[]
  onSearch: (value: string) => void
  onMuscle: (value: (typeof MUSCLE_CHIPS)[number]['id']) => void
  onToggle: (rowId: string) => void
  onBack: () => void
  onDone: () => void
}) {
  const query = search.trim().toLocaleLowerCase('ru-RU')
  const visible = catalog.filter((exercise) => {
    const matchesMuscle = muscle === 'all' || muscleBucket(exercise) === muscle
    const matchesQuery = !query || exercise.exercise_name.toLocaleLowerCase('ru-RU').includes(query)
    return matchesMuscle && matchesQuery
  })
  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title={`Добавить в ${dayLabel}`} onBack={onBack} />
      <div className="mt-4">
        <Input value={search} aria-label="Поиск упражнения" placeholder="Поиск" onChange={(event) => onSearch(event.target.value)} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {MUSCLE_CHIPS.map((item) => (
          <Chip key={item.id} active={muscle === item.id} onClick={() => onMuscle(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2">
        {visible.map((exercise) => {
          const selected = picked.includes(exercise.row_id)
          const group = GROUP_LABEL[muscleBucket(exercise)] ?? formatWorkoutCategory(exercise.workout_category)
          return (
            <Row
              key={exercise.row_id}
              title={exercise.exercise_name}
              subtitle={`${group} · ${formatEquipmentLabel(exercise.equipment).toLowerCase()}`}
              leading={<ExerciseThumb imageUrl={exercise.start_image_url} hasVideo={Boolean(exercise.video_url)} />}
              trailing={
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground ${selected ? 'bg-foreground text-background' : ''}`}>
                  {selected ? '✓' : '+'}
                </span>
              }
              onClick={() => onToggle(exercise.row_id)}
            />
          )
        })}
      </div>
      <StickyActionBar>
        <Button type="button" size="lg" className="w-full bg-foreground text-background" onClick={onDone}>
          Готово · добавлено {picked.length}
        </Button>
      </StickyActionBar>
    </div>
  )
}

function EditSlotScreen({
  dayLabel,
  slot,
  media,
  restOpen,
  onToggleRest,
  onChange,
  onDelete,
  onBack,
}: {
  dayLabel: string
  slot: DraftSlot
  media?: TrainerExercise
  restOpen: boolean
  onToggleRest: () => void
  onChange: (next: DraftSlot) => void
  onDelete: () => void
  onBack: () => void
}) {
  const hold = Boolean(slot.durationSeconds && slot.durationSeconds > 0 && !slot.reps)
  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title={dayLabel} onBack={onBack} />
      <h2 className="mt-4 text-[28px] font-bold">{slot.exerciseName}</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <ExerciseThumb imageUrl={media?.video_url ? null : media?.start_image_url} hasVideo={Boolean(media?.video_url)} />
        <span className="flex h-24 items-end justify-center rounded-xl bg-[#e5e5e5] pb-2 text-[13px]">Старт</span>
        <span className="flex h-24 items-end justify-center rounded-xl bg-[#e5e5e5] pb-2 text-[13px]">Финиш</span>
      </div>
      {media ? (
        <a className="mt-2 inline-flex text-[15px] underline" href={`/exercises/${encodeURIComponent(media.row_id)}`}>
          Изменить фото и видео
        </a>
      ) : null}
      {media?.start_image_url ? (
        <img src={media.start_image_url} alt="Старт" className="mt-3 hidden" />
      ) : null}
      <div className="mt-4 divide-y divide-border">
        <Stepper label="Подходы" value={slot.sets} min={1} max={10} onChange={(sets) => onChange({ ...slot, sets })} />
        {hold ? (
          <Stepper
            label="Секунды"
            value={slot.durationSeconds ?? 30}
            min={5}
            max={600}
            step={5}
            onChange={(durationSeconds) => onChange({ ...slot, durationSeconds, reps: null })}
          />
        ) : (
          <Stepper
            label="Повторы"
            value={slot.reps ?? 1}
            min={1}
            max={100}
            onChange={(reps) => onChange({ ...slot, reps, durationSeconds: null })}
          />
        )}
        <Stepper
          label="Вес, кг"
          value={slot.weightKg ?? 0}
          min={0}
          max={500}
          step={2.5}
          onChange={(weightKg) => onChange({ ...slot, weightKg })}
        />
      </div>
      <button type="button" className="mt-2 flex min-h-12 w-full items-center justify-between text-[17px]" onClick={onToggleRest}>
        <span>Ещё: отдых {slot.restSeconds ?? 0} с</span>
        <span>{restOpen ? '▴' : '▾'}</span>
      </button>
      {restOpen ? (
        <Stepper
          label="Отдых, с"
          value={slot.restSeconds ?? 0}
          min={0}
          max={600}
          step={15}
          onChange={(restSeconds) => onChange({ ...slot, restSeconds })}
        />
      ) : null}
      <Button type="button" variant="destructive" className="mt-6 w-full" onClick={onDelete}>
        Удалить из плана
      </Button>
      <StickyActionBar>
        <Button type="button" size="lg" className="w-full" onClick={onBack}>
          Готово
        </Button>
      </StickyActionBar>
    </div>
  )
}

function WeightsScreen({
  clientUserId,
  trainerUserId,
  catalog,
  onBack,
}: {
  clientUserId: string
  trainerUserId: string
  catalog: TrainerExercise[]
  onBack: () => void
}) {
  const { loadsQuery, upsertLoadMutation } = useClientLoads(clientUserId, trainerUserId)
  const weighted = catalog.filter((item) => item.default_weight_kg != null && item.default_weight_kg > 0)
  const loads = new Map((loadsQuery.data ?? []).map((item) => [item.exercise_row_id, item.working_weight_kg]))
  const [draft, setDraft] = useState<Record<string, string>>({})
  return (
    <div className="mx-auto w-full max-w-lg">
      <ScreenHeader title="Рабочие веса" onBack={onBack} />
      {weighted.map((exercise) => (
        <div key={exercise.row_id} className="flex min-h-16 items-center gap-3 border-b border-border py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold">{exercise.exercise_name}</div>
            <div className="text-[15px] text-secondary-foreground">Сейчас {loads.get(exercise.row_id) ?? '—'} кг</div>
          </div>
          <Input
            className="h-12 w-24"
            inputMode="decimal"
            aria-label={`Вес ${exercise.exercise_name}`}
            value={draft[exercise.row_id] ?? ''}
            onChange={(event) => setDraft((current) => ({ ...current, [exercise.row_id]: event.target.value }))}
          />
          <Button
            type="button"
            className="h-12 px-3"
            disabled={upsertLoadMutation.isPending}
            onClick={() => {
              const value = Number((draft[exercise.row_id] ?? '').replace(',', '.'))
              if (!Number.isFinite(value) || value < 0) return
              upsertLoadMutation.mutate({ exerciseRowId: exercise.row_id, payload: { working_weight_kg: value } })
            }}
          >
            Ок
          </Button>
        </div>
      ))}
      {weighted.length === 0 ? <p className="py-6 text-[17px]">В каталоге нет упражнений с весом.</p> : null}
    </div>
  )
}

function QuestionnaireScreen({
  name,
  profile,
  meta,
  onBack,
}: {
  name: string
  profile: ReturnType<typeof useProfile>['profileQuery']['data']
  meta: ReturnType<typeof useProfile>['metaQuery']['data']
  onBack: () => void
}) {
  const label = (options: { value: string; label: string }[] | undefined, value: string | null | undefined) =>
    options?.find((item) => item.value === value)?.label ?? value ?? 'Не указано'
  const rows = [
    ['Имя', profile?.full_name || name],
    ['Возраст', profile?.age != null ? String(profile.age) : 'Не указано'],
    ['Пол', label(meta?.genders, profile?.gender)],
    ['Цель', label(meta?.goals, profile?.goal)],
    ['Уровень', label(meta?.levels, profile?.experience_level)],
    ['Место', label(meta?.workout_locations, profile?.workout_location)],
    ['Ограничения', profile?.limitations?.trim() || 'Не указано'],
  ]
  return (
    <div className="mx-auto w-full max-w-lg">
      <ScreenHeader title="Анкета" onBack={onBack} />
      {rows.map(([title, value]) => (
        <div key={title} className="flex min-h-16 items-center justify-between gap-3 border-b border-border">
          <span className="text-[17px]">{title}</span>
          <span className="text-right text-[17px] font-semibold">{value}</span>
        </div>
      ))}
    </div>
  )
}
