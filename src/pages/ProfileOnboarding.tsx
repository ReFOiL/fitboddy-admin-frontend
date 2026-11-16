import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { ArrowLeft, Check, Dumbbell } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { ThemeToggle } from '../components/layout/ThemeToggle'
import { GuardianConsentField, HealthDataConsentField, ProfileFormField, ProfileSelectField } from '../components/profile'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Textarea } from '../components/ui/textarea'
import { AlertBanner, QueryState } from '../components/shared'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { rememberGuardianConsent, requiresGuardianConsent } from '../lib/guardian-consent'
import { inviteLandingPath, readPendingInviteCode } from '../lib/invite'
import {
  buildUpsertProfileRequest,
  emptyProfileFormValues,
  isKnownProfileOption,
  profileSchema,
  profileToFormValues,
  reportProfileUpsertBlock,
  type ProfileFormValues,
} from '../lib/profile-schema'

type WizardStep = 1 | 2

// Старая анкета: 1 — только имя, 2 — тренировки, 3 — возраст. Имя теперь на шаге тренировок.
function storedWizardStep(value: unknown, version: unknown): WizardStep {
  if (version === 2) return value === 2 ? 2 : 1
  if (value === 3) return 2
  return 1
}

type StoredOnboardingState = {
  step: WizardStep
  draft: Partial<ProfileFormValues>
  completed?: boolean
  version?: 2
}

export const PROFILE_ONBOARDING_STORAGE_PREFIX = 'fitboddy:profile-onboarding:'

function readStoredState(key: string): StoredOnboardingState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? '') as Partial<StoredOnboardingState>
    const step = storedWizardStep(parsed.step, parsed.version)
    const draft = parsed.draft && typeof parsed.draft === 'object' ? { ...parsed.draft } : {}
    return {
      step,
      // Галочку представителя не восстанавливаем: она не должна быть включена заранее.
      draft: { ...draft, guardian_consent: false },
      completed: parsed.completed === true,
    }
  } catch {
    return { step: 1, draft: {} }
  }
}

function saveStoredState(key: string, state: StoredOnboardingState) {
  sessionStorage.setItem(key, JSON.stringify({ ...state, version: 2 }))
}

export function ProfileOnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.user_id ?? ''
  const storageKey = `${PROFILE_ONBOARDING_STORAGE_PREFIX}${userId || 'anonymous'}`
  const initialState = useMemo(() => readStoredState(storageKey), [storageKey])
  const [step, setStep] = useState<WizardStep>(initialState.step)
  const [completed, setCompleted] = useState(initialState.completed === true)
  const profileHydrated = useRef(false)
  const { profileQuery, metaQuery, upsertMutation } = useProfile(userId)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    defaultValues: { ...emptyProfileFormValues, ...initialState.draft },
  })
  const pendingInviteCode = readPendingInviteCode()
  const age = useWatch({ control: form.control, name: 'age' })
  const gender = useWatch({ control: form.control, name: 'gender' })
  const healthDataConsent = useWatch({ control: form.control, name: 'health_data_consent' })
  const guardianConsent = useWatch({ control: form.control, name: 'guardian_consent' })
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

  useEffect(() => {
    if (!completed || !pendingInviteCode) return
    navigate(inviteLandingPath(pendingInviteCode), { replace: true })
  }, [completed, navigate, pendingInviteCode])

  const focusField = (id: string) => {
    document.getElementById(id)?.focus()
  }

  const validateCurrentStep = async (): Promise<boolean> => {
    if (step === 1) {
      const nameOk = await form.trigger('full_name')
      if (!nameOk) {
        focusField('onboarding_full_name')
        return false
      }
      if (!metaQuery.data) {
        form.setError('goal', { type: 'manual', message: 'Не удалось загрузить параметры профиля' })
        focusField('onboarding_goal')
        return false
      }
      const values = form.getValues()
      const required: Array<['goal' | 'experience_level' | 'workout_location', string, string | null, string]> = [
        ['goal', 'onboarding_goal', values.goal, 'Выберите цель'],
        ['experience_level', 'onboarding_level', values.experience_level, 'Выберите уровень'],
        ['workout_location', 'onboarding_location', values.workout_location, 'Выберите место тренировок'],
      ]
      const missing = required.filter(([, , value]) => !value)
      for (const [field, , , message] of missing) {
        form.setError(field, { type: 'manual', message })
      }
      if (missing[0]) {
        focusField(missing[0][1])
        return false
      }
      const known: Array<['goal' | 'experience_level' | 'workout_location', string, string | null, Array<{ value: string }>, string]> = [
        ['goal', 'onboarding_goal', values.goal, metaQuery.data.goals, 'Выберите цель из списка'],
        ['experience_level', 'onboarding_level', values.experience_level, metaQuery.data.levels, 'Выберите уровень из списка'],
        ['workout_location', 'onboarding_location', values.workout_location, metaQuery.data.workout_locations, 'Выберите место из списка'],
      ]
      const unknown = known.find(([, , value, options]) => !isKnownProfileOption(value, options))
      if (unknown) {
        form.setError(unknown[0], { type: 'manual', message: unknown[4] })
        focusField(unknown[1])
        return false
      }
      return true
    }

    const valid = await form.trigger(['age', 'gender', 'limitations', 'medical_notes'])
    if (form.getValues('age') == null) {
      form.setError('age', { type: 'manual', message: 'Укажите возраст' })
      focusField('onboarding_age')
      return false
    }
    if (!form.getValues('gender')) {
      form.setError('gender', { type: 'manual', message: 'Выберите пол' })
      focusField('onboarding_gender')
      return false
    }
    if (metaQuery.data && !isKnownProfileOption(form.getValues('gender'), metaQuery.data.genders)) {
      form.setError('gender', { type: 'manual', message: 'Выберите пол из списка' })
      focusField('onboarding_gender')
      return false
    }
    const built = buildUpsertProfileRequest(profileQuery.data, form.getValues())
    if (!built.ok) {
      reportProfileUpsertBlock(form, built)
      const consentId = built.code === 'guardian_consent' ? 'onboarding_guardian_consent' : 'onboarding_health_data_consent'
      focusField(consentId)
      return false
    }
    form.clearErrors(['health_data_consent', 'guardian_consent'])
    if (!valid) focusField('onboarding_age')
    return valid
  }

  const saveStep = async () => {
    if (!(await validateCurrentStep())) return
    const draft = form.getValues()

    if (step < 2) {
      const nextStep = 2 as WizardStep
      setStep(nextStep)
      saveStoredState(storageKey, { step: nextStep, draft })
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      return
    }

    const built = buildUpsertProfileRequest(profileQuery.data, draft)
    if (!built.ok) {
      reportProfileUpsertBlock(form, built)
      return
    }
    upsertMutation.mutate(built.request, {
      onSuccess: () => {
        rememberGuardianConsent(userId, draft.age, draft.guardian_consent === true)
        setCompleted(true)
        saveStoredState(storageKey, { step: 2, draft: { ...draft, guardian_consent: false }, completed: true })
      },
    })
  }

  const loadErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const isNotFound = loadErrorStatus === 404

  if (profileQuery.isLoading && !profileQuery.data) {
    return <Skeleton className="mx-auto h-80 w-full max-w-lg rounded-2xl" />
  }

  if (completed && pendingInviteCode) {
    return <p className="py-10 text-center text-[17px]">Подключаем к тренеру…</p>
  }

  if (completed) {
    return (
      <Card className="mx-auto w-full max-w-lg border-primary/30">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-end md:hidden">
            <ThemeToggle />
          </div>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-accent-ink">
            <Check size={24} />
          </div>
          <CardTitle>Профиль готов</CardTitle>
          <CardDescription>Выберите, как хотите начать тренироваться.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button asChild size="lg" className="h-12 w-full">
            <Link to={APP_PATHS.home}>Создать план</Link>
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
      {profileQuery.isError && !isNotFound ? (
        <QueryState
          isError
          errorTitle="Не удалось загрузить профиль"
          onRetry={() => void profileQuery.refetch()}
        >
          {null}
        </QueryState>
      ) : null}
      {upsertMutation.isError ? (
        <AlertBanner tone="destructive" title="Не удалось сохранить ответы" role="alert">
          Проверьте соединение и попробуйте ещё раз.
        </AlertBanner>
      ) : null}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Настройка профиля</span>
          <span className="flex items-center gap-2">
            <span className="text-secondary-foreground">Шаг {step} из 2</span>
            <ThemeToggle className="md:hidden" />
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Прогресс заполнения профиля"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 2) * 100}%` }} />
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>
            {step === 1 ? 'Расскажите о тренировках' : 'Последние детали'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Имя можно не указывать. Ответы помогут подобрать нагрузку.'
              : 'Ограничения и медицинские заметки можно не заполнять.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void saveStep()
            }}
          >
            {step === 1 ? (
              <>
              <ProfileFormField
                id="onboarding_full_name"
                label="Имя и фамилия"
                hint="Необязательно"
                error={form.formState.errors.full_name?.message}
              >
                <Input
                  id="onboarding_full_name"
                  autoFocus
                  autoComplete="name"
                  placeholder="например, Иван Иванов"
                  {...form.register('full_name')}
                />
              </ProfileFormField>
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
                  placeholder="Выберите цель..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) => {
                    form.setValue('goal', value, { shouldValidate: true })
                    if (value) form.clearErrors('goal')
                  }}
                  onBlur={() => {
                    if (!form.getValues('goal')) form.setError('goal', { type: 'manual', message: 'Выберите цель' })
                  }}
                  error={form.formState.errors.goal?.message}
                />
                <ProfileSelectField
                  id="onboarding_level"
                  label="Уровень вашей подготовки"
                  value={level}
                  options={metaQuery.data?.levels ?? []}
                  placeholder="Выберите уровень..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) => {
                    form.setValue('experience_level', value, { shouldValidate: true })
                    if (value) form.clearErrors('experience_level')
                  }}
                  onBlur={() => {
                    if (!form.getValues('experience_level')) {
                      form.setError('experience_level', { type: 'manual', message: 'Выберите уровень' })
                    }
                  }}
                  error={form.formState.errors.experience_level?.message}
                />
                <ProfileSelectField
                  id="onboarding_location"
                  label="Место тренировок"
                  value={location}
                  options={metaQuery.data?.workout_locations ?? []}
                  placeholder="Выберите место..."
                  disabled={metaQuery.isLoading}
                  onChange={(value) => {
                    form.setValue('workout_location', value, { shouldValidate: true })
                    if (value) form.clearErrors('workout_location')
                  }}
                  onBlur={() => {
                    if (!form.getValues('workout_location')) {
                      form.setError('workout_location', { type: 'manual', message: 'Выберите место тренировок' })
                    }
                  }}
                  error={form.formState.errors.workout_location?.message}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="order-1">
                    <ProfileFormField id="onboarding_age" label="Возраст" error={form.formState.errors.age?.message}>
                      <Input
                        id="onboarding_age"
                        type="number"
                        inputMode="numeric"
                        min={10}
                        max={100}
                        value={age ?? ''}
                        placeholder="например, 28"
                        onBlur={() => {
                          if (form.getValues('age') == null) {
                            form.setError('age', { type: 'manual', message: 'Укажите возраст' })
                          }
                        }}
                        onChange={(event) => {
                          const nextAge = event.target.value === '' ? null : Number(event.target.value)
                          form.setValue('age', nextAge, { shouldValidate: true, shouldDirty: true })
                          if (nextAge != null) form.clearErrors('age')
                          if (!requiresGuardianConsent(nextAge)) {
                            form.setValue('guardian_consent', false)
                            form.clearErrors('guardian_consent')
                          }
                        }}
                      />
                    </ProfileFormField>
                  </div>
                  <div className="order-3 sm:order-2">
                    <ProfileSelectField
                      id="onboarding_gender"
                      label="Пол"
                      value={gender}
                      options={metaQuery.data?.genders ?? []}
                      placeholder="Выберите пол..."
                      disabled={metaQuery.isLoading}
                      onChange={(value) => {
                        form.setValue('gender', value, { shouldValidate: true })
                        if (value) form.clearErrors('gender')
                      }}
                      onBlur={() => {
                        if (!form.getValues('gender')) form.setError('gender', { type: 'manual', message: 'Выберите пол' })
                      }}
                      error={form.formState.errors.gender?.message}
                    />
                  </div>
                  {requiresGuardianConsent(age) ? (
                    <div className="order-2 sm:order-3 sm:col-span-2">
                      <GuardianConsentField
                        id="onboarding_guardian_consent"
                        checked={guardianConsent === true}
                        error={form.formState.errors.guardian_consent?.message}
                        onCheckedChange={(checked) => {
                          form.setValue('guardian_consent', checked, { shouldDirty: true })
                          if (checked) form.clearErrors('guardian_consent')
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <HealthDataConsentField
                  id="onboarding_health_data_consent"
                  checked={healthDataConsent === true}
                  error={form.formState.errors.health_data_consent?.message}
                  onCheckedChange={(checked) => {
                    form.setValue('health_data_consent', checked, { shouldDirty: true })
                    if (checked) form.clearErrors('health_data_consent')
                  }}
                />
                <ProfileFormField id="onboarding_limitations" label="Ограничения" error={form.formState.errors.limitations?.message}>
                  <Textarea
                    id="onboarding_limitations"
                    placeholder="например, травма колена"
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
                disabled={upsertMutation.isPending || !userId}
              >
                {upsertMutation.isPending ? 'Сохраняем…' : step === 2 ? 'Завершить' : 'Продолжить'}
                {step === 1 ? <Dumbbell size={18} /> : null}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
