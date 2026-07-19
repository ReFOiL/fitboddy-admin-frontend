import { matchPath } from 'react-router-dom'

import { APP_BRAND_NAME, formatPageTitle } from './brand'

export type AppRole = 'trainer' | 'client' | null

export const APP_PATHS = {
  login: '/login',
  home: '/home',
  clients: '/clients',
  trainers: '/trainers',
  clientProfile: '/clients/profile',
  planGeneration: '/plan-generation',
  analytics: '/analytics',
  exercises: '/exercises',
  exerciseDetails: '/exercises/:rowId',
  clientExerciseDetails: '/plan/exercises/:rowId',
  planRules: '/plan-rules',
  profile: '/profile',
  dashboardAlias: '/dashboard',
  relationsAlias: '/relations',
  catalogAlias: '/catalog',
  profilesAlias: '/profiles',
} as const

type TitleRule = {
  title: string
  matches: (pathname: string, role: AppRole) => boolean
}

const TITLE_RULES: TitleRule[] = [
  {
    title: 'Главная',
    matches: (pathname) => pathname === '/' || pathname === APP_PATHS.home || pathname === APP_PATHS.dashboardAlias,
  },
  {
    title: 'Вход',
    matches: (pathname) => pathname === APP_PATHS.login,
  },
  {
    title: 'Клиенты',
    matches: (pathname, role) => pathname === APP_PATHS.clients || (pathname === APP_PATHS.relationsAlias && role === 'trainer'),
  },
  {
    title: 'Тренеры',
    matches: (pathname, role) => pathname === APP_PATHS.trainers || (pathname === APP_PATHS.relationsAlias && role !== 'trainer'),
  },
  {
    title: 'Профиль',
    matches: (pathname) => pathname === APP_PATHS.profile || pathname === APP_PATHS.profilesAlias,
  },
  {
    title: 'Профиль клиента',
    matches: (pathname) => pathname === APP_PATHS.clientProfile,
  },
  {
    title: 'Мой план',
    matches: (pathname) => pathname === APP_PATHS.planGeneration,
  },
  {
    title: 'Аналитика',
    matches: (pathname) => pathname === APP_PATHS.analytics,
  },
  {
    title: 'Каталог упражнений',
    matches: (pathname, role) => pathname === APP_PATHS.exercises || (pathname === APP_PATHS.catalogAlias && role === 'trainer'),
  },
  {
    title: 'Правила планов',
    matches: (pathname) => pathname === APP_PATHS.planRules,
  },
  {
    title: 'Упражнение',
    matches: (pathname) =>
      Boolean(matchPath(APP_PATHS.exerciseDetails, pathname) || matchPath(APP_PATHS.clientExerciseDetails, pathname)),
  },
]

export function resolveDocumentTitle(pathname: string, role: AppRole): string {
  const matchedRule = TITLE_RULES.find((rule) => rule.matches(pathname, role))
  return matchedRule ? formatPageTitle(matchedRule.title) : APP_BRAND_NAME
}

export function resolveRelationsPath(role: AppRole): string {
  if (role === 'trainer') return APP_PATHS.clients
  if (role === 'client') return APP_PATHS.trainers
  return APP_PATHS.home
}

export function resolveCatalogPath(role: AppRole): string {
  return role === 'trainer' ? APP_PATHS.exercises : APP_PATHS.home
}
