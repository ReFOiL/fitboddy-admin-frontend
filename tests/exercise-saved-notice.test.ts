import { toast } from 'sonner'

import { APP_PATHS } from '../src/config'
import { EXERCISE_SAVED_PLAN_HINT, notifyExerciseCatalogSaved } from '../src/lib/exercise-saved-notice'

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}))

describe('notifyExerciseCatalogSaved', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear()
  })

  it('после создания и правки ведёт к списку клиентов', () => {
    const navigate = vi.fn()

    notifyExerciseCatalogSaved('created', navigate)
    notifyExerciseCatalogSaved('updated', navigate)

    expect(toast.success).toHaveBeenNthCalledWith(
      1,
      'Упражнение добавлено',
      expect.objectContaining({ description: EXERCISE_SAVED_PLAN_HINT }),
    )
    expect(toast.success).toHaveBeenNthCalledWith(
      2,
      'Упражнение обновлено',
      expect.objectContaining({ description: EXERCISE_SAVED_PLAN_HINT }),
    )

    const createdOptions = vi.mocked(toast.success).mock.calls[0]?.[1]
    const updatedOptions = vi.mocked(toast.success).mock.calls[1]?.[1]
    if (!createdOptions?.action || !('onClick' in createdOptions.action)) {
      throw new Error('expected clients action on create toast')
    }
    if (!updatedOptions?.action || !('onClick' in updatedOptions.action)) {
      throw new Error('expected clients action on update toast')
    }
    createdOptions.action.onClick({} as never)
    updatedOptions.action.onClick({} as never)
    expect(navigate).toHaveBeenCalledTimes(2)
    expect(navigate).toHaveBeenCalledWith(APP_PATHS.clients)
  })
})
