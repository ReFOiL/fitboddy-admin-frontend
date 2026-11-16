import { Link, useNavigate } from 'react-router-dom'

import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useClientPlanModel } from '../hooks/use-client-plan-model'
import { ClientPlanCalendar } from '../components/plan/ClientPlanCalendar'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { QueryState } from '../components/shared'

export function PlanGenerationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isClient = user?.role === 'client'
  const model = useClientPlanModel(user)

  if (!isClient) {
    return <p className="py-8 text-[17px]">Этот раздел доступен только клиентам.</p>
  }

  const loadingPlan =
    (model.clientActiveRelationQuery.isLoading || model.profileQuery.isLoading || model.activePlanQuery.isLoading) &&
    !model.hasActivePlan &&
    !model.hasNoActivePlan

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 md:max-w-3xl">
      <h1 className="text-[28px] font-bold">План</h1>
      <p className="text-[15px] text-secondary-foreground">Расписание дней и упражнений. Тренировку начинаете на главной.</p>

      {loadingPlan ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}

      {model.hasNoProfile || (model.profile && !model.questionnaireReady) ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[17px] font-semibold">Сначала анкета</p>
          <p className="mt-1 text-[15px] text-secondary-foreground">Без неё расписание не собрать.</p>
          <Button asChild type="button" size="lg" className="mt-4 h-12 w-full">
            <Link to={APP_PATHS.profileOnboarding}>Заполнить профиль</Link>
          </Button>
        </div>
      ) : null}

      {model.hasProfileError ? (
        <QueryState isError errorTitle="Не удалось загрузить профиль" onRetry={() => void model.profileQuery.refetch()}>
          {null}
        </QueryState>
      ) : null}

      {model.questionnaireReady && !model.hasActivePlan && !model.activePlanQuery.isLoading ? (
        model.clientActiveRelationQuery.isLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : model.hasActiveTrainer ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[17px] font-semibold">Тренер ещё составляет план</p>
            <p className="mt-1 text-[15px] text-secondary-foreground">Расписание появится, когда план будет готов.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[17px] font-semibold">Расписания пока нет</p>
            <p className="mt-1 text-[15px] text-secondary-foreground">Самостоятельный план собирается на главной.</p>
            <Button asChild variant="secondary" className="mt-4 h-12 w-full">
              <Link to={APP_PATHS.home}>На главную</Link>
            </Button>
          </div>
        )
      ) : null}

      {model.hasActivePlan ? (
        <>
          {model.activePlan?.source === 'trainer' &&
          model.activePlan.trainer_user_id &&
          model.activePlan.trainer_user_id !== model.activeTrainerUserId ? (
            <p className="rounded-2xl border border-border bg-card px-4 py-3 text-[17px]">
              План составлен предыдущим тренером и остаётся у вас без изменений.
            </p>
          ) : null}

          {model.activePlan ? (
            <ClientPlanCalendar
              plan={model.activePlan}
              todayIso={model.todayIso}
              trainerUserId={model.activePlan.trainer_user_id}
              onStartToday={() => navigate(APP_PATHS.home, { state: { startWorkout: true } })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
