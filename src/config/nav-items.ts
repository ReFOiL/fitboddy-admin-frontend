import { Dumbbell, House, List, Mail, Menu, Smile, type LucideIcon } from 'lucide-react'

import { APP_PATHS, type AppRole } from './app-routes'

export type NavSurface = 'desktop' | 'mobile'

export type NavItem = {
  id: string
  label: string
  mobileLabel?: string
  path: string
  icon: LucideIcon
  roles: Exclude<AppRole, null>[]
  surfaces: NavSurface[]
  activePaths?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'trainer-today',
    label: 'Сегодня',
    path: APP_PATHS.home,
    icon: House,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
  },
  {
    id: 'client-home',
    label: 'Главная',
    path: APP_PATHS.home,
    icon: House,
    roles: ['client'],
    surfaces: ['desktop', 'mobile'],
  },
  {
    id: 'clients',
    label: 'Клиенты',
    path: APP_PATHS.clients,
    icon: Menu,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.clientProfile, APP_PATHS.clientPlan],
  },
  {
    id: 'plan',
    label: 'План',
    path: APP_PATHS.planGeneration,
    icon: List,
    roles: ['client'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.clientExerciseDetails],
  },
  {
    id: 'exercises',
    label: 'Упражнения',
    path: APP_PATHS.exercises,
    icon: Dumbbell,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.exerciseDetails],
  },
  {
    id: 'chat',
    label: 'Чат',
    path: APP_PATHS.messages,
    icon: Mail,
    roles: ['trainer', 'client'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.messageThread],
  },
  {
    id: 'profile',
    label: 'Профиль',
    path: APP_PATHS.profile,
    icon: Smile,
    roles: ['client'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.profileOnboarding, APP_PATHS.trainers, APP_PATHS.trainerProfile],
  },
]

export function getNavItems(role: AppRole, surface: NavSurface): NavItem[] {
  if (!role) return []
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && item.surfaces.includes(surface))
}
