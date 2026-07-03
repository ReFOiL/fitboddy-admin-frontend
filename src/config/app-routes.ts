import { matchPath } from 'react-router-dom'

import { APP_BRAND_NAME, formatPageTitle } from './brand'

export type AppRole = 'trainer' | 'client' | null

type TitleRule = {
  title: string
  matches: (pathname: string, role: AppRole) => boolean
}

const TITLE_RULES: TitleRule[] = [
  {
    title: 'Главная',
    matches: (pathname) => pathname === '/' || pathname === '/home' || pathname === '/dashboard',
  },
  {
    title: 'Вход',
    matches: (pathname) => pathname === '/login',
  },
  {
    title: 'Клиенты',
    matches: (pathname, role) => pathname === '/clients' || (pathname === '/relations' && role === 'trainer'),
  },
  {
    title: 'Тренеры',
    matches: (pathname, role) => pathname === '/trainers' || (pathname === '/relations' && role !== 'trainer'),
  },
  {
    title: 'Профиль',
    matches: (pathname) => pathname === '/profile' || pathname === '/profiles',
  },
  {
    title: 'Профиль клиента',
    matches: (pathname) => pathname === '/clients/profile',
  },
  {
    title: 'Аналитика',
    matches: (pathname) => pathname === '/analytics',
  },
  {
    title: 'Каталог упражнений',
    matches: (pathname, role) => pathname === '/exercises' || (pathname === '/catalog' && role === 'trainer'),
  },
  {
    title: 'Упражнение',
    matches: (pathname) => Boolean(matchPath('/exercises/:exerciseId', pathname)),
  },
]

export function resolveDocumentTitle(pathname: string, role: AppRole): string {
  const matchedRule = TITLE_RULES.find((rule) => rule.matches(pathname, role))
  return matchedRule ? formatPageTitle(matchedRule.title) : APP_BRAND_NAME
}

export function resolveRelationsPath(role: AppRole): string {
  if (role === 'trainer') return '/clients'
  if (role === 'client') return '/trainers'
  return '/home'
}

export function resolveCatalogPath(role: AppRole): string {
  return role === 'trainer' ? '/exercises' : '/home'
}
