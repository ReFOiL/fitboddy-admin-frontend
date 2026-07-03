import { Link } from 'react-router-dom'
import { Rocket } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { StyledSelect } from '../ui/styled-select'
import { Skeleton } from '../ui/skeleton'
import type { TrainingPlan } from '../../types/plan'

type ClientPlanGeneratorCardProps = {
  activeTrainerDisplay: string
  goal: string
  level: string
  workoutLocation: string
  workoutsPerWeek: number
  onGoalChange: (value: string) => void
  onLevelChange: (value: string) => void
  onWorkoutLocationChange: (value: string) => void
  onWorkoutsPerWeekChange: (value: number) => void
  onGeneratePlan: () => void
  canGeneratePlan: boolean
  isGenerating: boolean
  isRelationLoading: boolean
  hasNoActiveRelation: boolean
  isProfileLoading: boolean
  hasNoProfile: boolean
  hasProfileError: boolean
  isRelationError: boolean
  isActivePlanLoading: boolean
  hasNoActivePlan: boolean
  activePlan: TrainingPlan | undefined
}

export function ClientPlanGeneratorCard({
  activeTrainerDisplay,
  goal,
  level,
  workoutLocation,
  workoutsPerWeek,
  onGoalChange,
  onLevelChange,
  onWorkoutLocationChange,
  onWorkoutsPerWeekChange,
  onGeneratePlan,
  canGeneratePlan,
  isGenerating,
  isRelationLoading,
  hasNoActiveRelation,
  isProfileLoading,
  hasNoProfile,
  hasProfileError,
  isRelationError,
  isActivePlanLoading,
  hasNoActivePlan,
  activePlan,
}: ClientPlanGeneratorCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket size={18} className="text-primary" />
          Сгенерировать план
        </CardTitle>
        <CardDescription>Запуск генерации находится у клиента: выбери тренера и параметры, затем получи новый активный план.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="trainer_auto">Активный тренер</Label>
          <input
            id="trainer_auto"
            readOnly
            className="h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-secondary-foreground outline-none"
            value={activeTrainerDisplay || 'Нет активной связи'}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="goal_select">Цель</Label>
            <StyledSelect
              id="goal_select"
              value={goal}
              onChange={onGoalChange}
              disabled={isGenerating}
              options={[
                { value: 'maintenance', label: 'Поддержание формы' },
                { value: 'weight_loss', label: 'Снижение веса' },
                { value: 'muscle_gain', label: 'Набор мышечной массы' },
              ]}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="level_select">Уровень</Label>
            <StyledSelect
              id="level_select"
              value={level}
              onChange={onLevelChange}
              disabled={isGenerating}
              options={[
                { value: 'beginner', label: 'Начальный' },
                { value: 'intermediate', label: 'Средний' },
                { value: 'advanced', label: 'Продвинутый' },
              ]}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="location_select">Где тренироваться</Label>
            <StyledSelect
              id="location_select"
              value={workoutLocation}
              onChange={onWorkoutLocationChange}
              disabled={isGenerating}
              options={[
                { value: 'home', label: 'Дома' },
                { value: 'gym', label: 'В зале' },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="workouts_per_week">Тренировок в неделю</Label>
          <input
            id="workouts_per_week"
            type="number"
            min={1}
            max={7}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/70"
            value={workoutsPerWeek}
            onChange={(event) => onWorkoutsPerWeekChange(Number(event.target.value))}
            disabled={isGenerating}
          />
        </div>

        <Button type="button" disabled={!canGeneratePlan} onClick={onGeneratePlan}>
          <Rocket size={14} />
          Сгенерировать план
        </Button>

        {isRelationLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
        {hasNoActiveRelation ? (
          <span className="text-sm text-secondary-foreground">Сначала подключись к тренеру в разделе «Тренеры», потом можно запускать генерацию.</span>
        ) : null}
        {isProfileLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
        {hasNoProfile ? (
          <span className="text-sm text-secondary-foreground">
            Сначала заполни профиль в разделе{' '}
            <Link to="/profile" className="underline decoration-dotted underline-offset-4">
              «Профиль и цели»
            </Link>
            , затем можно запускать генерацию.
          </span>
        ) : null}
        {hasProfileError ? <span className="text-sm text-destructive">Не удалось проверить профиль пользователя.</span> : null}
        {isRelationError ? <span className="text-sm text-destructive">Не удалось загрузить активную связь с тренером.</span> : null}

        <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm">
          {isActivePlanLoading ? <Skeleton className="h-6 w-64 rounded-md" /> : null}
          {!isActivePlanLoading && hasNoActivePlan ? <span className="text-secondary-foreground">Активный план пока не найден.</span> : null}
          {!isActivePlanLoading && !hasNoActivePlan && activePlan ? (
            <div className="space-y-1">
              <div className="font-medium">
                Активный план: {activePlan.goal} ({activePlan.level})
              </div>
              <div className="text-secondary-foreground">
                Тренер: {activeTrainerDisplay || activePlan.trainer_user_id} · Период: {activePlan.start_date} — {activePlan.end_date}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
