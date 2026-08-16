import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { CheckCircle2, Dumbbell, HeartPulse, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { ProfileFormField, ProfileSelectField } from '../components/profile'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Textarea } from '../components/ui/textarea'
import { AlertBanner, QueryState } from '../components/shared'
import {
  buildUpsertProfileRequest,
  emptyProfileFormValues,
  isKnownProfileOption,
  profileSchema,
  profileToFormValues,
  type ProfileFormValues,
} from '../lib/profile-schema'

export function ProfilePage() {
  const { user } = useAuth()
  const targetUserId = user?.user_id ?? ''
  const { profileQuery, metaQuery, upsertMutation, uploadAvatarMutation } = useProfile(targetUserId)

  const goalOptions = metaQuery.data?.goals ?? []
  const levelOptions = metaQuery.data?.levels ?? []
  const locationOptions = metaQuery.data?.workout_locations ?? []
  const genderOptions = metaQuery.data?.genders ?? []

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
  const avatarUrl = useWatch({ control: form.control, name: 'avatar_url' })
  const watchedAge = useWatch({ control: form.control, name: 'age' })
  const watchedGender = useWatch({ control: form.control, name: 'gender' })
  const watchedGoal = useWatch({ control: form.control, name: 'goal' })
  const watchedExperienceLevel = useWatch({ control: form.control, name: 'experience_level' })
  const watchedWorkoutLocation = useWatch({ control: form.control, name: 'workout_location' })
  const isTrainerOwnProfile = user?.role === 'trainer'
  const questionnaireRequired = !isTrainerOwnProfile
  const isFormDirty = form.formState.isDirty
  const metaErrorStatus = axios.isAxiosError(metaQuery.error) ? metaQuery.error.response?.status : undefined
  const fieldDescription = (field: keyof ProfileFormValues) =>
    form.formState.errors[field]?.message ? `${field}-error` : undefined

  useUnsavedChangesGuard(isFormDirty && !upsertMutation.isPending)

  const submitProfile = form.handleSubmit((values) => {
    if (questionnaireRequired && !metaQuery.data) {
      form.setError('goal', {
        type: 'manual',
        message: 'Не удалось загрузить параметры профиля, попробуй позже',
      })
      return
    }

    if (questionnaireRequired) {
      const requiredFields: Array<[keyof ProfileFormValues, string | number | null | undefined, string]> = [
        ['age', values.age, 'Для профиля клиента возраст обязателен'],
        ['gender', values.gender, 'Для профиля клиента пол обязателен'],
        ['goal', values.goal, 'Для профиля клиента цель обязательна'],
        ['experience_level', values.experience_level, 'Для профиля клиента уровень обязателен'],
        ['workout_location', values.workout_location, 'Укажи место тренировок'],
      ]
      const missingField = requiredFields.find(([, value]) => value == null || value === '')
      if (missingField) {
        form.setError(missingField[0], { type: 'manual', message: missingField[2] })
        return
      }
    }

    const optionChecks: Array<[keyof ProfileFormValues, string | null, Array<{ value: string }>, string]> = [
      ['gender', values.gender, genderOptions, 'Выбери пол из списка'],
      ['goal', values.goal, goalOptions, 'Выбери цель из списка'],
      ['experience_level', values.experience_level, levelOptions, 'Выбери уровень из списка'],
      ['workout_location', values.workout_location, locationOptions, 'Выбери место тренировок из списка'],
    ]
    const invalidOption = optionChecks.find(([, value, options]) => !isKnownProfileOption(value, options))
    if (invalidOption) {
      form.setError(invalidOption[0], { type: 'manual', message: invalidOption[3] })
      return
    }

    upsertMutation.mutate(buildUpsertProfileRequest(profileQuery.data, values), {
      onSuccess: (savedProfile) => form.reset(profileToFormValues(savedProfile)),
    })
  })

  if (profileQuery.isLoading && !profileQuery.data) {
    return <Skeleton className="h-96 w-full rounded-2xl" />
  }

  return (
    <form className="space-y-5 pb-40 md:pb-0" onSubmit={submitProfile} noValidate>
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Настройки профиля</h1>
        <p className="mt-1 max-w-2xl text-sm text-secondary-foreground sm:text-base">
          {isTrainerOwnProfile
            ? 'Обновляйте данные, которые видят ваши клиенты.'
            : 'Поддерживайте данные актуальными — они используются при подборе нагрузки и составлении планов.'}
        </p>
      </header>

      {isNotFound ? (
        <AlertBanner title="Профиль пока не создан">
          Заполните данные и сохраните их.
        </AlertBanner>
      ) : null}
      {isForbidden ? (
        <AlertBanner tone="destructive" title="Нет доступа к профилю" role="alert" />
      ) : null}
      {profileQuery.isError && !isNotFound && !isForbidden ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить профиль"
          onRetry={() => void profileQuery.refetch()}
        >
          {null}
        </QueryState>
      ) : null}
      {upsertMutation.isError ? (
        <AlertBanner tone="destructive" title="Не удалось сохранить профиль" role="alert">
          Проверьте поля и нажмите «Сохранить» ещё раз.
        </AlertBanner>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound size={19} className="text-primary" aria-hidden />
            Личные данные
          </CardTitle>
          <CardDescription>Имя, фото и информация, которая помогает узнать вас.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ProfileFormField id="full_name" label="Имя и фамилия" error={form.formState.errors.full_name?.message}>
            <Input
              id="full_name"
              autoComplete="name"
              aria-invalid={Boolean(form.formState.errors.full_name)}
              aria-describedby={fieldDescription('full_name')}
              placeholder="Например: Иван Иванов"
              {...form.register('full_name')}
            />
          </ProfileFormField>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <ProfileFormField
              id="avatar_upload"
              label="Фото профиля"
              hint="JPG, PNG или WebP, до 5 МБ."
              error={form.formState.errors.avatar_url?.message}
            >
              <Input
                id="avatar_upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                aria-describedby={form.formState.errors.avatar_url ? 'avatar_upload-error' : 'avatar_upload-hint'}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file || !targetUserId) return
                  uploadAvatarMutation.mutate(file, {
                    onSuccess: (payload) => {
                      form.setValue('avatar_url', payload.avatar_url, { shouldDirty: false, shouldValidate: true })
                    },
                  })
                  event.currentTarget.value = ''
                }}
                disabled={!targetUserId || uploadAvatarMutation.isPending}
              />
            </ProfileFormField>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Текущее фото профиля"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFormField id="city" label="Город" error={form.formState.errors.city?.message}>
              <Input
                id="city"
                autoComplete="address-level2"
                aria-invalid={Boolean(form.formState.errors.city)}
                aria-describedby={fieldDescription('city')}
                placeholder="Например: Москва"
                {...form.register('city')}
              />
            </ProfileFormField>
            {!isTrainerOwnProfile ? (
              <ProfileFormField id="age" label="Возраст" error={form.formState.errors.age?.message}>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={100}
                  step={1}
                  value={watchedAge ?? ''}
                  aria-invalid={Boolean(form.formState.errors.age)}
                  aria-describedby={fieldDescription('age')}
                  onChange={(event) =>
                    form.setValue('age', event.target.value === '' ? null : Number(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </ProfileFormField>
            ) : null}
          </div>

          {!isTrainerOwnProfile ? (
            <ProfileSelectField
              id="gender"
              label="Пол"
              value={watchedGender}
              options={genderOptions}
              placeholder="Выберите пол..."
              disabled={metaQuery.isLoading}
              onChange={(value) => form.setValue('gender', value, { shouldDirty: true, shouldValidate: true })}
              error={form.formState.errors.gender?.message}
            />
          ) : null}

          <ProfileFormField id="bio" label="О себе" error={form.formState.errors.bio?.message}>
            <Textarea
              id="bio"
              aria-invalid={Boolean(form.formState.errors.bio)}
              aria-describedby={fieldDescription('bio')}
              placeholder={isTrainerOwnProfile ? 'Расскажите о специализации и опыте.' : 'Коротко о себе и своих целях.'}
              {...form.register('bio')}
            />
          </ProfileFormField>
        </CardContent>
      </Card>

      {!isTrainerOwnProfile ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell size={19} className="text-primary" aria-hidden />
                Параметры тренировок
              </CardTitle>
              <CardDescription>Эти настройки влияют на содержание и сложность плана.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ProfileSelectField
                id="goal"
                label="Цель"
                value={watchedGoal}
                options={goalOptions}
                placeholder="Выберите цель..."
                disabled={metaQuery.isLoading}
                onChange={(value) => form.setValue('goal', value, { shouldDirty: true, shouldValidate: true })}
                error={form.formState.errors.goal?.message}
              />
              <ProfileSelectField
                id="experience_level"
                label="Уровень подготовки"
                value={watchedExperienceLevel}
                options={levelOptions}
                placeholder="Выберите уровень..."
                disabled={metaQuery.isLoading}
                onChange={(value) =>
                  form.setValue('experience_level', value, { shouldDirty: true, shouldValidate: true })
                }
                error={form.formState.errors.experience_level?.message}
              />
              <div className="sm:col-span-2">
                <ProfileSelectField
                  id="workout_location"
                  label="Место тренировок"
                  value={watchedWorkoutLocation}
                  options={locationOptions}
                  placeholder="Выберите место..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) =>
                    form.setValue('workout_location', value, { shouldDirty: true, shouldValidate: true })
                  }
                  error={form.formState.errors.workout_location?.message}
                />
              </div>
              {metaErrorStatus ? (
                <div className="sm:col-span-2">
                  <QueryState
                    isError
                    errorTitle="Не удалось загрузить варианты"
                    onRetry={() => void metaQuery.refetch()}
                  >
                    {null}
                  </QueryState>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse size={19} className="text-primary" aria-hidden />
                Здоровье и ограничения
              </CardTitle>
              <CardDescription>Укажите всё, что нужно учитывать для безопасных тренировок.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ProfileFormField
                id="limitations"
                label="Ограничения"
                hint="Например, травмы или движения, которых следует избегать."
                error={form.formState.errors.limitations?.message}
              >
                <Textarea
                  id="limitations"
                  aria-invalid={Boolean(form.formState.errors.limitations)}
                  aria-describedby={
                    form.formState.errors.limitations ? 'limitations-error' : 'limitations-hint'
                  }
                  placeholder="Например: травма колена"
                  {...form.register('limitations')}
                />
              </ProfileFormField>
              <ProfileFormField
                id="medical_notes"
                label="Медицинские заметки"
                hint="Необязательное поле. Не указывайте лишние персональные медицинские данные."
                error={form.formState.errors.medical_notes?.message}
              >
                <Textarea
                  id="medical_notes"
                  aria-invalid={Boolean(form.formState.errors.medical_notes)}
                  aria-describedby={
                    form.formState.errors.medical_notes ? 'medical_notes-error' : 'medical_notes-hint'
                  }
                  placeholder="Дополнительная информация"
                  {...form.register('medical_notes')}
                />
              </ProfileFormField>
            </CardContent>
          </Card>
        </>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span
            className={isFormDirty ? 'text-sm font-medium text-foreground' : 'text-sm text-secondary-foreground'}
            aria-live="polite"
          >
            {isFormDirty ? 'Есть изменения' : 'Сохранено'}
          </span>
          {!isFormDirty ? <CheckCircle2 size={17} className="text-primary" aria-hidden /> : null}
          <Button
            type="submit"
            size="lg"
            className="ml-auto min-w-40"
            disabled={upsertMutation.isPending || !targetUserId || !isFormDirty}
          >
            {upsertMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </form>
  )
}
