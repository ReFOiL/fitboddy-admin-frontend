import { matchPath } from 'react-router-dom'

import type { NavItem } from '../config'

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return (
    pathname === item.path ||
    Boolean(item.activePaths?.some((pattern) => matchPath({ path: pattern, end: true }, pathname)))
  )
}
