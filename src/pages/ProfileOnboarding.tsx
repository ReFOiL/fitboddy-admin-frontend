import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, Dumbbell, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { ProfileFormField, ProfileSelectField } from '../components/profile'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Textarea } from '../components/ui/textarea'
import { AlertBanner, QueryState } from '../components/shared'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import {
  buildUpsertProfileRequest,
  emptyProfileFormValues,
  isKnownProfileOption,
  profileSchema,
  profileToFormValues,
  type ProfileFormValues,
} from '../lib/profile-schema'

type WizardStep = 1 | 2 | 3

type StoredOnboardingState = {
  step: WizardStep
  draft: Partial<ProfileFormValues>
  completed?: boolean
}

export const PROFILE_ONBOARDING_STORAGE_PREFIX = 'fitboddy:profile-onboarding:'

function readStoredState(key: string): StoredOnboardingState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? '') as Partial<StoredOnboardingState>
    const step = parsed.step === 2 || parsed.step === 3 ? parsed.step : 1
    return {
      step,
      draft: parsed.draft && typeof parsed.draft === 'object' ? parsed.draft : {},
      completed: parsed.completed === true,
    }
  } catch {
    return { step: 1, draft: {} }
  }
}

function saveStoredState(key: string, state: StoredOnboardingState) {
  sessionStorage.setItem(key, JSON.stringify(state))
}

export function ProfileOnboardingPage() {
  const { user } = useAuth()
  const userId = user?.user_id ?? ''
  const storageKey = `${PROFILE_ONBOARDING_STORAGE_PREFIX}${userId || 'anonymous'}`
  const initialState = useMemo(() => readStoredState(storageKey), [storageKey])
  const [step, setStep] = useState<WizardStep>(initialState.step)
  const [completed, setCompleted] = useState(initialState.completed === true)
  const profileHydrated = useRef(false)
  const { profileQuery, metaQuery, draftMutation, upsertMutation } = useProfile(userId)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ...emptyProfileFormValues, ...initialState.draft },
  })
  const age = useWatch({ control: form.control, name: 'age' })
  const gender = useWatch({ control: form.control, name: 'gender' })
  const goal = useWatch({ control: form.control, name: 'goal' })
  const level = useWatch({ control: form.control, name: 'experience_level' })
  const location = useWatch({ control: form.control, name: 'workout_location' })
  const draft = useWatch({ control: form.control })

  useEffect(() => {
    if (!profileQuery.data || profileHydrated.current) return
    profileHydrated.current = true
    form.reset({
      ...profileToFormValues(profileQuery.data),
      ...readStoredState(storageKey).draft,
    })
  }, [form, profileQuery.data, storageKey])

  useEffect(() => {
    saveStoredState(storageKey, { step, draft, completed })
  }, [completed, draft, step, storageKey])

  const validateCurrentStep = async (): Promise<boolean> => {
    if (step === 1) {
      const valid = await form.trigger('full_name')
      if (!form.getValues('full_name')?.trim()) {
        form.setError('full_name', { type: 'manual', message: 'Укажи имя' })
        return false
      }
      return valid
    }

    if (step === 2) {
      if (!metaQuery.data) {
        form.setError('goal', { type: 'manual', message: 'Не удалось загрузить параметры профиля' })
        return false
      }
      const values = form.getValues()
      const required: Array<['goal' | 'experience_level' | 'workout_location', string | null, string]> = [
        ['goal', values.goal, 'Выбери цель'],
        ['experience_level', values.experience_level, 'Выбери уровень'],
        ['workout_location', values.workout_location, 'Выбери место тренировок'],
      ]
      for (const [field, value, message] of required) {
        if (!value) {
          form.setError(field, { type: 'manual', message })
          return false
        }
      }
      if (!isKnownProfileOption(values.goal, metaQuery.data.goals)) {
        form.setError('goal', { type: 'manual', message: 'Выбери цель из списка' })
        return false
      }
      if (!isKnownProfileOption(values.experience_level, metaQuery.data.levels)) {
        form.setError('experience_level', { type: 'manual', message: 'Выбери уровень из списка' })
        return false
      }
      if (!isKnownProfileOption(values.workout_location, metaQuery.data.workout_locations)) {
        form.setError('workout_location', { type: 'manual', message: 'Выбери место из списка' })
        return false
      }
      return true
    }

    const valid = await form.trigger(['age', 'gender', 'limitations', 'medical_notes'])
    if (form.getValues('age') == null) {
      form.setError('age', { type: 'manual', message: 'Укажи возраст' })
      return false
    }
    if (!form.getValues('gender')) {
      form.setError('gender', { type: 'manual', message: 'Выбери пол' })
      return false
    }
    if (metaQuery.data && !isKnownProfileOption(form.getValues('gender'), metaQuery.data.genders)) {
      form.setError('gender', { type: 'manual', message: 'Выбери пол из списка' })
      return false
    }
    return valid
  }

  const saveStep = async () => {
    if (!(await validateCurrentStep())) return
    const draft = form.getValues()

    if (step < 3) {
      const payload =
        step === 1
          ? { full_name: (draft.full_name ?? '').trim() || null }
          : {
              goal: draft.goal,
              experience_level: draft.experience_level,
              workout_location: draft.workout_location,
            }
      try {
        await draftMutation.mutateAsync(payload)
      } catch {
        return
      }
      const nextStep = (step + 1) as WizardStep
      setStep(nextStep)
      saveStoredState(storageKey, { step: nextStep, draft })
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      return
    }

    const payload = buildUpsertProfileRequest(profileQuery.data, draft)
    upsertMutation.mutate(payload, {
      onSuccess: () => {
        setCompleted(true)
        saveStoredState(storageKey, { step: 3, draft, completed: true })
      },
    })
  }

  if (profileQuery.isLoading && !profileQuery.data) {
    return <Skeleton className="mx-auto h-80 w-full max-w-lg rounded-2xl" />
  }

  if (completed) {
    return (
      <Card className="mx-auto w-full max-w-lg border-primary/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check size={24} />
          </div>
          <CardTitle>Профиль готов</CardTitle>
          <CardDescription>Выбери, как хочешь начать тренироваться.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button asChild size="lg" className="h-12 w-full">
            <Link to={APP_PATHS.planGeneration}>Создать план</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-12 w-full">
            <Link to={APP_PATHS.trainers}>Выбрать тренера</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {profileQuery.isError ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить профиль"
          onRetry={() => void profileQuery.refetch()}
        >
          {null}
        </QueryState>
      ) : null}
      {draftMutation.isError || upsertMutation.isError ? (
        <AlertBanner tone="destructive" title="Не удалось сохранить ответы" role="alert">
          Проверьте соединение и попробуйте ещё раз.
        </AlertBanner>
      ) : null}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Настройка профиля</span>
          <span className="text-secondary-foreground">Шаг {step} из 3</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Прогресс заполнения профиля"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>
            {step === 1 ? 'Как тебя зовут?' : step === 2 ? 'Расскажи о тренировках' : 'Последние детали'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Фото и город можно добавить позже в профиле.'
              : step === 2
                ? 'Ответы помогут подобрать подходящую нагрузку.'
                : 'Ограничения и медицинские заметки можно не заполнять.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void saveStep()
            }}
          >
            {step === 1 ? (
              <ProfileFormField id="onboarding_full_name" label="Имя и фамилия" error={form.formState.errors.full_name?.message}>
                <Input
                  id="onboarding_full_name"
                  autoFocus
                  autoComplete="name"
                  placeholder="Например: Иван Иванов"
                  {...form.register('full_name')}
                />
              </ProfileFormField>
            ) : null}

            {step === 2 ? (
              <>
                {metaQuery.isError ? (
                  <QueryState
                    isError
                    errorTitle="Не удалось загрузить варианты"
                    onRetry={() => void metaQuery.refetch()}
                  >
                    {null}
                  </QueryState>
                ) : null}
                <ProfileSelectField
                  id="onboarding_goal"
                  label="Цель"
                  value={goal}
                  options={metaQuery.data?.goals ?? []}
                  placeholder="Выбери цель..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) => form.setValue('goal', value, { shouldValidate: true })}
                  error={form.formState.errors.goal?.message}
                />
                <ProfileSelectField
                  id="onboarding_level"
                  label="Уровень"
                  value={level}
                  options={metaQuery.data?.levels ?? []}
                  placeholder="Выбери уровень..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) => form.setValue('experience_level', value, { shouldValidate: true })}
                  error={form.formState.errors.experience_level?.message}
                />
                <ProfileSelectField
                  id="onboarding_location"
                  label="Место тренировок"
                  value={location}
                  options={metaQuery.data?.workout_locations ?? []}
                  placeholder="Выбери место..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) => form.setValue('workout_location', value, { shouldValidate: true })}
                  error={form.formState.errors.workout_location?.message}
                />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileFormField id="onboarding_age" label="Возраст" error={form.formState.errors.age?.message}>
                    <Input
                      id="onboarding_age"
                      type="number"
                      inputMode="numeric"
                      min={10}
                      max={100}
                      value={age ?? ''}
                      onChange={(event) =>
                        form.setValue('age', event.target.value === '' ? null : Number(event.target.value), {
                          shouldValidate: true,
                        })
                      }
                    />
                  </ProfileFormField>
                  <ProfileSelectField
                    id="onboarding_gender"
                    label="Пол"
                    value={gender}
                    options={metaQuery.data?.genders ?? []}
                    placeholder="Выбери пол..."
                    disabled={metaQuery.isLoading}
                    onChange={(value) => form.setValue('gender', value, { shouldValidate: true })}
                    error={form.formState.errors.gender?.message}
                  />
                </div>
                <ProfileFormField id="onboarding_limitations" label="Ограничения" error={form.formState.errors.limitations?.message}>
                  <Textarea
                    id="onboarding_limitations"
                    placeholder="Например: травма колена"
                    {...form.register('limitations')}
                  />
                </ProfileFormField>
                <ProfileFormField id="onboarding_medical_notes" label="Медицинские заметки" error={form.formState.errors.medical_notes?.message}>
                  <Textarea
                    id="onboarding_medical_notes"
                    placeholder="Дополнительная информация"
                    {...form.register('medical_notes')}
                  />
                </ProfileFormField>
              </>
            ) : null}

            <div className="mt-2 flex gap-2">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="h-12 px-4"
                  onClick={() => setStep((step - 1) as WizardStep)}
                >
                  <ArrowLeft size={18} />
                  Назад
                </Button>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className="h-12 flex-1"
                disabled={draftMutation.isPending || upsertMutation.isPending || !userId}
              >
                {draftMutation.isPending || upsertMutation.isPending
                  ? 'Сохраняем…'
                  : step === 3
                    ? 'Завершить'
                    : 'Продолжить'}
                {step === 1 ? <UserRound size={18} /> : step === 2 ? <Dumbbell size={18} /> : null}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
