import { trainerVisibleHealth, type TrainerHealthProfile } from '../../lib/health-data-consent'

type HealthDataTrainerSummaryProps = {
  profile: TrainerHealthProfile | null | undefined
}

export function HealthDataTrainerSummary({ profile }: HealthDataTrainerSummaryProps) {
  const view = trainerVisibleHealth(profile)

  switch (view.status) {
    case 'shared':
      return (
        <div role="group" aria-label="Сведения о здоровье">
          {view.limitations ? <HealthRow title="Ограничения" value={view.limitations} /> : null}
          {view.medicalNotes ? <HealthRow title="Медицинские заметки" value={view.medicalNotes} /> : null}
        </div>
      )
    case 'private':
    case 'empty':
      return (
        <p className="flex min-h-16 items-center border-b border-border text-[17px] text-secondary-foreground" role="status">
          {view.message}
        </p>
      )
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}

function HealthRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border">
      <span className="text-[17px]">{title}</span>
      <span className="text-right text-[17px] font-semibold">{value}</span>
    </div>
  )
}
