import axios from 'axios'

import { usePlans } from './use-plans'
import { useProfile } from './use-profile'
import { useClientRelations } from './use-relations'
import { isProfileCompleted } from '../lib/profile-completion'

type ClientUser = {
  role?: string
  user_id?: string
} | null | undefined

export function localTodayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useClientPlanModel(user: ClientUser) {
  const isClient = user?.role === 'client'
  const clientUserId = isClient && user?.user_id ? user.user_id : ''
  const { clientActiveRelationQuery } = useClientRelations({ clientUserId })
  const plans = usePlans(clientUserId)
  const profile = useProfile(clientUserId)
  const { activePlanQuery, todayWorkoutQuery, generatePlanMutation } = plans
  const { profileQuery } = profile

  const profileData = profileQuery.data
  const questionnaireReady = isProfileCompleted(profileData)
  const activeTrainerUserId = clientActiveRelationQuery.data?.trainer_user_id ?? ''
  const activeTrainerLogin = clientActiveRelationQuery.data?.trainer_login ?? null
  const activeTrainerDisplay = activeTrainerLogin?.trim() ? activeTrainerLogin : activeTrainerUserId
  const hasNoActiveRelation =
    !clientActiveRelationQuery.isLoading && !clientActiveRelationQuery.isError && !clientActiveRelationQuery.data
  const hasRelationError = clientActiveRelationQuery.isError && !hasNoActiveRelation
  const hasActiveTrainer = Boolean(activeTrainerUserId)

  const profileErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const hasNoProfile = profileErrorStatus === 404
  const hasProfileError = !profileQuery.isLoading && profileQuery.isError && !hasNoProfile
  const activePlanErrorStatus = axios.isAxiosError(activePlanQuery.error)
    ? activePlanQuery.error.response?.status
    : undefined
  const hasNoActivePlan = activePlanErrorStatus === 404
  const activePlan = activePlanQuery.data
  const hasActivePlan = Boolean(!activePlanQuery.isLoading && !hasNoActivePlan && activePlan)
  const todayWorkout = todayWorkoutQuery.data
  const todayErrorStatus = axios.isAxiosError(todayWorkoutQuery.error)
    ? todayWorkoutQuery.error.response?.status
    : undefined
  const hasNoTodayWorkout = todayErrorStatus === 404

  const canGenerateBase = Boolean(
    isClient && clientUserId && questionnaireReady && profileData && !generatePlanMutation.isPending,
  )
  // При активном тренере доступен только его план; без тренера — системный.
  const canGenerateSystemPlan = Boolean(
    canGenerateBase && !hasActiveTrainer && (hasNoActiveRelation || hasRelationError),
  )
  const canGenerateTrainerPlan = Boolean(canGenerateBase && hasActiveTrainer)
  const todayIso = localTodayIso()
  const completedDaysCount = activePlan?.days.filter((day) => day.is_completed).length ?? 0
  const totalPlanDays = activePlan?.days.length ?? 0
  const currentAdherence = totalPlanDays > 0 ? Math.round((completedDaysCount / totalPlanDays) * 100) : null
  const cycleEnded = Boolean(activePlan && todayIso > activePlan.end_date)
  const cycleFullyDone = Boolean(totalPlanDays > 0 && completedDaysCount === totalPlanDays)
  const showNextCycleCta = Boolean(hasActivePlan && (cycleEnded || cycleFullyDone))

  function runGenerate(source: 'trainer' | 'system') {
    if (!clientUserId || !profileData) return
    if (source === 'trainer' && !activeTrainerUserId) return
    if (source === 'system' && hasActiveTrainer) return
    generatePlanMutation.mutate({
      source,
      trainer_user_id: source === 'trainer' ? activeTrainerUserId : undefined,
      user_id: clientUserId,
      goal: profileData.goal ?? 'maintenance',
      level: profileData.experience_level ?? 'intermediate',
      workout_location: profileData.workout_location ?? 'both',
      unavailable_equipment: profileData.unavailable_equipment ?? [],
    })
  }

  return {
    ...plans,
    ...profile,
    clientActiveRelationQuery,
    clientUserId,
    profile: profileData,
    questionnaireReady,
    activeTrainerUserId,
    activeTrainerDisplay,
    hasNoActiveRelation,
    hasRelationError,
    hasActiveTrainer,
    hasNoProfile,
    hasProfileError,
    hasNoActivePlan,
    activePlan,
    hasActivePlan,
    todayWorkout,
    hasNoTodayWorkout,
    canGenerateSystemPlan,
    canGenerateTrainerPlan,
    todayIso,
    completedDaysCount,
    totalPlanDays,
    currentAdherence,
    showNextCycleCta,
    runGenerate,
  }
}
