import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { useClientPlanModel } from '../../hooks/use-client-plan-model'
import { useConversations, useUnreadCount } from '../../hooks/use-messages'
import { useWorkoutSession } from '../../hooks/use-workout-session'
import { calendarWeek, formatJsWeekdayShort, formatLowerWeekday, parseIsoDate, toIsoDate } from '../../lib/dates'
import { formatLastMessagePreview } from '../../lib/messages-formatters'
import { formatWorkoutCategory } from '../../lib/muscles'
import { selectPlanDay } from '../../lib/plan-day-selector'
import { firstName } from '../../lib/person'
import { weekProgress } from '../../lib/roster'
import type { AuthUser } from '../../types/auth'
import type { PlanExercise } from '../../types/plan'
import { WorkoutSession } from '../plan/WorkoutSession'
import { Button } from '../ui/button'
import { QueryState } from '../shared'
import { Avatar, DoneMark } from '../ui/kit'

export function ClientHome({ user }: { user: AuthUser }) {
  const model = useClientPlanModel(user)
  const conversationsQuery = useConversations(true, 15_000)
  const unreadQuery = useUnreadCount(true)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const workoutSession = useWorkoutSession(model.todayWorkout)
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
  const busy = model.completeDayMutation.isPending || model.replaceExerciseMutation.isPending
  const greetingName = firstName(model.profile?.full_name ?? '')
  const todayDate = parseIsoDate(model.todayIso) ?? new Date()
  const week = calendarWeek(todayDate)
  const focused = daySelection.kind === 'workout' ? daySelection.day : null
  const cardDay = focused
  const weekStats = model.activePlan && cardDay ? weekProgress(model.activePlan, cardDay.week) : null
  const completedTotal = model.activePlan?.days.filter((day) => day.is_completed).length ?? 0

  const finishWorkout = () => {
    if (!model.todayWorkout || model.todayWorkout.is_completed) return
    model.completeDayMutation.mutate(model.todayWorkout.day_index, { onSuccess: workoutSession.finish })
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
        onReplaceExercise={(lineId) =>
          model.replaceExerciseMutation.mutate({ dayIndex: model.todayWorkout!.day_index, lineId })
        }
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
      {initialLoading ? <p className="mt-6 text-[17px]">Загрузка…</p> : null}

      {model.hasNoProfile || (model.profile && !model.questionnaireReady) ? (
        <div className="mt-6 border-y border-border py-4">
          <p className="text-[17px] font-semibold">Заполни анкету</p>
          <p className="mt-1 text-[15px] text-secondary-foreground">Так тренер сможет составить программу.</p>
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
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {week.map((date) => {
              const iso = toIsoDate(date)
              const planDay = model.activePlan?.days.find((day) => day.scheduled_for.slice(0, 10) === iso)
              const isToday = iso === model.todayIso
              const selected = planDay?.day_id === daySelection.focusedDayId
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!planDay}
                  onClick={() => planDay && setSelectedDayId(planDay.day_id)}
                  className={`flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border-2 text-[13px] font-semibold ${
                    selected || isToday ? 'border-foreground bg-foreground text-background' : 'border-foreground bg-background'
                  }`}
                >
                  <span>{formatJsWeekdayShort(date)}</span>
                  {planDay?.is_completed ? <DoneMark /> : <span className="text-[17px]">{date.getDate()}</span>}
                </button>
              )
            })}
          </div>

          {cardDay ? (
            <section className="mt-4 rounded-3xl border-2 border-foreground p-4">
              <div className="text-[13px] font-bold uppercase">{daySelection.isToday ? 'Сегодня' : formatLowerWeekday(parseIsoDate(cardDay.scheduled_for) ?? todayDate)}</div>
              <h2 className="mt-1 text-[28px] font-bold">{workoutTitle(cardDay.exercises)}</h2>
              <p className="mt-1 text-[17px]">{cardDay.exercises.length} упражнений</p>
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
            <section className="mt-4 rounded-3xl border-2 border-foreground p-4">
              <p className="text-[17px] font-semibold">День отдыха</p>
              <Button asChild variant="secondary" className="mt-3 w-full">
                <Link to={APP_PATHS.planGeneration}>Посмотреть расписание</Link>
              </Button>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-[13px] font-bold uppercase">Прогресс</h2>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-foreground p-4">
                <div className="text-[28px] font-bold leading-none">
                  {weekStats ? `${weekStats.done} из ${weekStats.total}` : '—'}
                </div>
                <div className="mt-2 text-[15px]">на этой неделе</div>
              </div>
              <div className="rounded-2xl border-2 border-foreground p-4">
                <div className="text-[28px] font-bold leading-none">{completedTotal}</div>
                <div className="mt-2 text-[15px]">тренировок всего</div>
              </div>
            </div>
          </section>

          {model.showNextCycleCta ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-4 w-full"
              disabled={!generationEnabled}
              onClick={() => model.runGenerate(generationSource)}
            >
              {model.generatePlanMutation.isPending ? 'Генерируем…' : 'Следующий цикл'}
            </Button>
          ) : null}
        </>
      ) : null}

      {model.questionnaireReady && !model.hasActivePlan && !model.activePlanQuery.isLoading ? (
        model.hasActiveTrainer ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
            <h2 className="text-[28px] font-bold">Тренер ещё составляет программу</h2>
            <p className="mt-3 text-[17px] text-secondary-foreground">Напишем, когда план будет готов</p>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-[28px] font-bold">Начни тренироваться</h2>
            <Button
              type="button"
              size="lg"
              className="mt-4 w-full"
              disabled={!generationEnabled}
              onClick={() => model.runGenerate('system')}
            >
              {model.generatePlanMutation.isPending ? 'Генерируем…' : 'Тренироваться самостоятельно'}
            </Button>
            <p className="mt-4 text-center text-[17px]">
              Или{' '}
              <Link className="underline" to={APP_PATHS.trainers}>
                выбрать тренера
              </Link>
            </p>
          </div>
        )
      ) : null}

      {model.hasActiveTrainer ? (
        <div className="mt-6 flex min-h-16 items-center gap-3 border-t border-border py-3">
          <Avatar name={model.activeTrainerDisplay || 'Тренер'} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold">{model.activeTrainerDisplay || 'Тренер'}</div>
            <div className="text-[15px] text-secondary-foreground">
              {preview && preview !== 'Нет сообщений' ? preview : 'Твой тренер'}
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
