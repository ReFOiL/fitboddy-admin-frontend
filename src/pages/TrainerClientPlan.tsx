import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { listTrainerExercises } from '../api/exercises'
import { createEmptyPlan, getTrainerClientPlan, replaceDaySlots } from '../api/plan-editor'
import { generatePlan, getActivePlan, queryKeys } from '../api'
import { TrainerPlanEditor } from '../components/plan-editor/TrainerPlanEditor'
import { clientProfilePath } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import { useProfile } from '../hooks/use-profile'
import { useTrainerRelations } from '../hooks'
import { getUserErrorMessage } from '../lib/user-error-message'
import { trainerCatalogGenerateBlockReason } from '../lib/plan-generate-reason'
import {
  CATALOG_DRAFT_CONFIRM,
  cloneEditorDays,
  createEmptyCycle,
  daySlotsPayload,
  dirtyDayIndexes,
  editorDaysEqual,
  editorDaysFromPlan,
  firstDosageError,
  type EditorDay,
} from '../lib/plan-editor-draft'
import { formatTrainerClientCardTitle } from '../lib/relations-formatters'
import { textOrFallback } from '../lib/plan-formatters'
import { Skeleton } from '../components/ui/skeleton'
import type { TrainingPlan } from '../types/plan'

function textOrPlaceholder(value: string | null | undefined): string {
  const normalized = value?.trim()
  return normalized ? normalized : 'Не указано'
}

function planLabel(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim() ?? ''
  if (normalized.length < 2 || normalized.length > 32) return fallback
  return normalized
}

function isActivePlanConflict(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
  return typeof detail === 'string' && detail.toLowerCase().includes('already has an active plan')
}

export function TrainerClientPlanPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer && user?.user_id ? user.user_id : ''
  const params = useParams()
  const clientUserId = (params.clientUserId ?? '').trim()
  const queryClient = useQueryClient()

  const { trainerClientsQuery } = useTrainerRelations({ trainerUserId })
  const trainerClients = useMemo(
    () => (Array.isArray(trainerClientsQuery.data) ? trainerClientsQuery.data : []),
    [trainerClientsQuery.data],
  )
  const relation = trainerClients.find((item) => item.client_user_id === clientUserId)
  const clientKnown = Boolean(relation)
  const clientName = relation ? formatTrainerClientCardTitle(relation) : 'Клиент'

  const { profileQuery, metaQuery } = useProfile(clientKnown ? clientUserId : '')
  const profile = profileQuery.data
  const profileErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const profileMissing = profileErrorStatus === 404
  const levelLabel =
    metaQuery.data?.levels.find((item) => item.value === profile?.experience_level)?.label ??
    textOrPlaceholder(profile?.experience_level)

  const trainerPlanQuery = useQuery({
    queryKey: queryKeys.plans.trainerClient(clientUserId, trainerUserId),
    queryFn: async () => getTrainerClientPlan(clientUserId, trainerUserId),
    enabled: Boolean(clientUserId && trainerUserId && clientKnown),
    retry: false,
  })
  const trainerPlanStatus = axios.isAxiosError(trainerPlanQuery.error) ? trainerPlanQuery.error.response?.status : undefined
  const hasNoTrainerPlan = trainerPlanStatus === 404
  const ownedPlan = hasNoTrainerPlan ? undefined : trainerPlanQuery.data

  const anyActiveQuery = useQuery({
    queryKey: queryKeys.plans.activeByUser(clientUserId),
    queryFn: async () => getActivePlan(clientUserId),
    enabled: Boolean(clientUserId && clientKnown),
    retry: false,
  })
  const anyActiveStatus = axios.isAxiosError(anyActiveQuery.error) ? anyActiveQuery.error.response?.status : undefined
  const hasNoActivePlan = anyActiveStatus === 404
  const anyActivePlan = hasNoActivePlan ? undefined : anyActiveQuery.data
  const foreignPlan = Boolean(anyActivePlan && !ownedPlan)

  const catalogQuery = useQuery({
    queryKey: queryKeys.exercises.trainerCatalog(trainerUserId, false),
    queryFn: async () => listTrainerExercises(trainerUserId, false),
    enabled: Boolean(trainerUserId && clientKnown),
  })
  const catalog = useMemo(
    () => (Array.isArray(catalogQuery.data) ? catalogQuery.data : []).filter((exercise) => exercise.is_active),
    [catalogQuery.data],
  )

  const [draftDays, setDraftDays] = useState<EditorDay[] | null>(null)
  const [baselineDays, setBaselineDays] = useState<EditorDay[] | null>(null)
  const [scopeClientId, setScopeClientId] = useState(clientUserId)

  if (scopeClientId !== clientUserId) {
    setScopeClientId(clientUserId)
    setDraftDays(null)
    setBaselineDays(null)
  }

  if (ownedPlan && ownedPlan.user_id === clientUserId && scopeClientId === clientUserId && draftDays == null) {
    const next = editorDaysFromPlan(ownedPlan)
    setDraftDays(next)
    setBaselineDays(cloneEditorDays(next))
  }

  const isBlankDraft = !ownedPlan && draftDays != null
  const isDirty = draftDays != null && (isBlankDraft || !editorDaysEqual(baselineDays, draftDays))
  const dosageError = draftDays ? firstDosageError(draftDays) : null
  const foreignPlanNotice = foreignPlan
    ? 'У клиента уже есть план другого источника. Собрать из каталога заменит его вашим планом.'
    : null

  const generateReason = trainerCatalogGenerateBlockReason({
    isPending: false,
    profile,
    profileLoading: profileQuery.isLoading,
    profileMissing,
  })

  useUnsavedChangesGuard(isDirty)

  const applySavedPlan = (plan: TrainingPlan) => {
    queryClient.setQueryData(queryKeys.plans.trainerClient(clientUserId, trainerUserId), plan)
    queryClient.setQueryData(queryKeys.plans.activeByUser(clientUserId), plan)
    const next = editorDaysFromPlan(plan)
    setDraftDays(next)
    setBaselineDays(cloneEditorDays(next))
  }

  const invalidatePlanQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.plans.trainerClient(clientUserId, trainerUserId) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.plans.activeByUser(clientUserId) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.plans.today(clientUserId) })
  }

  const saveMutation = useMutation({
    mutationFn: async (days: EditorDay[]) => {
      if (!trainerUserId || !clientUserId) throw new Error('missing user')
      if (foreignPlan) throw new Error('client already has an active plan')
      const creating = !ownedPlan
      if (creating) {
        await createEmptyPlan(clientUserId, trainerUserId, {
          goal: planLabel(profile?.goal, 'maintenance'),
          level: planLabel(profile?.experience_level, 'intermediate'),
          workouts_per_week: Math.min(7, Math.max(1, days.length || 3)),
          day_count: Math.min(28, Math.max(0, days.length)),
        })
      }
      const changed = creating
        ? days.filter((day) => day.slots.length > 0).map((day) => day.dayIndex)
        : dirtyDayIndexes(baselineDays, days)
      for (const dayIndex of changed) {
        const day = days.find((item) => item.dayIndex === dayIndex)
        if (!day) continue
        await replaceDaySlots(clientUserId, trainerUserId, day.dayIndex, {
          slots: daySlotsPayload(day),
        })
      }
      return getTrainerClientPlan(clientUserId, trainerUserId)
    },
    onSuccess: (plan) => {
      applySavedPlan(plan)
      void invalidatePlanQueries()
      toast.success('План сохранён')
    },
    onError: (error) => {
      void invalidatePlanQueries()
      toast.error(
        isActivePlanConflict(error)
          ? 'У клиента уже есть активный план. Замените его сборкой из каталога.'
          : getUserErrorMessage(error, 'Не удалось сохранить план.'),
      )
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !trainerUserId || !clientUserId) throw new Error('missing profile')
      return generatePlan({
        source: 'trainer',
        trainer_user_id: trainerUserId,
        user_id: clientUserId,
        goal: profile.goal ?? 'maintenance',
        level: profile.experience_level ?? 'intermediate',
        workout_location: profile.workout_location ?? 'both',
        unavailable_equipment: profile.unavailable_equipment ?? [],
      })
    },
    onSuccess: (plan) => {
      applySavedPlan(plan)
      void invalidatePlanQueries()
      toast.success('Черновик собран из каталога')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось собрать план из каталога.')),
  })

  const confirmReplace = () => {
    if (!anyActivePlan && !ownedPlan && !isDirty) return true
    return window.confirm(CATALOG_DRAFT_CONFIRM)
  }

  const runGenerate = () => {
    if (generateReason || generateMutation.isPending) return
    if (!confirmReplace()) return
    generateMutation.mutate()
  }

  const runSave = () => {
    if (!draftDays || dosageError || saveMutation.isPending || foreignPlan) return
    saveMutation.mutate(draftDays)
  }

  if (!isTrainer) return <Navigate to="/home" replace />

  if (!clientUserId) return <Navigate to="/clients" replace />

  const planQueriesLoading =
    clientKnown && draftDays == null && (trainerPlanQuery.isLoading || anyActiveQuery.isLoading)
  const ownedPlanPending = Boolean(ownedPlan && ownedPlan.user_id === clientUserId && draftDays == null)

  if (trainerClientsQuery.isLoading || planQueriesLoading || ownedPlanPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (!trainerClientsQuery.isLoading && !clientKnown) {
    return (
      <p className="rounded-xl border border-border/70 bg-secondary/20 px-3 py-4 text-sm text-secondary-foreground">
        Клиент не найден среди активных.
      </p>
    )
  }

  const trainerPlanFailed = trainerPlanQuery.isError && !hasNoTrainerPlan
  const blockingPlanUnknown = !ownedPlan && anyActiveQuery.isError && !hasNoActivePlan
  if (trainerPlanFailed || blockingPlanUnknown) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Не удалось загрузить план клиента.</p>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2"
          onClick={() => {
            void trainerPlanQuery.refetch()
            void anyActiveQuery.refetch()
          }}
        >
          Повторить
        </button>
      </div>
    )
  }

  const showEmpty = !ownedPlan && draftDays == null
  const saveDisabled = saveMutation.isPending || !isDirty || Boolean(dosageError) || draftDays == null || foreignPlan

  return (
    <TrainerPlanEditor
      clientName={clientName}
      levelLabel={levelLabel || textOrFallback(ownedPlan?.level ?? anyActivePlan?.level)}
      trainerUserId={trainerUserId}
      backTo={clientProfilePath(clientUserId)}
      days={showEmpty ? null : draftDays}
      catalog={catalog}
      catalogLoading={catalogQuery.isLoading}
      isDirty={isDirty}
      dosageError={dosageError}
      savePending={saveMutation.isPending}
      saveDisabled={saveDisabled}
      generatePending={generateMutation.isPending}
      generateDisabledReason={generateMutation.isPending ? null : generateReason}
      foreignPlanNotice={foreignPlanNotice}
      canStartEmpty={!foreignPlan}
      onChangeDays={setDraftDays}
      onSave={runSave}
      onGenerate={runGenerate}
      onStartEmpty={(dayCount) => {
        const next = createEmptyCycle(dayCount)
        setDraftDays(next)
        setBaselineDays(null)
      }}
    />
  )
}
