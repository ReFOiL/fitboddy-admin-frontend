import axios from 'axios'
import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useProfile } from '../hooks/use-profile'
import { useRelations } from '../hooks/use-relations'
import { usePlans } from '../hooks/use-plans'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, Rocket, Sparkles, Users } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { StyledSelect } from '../components/ui/styled-select'
import { isProfileCompleted } from '../lib/profile-completion'
import { Skeleton } from '../components/ui/skeleton'

export function DashboardPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const roleLabel =
    user?.role === 'trainer' ? 'Тренер' : user?.role === 'client' ? 'Клиент' : 'Пользователь'
  const [goal, setGoal] = useState('maintenance')
  const [level, setLevel] = useState('intermediate')
  const [workoutLocation, setWorkoutLocation] = useState('home')
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const { clientActiveRelationQuery } = useRelations({ trainerUserId: '', clientUserId: user?.user_id ?? '' })
  const hasNoActiveRelation =
    !clientActiveRelationQuery.isLoading && !clientActiveRelationQuery.isError && !clientActiveRelationQuery.data
  const activeTrainerUserId = clientActiveRelationQuery.data?.trainer_user_id ?? ''
  const activeTrainerLogin = clientActiveRelationQuery.data?.trainer_login ?? null
  const activeTrainerDisplay = activeTrainerLogin?.trim() ? activeTrainerLogin : activeTrainerUserId
  const { activePlanQuery, generatePlanMutation } = usePlans(user?.user_id ?? '')
  const ownUserId = user?.user_id ?? ''
  const { profileQuery } = useProfile(ownUserId)
  const profileErrorStatus = axios.isAxiosError(profileQuery.error) ? profileQuery.error.response?.status : undefined
  const hasNoProfile = profileErrorStatus === 404
  const questionnaireReady = isProfileCompleted(profileQuery.data)
  const canGeneratePlan = Boolean(user?.user_id && activeTrainerUserId && questionnaireReady && !generatePlanMutation.isPending)

  const activePlanErrorStatus = axios.isAxiosError(activePlanQuery.error) ? activePlanQuery.error.response?.status : undefined
  const hasNoActivePlan = activePlanErrorStatus === 404

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="relative pb-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_60%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
                <Sparkles size={14} />
                Персональная фитнес-платформа
              </div>
              <CardTitle className="text-2xl md:text-3xl">Добро пожаловать в Fitboddy</CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Все под рукой: клиенты, профили и персональные рекомендации. Фокус только на том, что важно для прогресса.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
            <span className="text-secondary-foreground">Логин:</span> {user?.login ?? 'не указан'}
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
            <span className="text-secondary-foreground">Почта:</span> {user?.email ?? 'не указана'}
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
            <span className="text-secondary-foreground">Роль:</span> {roleLabel}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              Клиенты и связи
            </CardTitle>
            <CardDescription>
              Находите новых клиентов, подключайте их в один клик и ведите активную базу без технических шагов.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <span className="text-sm text-secondary-foreground">Управление отношениями тренер-клиент</span>
            <Button asChild>
              <Link to="/clients" className="inline-flex items-center gap-2">
                Открыть
                <ArrowRight size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-primary" />
              Профиль и цели
            </CardTitle>
            <CardDescription>
              Заполняйте цели, ограничения и инвентарь, чтобы рекомендации были безопасными и персонализированными.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <span className="text-sm text-secondary-foreground">Основа для персональных планов</span>
            <Button asChild>
              <Link to="/profile" className="inline-flex items-center gap-2">
                Открыть
                <ArrowRight size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Мой профиль</CardTitle>
          <CardDescription>Личные данные и фото, которые можно использовать в сценариях платформы.</CardDescription>
        </CardHeader>
        <CardContent>
          {profileQuery.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
          {!profileQuery.isLoading && hasNoProfile ? (
            <span className="text-sm text-secondary-foreground">Профиль еще не заполнен. Открой раздел «Профиль и цели».</span>
          ) : null}
          {!profileQuery.isLoading && !hasNoProfile && profileQuery.data ? (
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
              {profileQuery.data.avatar_url ? (
                <img
                  src={profileQuery.data.avatar_url}
                  alt={profileQuery.data.full_name ?? 'Аватар пользователя'}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-secondary/40 text-xs text-secondary-foreground">
                  без фото
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="font-medium">{profileQuery.data.full_name || user?.email || 'Пользователь'}</div>
                <div className="text-secondary-foreground">{profileQuery.data.city || 'Город не указан'}</div>
                {profileQuery.data.bio ? <div className="text-secondary-foreground">{profileQuery.data.bio}</div> : null}
              </div>
            </div>
          ) : null}
          {!profileQuery.isLoading && profileQuery.isError && !hasNoProfile ? (
            <span className="text-sm text-destructive">Не удалось загрузить профиль пользователя.</span>
          ) : null}
        </CardContent>
      </Card>

      {isClient ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket size={18} className="text-primary" />
              Сгенерировать план
            </CardTitle>
            <CardDescription>
              Запуск генерации находится у клиента: выбери тренера и параметры, затем получи новый активный план.
            </CardDescription>
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
                  onChange={setGoal}
                  disabled={generatePlanMutation.isPending}
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
                  onChange={setLevel}
                  disabled={generatePlanMutation.isPending}
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
                  onChange={setWorkoutLocation}
                  disabled={generatePlanMutation.isPending}
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
                onChange={(event) => setWorkoutsPerWeek(Number(event.target.value))}
                disabled={generatePlanMutation.isPending}
              />
            </div>

            <Button
              type="button"
              disabled={!canGeneratePlan}
              onClick={() => {
                if (!user?.user_id || !activeTrainerUserId || !questionnaireReady) return
                generatePlanMutation.mutate({
                  trainer_user_id: activeTrainerUserId,
                  user_id: user.user_id,
                  goal,
                  level,
                  workout_location: workoutLocation,
                  workouts_per_week: Math.min(Math.max(workoutsPerWeek, 1), 7),
                  equipment: [],
                })
              }}
            >
              <Rocket size={14} />
              Сгенерировать план
            </Button>

            {clientActiveRelationQuery.isLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
            {hasNoActiveRelation ? (
              <span className="text-sm text-secondary-foreground">
                Сначала подключись к тренеру в разделе «Клиенты», потом можно запускать генерацию.
              </span>
            ) : null}
            {profileQuery.isLoading ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
            {hasNoProfile ? (
              <span className="text-sm text-secondary-foreground">
                Сначала заполни профиль в разделе{' '}
                <Link to="/profile" className="underline decoration-dotted underline-offset-4">
                  «Профиль и цели»
                </Link>
                , затем можно запускать генерацию.
              </span>
            ) : null}
            {!profileQuery.isLoading && profileQuery.isError && !hasNoProfile ? (
              <span className="text-sm text-destructive">Не удалось проверить профиль пользователя.</span>
            ) : null}
            {clientActiveRelationQuery.isError && !hasNoActiveRelation ? (
              <span className="text-sm text-destructive">Не удалось загрузить активную связь с тренером.</span>
            ) : null}

            <div className="rounded-xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm">
              {activePlanQuery.isLoading ? <Skeleton className="h-6 w-64 rounded-md" /> : null}
              {!activePlanQuery.isLoading && hasNoActivePlan ? (
                <span className="text-secondary-foreground">Активный план пока не найден.</span>
              ) : null}
              {!activePlanQuery.isLoading && !hasNoActivePlan && activePlanQuery.data ? (
                <div className="space-y-1">
                  <div className="font-medium">
                    Активный план: {activePlanQuery.data.goal} ({activePlanQuery.data.level})
                  </div>
                  <div className="text-secondary-foreground">
                    Тренер: {activeTrainerDisplay || activePlanQuery.data.trainer_user_id} · Период: {activePlanQuery.data.start_date} —{' '}
                    {activePlanQuery.data.end_date}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
