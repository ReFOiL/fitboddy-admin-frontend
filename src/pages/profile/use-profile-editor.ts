import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { useAuth } from '../../hooks/use-auth'
import { useProfile } from '../../hooks/use-profile'
import { useUnsavedChangesGuard } from '../../hooks/use-unsaved-changes-guard'
import { rememberGuardianConsent } from '../../lib/guardian-consent'
import {
  buildUpsertProfileRequest,
  emptyProfileFormValues,
  isKnownProfileOption,
  profileSchema,
  profileToFormValues,
  reportProfileUpsertBlock,
  type ProfileFormValues,
} from '../../lib/profile-schema'

export type ProfileSectionId = 'personal' | 'goals' | 'health'

export function useProfileEditor(section: ProfileSectionId) {
  const { user, logoutMutation } = useAuth()
  const targetUserId = user?.user_id ?? ''
  const { profileQuery, metaQuery, upsertMutation, uploadAvatarMutation } = useProfile(targetUserId)
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyProfileFormValues,
  })

  useEffect(() => {
    if (!profileQuery.data) return
    form.reset(profileToFormValues(profileQuery.data))
  }, [form, profileQuery.data])

  const loadErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const isNotFound = loadErrorStatus === 404
  const isForbidden = loadErrorStatus === 403
  const isFormDirty = form.formState.isDirty
  const metaErrorStatus = axios.isAxiosError(metaQuery.error) ? metaQuery.error.response?.status : undefined

  useUnsavedChangesGuard(isFormDirty && !upsertMutation.isPending)

  const submitProfile = form.handleSubmit((values) => {
    const requiredFields: Array<[keyof ProfileFormValues, string | number | null | undefined, string]> = [
      ['age', values.age, 'Для профиля клиента возраст обязателен'],
      ['gender', values.gender, 'Для профиля клиента пол обязателен'],
      ['goal', values.goal, 'Для профиля клиента цель обязательна'],
      ['experience_level', values.experience_level, 'Для профиля клиента уровень обязателен'],
      ['workout_location', values.workout_location, 'Укажите место тренировок'],
    ]
    if (!metaQuery.data) {
      form.setError('goal', {
        type: 'manual',
        message: 'Не удалось загрузить параметры профиля, попробуйте позже',
      })
      return
    }
    const missingField = requiredFields.find(([, value]) => value == null || value === '')
    if (missingField) {
      form.setError(missingField[0], { type: 'manual', message: missingField[2] })
      return
    }

    const optionChecks: Array<[keyof ProfileFormValues, string | null, Array<{ value: string }>, string]> = [
      ['gender', values.gender, metaQuery.data.genders, 'Выберите пол из списка'],
      ['goal', values.goal, metaQuery.data.goals, 'Выберите цель из списка'],
      ['experience_level', values.experience_level, metaQuery.data.levels, 'Выберите уровень из списка'],
      ['workout_location', values.workout_location, metaQuery.data.workout_locations, 'Выберите место тренировок из списка'],
    ]
    const invalidOption = optionChecks.find(([, value, options]) => !isKnownProfileOption(value, options))
    if (invalidOption) {
      form.setError(invalidOption[0], { type: 'manual', message: invalidOption[3] })
      return
    }

    const options =
      section === 'personal'
        ? { preserveHealthFields: true, enforceGuardianConsent: true }
        : section === 'goals'
          ? { preserveHealthFields: true }
          : undefined
    const built = buildUpsertProfileRequest(profileQuery.data, values, options)
    if (!built.ok) {
      reportProfileUpsertBlock(form, built)
      return
    }
    upsertMutation.mutate(built.request, {
      onSuccess: (savedProfile) => {
        rememberGuardianConsent(targetUserId, values.age, values.guardian_consent === true)
        form.reset({
          ...profileToFormValues(savedProfile),
          health_data_consent: values.health_data_consent,
        })
      },
    })
  })

  return {
    form,
    user,
    logoutMutation,
    targetUserId,
    profileQuery,
    metaQuery,
    upsertMutation,
    uploadAvatarMutation,
    submitProfile,
    isNotFound,
    isForbidden,
    isFormDirty,
    metaErrorStatus,
  }
}
