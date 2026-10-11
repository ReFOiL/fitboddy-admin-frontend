import { EmptyState } from '../shared'

export function ClientPlanPending() {
  return (
    <EmptyState
      title="Тренер ещё составляет программу"
      description="Когда план будет готов, тренировка появится здесь."
    />
  )
}
