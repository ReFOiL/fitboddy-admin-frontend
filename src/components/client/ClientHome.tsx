import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { useClientPlanModel } from '../../hooks/use-client-plan-model'
import { useConversations, useUnreadCount } from '../../hooks/use-messages'
import { useWorkoutSession } from '../../hooks/use-workout-session'
import { completedWeekStreak, estimateWorkoutMinutes, trainerNotes } from '../../lib/client-plan-summary'
import { formatLowerWeekday, formatWorkoutClock, formatWorkoutDuration, parseIsoDate } from '../../lib/dates'
import { formatLastMessagePreview } from '../../lib/messages-formatters'
import { formatWorkoutCategory } from '../../lib/muscles'
import { selectPlanDay } from '../../lib/plan-day-selector'
import { clientSystemGenerateBlockReason } from '../../lib/plan-generate-reason'
import { loadWorkoutStart } from '../../lib/plan-session'
import { firstName } from '../../lib/person'
import { EXERCISE_FORMS, plural, pluralPhrase, WEEK_FORMS, WORKOUT_FORMS } from '../../lib/plural'
import { lastCompletedDay, weekProgress } from '../../lib/roster'
import type { AuthUser } from '../../types/auth'
import type { PlanExercise, TrainingPlan } from '../../types/plan'
import { GenerateBlockNote } from '../plan/GenerateBlockNote'
import { WeekStrip } from '../plan/WeekStrip'
import { WorkoutSession } from '../plan/WorkoutSession'
import { Button } from '../ui/button'
import { QueryState } from '../shared'
import { Avatar } from '../ui/kit'
import { Skeleton } from '../ui/skeleton'

export function ClientHome({ user }: { user: AuthUser }) {
  const model = useClientPlanModel(user)
  const location = useLocation()
  const navigate = useNavigate()
  const conversationsQuery = useConversations(true, 15_000)
  const unreadQuery = useUnreadCount(true)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const workoutSession = useWorkoutSession(model.todayWorkout)
  const startedFromPlan = useRef(false)
  useEffect(() => {
    const state = location.state as { startWorkout?: boolean } | null
    if (!state?.startWorkout || startedFromPlan.current) return
    if (!model.todayWorkout || model.todayWorkout.is_completed) return
    startedFromPlan.current = true
    workoutSession.start()
    navigate(APP_PATHS.home, { replace: true, state: null })
  }, [location.state, model.todayWorkout, navigate, workoutSession])
  const daySelection = useMemo(
    () =>
      selectPlanDay({
        plan: model.activePlan,
        todayIso: model.todayIso,
        selectedDayId,
        todayWorkout: model.todayWorkout,
      }),
    [model.activePlan, model.todayIso, model.todayWorkout, selectedDayId],
  )
  const unreadCount = unreadQuery.data?.unread_count ?? 0
  const unreadConversation = (conversationsQuery.data ?? []).find((item) => item.unread_count > 0)
  const preview = unreadConversation ? formatLastMessagePreview(unreadConversation.last_message, user.user_id) : null
  const messagePath = unreadConversation
    ? APP_PATHS.messageThread.replace(':conversationId', unreadConversation.conversation_id)
    : model.activeTrainerUserId
      ? `${APP_PATHS.messages}?peerUserId=${encodeURIComponent(model.activeTrainerUserId)}`
      : APP_PATHS.messages
  const generationSource = model.hasActiveTrainer ? 'trainer' : 'system'
  const generationEnabled = model.hasActiveTrainer ? model.canGenerateTrainerPlan : model.canGenerateSystemPlan
  const systemGenerateReason = clientSystemGenerateBlockReason({
    isPending: model.generatePlanMutation.isPending,
    profile: model.profile,
    profileLoading: model.profileQuery.isLoading,
    relationLoading: model.clientActiveRelationQuery.isLoading,
    hasActiveTrainer: model.hasActiveTrainer,
  })
  const busy = model.completeDayMutation.isPending || model.replaceExerciseMutation.isPending
  const greetingName = firstName(model.profile?.full_name ?? '')
  const todayDate = parseIsoDate(model.todayIso) ?? new Date()
  const focused = daySelection.kind === 'workout' ? daySelection.day : null
  const cardDay = focused
  const weekStats = model.activePlan && cardDay ? weekProgress(model.activePlan, cardDay.week) : null
  const completedTotal = model.activePlan?.days.filter((day) => day.is_completed).length ?? 0
  const lastDone = model.activePlan ? lastCompletedDay(model.activePlan) : null
  const lastFinishedAt = lastDone?.finished_at ?? lastDone?.completed_at
  const lastDuration = formatWorkoutDuration(lastDone?.started_at, lastFinishedAt)
  const lastClock = lastFinishedAt ? formatWorkoutClock(lastFinishedAt) : ''

  const finishWorkout = () => {
    if (!model.todayWorkout || model.todayWorkout.is_completed) return
    model.completeDayMutation.mutate(
      { dayIndex: model.todayWorkout.day_index, startedAt: loadWorkoutStart(model.todayWorkout.day_id) },
      { onSuccess: workoutSession.finish },
    )
  }

  if (workoutSession.isActive && model.todayWorkout) {
    return (
      <WorkoutSession
        workout={model.todayWorkout}
        checkedLineIds={workoutSession.checkedLineIds}
        checkedCount={workoutSession.checkedCount}
        exerciseTotal={workoutSession.exerciseTotal}
        busy={busy}
        completing={model.completeDayMutation.isPending}
        trainerName={model.activeTrainerDisplay}
        onCollapse={workoutSession.collapse}
        onToggleChecked={workoutSession.toggleChecked}
        onFinish={finishWorkout}
      />
    )
  }

  const initialLoading =
    (model.clientActiveRelationQuery.isLoading || model.profileQuery.isLoading || model.activePlanQuery.isLoading) &&
    !model.hasActivePlan &&
    !model.hasNoActivePlan

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-[28px] font-bold">{greetingName ? `Привет, ${greetingName}` : 'Привет'}</h1>
      {unreadCount > 0 ? (
        <Link to={messagePath} className="mt-3 block text-[17px] underline">
          Новых сообщений: {unreadCount}
          {preview && preview !== 'Нет сообщений' ? (
            <>
              {' · '}
              <span>{preview}</span>
            </>
          ) : null}
        </Link>
      ) : null}
      {initialLoading ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Загрузка страницы">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      ) : null}

      {model.hasNoProfile || (model.profile && !model.questionnaireReady) ? (
        <div className="mt-6 border-y border-border py-4">
          <p className="text-[17px] font-semibold">Заполните анкету</p>
          <p className="mt-1 text-[15px] text-secondary-foreground">Так тренер сможет составить план.</p>
          <GenerateBlockNote reason={systemGenerateReason} />
          <Button asChild size="lg" className="mt-4 w-full">
            <Link to={APP_PATHS.profileOnboarding}>Продолжить заполнение</Link>
          </Button>
        </div>
      ) : null}

      {model.hasProfileError ? (
        <QueryState isError errorTitle="Не удалось загрузить профиль" onRetry={() => void model.profileQuery.refetch()}>
          {null}
        </QueryState>
      ) : null}

      {model.questionnaireReady && model.hasActivePlan ? (
        <>
          <div className="mt-4">
            <WeekStrip
              days={model.activePlan?.days ?? []}
              focusedDayId={daySelection.focusedDayId}
              todayIso={model.todayIso}
              onSelectDay={setSelectedDayId}
            />
          </div>

          {cardDay ? (
            <section className="mt-4 rounded-3xl border border-border bg-card p-4">
              <div className="text-[13px] font-bold uppercase">{daySelection.isToday ? 'Сегодня' : formatLowerWeekday(parseIsoDate(cardDay.scheduled_for) ?? todayDate)}</div>
              <h2 className="mt-1 text-[28px] font-bold">{workoutTitle(cardDay.exercises)}</h2>
              <p className="mt-1 text-[17px]">{todayMeta(cardDay)}</p>
              {trainerNotes(cardDay.exercises).length > 0 ? (
                <p className="mt-2 text-[15px]">Заметка тренера: {trainerNotes(cardDay.exercises).join(' · ')}</p>
              ) : null}
              <p className="mt-2 text-[15px] text-secondary-foreground">{previewNames(cardDay.exercises)}</p>
              {daySelection.isToday && model.todayWorkout && !model.todayWorkout.is_completed ? (
                <Button type="button" size="lg" className="mt-4 w-full" onClick={workoutSession.start}>
                  Начать тренировку
                </Button>
              ) : null}
              {daySelection.kind === 'rest' ? (
                <div className="mt-4">
                  <p className="text-[17px] font-semibold">День отдыха</p>
                  <Button asChild variant="secondary" className="mt-3 w-full">
                    <Link to={APP_PATHS.planGeneration}>Посмотреть расписание</Link>
                  </Button>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="mt-4 rounded-3xl border border-border bg-card p-4">
              <p className="text-[17px] font-semibold">День отдыха</p>
              <Button asChild variant="secondary" className="mt-3 w-full">
                <Link to={APP_PATHS.planGeneration}>Посмотреть расписание</Link>
              </Button>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-[13px] font-bold uppercase">Прогресс</h2>
            {weekStats && weekStats.total > 0 ? (
              <div className="mt-3">
                <div
                  className="h-2 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={weekStats.total}
                  aria-valuenow={weekStats.done}
                  aria-label="Прогресс недели"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((weekStats.done / weekStats.total) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
            {model.activePlan ? <WeekStreak plan={model.activePlan} /> : null}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-[28px] font-bold leading-none">
                  {weekStats ? `${weekStats.done} из ${weekStats.total}` : '—'}
                </div>
                <div className="mt-2 text-[15px]">на этой неделе</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="text-[28px] font-bold leading-none">{completedTotal}</div>
                <div className="mt-2 text-[15px]">{plural(completedTotal, WORKOUT_FORMS)} всего</div>
                {lastClock || lastDuration ? (
                  <div className="mt-1 text-[15px]">последняя {[lastClock, lastDuration].filter(Boolean).join(' · ')}</div>
                ) : null}
              </div>
            </div>
          </section>

          {model.showNextCycleCta ? (
            model.hasActiveTrainer ? (
              <p className="mt-4 text-[15px] text-secondary-foreground">Когда этот план закончится, тренер составит следующий</p>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                disabled={!generationEnabled}
                onClick={() => model.runGenerate(generationSource)}
              >
                {model.generatePlanMutation.isPending ? 'Генерируем…' : 'Следующий цикл'}
              </Button>
            )
          ) : null}
        </>
      ) : null}

      {model.questionnaireReady && !model.hasActivePlan && !model.activePlanQuery.isLoading ? (
        model.hasActiveTrainer ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
            <h2 className="text-[28px] font-bold">Тренер ещё составляет план</h2>
            <p className="mt-3 text-[17px] text-secondary-foreground">Напишем, когда план будет готов</p>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-[28px] font-bold">Начните тренироваться</h2>
            <div className="mt-4 grid gap-3">
              <Link
                to={APP_PATHS.trainers}
                className="flex min-h-28 items-center rounded-3xl border border-border bg-card p-4 text-left text-[17px] font-semibold"
              >
                У меня есть тренер — ввести код
              </Link>
              <button
                type="button"
                className="flex min-h-28 items-center rounded-3xl border border-border bg-card p-4 text-left text-[17px] font-semibold disabled:opacity-50"
                disabled={!generationEnabled}
                onClick={() => model.runGenerate('system')}
              >
                {model.generatePlanMutation.isPending
                  ? 'Генерируем…'
                  : 'Тренироваться самостоятельно — план соберёт Fitboddy по анкете'}
              </button>
            </div>
            <div className="mt-3">
              <GenerateBlockNote reason={generationEnabled ? null : systemGenerateReason} />
            </div>
          </div>
        )
      ) : null}

      {model.hasActiveTrainer ? (
        <div className="mt-6 flex min-h-16 items-center gap-3 border-t border-border py-3">
          <Avatar name={model.activeTrainerDisplay || 'Тренер'} src={model.activeTrainerAvatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold">{model.activeTrainerDisplay || 'Тренер'}</div>
            <div className="text-[15px] text-secondary-foreground">
              {preview && preview !== 'Нет сообщений' ? preview : 'Ваш тренер'}
            </div>
          </div>
          <Button asChild variant="secondary" className="h-12 px-4">
            <Link to={messagePath}>{unreadCount > 0 ? 'Открыть' : 'Написать'}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function todayMeta(day: { exercises: PlanExercise[]; scheduled_time?: string | null }): string {
  const parts = [pluralPhrase(day.exercises.length, EXERCISE_FORMS)]
  if (day.scheduled_time?.trim()) parts.push(day.scheduled_time.trim())
  const minutes = estimateWorkoutMinutes(day.exercises)
  if (minutes != null) parts.push(`около ${minutes} мин`)
  return parts.join(' · ')
}

function WeekStreak({ plan }: { plan: TrainingPlan }) {
  const streak = completedWeekStreak(plan)
  if (streak == null) return null
  return (
    <p className="mt-3 text-[15px] font-semibold">
      {streak} {plural(streak, WEEK_FORMS)} подряд
    </p>
  )
}

function workoutTitle(exercises: PlanExercise[]): string {
  if (exercises.length === 0) return 'Тренировка'
  const counts = new Map<string, number>()
  for (const exercise of exercises) {
    const category = exercise.category || 'full_body'
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'full_body'
  return formatWorkoutCategory(top)
}

function previewNames(exercises: PlanExercise[]): string {
  const names = exercises.map((exercise) => exercise.exercise_name)
  const head = names.slice(0, 3).join(' · ')
  const extra = names.length - 3
  return extra > 0 ? `${head} · ещё ${extra}` : head
}
