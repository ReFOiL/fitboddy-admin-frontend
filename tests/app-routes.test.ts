import { APP_PATHS, resolveCatalogPath, resolveDocumentTitle, resolveRelationsPath } from '../src/config/app-routes'

describe('app-routes', () => {
  it('resolves document title by route and role', () => {
    expect(resolveDocumentTitle(APP_PATHS.clients, 'trainer')).toBe('Fitboddy — Клиенты')
    expect(resolveDocumentTitle(APP_PATHS.trainers, 'client')).toBe('Fitboddy — Тренеры')
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
