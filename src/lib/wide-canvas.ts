import { APP_PATHS } from '../config'

/** Студия плана и список клиентов на десктопе занимают ширину макета. */
export function isWideTrainerPath(pathname: string): boolean {
  return pathname === APP_PATHS.clients || pathname === APP_PATHS.clientProfile
}
