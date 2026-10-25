import { APP_PATHS, resolveCatalogPath, resolveDocumentTitle, resolveRelationsPath } from '../src/config/app-routes'

describe('app-routes', () => {
  it('resolves document title by route and role', () => {
    expect(resolveDocumentTitle(APP_PATHS.clients, 'trainer')).toBe('Fitboddy — Клиенты')
    expect(resolveDocumentTitle(APP_PATHS.trainers, 'client')).toBe('Fitboddy — Тренеры')
    expect(resolveDocumentTitle(APP_PATHS.more, 'client')).toBe('Fitboddy — Ещё')
    expect(resolveDocumentTitle(APP_PATHS.profileOnboarding, 'client')).toBe('Fitboddy — Настройка профиля')
    expect(resolveDocumentTitle('/clients/client-1/plan', 'trainer')).toBe('Fitboddy — План клиента')
    expect(resolveDocumentTitle(APP_PATHS.trainerInvite, 'trainer')).toBe('Fitboddy — Приглашение')
    expect(resolveDocumentTitle('/i/AB3K9Z', null)).toBe('Fitboddy — Приглашение')
    expect(resolveDocumentTitle('/unknown', null)).toBe('Fitboddy')
  })

  it('resolves role-based redirects', () => {
    expect(resolveRelationsPath('trainer')).toBe(APP_PATHS.clients)
    expect(resolveRelationsPath('client')).toBe(APP_PATHS.trainers)
    expect(resolveRelationsPath(null)).toBe(APP_PATHS.home)

    expect(resolveCatalogPath('trainer')).toBe(APP_PATHS.exercises)
    expect(resolveCatalogPath('client')).toBe(APP_PATHS.home)
  })
})
