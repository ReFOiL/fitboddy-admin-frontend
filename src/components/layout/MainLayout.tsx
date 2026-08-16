import { NavLink, Outlet, matchPath, useLocation } from 'react-router-dom'
import { BarChart3, ClipboardList, Dumbbell, Home, ListChecks, MessageSquare, Rocket, Users } from 'lucide-react'

import { APP_BRAND_NAME, APP_PATHS } from '../../config'
import { useAuth } from '../../hooks/use-auth'
import { useMessagingSocket, useUnreadCount } from '../../hooks/use-messages'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

export function MainLayout() {
  const { user, logoutMutation } = useAuth()
  const location = useLocation()
  useMessagingSocket(Boolean(user))
  const unreadQuery = useUnreadCount(Boolean(user))
  const unreadCount = unreadQuery.data?.unread_count ?? 0
  const isTrainer = user?.role === 'trainer'
  const isClient = user?.role === 'client'
  const relationsTabLabel = isTrainer ? 'Клиенты' : 'Тренеры'
  const relationsTabPath = isTrainer ? '/clients' : '/trainers'
  const isChatThread = Boolean(matchPath(APP_PATHS.messageThread, location.pathname))
  const isMessagesSection = location.pathname === APP_PATHS.messages || isChatThread
  const mobileGridClass = isTrainer ? 'grid-cols-6' : isClient ? 'grid-cols-5' : 'grid-cols-3'
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 font-medium transition ${
      isActive ? 'bg-primary/20 text-foreground' : 'text-secondary-foreground hover:bg-secondary/70 hover:text-foreground'
    }`
  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-full min-h-12 items-center justify-center rounded-lg px-1 text-[11px] font-medium transition',
      isActive ? 'bg-primary/20 text-foreground' : 'text-secondary-foreground',
    )

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-background text-foreground',
        (isChatThread || isMessagesSection) && 'h-dvh overflow-hidden',
      )}
    >
      <header className="sticky top-0 z-20 shrink-0 border-b border-border/80 bg-[rgba(15,17,21,0.92)] pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
          <div className="truncate text-sm font-semibold md:hidden">{APP_BRAND_NAME}</div>
          <div className="hidden rounded-lg border border-border/80 bg-secondary/60 px-3 py-1 text-xs text-secondary-foreground md:block">
            {APP_BRAND_NAME} Платформа
          </div>
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <NavLink className={navItemClass} to="/home">
              Главная
            </NavLink>
            <NavLink className={navItemClass} to={relationsTabPath}>
              {relationsTabLabel}
            </NavLink>
            {isTrainer ? (
              <NavLink className={navItemClass} to="/analytics">
                Аналитика
              </NavLink>
            ) : null}
            {isTrainer ? (
              <NavLink className={navItemClass} to="/exercises">
                Каталог
              </NavLink>
            ) : null}
            {isTrainer ? (
              <NavLink className={navItemClass} to={APP_PATHS.planRules}>
                Правила планов
              </NavLink>
            ) : null}
            {isClient ? (
              <NavLink className={navItemClass} to="/plan-generation">
                План
              </NavLink>
            ) : null}
            <NavLink className={navItemClass} to={APP_PATHS.messages}>
              Сообщения
              {unreadCount > 0 ? (
                <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </NavLink>
            <NavLink className={navItemClass} to="/profile">
              Профиль
            </NavLink>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            {isTrainer ? (
              <NavLink
                to={APP_PATHS.messages}
                className="relative rounded-lg p-2.5 text-secondary-foreground hover:bg-secondary/70 md:hidden"
                aria-label="Сообщения"
              >
                <MessageSquare size={20} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </NavLink>
            ) : null}
            <span className="hidden text-xs text-secondary-foreground sm:inline">{user?.email ?? 'пользователь'}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="md:h-10 md:px-4 md:text-sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main
        className={cn(
          'mx-auto w-full max-w-6xl flex-1',
          (isChatThread || isMessagesSection) && 'min-h-0 overflow-hidden',
          isChatThread || isMessagesSection ? 'px-0 py-0 md:px-6 md:py-6' : 'px-4 py-4 md:px-6 md:py-6',
          isChatThread
            ? 'pb-0 md:pb-6'
            : isMessagesSection
              ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-6'
              : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6',
        )}
      >
        <Outlet />
      </main>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden',
          isChatThread ? 'hidden' : 'block',
        )}
      >
        <div className={cn('mx-auto grid h-[4.25rem] w-full max-w-6xl items-center px-1', mobileGridClass)}>
          <NavLink className={mobileTabClass} to="/home">
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <Home size={18} />
              Главная
            </span>
          </NavLink>
          <NavLink className={mobileTabClass} to={relationsTabPath}>
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <Users size={18} />
              {relationsTabLabel}
            </span>
          </NavLink>
          {isTrainer ? (
            <NavLink className={mobileTabClass} to="/analytics">
              <span className="mx-auto flex flex-col items-center gap-0.5">
                <BarChart3 size={18} />
                Аналитика
              </span>
            </NavLink>
          ) : null}
          {isTrainer ? (
            <NavLink className={mobileTabClass} to="/exercises">
              <span className="mx-auto flex flex-col items-center gap-0.5">
                <Dumbbell size={18} />
                Каталог
              </span>
            </NavLink>
          ) : null}
          {isTrainer ? (
            <NavLink className={mobileTabClass} to={APP_PATHS.planRules}>
              <span className="mx-auto flex flex-col items-center gap-0.5">
                <ListChecks size={18} />
                Правила
              </span>
            </NavLink>
          ) : null}
          {isClient ? (
            <NavLink className={mobileTabClass} to={APP_PATHS.messages}>
              <span className="relative mx-auto flex flex-col items-center gap-0.5">
                <span className="relative">
                  <MessageSquare size={18} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex min-w-4 justify-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                      {unreadCount}
                    </span>
                  ) : null}
                </span>
                Сообщения
              </span>
            </NavLink>
          ) : null}
          {isClient ? (
            <NavLink className={mobileTabClass} to="/plan-generation">
              <span className="mx-auto flex flex-col items-center gap-0.5">
                <Rocket size={18} />
                План
              </span>
            </NavLink>
          ) : null}
          <NavLink className={mobileTabClass} to="/profile">
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <ClipboardList size={18} />
              Профиль
            </span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
