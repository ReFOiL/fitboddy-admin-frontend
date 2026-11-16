import { MessageCircle, UserRound, Users } from 'lucide-react'

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
    expect(items.find((item) => item.id === 'chat')?.icon).toBe(MessageCircle)
    expect(items.find((item) => item.id === 'profile')?.icon).toBe(UserRound)
  })

  it('keeps five trainer tabs and moves the rest behind Ещё', () => {
    const items = getNavItems('trainer', 'mobile')

    expect(items.map((item) => item.label)).toEqual(['Сегодня', 'Клиенты', 'Упражнения', 'Чат', 'Ещё'])
    expect(items.map((item) => item.path)).toEqual([
      APP_PATHS.home,
      APP_PATHS.clients,
      APP_PATHS.exercises,
      APP_PATHS.messages,
      APP_PATHS.more,
    ])
    expect(getNavItems('trainer', 'desktop').map((item) => item.path)).toEqual(items.map((item) => item.path))
    expect(items.find((item) => item.id === 'clients')?.icon).toBe(Users)
    const more = items.find((item) => item.id === 'trainer-more')
    expect(more?.activePaths).toEqual(
      expect.arrayContaining([APP_PATHS.analytics, APP_PATHS.planRules, APP_PATHS.trainerInvite, APP_PATHS.howItWorks]),
    )
    expect(items.map((item) => item.path)).not.toContain(APP_PATHS.analytics)
    expect(items.map((item) => item.path)).not.toContain(APP_PATHS.planRules)
  })
})
