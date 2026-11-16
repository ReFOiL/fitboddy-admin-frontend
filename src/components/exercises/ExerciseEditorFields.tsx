import { useQuery } from '@tanstack/react-query'
import { useWatch, type UseFormReturn } from 'react-hook-form'

import { listMuscles } from '../../api/exercises'
import { deriveWorkoutCategory, formatWorkoutCategory } from '../../lib/muscles'
import type { LoadScheme } from '../../types/exercise'
import { getLoadSchemeOptions, parseSchemeStepsInput, previewSchemeSteps } from '../../lib/load-schemes'
import { MuscleTargetPicker } from '../muscles/MuscleTargetPicker'
import { DifficultyPicker } from '../ui/difficulty-picker'
import { EquipmentPicker } from '../ui/equipment-picker'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Skeleton } from '../ui/skeleton'
import { StyledSelect } from '../ui/styled-select'
import { Textarea } from '../ui/textarea'
import { defaultExerciseFormValues, type ExerciseFormValues } from './exercise-form'

type EditorProps = {
  form: UseFormReturn<ExerciseFormValues>
  disabled?: boolean
  bodyGender?: string | null
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <span className="text-xs text-destructive">{message}</span>
}

export function ExerciseBasicFields({ form, disabled = false }: EditorProps) {
  const equipment = useWatch({ control: form.control, name: 'equipment' }) ?? defaultExerciseFormValues.equipment
  const difficulty = useWatch({ control: form.control, name: 'difficulty' }) ?? defaultExerciseFormValues.difficulty
  const isCardio = useWatch({ control: form.control, name: 'is_cardio' }) ?? false
  const errors = form.formState.errors

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="exercise_name">Название</Label>
        <Input id="exercise_name" placeholder="Болгарские выпады" disabled={disabled} {...form.register('exercise_name')} />
        <FieldError message={errors.exercise_name?.message} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          placeholder="Техника, акценты, на что обратить внимание."
          disabled={disabled}
          {...form.register('description')}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <EquipmentPicker
        id="equipment"
        disabled={disabled}
        value={equipment}
        error={errors.equipment?.message}
        onChange={(nextValue) => {
          form.setValue('equipment', nextValue, { shouldDirty: true, shouldValidate: true })
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="difficulty">Сложность (1-5)</Label>
          <DifficultyPicker
            id="difficulty"
            value={difficulty}
            disabled={disabled}
            onChange={(nextDifficulty) => {
              if (nextDifficulty === form.getValues('difficulty')) return
              form.setValue('difficulty', nextDifficulty, { shouldDirty: true, shouldValidate: true })
            }}
          />
          <FieldError message={errors.difficulty?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="is_cardio">Тип нагрузки</Label>
          <StyledSelect
            id="is_cardio"
            value={isCardio ? 'cardio' : 'strength'}
            disabled={disabled}
            onChange={(nextValue) => {
              const nextIsCardio = nextValue === 'cardio'
              if (nextIsCardio === form.getValues('is_cardio')) return
              form.setValue('is_cardio', nextIsCardio, { shouldDirty: true, shouldValidate: true })
            }}
            options={[
              { value: 'strength', label: 'Силовое' },
              { value: 'cardio', label: 'Кардио' },
            ]}
          />
        </div>
      </div>
    </>
  )
}

export function ExerciseMuscleFields({ form, disabled = false, bodyGender }: EditorProps) {
  const primary = useWatch({ control: form.control, name: 'primary_muscles' }) ?? []
  const secondary = useWatch({ control: form.control, name: 'secondary_muscles' }) ?? []
  const musclesQuery = useQuery({
    queryKey: ['muscles-catalog'],
    queryFn: listMuscles,
  })

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Группы мышц</Label>
        <span className="text-xs text-secondary-foreground">
          Категория: {formatWorkoutCategory(deriveWorkoutCategory(primary))}
        </span>
      </div>
      <p className="text-xs text-secondary-foreground">
        Нажмите на силуэт или выберите из списка — основные и вспомогательные мышцы. Категория считается автоматически по основным.
      </p>
      {musclesQuery.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <MuscleTargetPicker
          muscles={musclesQuery.data ?? []}
          primary={primary}
          secondary={secondary}
          readOnly={disabled}
          bodyGender={bodyGender}
          onChange={({ primary: nextPrimary, secondary: nextSecondary }) => {
            form.setValue('primary_muscles', nextPrimary, { shouldDirty: true, shouldValidate: true })
            form.setValue('secondary_muscles', nextSecondary, { shouldDirty: true, shouldValidate: true })
          }}
        />
      )}
    </div>
  )
}

export function ExerciseLoadFields({ form, disabled = false }: EditorProps) {
  const isHold = useWatch({ control: form.control, name: 'is_hold' }) ?? false
  const sets = useWatch({ control: form.control, name: 'default_sets' }) ?? defaultExerciseFormValues.default_sets
  const reps = useWatch({ control: form.control, name: 'default_reps' })
  const duration = useWatch({ control: form.control, name: 'default_duration_seconds' })
  const rest = useWatch({ control: form.control, name: 'default_rest_seconds' }) ?? defaultExerciseFormValues.default_rest_seconds
  const weight = useWatch({ control: form.control, name: 'default_weight_kg' })
  const loadScheme = useWatch({ control: form.control, name: 'load_scheme' }) ?? 'flat'
  const schemeStepsInput = useWatch({ control: form.control, name: 'scheme_steps_input' }) ?? ''
  const errors = form.formState.errors
  const schemePreview = previewSchemeSteps(loadScheme, sets, parseSchemeStepsInput(schemeStepsInput))

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="is_hold">Дозировка</Label>
        <StyledSelect
          id="is_hold"
          value={isHold ? 'duration' : 'reps'}
          disabled={disabled}
          onChange={(nextValue) => {
            const nextIsHold = nextValue === 'duration'
            if (nextIsHold === form.getValues('is_hold')) return
            form.setValue('is_hold', nextIsHold, { shouldDirty: true, shouldValidate: true })
            if (nextIsHold) {
              form.setValue('default_rest_seconds', 45, { shouldDirty: true, shouldValidate: true })
              if (!form.getValues('default_duration_seconds')) {
                form.setValue('default_duration_seconds', 35, { shouldDirty: true, shouldValidate: true })
              }
            } else {
              form.setValue('default_rest_seconds', 60, { shouldDirty: true, shouldValidate: true })
              if (!form.getValues('default_reps')) {
                form.setValue('default_reps', 10, { shouldDirty: true, shouldValidate: true })
              }
            }
          }}
          options={[
            { value: 'reps', label: 'На повторы' },
            { value: 'duration', label: 'На время' },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="default_sets">Подходы</Label>
          <Input
            id="default_sets"
            type="number"
            min={1}
            max={10}
            disabled={disabled}
            value={sets}
            onChange={(event) => {
              const nextValue = Number(event.target.value)
              form.setValue('default_sets', Number.isFinite(nextValue) ? nextValue : 1, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          />
          <FieldError message={errors.default_sets?.message} />
        </div>
        {isHold ? (
          <div className="grid gap-1.5">
            <Label htmlFor="default_duration_seconds">Длительность (сек)</Label>
            <Input
              id="default_duration_seconds"
              type="number"
              min={5}
              max={3600}
              disabled={disabled}
              value={duration ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                form.setValue('default_duration_seconds', raw === '' ? null : Number(raw), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
            <FieldError message={errors.default_duration_seconds?.message} />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="default_reps">Повторения</Label>
            <Input
              id="default_reps"
              type="number"
              min={1}
              max={100}
              disabled={disabled}
              value={reps ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                form.setValue('default_reps', raw === '' ? null : Number(raw), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
            <FieldError message={errors.default_reps?.message} />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="default_rest_seconds">Отдых (сек)</Label>
          <Input
            id="default_rest_seconds"
            type="number"
            min={0}
            max={600}
            disabled={disabled}
            value={rest}
            onChange={(event) => {
              const nextValue = Number(event.target.value)
              form.setValue('default_rest_seconds', Number.isFinite(nextValue) ? nextValue : 0, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          />
          <FieldError message={errors.default_rest_seconds?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="default_weight_kg">Базовый вес (кг)</Label>
          <Input
            id="default_weight_kg"
            type="number"
            min={0}
            step={0.5}
            disabled={disabled}
            value={weight ?? ''}
            placeholder="Необязательно"
            onChange={(event) => {
              const raw = event.target.value
              form.setValue('default_weight_kg', raw === '' ? null : Number(raw), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          />
          <FieldError message={errors.default_weight_kg?.message} />
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-3">
        <div className="grid gap-1.5">
          <Label>Схема подходов</Label>
          <StyledSelect
            value={loadScheme}
            disabled={disabled}
            onChange={(value) => form.setValue('load_scheme', value as LoadScheme, { shouldDirty: true, shouldValidate: true })}
            options={getLoadSchemeOptions(isHold)}
          />
        </div>
        {loadScheme === 'custom' ? (
          <div className="grid gap-1.5">
            <Label htmlFor="scheme_steps_input">
              {isHold ? 'Коэффициенты от базовой длительности' : 'Коэффициенты от рабочего веса'}
            </Label>
            <Input
              id="scheme_steps_input"
              disabled={disabled}
              value={schemeStepsInput}
              placeholder="0.7, 0.85, 1, 1.05"
              onChange={(event) =>
                form.setValue('scheme_steps_input', event.target.value, { shouldDirty: true, shouldValidate: true })
              }
            />
            <FieldError message={errors.scheme_steps_input?.message} />
          </div>
        ) : null}
        <div className="text-xs text-secondary-foreground">
          Превью: {schemePreview.map((step, index) => `П${index + 1}×${step}`).join(' · ')}
          {isHold && duration != null && duration > 0
            ? ` → ${schemePreview.map((step) => `${Math.round(duration * step)} сек`).join(', ')}`
            : !isHold && weight != null && weight > 0
              ? ` → ${schemePreview.map((step) => `${Math.round((weight * step) / 2.5) * 2.5} кг`).join(', ')}`
              : ''}
          {isHold && weight != null && weight > 0 ? ` · вес ${weight} кг на все подходы` : ''}
        </div>
      </div>
    </>
  )
}
