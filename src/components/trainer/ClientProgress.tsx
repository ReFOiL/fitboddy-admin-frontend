import { formatMonthDay, weeksLabel } from '../../lib/dates'
import { formatDosage } from '../../lib/plan-draft'
import { formatWeekdayShort } from '../../lib/plan-formatters'
import { firstName } from '../../lib/person'
import { lastCompletedDay, weekProgress } from '../../lib/roster'
import type { TrainingPlan } from '../../types/plan'
import type { TrainerFunnelMetrics } from '../../types/relation'
import { Button } from '../ui/button'
import { ScreenHeader, SectionLabel, StickyActionBar } from '../ui/kit'

export function ClientProgress({
  name,
  plan,
  todayIso,
  funnel,
  onBack,
  onWrite,
}: {
  name: string
  plan: TrainingPlan | null
  todayIso: string
  funnel?: TrainerFunnelMetrics
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
        .sort((left, right) => right.scheduled_for.localeCompare(left.scheduled_for))
        .slice(0, 6)
    : []

  return (
    <div className="mx-auto w-full max-w-lg pb-28">
      <ScreenHeader title={`Прогресс · ${firstName(name) || name}`} onBack={onBack} />
      {plan ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-foreground p-4">
              <div className="text-[28px] font-bold leading-none">
                {done} из {total}
              </div>
              <div className="mt-2 text-[15px]">
                тренировок за {weeks} {weeksLabel(weeks)}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-foreground p-4">
              <div className="text-[28px] font-bold leading-none">{last ? formatMonthDay(last.scheduled_for) : '—'}</div>
              <div className="mt-2 text-[15px]">последняя тренировка</div>
            </div>
          </div>
          {[currentWeek, previousWeek].filter((week): week is number => week != null && week > 0).map((week) => {
            const progress = weekProgress(plan, week)
            if (progress.total === 0) return null
            return (
              <section key={week} className="mt-6">
                <SectionLabel>
                  Неделя {week}
                  {week === currentWeek ? ' · сейчас' : ''}
                </SectionLabel>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center text-[13px] font-semibold">
                  {plan.days
                    .filter((day) => day.week === week)
                    .map((day) => {
                      const missed = day.scheduled_for.slice(0, 10) < todayIso && !day.is_completed
                      return (
                        <div key={day.day_id}>
                          <div>{formatWeekdayShort(day.day_of_week)}</div>
                          <div
                            className={`mt-1 flex h-12 items-center justify-center rounded-xl border-2 ${
                              missed
                                ? 'border-destructive text-destructive'
                                : day.is_completed
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-foreground'
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
              const missed = !day.is_completed && day.scheduled_for.slice(0, 10) < todayIso
              const first = day.exercises[0]
              return (
                <div key={day.day_id} className="border-b border-border py-3">
                  <div className="text-[17px] font-semibold">
                    {formatWeekdayShort(day.day_of_week)}, {formatMonthDay(day.scheduled_for)}
                    {missed ? ' · пропущена' : ` · ${day.exercises.length} из ${day.exercises.length}`}
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

      {funnel ? (
        <section className="mt-8">
          <SectionLabel>Приглашения</SectionLabel>
          <div className="mt-2 divide-y divide-border border-y border-border">
            <Metric label="Отправлено" value={String(funnel.invites_sent)} />
            <Metric label="Ждут ответа" value={String(funnel.invites_pending)} />
            <Metric label="Принято" value={String(funnel.invites_accepted)} />
            <Metric label="Отклонено" value={String(funnel.invites_declined)} />
            <Metric label="Активных клиентов" value={String(funnel.active_clients)} />
            <Metric label="Конверсия" value={`${funnel.invite_acceptance_rate}%`} />
          </div>
        </section>
      ) : null}

      <StickyActionBar>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onWrite}>
          Написать
        </Button>
      </StickyActionBar>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between text-[17px]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
