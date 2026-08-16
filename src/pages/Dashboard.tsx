import { MessageSquare, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useClientPlanModel } from '../hooks/use-client-plan-model'
import { useConversations, useUnreadCount } from '../hooks/use-messages'
import { useWorkoutSession } from '../hooks/use-workout-session'
import { HeroCard, QuickActionsSection } from '../components/dashboard'
import { TodayWorkoutCard } from '../components/plan/TodayWorkoutCard'
import { WeekStrip } from '../components/plan/WeekStrip'
import { WorkoutSession } from '../components/plan/WorkoutSession'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { QueryState } from '../components/shared'
import { formatLastMessagePreview } from '../lib/messages-formatters'
import { selectPlanDay } from '../lib/plan-day-selector'
import type { AuthUser } from '../types/auth'

export function DashboardPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const unreadQuery = useUnreadCount(Boolean(user && !isClient))
  const unreadCount = unreadQuery.data?.unread_count ?? 0

  if (isClient) return <ClientTodayDashboard user={user} />

  return (
    <div className="space-y-6">
      <HeroCard login={user?.login} email={user?.email} roleLabel={user?.role === 'trainer' ? 'Тренер' : 'Пользователь'} />
      <QuickActionsSection
        relationsPath="/clients"
        relationsSectionLabel="Клиенты и связи"
        unreadCount={unreadCount}
      />
    </div>
  )
}

function ClientTodayDashboard({ user }: { user: AuthUser }) {
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
  const preview = unreadConversation
    ? formatLastMessagePreview(unreadConversation.last_message, user.user_id)
    : null
  const messagePath = unreadConversation
    ? APP_PATHS.messageThread.replace(':conversationId', unreadConversation.conversation_id)
    : APP_PATHS.messages
  const planSourceLabel =
    model.activePlan?.source === 'system'
      ? 'Самостоятельно'
      : model.activeTrainerDisplay || model.activePlan?.trainer_user_id || 'Тренер'
  const generationSource = model.hasActiveTrainer ? 'trainer' : 'system'
  const generationEnabled = model.hasActiveTrainer
    ? model.canGenerateTrainerPlan
    : model.canGenerateSystemPlan
  const busy = model.completeDayMutation.isPending || model.replaceExerciseMutation.isPending

  const finishWorkout = () => {
    if (!model.todayWorkout || model.todayWorkout.is_completed) return
    model.completeDayMutation.mutate(model.todayWorkout.day_index, {
      onSuccess: workoutSession.finish,
    })
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
        onCollapse={workoutSession.collapse}
        onToggleChecked={workoutSession.toggleChecked}
        onReplaceExercise={(lineId) =>
          model.replaceExerciseMutation.mutate({
            dayIndex: model.todayWorkout!.day_index,
            lineId,
          })
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
    <div className="mx-auto w-full max-w-lg space-y-4 md:max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Сегодня</h1>
        <p className="text-sm text-secondary-foreground">Тренировка и следующий шаг на день</p>
      </div>

      {unreadCount > 0 ? (
        <Link
          to={messagePath}
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <MessageSquare size={18} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Новых сообщений: {unreadCount}</div>
            {preview && preview !== 'Нет сообщений' ? (
              <div className="truncate text-xs text-secondary-foreground">{preview}</div>
            ) : null}
          </div>
          <span className="text-xs font-medium text-primary">Открыть</span>
        </Link>
      ) : null}

      {initialLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}

      {model.hasNoProfile || (model.profile && !model.questionnaireReady) ? (
        <Card className="border-primary/25">
          <CardHeader>
            <CardTitle>Заверши профиль</CardTitle>
            <CardDescription>Ответы помогут подобрать безопасный и подходящий план тренировок.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="h-12 w-full">
              <Link to={APP_PATHS.profileOnboarding}>Продолжить заполнение</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {model.hasProfileError ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить профиль"
          onRetry={() => void model.profileQuery.refetch()}
        >
          {null}
        </QueryState>
      ) : null}

      {model.questionnaireReady && !model.hasActivePlan && !model.activePlanQuery.isLoading ? (
        <Card className="border-primary/30 bg-gradient-to-b from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle>Начни тренироваться</CardTitle>
            <CardDescription>
              {model.hasActiveTrainer
                ? `Создай план от ${model.activeTrainerDisplay || 'тренера'} по своей анкете.`
                : 'Создай самостоятельный план по своей анкете.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full"
              disabled={!generationEnabled}
              onClick={() => model.runGenerate(generationSource)}
            >
              {model.generatePlanMutation.isPending
                ? 'Генерируем…'
                : model.hasActiveTrainer
                  ? 'Создать план тренера'
                  : 'Тренироваться самостоятельно'}
            </Button>
            {!model.hasActiveTrainer ? (
              <p className="text-center text-sm text-secondary-foreground">
                Или{' '}
                <Link className="text-primary underline-offset-2 hover:underline" to={APP_PATHS.trainers}>
                  выбрать тренера
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {model.hasActivePlan ? (
        <>
          <WeekStrip
            days={daySelection.weekDays}
            focusedDayId={daySelection.focusedDayId}
            todayIso={model.todayIso}
            onSelectDay={setSelectedDayId}
          />
          <TodayWorkoutCard
            selection={daySelection}
            todayIso={model.todayIso}
            todayWorkout={model.todayWorkout}
            todayLoading={model.todayWorkoutQuery.isLoading}
            todayMissing={model.hasNoTodayWorkout}
            todayError={model.todayWorkoutQuery.isError}
            planSourceLabel={planSourceLabel}
            onStartWorkout={workoutSession.start}
            onRetry={() => void model.todayWorkoutQuery.refetch()}
            restAction={
              <Button asChild variant="secondary" className="w-full">
                <Link to={APP_PATHS.planGeneration}>Посмотреть расписание</Link>
              </Button>
            }
          />
          {model.showNextCycleCta ? (
            <Card className="border-primary/30 bg-primary/10">
              <CardContent className="space-y-3 p-4">
                <div>
                  <div className="font-semibold">Цикл завершён</div>
                  <p className="text-sm text-secondary-foreground">
                    {model.currentAdherence != null ? `Выполнено ${model.currentAdherence}% плана. ` : ''}
                    Можно переходить к следующему циклу.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!generationEnabled}
                  onClick={() => model.runGenerate(generationSource)}
                >
                  <RefreshCw size={16} />
                  {model.generatePlanMutation.isPending ? 'Генерируем…' : 'Следующий цикл'}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
