import { APP_PATHS, getNavItems } from '../src/config'

describe('role-based nav items', () => {
  it('keeps exactly four client mobile destinations in the required order', () => {
    const items = getNavItems('client', 'mobile')

    expect(items.map((item) => item.mobileLabel ?? item.label)).toEqual(['Главная', 'Чат', 'Тренер', 'Ещё'])
    expect(items.map((item) => item.path)).toEqual([
      APP_PATHS.home,
      APP_PATHS.messages,
      APP_PATHS.trainers,
      APP_PATHS.more,
    ])
  })

  it('keeps direct client plan and profile links on desktop', () => {
    const paths = getNavItems('client', 'desktop').map((item) => item.path)

    expect(paths).toContain(APP_PATHS.planGeneration)
    expect(paths).toContain(APP_PATHS.profile)
    expect(paths).not.toContain(APP_PATHS.more)
  })

  it('preserves trainer destinations', () => {
    const allPaths = new Set([
      ...getNavItems('trainer', 'desktop').map((item) => item.path),
      ...getNavItems('trainer', 'mobile').map((item) => item.path),
    ])

    expect(allPaths).toEqual(
      new Set([
        APP_PATHS.home,
        APP_PATHS.clients,
        APP_PATHS.analytics,
        APP_PATHS.exercises,
        APP_PATHS.planRules,
        APP_PATHS.messages,
        APP_PATHS.profile,
      ]),
    )
  })
})
