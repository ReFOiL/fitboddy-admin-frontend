import { formatMonthDay, formatWorkoutClock, formatWorkoutDuration, weeksLabel } from '../../lib/dates'
import { formatDosage } from '../../lib/plan-draft'
import { formatWeekdayShort } from '../../lib/plan-formatters'
import { isEmptyLeadInDay, isSkippedWorkout } from '../../lib/plan-start'
import { firstName } from '../../lib/person'
import { lastCompletedDay, weekProgress } from '../../lib/roster'
import type { TrainingPlan } from '../../types/plan'
import { Button } from '../ui/button'
import { ScreenHeader, SectionLabel, StickyActionBar } from '../ui/kit'

export function ClientProgress({
  name,
  plan,
  todayIso,
  onBack,
  onWrite,
}: {
  name: string
  plan: TrainingPlan | null
  todayIso: string
  onBack: () => void
  onWrite: () => void
}) {
  const weeks = plan ? new Set(plan.days.map((day) => day.week)).size : 0
  const done = plan?.days.filter((day) => day.is_completed).length ?? 0
  const total = plan?.days.length ?? 0
  const last = plan ? lastCompletedDay(plan) : null
  const currentWeek = plan?.days.find((day) => day.scheduled_for.slice(0, 10) >= todayIso)?.week ?? plan?.days.at(-1)?.week
  const previousWeek = currentWeek != null ? currentWeek - 1 : null
  const recent = plan
    ? [...plan.days]
        .filter((day) => day.scheduled_for.slice(0, 10) <= todayIso)
        .filter(
          (day) =>
            !isEmptyLeadInDay(
              { week: day.week, scheduledFor: day.scheduled_for, exerciseCount: day.exercises.length },
              plan.start_date,
            ),
        )
        .sort((left, right) => right.scheduled_for.localeCompare(left.scheduled_for))
        .slice(0, 6)
    : []

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title={`Прогресс · ${firstName(name) || name}`} onBack={onBack} />
      {plan ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[28px] font-bold leading-none">
                {done} из {total}
              </div>
              <div className="mt-2 text-[15px]">
                тренировок за {weeks} {weeksLabel(weeks)}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-[28px] font-bold leading-none">{last ? formatMonthDay(last.scheduled_for) : '—'}</div>
              <div className="mt-2 text-[15px]">последняя тренировка</div>
            </div>
          </div>
          {[currentWeek, previousWeek].filter((week): week is number => week != null && week > 0).map((week) => {
            const progress = weekProgress(plan, week)
            const visibleDays = plan.days.filter(
              (day) =>
                day.week === week &&
                !isEmptyLeadInDay(
                  { week: day.week, scheduledFor: day.scheduled_for, exerciseCount: day.exercises.length },
                  plan.start_date,
                ),
            )
            if (progress.total === 0 || visibleDays.length === 0) return null
            return (
              <section key={week} className="mt-6">
                <SectionLabel>
                  Неделя {week}
                  {week === currentWeek ? ' · сейчас' : ''}
                </SectionLabel>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center text-[13px] font-semibold">
                  {visibleDays
                    .map((day) => {
                      const missed = isSkippedWorkout(
                        {
                          week: day.week,
                          scheduledFor: day.scheduled_for,
                          exerciseCount: day.exercises.length,
                          isCompleted: Boolean(day.is_completed),
                        },
                        todayIso,
                        plan.start_date,
                      )
                      return (
                        <div key={day.day_id}>
                          <div>{formatWeekdayShort(day.day_of_week)}</div>
                          <div
                            className={`mt-1 flex h-12 items-center justify-center rounded-xl border ${
                              missed
                                ? 'border-destructive bg-card text-destructive'
                                : day.is_completed
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-card'
                            }`}
                          >
                            {day.is_completed ? '✓' : missed ? '×' : ''}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </section>
            )
          })}
          <section className="mt-6">
            <SectionLabel>Последние</SectionLabel>
            {recent.map((day) => {
              const missed = isSkippedWorkout(
                {
                  week: day.week,
                  scheduledFor: day.scheduled_for,
                  exerciseCount: day.exercises.length,
                  isCompleted: Boolean(day.is_completed),
                },
                todayIso,
                plan.start_date,
              )
              const first = day.exercises[0]
              const finishedAt = day.finished_at ?? day.completed_at
              const clock = finishedAt ? formatWorkoutClock(finishedAt) : ''
              const duration = formatWorkoutDuration(day.started_at, finishedAt)
              const timing = [clock, duration].filter(Boolean).join(' · ')
              return (
                <div key={day.day_id} className="border-b border-border py-3">
                  <div className="text-[17px] font-semibold">
                    {formatWeekdayShort(day.day_of_week)}, {formatMonthDay(day.scheduled_for)}
                    {missed ? ' · пропущена' : timing ? ` · ${timing}` : ` · ${day.exercises.length} из ${day.exercises.length}`}
                  </div>
                  <div className="text-[15px] text-secondary-foreground">
                    {missed ? 'Тренировка не отмечена' : first ? `${first.exercise_name} ${formatDosage(first)}` : 'Без упражнений'}
                  </div>
                </div>
              )
            })}
          </section>
        </>
      ) : (
        <p className="py-8 text-[17px]">Плана ещё нет — прогресс появится после первой программы.</p>
      )}

      <StickyActionBar>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onWrite}>
          Написать
        </Button>
      </StickyActionBar>
    </div>
  )
}
