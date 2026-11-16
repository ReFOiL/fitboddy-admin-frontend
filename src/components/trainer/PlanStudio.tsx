import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { listTrainerExercises, queryKeys } from '../../api'
import { APP_PATHS } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useUnsavedChangesGuard } from '../../hooks/use-unsaved-changes-guard'
import { useManualPlan } from '../../hooks/use-manual-plan'
import { usePlans } from '../../hooks/use-plans'
import { useProfile } from '../../hooks/use-profile'
import { useTrainerRelations } from '../../hooks/use-relations'
import { formatCalendarDate, formatMonthDay, localTodayIso } from '../../lib/dates'
import { formatEquipmentLabel } from '../../lib/equipment'
import { assembleReplacementCopy } from '../../lib/plan-archive-copy'
import { formatWeekdayShort } from '../../lib/plan-formatters'
import { WEEKDAYS, weekdaySlots, type WeekdaySlot } from '../../lib/plan-weekday'
import { dirtyDayIndexes, draftsFromPlan, formatDosage, type DayDraft, type DraftSlot } from '../../lib/plan-draft'
import {
  isEmptyLeadInDay,
  isSamePlanStartChoice,
  planStartChoiceForSlots,
  planStartChoiceFromPlan,
  planStartRequest,
  type PlanStartChoice,
} from '../../lib/plan-start'
import { muscleBucket } from '../../lib/muscle-bucket'
import { clientDisplayName } from '../../lib/person'
import { lastCompletedDay } from '../../lib/roster'
import { getProfileOnboardingStep, isProfileCompleted, profileLacksGuardianConsent } from '../../lib/profile-completion'
import { getTrainerPlanComposeBlockReason } from '../../lib/trainer-plan-compose'
import type { TrainerExercise } from '../../types/exercise'
import type { CopyDayMode } from '../../types/plan'
import { QueryState } from '../shared'
import { Button } from '../ui/button'
import { PageSkeleton } from '../ui/skeleton'
import { Input } from '../ui/input'
import {
  Chip,
  ConfirmSheet,
  ExerciseThumb,
  OverflowMenu,
  Row,
  ScreenHeader,
  Sheet,
  StickyActionBar,
  type OverflowItem,
} from '../ui/kit'
import { HealthDataTrainerSummary } from '../profile/HealthDataTrainerSummary'
import { ClientProgress } from './ClientProgress'
import { EmptyPlanChoices } from './EmptyPlanChoices'
import { ExerciseSlotSheet } from './ExerciseSlotSheet'
import { PlanStartCard } from './PlanStartCard'
import { WorkingWeights } from './WorkingWeights'
import { PlanDayChip, WeekdayMenu, WeekdaySwapSheet } from './WeekdayChange'
import { WeekSwitcher } from './WeekSwitcher'

type StudioScreen = 'plan' | 'progress' | 'add' | 'weights' | 'questionnaire'
type Picker = 'none' | 'copy-day' | 'copy-week' | 'add-day'

const MUSCLE_CHIPS = [
  { id: 'all', label: 'Все' },
  { id: 'chest', label: 'Грудь' },
  { id: 'back', label: 'Спина' },
  { id: 'legs', label: 'Ноги' },
  { id: 'shoulders', label: 'Плечи' },
  { id: 'arms', label: 'Руки' },
  { id: 'core', label: 'Корпус' },
  { id: 'other', label: 'Без группы' },
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
  const profileStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const composeBlockReason = getTrainerPlanComposeBlockReason({
    isProfileLoading: profileQuery.isLoading,
    isNotFound: profileStatus === 404,
    isForbidden: profileStatus === 403,
    hasProfileLoadError: Boolean(profileQuery.isError && profileStatus !== 404 && profileStatus !== 403),
    hasProfile: Boolean(profileQuery.data),
    questionnaireReady: isProfileCompleted(profileQuery.data),
    guardianConsentMissing:
      getProfileOnboardingStep(profileQuery.data) === null && profileLacksGuardianConsent(profileQuery.data),
  })
  const { trainerClientsQuery, leaveRelationMutation } = useTrainerRelations({ trainerUserId })
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

  const [stored, setStored] = useState<{
    id: string
    updatedAt: string
    baseline: DayDraft[]
    draft: DayDraft[]
    startBaseline: PlanStartChoice
  } | null>(null)
  const [startChoice, setStartChoice] = useState<PlanStartChoice>({ mode: 'next_workout' })
  const [screen, setScreen] = useState<StudioScreen>(initialScreen)
  const [week, setWeek] = useState<number | null>(null)
  const [dayIndex, setDayIndex] = useState<number | null>(null)
  const [lineKey, setLineKey] = useState<string | null>(null)
  const [picker, setPicker] = useState<Picker>('none')
  const [copyWeekTarget, setCopyWeekTarget] = useState(1)
  const [copyDayWeek, setCopyDayWeek] = useState(1)
  const [copyDow, setCopyDow] = useState(0)
  const [copyMode, setCopyMode] = useState<CopyDayMode>('overwrite')
  const [addTime, setAddTime] = useState('')
  const [addDow, setAddDow] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<(typeof MUSCLE_CHIPS)[number]['id']>('all')
  const [picked, setPicked] = useState<string[]>([])
  const [confirm, setConfirm] = useState<'assemble' | 'delete-day' | 'leave' | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [weekdayOpen, setWeekdayOpen] = useState(false)
  const [swapWith, setSwapWith] = useState<number | null>(null)

  // Черновик сбрасывается, когда с сервера приходит другой план или новая версия.
  if (
    editablePlan &&
    (!stored || stored.id !== editablePlan.plan_id || stored.updatedAt !== editablePlan.updated_at)
  ) {
    const next = draftsFromPlan(editablePlan)
    const choice = planStartChoiceFromPlan(editablePlan)
    const samePlan = stored?.id === editablePlan.plan_id
    setStored({
      id: editablePlan.plan_id,
      updatedAt: editablePlan.updated_at,
      baseline: next,
      draft: next,
      startBaseline: choice,
    })
    setStartChoice(choice)
    // Смена дня недели не переназначает day_index: остаёмся на той же тренировке.
    if (!samePlan || !next.some((day) => day.week === week)) {
      setWeek(next[0]?.week ?? null)
    }
    if (!samePlan || dayIndex == null || !next.some((day) => day.dayIndex === dayIndex)) {
      setDayIndex(next[0]?.dayIndex ?? null)
    }
  }

  const draft = stored?.draft ?? []
  const baseline = stored?.baseline ?? []
  const dirty = stored ? dirtyDayIndexes(baseline, draft) : []
  const dayOfWeeks = draft.map((day) => day.dayOfWeek)
  const resolvedStart = planStartChoiceForSlots(startChoice, dayOfWeeks, todayIso)
  const startRequest = planStartRequest(resolvedStart, dayOfWeeks, todayIso)
  const chosenStart = startRequest?.start_date ?? null
  const startDirty = stored
    ? !isSamePlanStartChoice(resolvedStart, planStartChoiceForSlots(stored.startBaseline, dayOfWeeks, todayIso))
    : false
  const startNeedsDate = resolvedStart.mode === 'date' && !resolvedStart.date
  const isDirty = dirty.length > 0 || (startDirty && !startNeedsDate)
  useUnsavedChangesGuard(isDirty && !manual.saveMutation.isPending)

  const weeks = [...new Set(draft.map((day) => day.week))]
  const activeWeek = week ?? weeks[0] ?? 1
  const weekDays = draft.filter((day) => day.week === activeWeek)
  const shownWeekDays = weekDays.filter(
    (day) =>
      !isEmptyLeadInDay(
        { week: day.week, scheduledFor: day.scheduledFor, exerciseCount: day.slots.length },
        chosenStart,
      ),
  )
  const daysForWeek = shownWeekDays.length > 0 ? shownWeekDays : weekDays
  const selectedDay = daysForWeek.find((day) => day.dayIndex === dayIndex) ?? daysForWeek[0] ?? null
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
    if (!stored || !startRequest || startNeedsDate) return
    const payload = stored.draft.filter((day) => dirty.includes(day.dayIndex))
    manual.saveMutation.mutate({ baseline: stored.baseline, draft: payload, start: startRequest })
  }

  const structureBusy =
    manual.addDayMutation.isPending ||
    manual.deleteDayMutation.isPending ||
    manual.copyDayMutation.isPending ||
    manual.copyWeekMutation.isPending ||
    manual.changeWeekdayMutation.isPending

  const requireCleanDraft = () => {
    if (!isDirty) return true
    toast.error('Сначала сохраните упражнения.')
    return false
  }

  const pickWeekday = (slot: WeekdaySlot) => {
    if (!selectedDay || structureBusy) return
    switch (slot.kind) {
      case 'current':
        setWeekdayOpen(false)
        return
      case 'free':
        manual.changeWeekdayMutation.mutate(
          { dayIndex: selectedDay.dayIndex, dayOfWeek: slot.dayOfWeek },
          { onSuccess: () => setWeekdayOpen(false) },
        )
        return
      case 'occupied':
        setWeekdayOpen(false)
        setSwapWith(slot.dayOfWeek)
        return
      default: {
        const unreachable: never = slot.kind
        return unreachable
      }
    }
  }

  const runAssemble = () => {
    const profile = profileQuery.data
    if (!profile) return
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
          setConfirm(null)
          void queryClient.invalidateQueries({
            queryKey: queryKeys.plans.trainerClientPlan(clientUserId, trainerUserId),
          })
        },
      },
    )
  }

  const selectWeek = (item: number) => {
    setWeek(item)
    setWeekdayOpen(false)
    setLineKey(null)
    const inWeek = draft.filter((day) => day.week === item)
    const first =
      inWeek.find(
        (day) =>
          !isEmptyLeadInDay(
            { week: day.week, scheduledFor: day.scheduledFor, exerciseCount: day.slots.length },
            chosenStart,
          ),
      ) ?? inWeek[0]
    if (first) setDayIndex(first.dayIndex)
  }

  const createManual = () => {
    if (manual.createEmptyMutation.isPending) return
    const profile = profileQuery.data
    manual.createEmptyMutation.mutate({
      goal: profile?.goal ?? undefined,
      level: profile?.experience_level ?? undefined,
      day_count: 1,
      start_date: todayIso,
    })
  }

  const assemble = () => {
    if (composeBlockReason) {
      window.alert(composeBlockReason)
      return
    }
    if (!profileQuery.data) return
    if (plan) {
      setConfirm('assemble')
      return
    }
    runAssemble()
  }

  const menuItems: OverflowItem[] = [
    {
      id: 'copy-day',
      label: 'Копировать день',
      onSelect: () => {
        if (!requireCleanDraft() || !selectedDay) return
        setCopyDayWeek(selectedDay.week)
        setCopyDow(selectedDay.dayOfWeek === 6 ? 0 : selectedDay.dayOfWeek + 1)
        setCopyMode('overwrite')
        setPicker('copy-day')
      },
    },
    {
      id: 'copy-week',
      label: 'Копировать неделю',
      onSelect: () => {
        if (!requireCleanDraft()) return
        setCopyWeekTarget(Math.min(8, activeWeek + 1))
        setCopyMode('overwrite')
        setPicker('copy-week')
      },
    },
    {
      id: 'delete-day',
      label: 'Удалить день',
      danger: true,
      onSelect: () => {
        if (!selectedDay || !requireCleanDraft()) return
        setConfirm('delete-day')
      },
    },
    {
      id: 'assemble',
      label: 'Собрать из каталога',
      hint: 'Заменит текущий план',
      onSelect: assemble,
    },
    {
      id: 'leave',
      label: 'Завершить сопровождение',
      danger: true,
      onSelect: () => {
        if (!relation) return
        setConfirm('leave')
      },
    },
  ]

  if (manual.planQuery.isLoading || (manual.isMissing && activePlanQuery.isLoading)) {
    return <PageSkeleton />
  }

  if (manual.planQuery.isError && !manual.isMissing) {
    return (
      <QueryState isError errorTitle="Не удалось загрузить план" onRetry={() => void manual.planQuery.refetch()}>
        {null}
      </QueryState>
    )
  }

  if (screen === 'progress') {
    return (
      <ClientProgress
        name={clientName}
        plan={plan ?? null}
        todayIso={todayIso}
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

  if (screen === 'weights') {
    return <WorkingWeights clientUserId={clientUserId} trainerUserId={trainerUserId} catalog={catalog} onBack={() => setScreen('plan')} />
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

  const canChangeWeekday = !readOnly && Boolean(editablePlan)
  const last = plan ? lastCompletedDay(plan) : null
  const editingSlot = selectedDay?.slots.find((item) => item.key === lineKey) ?? null
  const planDates = plan ? `${formatMonthDay(plan.start_date)} — ${formatMonthDay(plan.end_date)}` : ''
  const freeWeekdays = WEEKDAYS.filter((day) => !weekDays.some((item) => item.dayOfWeek === day))

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader
        title={clientName}
        onBack={goBack}
        menu={
          <OverflowMenu
            items={
              readOnly ? menuItems.filter((item) => item.id !== 'copy-day' && item.id !== 'copy-week' && item.id !== 'delete-day') : menuItems
            }
          />
        }
      />
      {plan && weeks.length > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="min-w-0 text-[15px] leading-snug text-secondary-foreground">{planDates}</p>
          <WeekSwitcher weeks={weeks} active={activeWeek} onChange={selectWeek} />
        </div>
      ) : null}

      {daysForWeek.length > 0 ? (
        <>
          <p id="weekday-chip-hint" className="sr-only">
            Сменить день недели
          </p>
          <p className="mt-3 text-[13px] font-semibold text-secondary-foreground">День недели</p>
          <div className="relative z-30 mt-2 flex gap-2 overflow-x-auto">
            {daysForWeek.map((day) => {
              const isActive = selectedDay?.dayId === day.dayId
              const canOpen = isActive && canChangeWeekday
              return (
                <PlanDayChip
                  key={day.dayId}
                  label={formatWeekdayShort(day.dayOfWeek)}
                  active={isActive}
                  disclosure={canOpen}
                  expanded={isActive && weekdayOpen}
                  title={canOpen ? 'Сменить день недели' : 'Открыть день'}
                  describedBy={canOpen ? 'weekday-chip-hint' : undefined}
                  onClick={() => {
                    if (!isActive) {
                      setWeekdayOpen(false)
                      setLineKey(null)
                      setDayIndex(day.dayIndex)
                      return
                    }
                    if (!canChangeWeekday) return
                    if (weekdayOpen) {
                      setWeekdayOpen(false)
                      return
                    }
                    if (!requireCleanDraft()) return
                    setSwapWith(null)
                    setWeekdayOpen(true)
                  }}
                />
              )
            })}
            {canChangeWeekday ? (
              <button
                type="button"
                aria-label="Добавить день"
                title="Добавить день"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/50 bg-secondary px-4 text-[15px] font-semibold text-foreground"
                onClick={() => {
                  if (!requireCleanDraft()) return
                  setWeekdayOpen(false)
                  setAddTime('')
                  setAddDow(null)
                  setPicker('add-day')
                }}
              >
                + День
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      {weekdayOpen && canChangeWeekday && selectedDay ? (
        <>
          <button
            type="button"
            aria-label="Закрыть список дней"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setWeekdayOpen(false)}
          />
          <WeekdayMenu
            slots={weekdaySlots(weekDays, selectedDay.dayOfWeek)}
            pending={manual.changeWeekdayMutation.isPending}
            onPick={pickWeekday}
          />
        </>
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
              onClick={readOnly ? undefined : () => setLineKey(slot.key)}
            />
          )
        })}
      </div>

      {!readOnly && selectedDay ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => {
            setSearch('')
            setMuscle('all')
            setPicked([])
            setLineKey(null)
            setScreen('add')
          }}
        >
          + Добавить упражнение
        </Button>
      ) : null}

      {!plan ? (
        <EmptyPlanChoices
          catalogPending={generatePlanMutation.isPending}
          manualPending={manual.createEmptyMutation.isPending}
          blockReason={composeBlockReason}
          onCatalog={assemble}
          onManual={createManual}
        />
      ) : (
        <div className="mt-4 border-t border-border">
          <button
            type="button"
            className="flex min-h-12 w-full items-center text-left text-[17px] font-semibold"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((current) => !current)}
          >
            Подробнее о плане
            <span aria-hidden className="ml-auto text-secondary-foreground">
              {detailsOpen ? '▴' : '▾'}
            </span>
          </button>
          {detailsOpen ? (
            <div className="pb-2">
              <div className="flex items-center justify-between gap-3 text-[15px]">
                <span>
                  {last
                    ? `Последняя тренировка: ${formatCalendarDate(last.scheduled_for, 'short')}`
                    : 'Тренировок пока нет'}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold underline"
                  onClick={() => setScreen('progress')}
                >
                  Прогресс
                </button>
              </div>
              {readOnly ? (
                <p className="mt-3 text-[15px] text-secondary-foreground">Этот план нельзя править по слотам. Собрать новый можно из меню.</p>
              ) : null}
              {!readOnly && editablePlan && draft.length > 0 ? (
                <PlanStartCard choice={startChoice} todayIso={todayIso} dayOfWeeks={dayOfWeeks} onChange={setStartChoice} />
              ) : null}
              {!readOnly && selectedDay ? (
                <label className="mt-4 grid gap-2 text-[17px] font-semibold" htmlFor="plan-day-time">
                  Время
                  <Input
                    id="plan-day-time"
                    type="time"
                    value={selectedDay.scheduledTime ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      updateDay(selectedDay.dayIndex, (day) => ({ ...day, scheduledTime: value || null }))
                    }}
                  />
                </label>
              ) : null}
              <div className="mt-2 divide-y divide-border border-y border-border">
                <button type="button" className="flex min-h-12 w-full items-center text-left text-[17px]" onClick={() => setScreen('weights')}>
                  Рабочие веса
                </button>
                <button type="button" className="flex min-h-12 w-full items-center text-left text-[17px]" onClick={() => setScreen('questionnaire')}>
                  Анкета
                </button>
                <Link to={APP_PATHS.planRules} className="flex min-h-11 items-center text-[17px]">
                  Правила генератора
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!readOnly && selectedDay ? (
        <StickyActionBar>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[15px] text-secondary-foreground" aria-live="polite">
              {startNeedsDate ? 'Укажите дату начала' : isDirty ? 'Есть изменения' : 'Нет изменений'}
            </span>
            <Button
              type="button"
              size="lg"
              className="ml-auto h-12 min-w-36 flex-1"
              disabled={!isDirty || startNeedsDate || manual.saveMutation.isPending}
              onClick={save}
            >
              {manual.saveMutation.isPending ? 'Сохраняем…' : 'Сохранить план'}
            </Button>
          </div>
        </StickyActionBar>
      ) : null}
      {picker === 'add-day' ? (
        <Sheet title="Добавить день" onClose={() => setPicker('none')}>
          <p className="text-[15px] text-secondary-foreground">Сначала выберите свободный день. Время можно не указывать.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {freeWeekdays.map((day) => (
              <Chip key={day} active={addDow === day} disabled={structureBusy} onClick={() => setAddDow(day)}>
                {formatWeekdayShort(day)}
              </Chip>
            ))}
          </div>
          {freeWeekdays.length === 0 ? <p className="mt-3 text-[17px]">В этой неделе уже есть все дни.</p> : null}
          <label className="mt-4 grid gap-2 text-[17px] font-semibold" htmlFor="new-day-time">
            Время, если нужно
            <Input id="new-day-time" type="time" value={addTime} onChange={(event) => setAddTime(event.target.value)} />
          </label>
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            disabled={addDow == null || structureBusy}
            onClick={() => {
              if (addDow == null) return
              manual.addDayMutation.mutate(
                { week: activeWeek, day_of_week: addDow, scheduled_time: addTime || null },
                { onSuccess: () => setPicker('none') },
              )
            }}
          >
            {structureBusy ? 'Добавляем…' : 'Добавить'}
          </Button>
        </Sheet>
      ) : null}

      {editingSlot && selectedDay ? (
        <ExerciseSlotSheet
          slot={editingSlot}
          media={media.get(editingSlot.exerciseId)}
          onChange={(next) =>
            updateDay(selectedDay.dayIndex, (day) => ({
              ...day,
              slots: day.slots.map((item) => (item.key === editingSlot.key ? next : item)),
            }))
          }
          onDelete={() => {
            updateDay(selectedDay.dayIndex, (day) => ({
              ...day,
              slots: day.slots.filter((item) => item.key !== editingSlot.key),
            }))
            setLineKey(null)
          }}
          onClose={() => setLineKey(null)}
        />
      ) : null}

      {picker === 'copy-day' && selectedDay ? (
        <Sheet title="Куда скопировать день" onClose={() => setPicker('none')}>
          <WeekStepper label="Неделя" value={copyDayWeek} onChange={setCopyDayWeek} />
          <div className="mt-3 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <Chip key={day} active={copyDow === day} onClick={() => setCopyDow(day)}>
                {formatWeekdayShort(day)}
              </Chip>
            ))}
          </div>
          <ModePicker mode={copyMode} onChange={setCopyMode} />
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            disabled={structureBusy}
            onClick={() => {
              manual.copyDayMutation.mutate(
                { dayIndex: selectedDay.dayIndex, payload: { week: copyDayWeek, day_of_week: copyDow, mode: copyMode } },
                { onSuccess: () => setPicker('none') },
              )
            }}
          >
            {structureBusy ? 'Копируем…' : 'Скопировать'}
          </Button>
        </Sheet>
      ) : null}

      {picker === 'copy-week' ? (
        <Sheet title="Куда скопировать неделю" onClose={() => setPicker('none')}>
          <WeekStepper label="В неделю" value={copyWeekTarget} onChange={setCopyWeekTarget} />
          <ModePicker mode={copyMode} onChange={setCopyMode} />
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            disabled={structureBusy || copyWeekTarget === activeWeek}
            onClick={() => {
              manual.copyWeekMutation.mutate(
                { week: activeWeek, payload: { target_week: copyWeekTarget, mode: copyMode } },
                { onSuccess: () => setPicker('none') },
              )
            }}
          >
            {structureBusy ? 'Копируем…' : 'Скопировать'}
          </Button>
        </Sheet>
      ) : null}

      {confirm === 'assemble' ? (
        <ConfirmSheet
          title="Собрать из каталога"
          body={
            plan
              ? assembleReplacementCopy(
                  plan.days.length,
                  plan.days.reduce((sum, day) => sum + day.exercises.length, 0),
                  isDirty,
                )
              : 'Текущий план будет заменён.'
          }
          confirmLabel="Собрать"
          pending={generatePlanMutation.isPending}
          tone="danger"
          onClose={() => setConfirm(null)}
          onConfirm={runAssemble}
        />
      ) : null}
      {confirm === 'delete-day' && selectedDay ? (
        <ConfirmSheet
          title="Удалить день"
          body={`Удалить ${formatWeekdayShort(selectedDay.dayOfWeek)}, неделя ${selectedDay.week}? Упражнения этого дня пропадут.`}
          confirmLabel="Удалить"
          pending={manual.deleteDayMutation.isPending}
          tone="danger"
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            manual.deleteDayMutation.mutate(selectedDay.dayIndex, { onSuccess: () => setConfirm(null) })
          }
        />
      ) : null}
      {confirm === 'leave' && relation ? (
        <ConfirmSheet
          title="Завершить сопровождение"
          body="Завершить сопровождение этого клиента?"
          confirmLabel="Завершить"
          pending={leaveRelationMutation.isPending}
          tone="danger"
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            leaveRelationMutation.mutate(
              { relationId: relation.relation_id },
              { onSuccess: () => navigate(APP_PATHS.clients) },
            )
          }
        />
      ) : null}
      {swapWith != null && selectedDay ? (
        <WeekdaySwapSheet
          fromDayOfWeek={selectedDay.dayOfWeek}
          toDayOfWeek={swapWith}
          pending={manual.changeWeekdayMutation.isPending}
          onClose={() => setSwapWith(null)}
          onConfirm={() =>
            manual.changeWeekdayMutation.mutate(
              { dayIndex: selectedDay.dayIndex, dayOfWeek: swapWith },
              { onSuccess: () => setSwapWith(null) },
            )
          }
        />
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
    note: '',
  }
}

function WeekStepper({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3">
      <span className="text-[17px] font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" className="h-12 w-12 rounded-2xl border border-border bg-card text-[20px]" onClick={() => onChange(Math.max(1, value - 1))}>
          −
        </button>
        <span className="w-8 text-center text-[17px] font-semibold">{value}</span>
        <button type="button" className="h-12 w-12 rounded-2xl border border-border bg-card text-[20px]" onClick={() => onChange(Math.min(8, value + 1))}>
          +
        </button>
      </span>
    </div>
  )
}

function ModePicker({ mode, onChange }: { mode: CopyDayMode; onChange: (mode: CopyDayMode) => void }) {
  return (
    <div className="mt-3 flex gap-2">
      <Chip active={mode === 'overwrite'} onClick={() => onChange('overwrite')}>
        Заменить
      </Chip>
      <Chip active={mode === 'append'} onClick={() => onChange('append')}>
        Добавить
      </Chip>
    </div>
  )
}

const GROUP_LABEL: Record<string, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Корпус',
  other: 'Без группы',
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
      <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto">
        {MUSCLE_CHIPS.map((item) => (
          <Chip
            key={item.id}
            active={muscle === item.id}
            aria-pressed={muscle === item.id}
            className="shrink-0 whitespace-nowrap"
            onClick={() => onMuscle(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2">
        {visible.map((exercise) => {
          const selected = picked.includes(exercise.row_id)
          const group = GROUP_LABEL[muscleBucket(exercise)] ?? 'Без группы'
          return (
            <Row
              key={exercise.row_id}
              title={exercise.exercise_name}
              subtitle={`${group} · ${formatEquipmentLabel(exercise.equipment).toLowerCase()}`}
              leading={<ExerciseThumb imageUrl={exercise.start_image_url} hasVideo={Boolean(exercise.video_url)} />}
              trailing={selected ? <span aria-hidden className="text-[17px] font-semibold text-accent-ink">✓</span> : null}
              onClick={() => onToggle(exercise.row_id)}
            />
          )
        })}
      </div>
      <StickyActionBar>
        <Button type="button" size="lg" className="w-full" onClick={onDone}>
          Готово · добавлено {picked.length}
        </Button>
      </StickyActionBar>
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
      <HealthDataTrainerSummary profile={profile} />
    </div>
  )
}
