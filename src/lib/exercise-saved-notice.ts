import type { NavigateFunction } from 'react-router-dom'
import { toast } from 'sonner'

import { APP_PATHS } from '../config'

export const EXERCISE_SAVED_PLAN_HINT =
  'Чтобы упражнение попало в планы клиентов — пересоберите план в профиле клиента'

function exerciseSavedTitle(kind: 'created' | 'updated'): string {
  switch (kind) {
    case 'created':
      return 'Упражнение добавлено'
    case 'updated':
      return 'Упражнение обновлено'
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

export function notifyExerciseCatalogSaved(kind: 'created' | 'updated', navigate: NavigateFunction) {
  toast.success(exerciseSavedTitle(kind), {
    description: EXERCISE_SAVED_PLAN_HINT,
    duration: 8000,
    action: {
      label: 'Клиенты',
      onClick: () => {
        navigate(APP_PATHS.clients)
      },
    },
  })
}
