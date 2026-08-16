import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  Ellipsis,
  Home,
  ListChecks,
  MessageSquare,
  Rocket,
  Users,
  type LucideIcon,
} from 'lucide-react'

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
    id: 'home',
    label: 'Главная',
    path: APP_PATHS.home,
    icon: Home,
    roles: ['trainer', 'client'],
    surfaces: ['desktop', 'mobile'],
  },
  {
    id: 'client-chat',
    label: 'Чат',
    path: APP_PATHS.messages,
    icon: MessageSquare,
    roles: ['client'],
    surfaces: ['mobile'],
    activePaths: [APP_PATHS.messageThread],
  },
  {
    id: 'clients',
    label: 'Клиенты',
    path: APP_PATHS.clients,
    icon: Users,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.clientProfile],
  },
  {
    id: 'trainers',
    label: 'Тренеры',
    mobileLabel: 'Тренер',
    path: APP_PATHS.trainers,
    icon: Users,
    roles: ['client'],
    surfaces: ['desktop', 'mobile'],
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    path: APP_PATHS.analytics,
    icon: BarChart3,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
  },
  {
    id: 'exercises',
    label: 'Каталог',
    path: APP_PATHS.exercises,
    icon: Dumbbell,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
    activePaths: [APP_PATHS.exerciseDetails],
  },
  {
    id: 'plan-rules',
    label: 'Правила планов',
    mobileLabel: 'Правила',
    path: APP_PATHS.planRules,
    icon: ListChecks,
    roles: ['trainer'],
    surfaces: ['desktop', 'mobile'],
  },
  {
    id: 'plan',
    label: 'План',
    path: APP_PATHS.planGeneration,
    icon: Rocket,
    roles: ['client'],
    surfaces: ['desktop'],
    activePaths: [APP_PATHS.clientExerciseDetails],
  },
  {
    id: 'messages',
    label: 'Сообщения',
    mobileLabel: 'Чат',
    path: APP_PATHS.messages,
    icon: MessageSquare,
    roles: ['trainer', 'client'],
    surfaces: ['desktop'],
    activePaths: [APP_PATHS.messageThread],
  },
  {
    id: 'profile',
    label: 'Профиль',
    path: APP_PATHS.profile,
    icon: ClipboardList,
    roles: ['trainer', 'client'],
    surfaces: ['desktop'],
    activePaths: [APP_PATHS.profileOnboarding],
  },
  {
    id: 'trainer-profile',
    label: 'Профиль',
    path: APP_PATHS.profile,
    icon: ClipboardList,
    roles: ['trainer'],
    surfaces: ['mobile'],
    activePaths: [APP_PATHS.profileOnboarding],
  },
  {
    id: 'more',
    label: 'Ещё',
    path: APP_PATHS.more,
    icon: Ellipsis,
    roles: ['client'],
    surfaces: ['mobile'],
    activePaths: [APP_PATHS.planGeneration, APP_PATHS.clientExerciseDetails, APP_PATHS.profile, APP_PATHS.profileOnboarding],
  },
]

export function getNavItems(role: AppRole, surface: NavSurface): NavItem[] {
  if (!role) return []
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && item.surfaces.includes(surface))
}
