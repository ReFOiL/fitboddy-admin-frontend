import { CheckCircle2 } from 'lucide-react'
import { type ReactNode } from 'react'
import { useWatch, type FieldErrors } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'

import { StyledUpload } from '../../components/media/StyledUpload'
import { GuardianConsentField, HealthDataConsentField, NotificationSettings, ProfileFormField, ProfileSelectField } from '../../components/profile'
import { AlertBanner, QueryState } from '../../components/shared'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Row, ScreenHeader, StickyActionBar } from '../../components/ui/kit'
import { Skeleton } from '../../components/ui/skeleton'
import { Textarea } from '../../components/ui/textarea'
import { APP_PATHS } from '../../config'
import { notificationsEnabled } from '../../config/features'
import { useAuth } from '../../hooks/use-auth'
import { requiresGuardianConsent } from '../../lib/guardian-consent'
import type { ProfileFormValues } from '../../lib/profile-schema'
import { useProfileEditor, type ProfileSectionId } from './use-profile-editor'

const SECTION_FIELDS: Record<ProfileSectionId, Array<keyof ProfileFormValues>> = {
  personal: ['full_name', 'avatar_url', 'city', 'bio', 'age', 'gender', 'guardian_consent'],
  goals: ['goal', 'experience_level', 'workout_location'],
  health: ['limitations', 'medical_notes', 'health_data_consent', 'guardian_consent'],
}

type Editor = ReturnType<typeof useProfileEditor>

export function ClientProfile({ section }: { section?: string }) {
  switch (section) {
    case undefined:
      return <ClientProfileMenu />
    case 'personal':
      return <ClientPersonalSection />
    case 'goals':
      return <ClientGoalsSection />
    case 'health':
      return <ClientHealthSection />
    case 'notifications':
      return <ClientNotificationsSection />
    default:
      return <Navigate to={APP_PATHS.profile} replace />
  }
}

function ClientProfileMenu() {
  const { logoutMutation } = useAuth()
  const items: Array<{ title: string; href: string }> = [
    { title: 'Личные данные', href: APP_PATHS.profilePersonal },
    { title: 'Цели и уровень', href: APP_PATHS.profileGoals },
    { title: 'Здоровье', href: APP_PATHS.profileHealth },
    { title: 'Веса и инвентарь', href: APP_PATHS.profileTraining },
  ]
  if (notificationsEnabled()) {
    items.push({ title: 'Уведомления', href: APP_PATHS.profileNotifications })
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-8">
      <h1 className="text-[28px] font-bold">Профиль</h1>
      <nav className="mt-2" aria-label="Разделы профиля">
        {items.map((item) => (
          <Row key={item.href} title={item.title} href={item.href} />
        ))}
      </nav>
      <Button
        type="button"
        variant="destructive"
        className="mt-8 w-full"
        disabled={logoutMutation.isPending}
        onClick={() => {
          if (!window.confirm('Выйти из аккаунта?')) return
          logoutMutation.mutate()
        }}
      >
        {logoutMutation.isPending ? 'Выходим…' : 'Выйти'}
      </Button>
    </div>
  )
}

function ClientPersonalSection() {
  return (
    <SectionShell title="Личные данные" section="personal">
      {(editor) => <PersonalFields editor={editor} />}
    </SectionShell>
  )
}

function ClientGoalsSection() {
  return (
    <SectionShell title="Цели и уровень" section="goals">
      {(editor) => <GoalsFields editor={editor} />}
    </SectionShell>
  )
}

function ClientHealthSection() {
  return (
    <SectionShell title="Здоровье" section="health">
      {(editor) => <HealthFields editor={editor} />}
    </SectionShell>
  )
}

function ClientNotificationsSection() {
  const navigate = useNavigate()
  if (!notificationsEnabled()) return <Navigate to={APP_PATHS.profile} replace />
  return (
    <div className="mx-auto w-full max-w-lg">
      <ScreenHeader title="Уведомления" onBack={() => navigate(APP_PATHS.profile)} />
      <p className="mt-4 text-[15px] text-secondary-foreground">Изменения в этом разделе сохраняются сразу.</p>
      <div className="mt-4">
        <NotificationSettings />
      </div>
    </div>
  )
}

function SectionShell({
  title,
  section,
  children,
}: {
  title: string
  section: ProfileSectionId
  children: (editor: Editor) => ReactNode
}) {
  const editor = useProfileEditor(section)
  const navigate = useNavigate()
  const outside = outsideMessages(editor.form.formState.errors, section)

  if (editor.profileQuery.isLoading && !editor.profileQuery.data) {
    return <Skeleton className="h-96 w-full rounded-2xl" />
  }

  return (
    <form className="mx-auto w-full max-w-lg space-y-4 pb-28" onSubmit={editor.submitProfile} noValidate>
      <ScreenHeader title={title} onBack={() => navigate(APP_PATHS.profile)} />
      {editor.isNotFound ? (
        <AlertBanner title="Профиль пока не создан">Заполните данные и сохраните их.</AlertBanner>
      ) : null}
      {editor.isForbidden ? <AlertBanner tone="destructive" title="Нет доступа к профилю" role="alert" /> : null}
      {editor.profileQuery.isError && !editor.isNotFound && !editor.isForbidden ? (
        <QueryState isError errorTitle="Не удалось загрузить профиль" onRetry={() => void editor.profileQuery.refetch()}>
          {null}
        </QueryState>
      ) : null}
      {editor.upsertMutation.isError ? (
        <AlertBanner tone="destructive" title="Не удалось сохранить профиль" role="alert">
          Проверьте поля и нажмите «Сохранить» ещё раз.
        </AlertBanner>
      ) : null}
      {outside.map((message) => (
        <p key={message} className="text-[15px] text-destructive" role="alert">
          {message}
        </p>
      ))}
      <div className="grid gap-4">{children(editor)}</div>
      <StickyActionBar>
        <div className="flex items-center gap-3">
          <span className={editor.isFormDirty ? 'text-sm font-medium' : 'text-sm text-secondary-foreground'} aria-live="polite">
            {editor.isFormDirty ? 'Есть изменения' : 'Сохранено'}
          </span>
          {!editor.isFormDirty ? <CheckCircle2 size={17} className="text-accent-ink" aria-hidden /> : null}
          <Button
            type="submit"
            size="lg"
            className="ml-auto min-w-40"
            disabled={editor.upsertMutation.isPending || !editor.targetUserId || !editor.isFormDirty}
          >
            {editor.upsertMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </StickyActionBar>
    </form>
  )
}

function PersonalFields({ editor }: { editor: Editor }) {
  const { form, uploadAvatarMutation, targetUserId } = editor
  const avatarUrl = useWatch({ control: form.control, name: 'avatar_url' })
  const watchedAge = useWatch({ control: form.control, name: 'age' })
  const watchedGender = useWatch({ control: form.control, name: 'gender' })
  const guardianConsent = useWatch({ control: form.control, name: 'guardian_consent' })
  const genderOptions = editor.metaQuery.data?.genders ?? []

  return (
    <>
      <ProfileFormField id="full_name" label="Имя и фамилия" error={form.formState.errors.full_name?.message}>
        <Input
          id="full_name"
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.full_name)}
          aria-describedby={describedBy(form.formState.errors, 'full_name')}
          placeholder="Например: Иван Иванов"
          {...form.register('full_name')}
        />
      </ProfileFormField>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Фото профиля</p>
        <StyledUpload
          kind="avatar"
          id="avatar_upload"
          accept=".jpg,.jpeg,.png,.webp"
          previewUrl={avatarUrl}
          describedBy={form.formState.errors.avatar_url ? 'avatar_upload-error' : 'avatar_upload-hint'}
          disabled={!targetUserId || uploadAvatarMutation.isPending}
          onFile={(file) => {
            if (!targetUserId) return
            uploadAvatarMutation.mutate(file, {
              onSuccess: (payload) => {
                form.setValue('avatar_url', payload.avatar_url, { shouldDirty: false, shouldValidate: true })
              },
            })
          }}
        />
        <span id="avatar_upload-hint" className="text-xs text-secondary-foreground">
          JPG, PNG или WebP, до 5 МБ.
        </span>
        {form.formState.errors.avatar_url?.message ? (
          <span id="avatar_upload-error" className="text-xs text-destructive" role="alert">
            {form.formState.errors.avatar_url.message}
          </span>
        ) : null}
      </div>
      <ProfileFormField id="city" label="Город" error={form.formState.errors.city?.message}>
        <Input
          id="city"
          autoComplete="address-level2"
          aria-invalid={Boolean(form.formState.errors.city)}
          aria-describedby={describedBy(form.formState.errors, 'city')}
          placeholder="Например: Москва"
          {...form.register('city')}
        />
      </ProfileFormField>
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
          aria-describedby={describedBy(form.formState.errors, 'age')}
          onChange={(event) => {
            const nextAge = event.target.value === '' ? null : Number(event.target.value)
            form.setValue('age', nextAge, { shouldDirty: true, shouldValidate: true })
            if (!requiresGuardianConsent(nextAge)) {
              form.setValue('guardian_consent', false)
              form.clearErrors('guardian_consent')
            }
          }}
        />
      </ProfileFormField>
      {requiresGuardianConsent(watchedAge) ? (
        <GuardianConsentField
          id="guardian_consent"
          checked={guardianConsent === true}
          error={form.formState.errors.guardian_consent?.message}
          onCheckedChange={(checked) => {
            form.setValue('guardian_consent', checked, { shouldDirty: true })
            if (checked) form.clearErrors('guardian_consent')
          }}
        />
      ) : null}
      <ProfileSelectField
        id="gender"
        label="Пол"
        value={watchedGender}
        options={genderOptions}
        placeholder="Выберите пол..."
        disabled={editor.metaQuery.isLoading}
        onChange={(value) => form.setValue('gender', value, { shouldDirty: true, shouldValidate: true })}
        error={form.formState.errors.gender?.message}
      />
      <ProfileFormField id="bio" label="О себе" error={form.formState.errors.bio?.message}>
        <Textarea
          id="bio"
          aria-invalid={Boolean(form.formState.errors.bio)}
          aria-describedby={describedBy(form.formState.errors, 'bio')}
          placeholder="Коротко о себе и своих целях."
          {...form.register('bio')}
        />
      </ProfileFormField>
    </>
  )
}

function GoalsFields({ editor }: { editor: Editor }) {
  const { form } = editor
  const watchedGoal = useWatch({ control: form.control, name: 'goal' })
  const watchedExperienceLevel = useWatch({ control: form.control, name: 'experience_level' })
  const watchedWorkoutLocation = useWatch({ control: form.control, name: 'workout_location' })
  const meta = editor.metaQuery.data

  return (
    <>
      <ProfileSelectField
        id="goal"
        label="Цель"
        value={watchedGoal}
        options={meta?.goals ?? []}
        placeholder="Выберите цель..."
        disabled={editor.metaQuery.isLoading}
        onChange={(value) => form.setValue('goal', value, { shouldDirty: true, shouldValidate: true })}
        error={form.formState.errors.goal?.message}
      />
      <ProfileSelectField
        id="experience_level"
        label="Уровень подготовки"
        value={watchedExperienceLevel}
        options={meta?.levels ?? []}
        placeholder="Выберите уровень..."
        disabled={editor.metaQuery.isLoading}
        onChange={(value) => form.setValue('experience_level', value, { shouldDirty: true, shouldValidate: true })}
        error={form.formState.errors.experience_level?.message}
      />
      <ProfileSelectField
        id="workout_location"
        label="Место тренировок"
        value={watchedWorkoutLocation}
        options={meta?.workout_locations ?? []}
        placeholder="Выберите место..."
        disabled={editor.metaQuery.isLoading}
        onChange={(value) => form.setValue('workout_location', value, { shouldDirty: true, shouldValidate: true })}
        error={form.formState.errors.workout_location?.message}
      />
      {editor.metaErrorStatus ? (
        <QueryState isError errorTitle="Не удалось загрузить варианты" onRetry={() => void editor.metaQuery.refetch()}>
          {null}
        </QueryState>
      ) : null}
    </>
  )
}

function HealthFields({ editor }: { editor: Editor }) {
  const { form } = editor
  const watchedAge = useWatch({ control: form.control, name: 'age' })
  const healthDataConsent = useWatch({ control: form.control, name: 'health_data_consent' })
  const guardianConsent = useWatch({ control: form.control, name: 'guardian_consent' })

  return (
    <>
      {requiresGuardianConsent(watchedAge) ? (
        <GuardianConsentField
          id="guardian_consent"
          checked={guardianConsent === true}
          error={form.formState.errors.guardian_consent?.message}
          onCheckedChange={(checked) => {
            form.setValue('guardian_consent', checked, { shouldDirty: true })
            if (checked) form.clearErrors('guardian_consent')
          }}
        />
      ) : null}
      <HealthDataConsentField
        id="health_data_consent"
        checked={healthDataConsent === true}
        error={form.formState.errors.health_data_consent?.message}
        onCheckedChange={(checked) => {
          form.setValue('health_data_consent', checked, { shouldDirty: true })
          if (checked) form.clearErrors('health_data_consent')
        }}
      />
      <ProfileFormField
        id="limitations"
        label="Ограничения"
        hint="Например, травмы или движения, которых следует избегать."
        error={form.formState.errors.limitations?.message}
      >
        <Textarea
          id="limitations"
          aria-invalid={Boolean(form.formState.errors.limitations)}
          aria-describedby={form.formState.errors.limitations ? 'limitations-error' : 'limitations-hint'}
          placeholder="Например: травма колена"
          {...form.register('limitations')}
        />
      </ProfileFormField>
      <ProfileFormField id="medical_notes" label="Медицинские заметки" error={form.formState.errors.medical_notes?.message}>
        <Textarea
          id="medical_notes"
          aria-invalid={Boolean(form.formState.errors.medical_notes)}
          aria-describedby={form.formState.errors.medical_notes ? 'medical_notes-error' : undefined}
          placeholder="Дополнительная информация"
          {...form.register('medical_notes')}
        />
      </ProfileFormField>
    </>
  )
}

function describedBy(errors: FieldErrors<ProfileFormValues>, field: keyof ProfileFormValues): string | undefined {
  return errors[field]?.message ? `${field}-error` : undefined
}

function outsideMessages(errors: FieldErrors<ProfileFormValues>, section: ProfileSectionId): string[] {
  const own = new Set<string>(SECTION_FIELDS[section])
  const messages: string[] = []
  for (const [key, error] of Object.entries(errors)) {
    if (own.has(key)) continue
    const message = error && typeof error === 'object' && 'message' in error ? error.message : null
    if (typeof message === 'string' && message && !messages.includes(message)) messages.push(message)
  }
  return messages
}
