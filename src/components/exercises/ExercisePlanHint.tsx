import { Link } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { AlertBanner } from '../shared'

export const EXERCISE_PLAN_REBUILD_HINT =
  'Уже выданные планы не меняются сами. Пересоберите план клиента из каталога или откройте его план и поправьте дни.'

export function ExercisePlanHint() {
  return (
    <AlertBanner tone="info" title="Каталог сохранён">
      <p>{EXERCISE_PLAN_REBUILD_HINT}</p>
      <Link
        to={APP_PATHS.clients}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline-offset-2 hover:underline"
      >
        К клиентам
      </Link>
    </AlertBanner>
  )
}
