export function getTrainerPlanComposeBlockReason(input: {
  isProfileLoading: boolean
  isNotFound: boolean
  isForbidden: boolean
  hasProfileLoadError: boolean
  hasProfile: boolean
  questionnaireReady: boolean
}): string | null {
  if (input.isProfileLoading && !input.hasProfile) {
    return 'Загружаем анкету клиента. Составить план можно после загрузки.'
  }
  if (input.isForbidden) {
    return 'Нет доступа к анкете клиента. Проверьте активную связь — без неё план составить нельзя.'
  }
  if (input.isNotFound) {
    return 'Анкета клиента не заполнена. План можно составить, когда клиент укажет цель, уровень, место тренировок и возраст.'
  }
  if (input.hasProfileLoadError) {
    return 'Не удалось загрузить анкету клиента. Составить план пока нельзя.'
  }
  if (!input.hasProfile || !input.questionnaireReady) {
    return 'Анкета клиента неполная. План можно составить, когда клиент заполнит цель, уровень, место тренировок и возраст.'
  }
  return null
}
