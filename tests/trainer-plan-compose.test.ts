import { getTrainerPlanComposeBlockReason } from '../src/lib/trainer-plan-compose'

const ready = {
  isProfileLoading: false,
  isNotFound: false,
  isForbidden: false,
  hasProfileLoadError: false,
  hasProfile: true,
  questionnaireReady: true,
}

describe('getTrainerPlanComposeBlockReason', () => {
  it('объясняет, почему план нельзя составить', () => {
    expect(
      getTrainerPlanComposeBlockReason({ ...ready, isProfileLoading: true, hasProfile: false, questionnaireReady: false }),
    ).toMatch(/Загружаем анкету/)
    expect(getTrainerPlanComposeBlockReason({ ...ready, isNotFound: true, hasProfile: false, questionnaireReady: false })).toMatch(
      /не заполнена/,
    )
    expect(getTrainerPlanComposeBlockReason({ ...ready, isForbidden: true, hasProfile: false, questionnaireReady: false })).toMatch(
      /Нет доступа/,
    )
    expect(
      getTrainerPlanComposeBlockReason({ ...ready, hasProfileLoadError: true, hasProfile: false, questionnaireReady: false }),
    ).toMatch(/Не удалось загрузить анкету/)
    expect(getTrainerPlanComposeBlockReason({ ...ready, questionnaireReady: false })).toMatch(/неполная/)
  })

  it('не блокирует готовую анкету', () => {
    expect(getTrainerPlanComposeBlockReason(ready)).toBeNull()
  })
})
