import { APP_PATHS, getNavItems } from '../src/config'

describe('role-based nav items', () => {
  it('keeps four client destinations in the required order', () => {
    const items = getNavItems('client', 'mobile')

    expect(items.map((item) => item.label)).toEqual(['Главная', 'План', 'Чат', 'Профиль'])
    expect(items.map((item) => item.path)).toEqual([
      APP_PATHS.home,
      APP_PATHS.planGeneration,
      APP_PATHS.messages,
      APP_PATHS.profile,
    ])
    expect(getNavItems('client', 'desktop').map((item) => item.path)).toEqual(items.map((item) => item.path))
  })

  it('keeps four trainer destinations and leaves analytics out of the tab bar', () => {
    const items = getNavItems('trainer', 'mobile')

    expect(items.map((item) => item.label)).toEqual(['Сегодня', 'Клиенты', 'Упражнения', 'Чат'])
    expect(items.map((item) => item.path)).toEqual([
      APP_PATHS.home,
      APP_PATHS.clients,
      APP_PATHS.exercises,
      APP_PATHS.messages,
    ])
    expect(getNavItems('trainer', 'desktop').map((item) => item.path)).toEqual(items.map((item) => item.path))
    expect(items.map((item) => item.path)).not.toContain(APP_PATHS.analytics)
    expect(items.map((item) => item.path)).not.toContain(APP_PATHS.planRules)
    expect(items.map((item) => item.path)).not.toContain(APP_PATHS.profile)
  })
})
