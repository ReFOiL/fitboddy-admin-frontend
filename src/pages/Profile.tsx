import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Activity, Check, X } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import { StyledSelect } from '../components/ui/styled-select'
import { cn } from '../lib/utils'

function isValidAvatarReference(value: string): boolean {
  if (!value) return true
  if (value.startsWith('/api/v1/profiles/media/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const profileSchema = z.object({
  full_name: z.string().max(120, 'Максимум 120 символов').optional(),
  avatar_url: z
    .string()
    .max(500, 'Максимум 500 символов')
    .refine(isValidAvatarReference, 'Некорректный URL или media-путь')
    .or(z.literal('')),
  city: z.string().max(120, 'Максимум 120 символов').optional(),
  bio: z.string().max(2000, 'Максимум 2000 символов').optional(),
  goal: z.string().nullable(),
  experience_level: z.string().nullable(),
  workout_location: z.string().nullable(),
  equipment: z.array(z.string()),
  limitations: z.string().max(1000, 'Максимум 1000 символов').optional(),
  medical_notes: z.string().max(1000, 'Максимум 1000 символов').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type SelectOption = { value: string; label: string }

type FancySelectProps = {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  options: SelectOption[]
  placeholder: string
  error?: string
  disabled?: boolean
}

function FancySelect({ id, label, value, onChange, options, placeholder, error, disabled }: FancySelectProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <StyledSelect
        id={id}
        placeholder={placeholder}
        value={value ?? undefined}
        options={options}
        onChange={(nextValue) => onChange(nextValue || null)}
        className={error ? 'border-destructive/60' : undefined}
        disabled={disabled}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}

type ChipsMultiSelectProps = {
  options: SelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

function ChipsMultiSelect({ options, value, onChange, disabled }: ChipsMultiSelectProps) {
  const selected = value.filter((item) => options.some((option) => option.value === item))

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/15 p-3">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => {
            const option = options.find((entry) => entry.value === item)
            if (!option) return null
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((current) => current !== item))}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/20 px-3 py-1 text-xs text-primary-foreground transition',
                  disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-primary/30',
                )}
              >
                <span>{option.label}</span>
                <X size={12} />
              </button>
            )
          })}
        </div>
      ) : (
        <span className="text-xs text-secondary-foreground">Можно оставить пусто, если инвентаря нет.</span>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() =>
                isSelected
                  ? onChange(value.filter((current) => current !== option.value))
                  : onChange([...value, option.value])
              }
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition',
                disabled ? 'cursor-not-allowed opacity-70' : '',
                isSelected
                  ? 'border-primary/60 bg-primary/20 text-primary-foreground shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                  : 'border-border bg-background/70 text-secondary-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {isSelected ? <Check size={12} /> : null}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user } = useAuth()
  const targetUserId = user?.user_id ?? ''
  const { profileQuery, metaQuery, upsertMutation, uploadAvatarMutation } = useProfile(targetUserId)

  const goalOptions = metaQuery.data?.goals ?? []
  const levelOptions = metaQuery.data?.levels ?? []
  const locationOptions = metaQuery.data?.workout_locations ?? []
  const equipmentOptions = metaQuery.data?.equipment ?? []

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      avatar_url: '',
      city: '',
      bio: '',
      goal: null,
      experience_level: null,
      workout_location: null,
      equipment: [],
      limitations: '',
      medical_notes: '',
    },
  })

  useEffect(() => {
    if (!profileQuery.data || typeof profileQuery.data !== 'object') return
    const profile = profileQuery.data as Record<string, unknown>
    form.reset({
      full_name: typeof profile.full_name === 'string' ? profile.full_name : '',
      avatar_url: typeof profile.avatar_url === 'string' ? profile.avatar_url : '',
      city: typeof profile.city === 'string' ? profile.city : '',
      bio: typeof profile.bio === 'string' ? profile.bio : '',
      goal: typeof profile.goal === 'string' ? profile.goal : null,
      experience_level: typeof profile.experience_level === 'string' ? profile.experience_level : null,
      workout_location: typeof profile.workout_location === 'string' ? profile.workout_location : null,
      equipment: Array.isArray(profile.equipment) ? profile.equipment.filter((item): item is string => typeof item === 'string') : [],
      limitations: typeof profile.limitations === 'string' ? profile.limitations : '',
      medical_notes: typeof profile.medical_notes === 'string' ? profile.medical_notes : '',
    })
  }, [form, profileQuery.data])

  const loadErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const isNotFound = loadErrorStatus === 404
  const isForbidden = loadErrorStatus === 403
  const avatarUrl = useWatch({ control: form.control, name: 'avatar_url' })
  const watchedGoal = useWatch({ control: form.control, name: 'goal' })
  const watchedExperienceLevel = useWatch({ control: form.control, name: 'experience_level' })
  const watchedWorkoutLocation = useWatch({ control: form.control, name: 'workout_location' })
  const selectedEquipment = useWatch({ control: form.control, name: 'equipment' }) ?? []
  const isTrainerOwnProfile = user?.role === 'trainer'
  const questionnaireRequired = !isTrainerOwnProfile
  const isFormDirty = form.formState.isDirty
  const metaErrorStatus = axios.isAxiosError(metaQuery.error) ? metaQuery.error.response?.status : undefined

  useEffect(() => {
    if (watchedWorkoutLocation !== 'home' && selectedEquipment.length > 0) {
      form.setValue('equipment', [])
    }
  }, [form, watchedWorkoutLocation, selectedEquipment.length])

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              {isTrainerOwnProfile ? 'Личный профиль тренера' : 'Профиль клиента'}
            </CardTitle>
            <CardDescription>
              {isTrainerOwnProfile
                ? 'Личные данные тренера: имя, фото, город и описание профиля.'
                : 'Заполни ключевую информацию, чтобы тренировки лучше подходили под цели и ограничения.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((values) => {
                const goalValue = values.goal
                const experienceValue = values.experience_level
                const workoutLocationValue = values.workout_location
                const hasMeta = Boolean(metaQuery.data)
                const isKnown = (value: string | null, options: { value: string; label: string }[]): boolean =>
                  value === null || options.some((option) => option.value === value)
                const normalizedEquipment = values.equipment.filter((item) =>
                  equipmentOptions.some((option) => option.value === item),
                )
                if (!hasMeta) {
                  form.setError('goal', { type: 'manual', message: 'Не удалось загрузить параметры профиля, попробуй позже' })
                  return
                }
                if (questionnaireRequired) {
                  if (!goalValue) {
                    form.setError('goal', { type: 'manual', message: 'Для профиля клиента цель обязательна' })
                    return
                  }
                  if (!experienceValue) {
                    form.setError('experience_level', { type: 'manual', message: 'Для профиля клиента уровень обязателен' })
                    return
                  }
                  if (!workoutLocationValue) {
                    form.setError('workout_location', { type: 'manual', message: 'Укажи место тренировок' })
                    return
                  }
                }
                if (!isKnown(goalValue, goalOptions)) {
                  form.setError('goal', { type: 'manual', message: 'Выбери цель из списка' })
                  return
                }
                if (!isKnown(experienceValue, levelOptions)) {
                  form.setError('experience_level', { type: 'manual', message: 'Выбери уровень из списка' })
                  return
                }
                if (!isKnown(workoutLocationValue, locationOptions)) {
                  form.setError('workout_location', { type: 'manual', message: 'Выбери место тренировок из списка' })
                  return
                }
                upsertMutation.mutate({
                  full_name: values.full_name?.trim() ? values.full_name.trim() : null,
                  city: values.city?.trim() ? values.city.trim() : null,
                  bio: values.bio?.trim() ? values.bio.trim() : null,
                  goal: goalValue,
                  experience_level: experienceValue,
                  workout_location: workoutLocationValue,
                  equipment: workoutLocationValue === 'home' ? normalizedEquipment : [],
                  limitations: values.limitations?.trim() ? values.limitations.trim() : null,
                  medical_notes: values.medical_notes?.trim() ? values.medical_notes.trim() : null,
                })
              })}
            >
              {isTrainerOwnProfile ? (
                <span className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-secondary-foreground">
                  Это ваш профиль тренера. Заполните личные данные и фото.
                </span>
              ) : null}
              {isNotFound ? (
                <span className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-secondary-foreground">
                  Профиль пока не создан. Заполни форму и нажми «Сохранить профиль».
                </span>
              ) : null}
              {isForbidden ? (
                <span className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Доступ запрещен.
                </span>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="full_name">Имя и фамилия</Label>
                <Input id="full_name" {...form.register('full_name')} placeholder="Например: Иван Иванов" />
                {form.formState.errors.full_name?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.full_name.message}</span>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="avatar_upload">Фото профиля</Label>
                <Input
                  id="avatar_upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file || !targetUserId) return
                    uploadAvatarMutation.mutate(file, {
                      onSuccess: (payload) => {
                        form.setValue('avatar_url', payload.avatar_url, { shouldDirty: true, shouldValidate: true })
                      },
                    })
                    event.currentTarget.value = ''
                  }}
                  disabled={!targetUserId || uploadAvatarMutation.isPending}
                />
                <span className="text-xs text-secondary-foreground">
                  Поддерживаются JPG/PNG/WebP, до 5MB.
                </span>
                {form.formState.errors.avatar_url?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.avatar_url.message}</span>
                ) : null}
              </div>
              {avatarUrl ? (
                <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                  <div className="mb-2 text-xs text-secondary-foreground">Превью фото</div>
                  <img
                    src={avatarUrl}
                    alt="Аватар пользователя"
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/40"
                  />
                </div>
              ) : null}

              {metaQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : null}

              {metaErrorStatus ? (
                <span className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Не удалось загрузить параметры профиля. Обнови страницу или проверь `profile-service`.
                </span>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="city">Город</Label>
                <Input id="city" {...form.register('city')} placeholder="Сидней" />
                {form.formState.errors.city?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.city.message}</span>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="bio">О себе</Label>
                <textarea
                  id="bio"
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/70"
                  {...form.register('bio')}
                  placeholder="Коротко о себе, опыте и целях."
                />
                {form.formState.errors.bio?.message ? (
                  <span className="text-xs text-destructive">{form.formState.errors.bio.message}</span>
                ) : null}
              </div>

              {!isTrainerOwnProfile ? (
                <>
                  <FancySelect
                    id="goal"
                    label="Цель"
                    value={watchedGoal}
                    options={goalOptions}
                    placeholder="Выбери цель..."
                    onChange={(nextValue) => form.setValue('goal', nextValue, { shouldDirty: true, shouldValidate: true })}
                    error={form.formState.errors.goal?.message}
                  />

                  <FancySelect
                    id="experience_level"
                    label="Уровень"
                    value={watchedExperienceLevel}
                    options={levelOptions}
                    placeholder="Выбери уровень..."
                    onChange={(nextValue) =>
                      form.setValue('experience_level', nextValue, { shouldDirty: true, shouldValidate: true })
                    }
                    error={form.formState.errors.experience_level?.message}
                  />

                  <FancySelect
                    id="workout_location"
                    label="Место тренировок"
                    value={watchedWorkoutLocation}
                    options={locationOptions}
                    placeholder="Выбери место..."
                    onChange={(nextValue) =>
                      form.setValue('workout_location', nextValue, { shouldDirty: true, shouldValidate: true })
                    }
                    error={form.formState.errors.workout_location?.message}
                  />

                  {watchedWorkoutLocation === 'home' ? (
                    <div className="grid gap-2">
                      <Label>Оборудование</Label>
                      <ChipsMultiSelect
                        options={equipmentOptions}
                        value={selectedEquipment}
                        onChange={(nextValue) =>
                          form.setValue('equipment', nextValue, { shouldDirty: true, shouldValidate: true })
                        }
                      />
                      {form.formState.errors.equipment?.message ? (
                        <span className="text-xs text-destructive">{form.formState.errors.equipment.message}</span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-1.5">
                    <Label htmlFor="limitations">Ограничения</Label>
                    <textarea
                      id="limitations"
                      className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/70"
                      {...form.register('limitations')}
                      placeholder="Например: травма колена"
                    />
                    {form.formState.errors.limitations?.message ? (
                      <span className="text-xs text-destructive">{form.formState.errors.limitations.message}</span>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="medical_notes">Медицинские заметки</Label>
                    <textarea
                      id="medical_notes"
                      className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/70"
                      {...form.register('medical_notes')}
                      placeholder="Дополнительная информация"
                    />
                    {form.formState.errors.medical_notes?.message ? (
                      <span className="text-xs text-destructive">{form.formState.errors.medical_notes.message}</span>
                    ) : null}
                  </div>
                </>
              ) : null}

              <Button
                type="submit"
                size="lg"
                disabled={upsertMutation.isPending || !targetUserId || !isFormDirty}
              >
                Сохранить профиль
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
