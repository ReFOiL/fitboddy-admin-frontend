import axios from 'axios'
import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useClientRelations } from '../hooks/use-relations'
import { usePlans } from '../hooks/use-plans'
import { isProfileCompleted } from '../lib/profile-completion'
import { ClientPlanGeneratorCard, HeroCard, QuickActionsSection } from '../components/dashboard'

export function DashboardPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const relationsPath = isClient ? '/trainers' : '/clients'
  const relationsSectionLabel = isClient ? 'Тренеры и связи' : 'Клиенты и связи'
  const roleLabel =
    user?.role === 'trainer' ? 'Тренер' : user?.role === 'client' ? 'Клиент' : 'Пользователь'
  const [goal, setGoal] = useState('maintenance')
  const [level, setLevel] = useState('intermediate')
  const [workoutLocation, setWorkoutLocation] = useState('home')
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const { clientActiveRelationQuery } = useClientRelations({ clientUserId: user?.user_id ?? '' })
  const hasNoActiveRelation =
    !clientActiveRelationQuery.isLoading && !clientActiveRelationQuery.isError && !clientActiveRelationQuery.data
  const activeTrainerUserId = clientActiveRelationQuery.data?.trainer_user_id ?? ''
  const activeTrainerLogin = clientActiveRelationQuery.data?.trainer_login ?? null
  const activeTrainerDisplay = activeTrainerLogin?.trim() ? activeTrainerLogin : activeTrainerUserId
  const { activePlanQuery, generatePlanMutation } = usePlans(user?.user_id ?? '')
  const ownUserId = user?.user_id ?? ''
  const { profileQuery } = useProfile(ownUserId)
  const profileErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const hasNoProfile = profileErrorStatus === 404
  const questionnaireReady = isProfileCompleted(profileQuery.data)
  const canGeneratePlan = Boolean(user?.user_id && activeTrainerUserId && questionnaireReady && !generatePlanMutation.isPending)
  const hasProfileError = !profileQuery.isLoading && profileQuery.isError && !hasNoProfile
  const hasRelationError = clientActiveRelationQuery.isError && !hasNoActiveRelation

  const activePlanErrorStatus = axios.isAxiosError(activePlanQuery.error) ? activePlanQuery.error.response?.status : undefined
  const hasNoActivePlan = activePlanErrorStatus === 404

  return (
    <div className="space-y-6">
      <HeroCard login={user?.login} email={user?.email} roleLabel={roleLabel} />
      <QuickActionsSection relationsPath={relationsPath} relationsSectionLabel={relationsSectionLabel} />
      {isClient ? (
        <ClientPlanGeneratorCard
          activeTrainerDisplay={activeTrainerDisplay}
          goal={goal}
          level={level}
          workoutLocation={workoutLocation}
          workoutsPerWeek={workoutsPerWeek}
          onGoalChange={setGoal}
          onLevelChange={setLevel}
          onWorkoutLocationChange={setWorkoutLocation}
          onWorkoutsPerWeekChange={setWorkoutsPerWeek}
          onGeneratePlan={() => {
            if (!user?.user_id || !activeTrainerUserId || !questionnaireReady) return
            generatePlanMutation.mutate({
              trainer_user_id: activeTrainerUserId,
              user_id: user.user_id,
              goal,
              level,
              workout_location: workoutLocation,
              workouts_per_week: Math.min(Math.max(workoutsPerWeek, 1), 7),
              equipment: [],
            })
          }}
          canGeneratePlan={canGeneratePlan}
          isGenerating={generatePlanMutation.isPending}
          isRelationLoading={clientActiveRelationQuery.isLoading}
          hasNoActiveRelation={hasNoActiveRelation}
          isProfileLoading={profileQuery.isLoading}
          hasNoProfile={hasNoProfile}
          hasProfileError={hasProfileError}
          isRelationError={hasRelationError}
          isActivePlanLoading={activePlanQuery.isLoading}
          hasNoActivePlan={hasNoActivePlan}
          activePlan={activePlanQuery.data}
        />
      ) : null}
    </div>
  )
}
