import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, ClipboardList, Dumbbell, Home, Users } from 'lucide-react'

import { useAuth } from '../../hooks/use-auth'
import { Button } from '../ui/button'

export function MainLayout() {
  const { user, logoutMutation } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 font-medium transition ${
      isActive ? 'bg-primary/20 text-foreground' : 'text-secondary-foreground hover:bg-secondary/70 hover:text-foreground'
    }`

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/80 bg-[rgba(15,17,21,0.85)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <div className="hidden rounded-lg border border-border/80 bg-secondary/60 px-3 py-1 text-xs text-secondary-foreground md:block">
            Fitboddy Платформа
          </div>
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <NavLink className={navItemClass} to="/home">
              Главная
            </NavLink>
            <NavLink className={navItemClass} to="/clients">
              Клиенты
            </NavLink>
            {isTrainer ? (
              <NavLink className={navItemClass} to="/analytics">
                Аналитика
              </NavLink>
            ) : null}
            <NavLink className={navItemClass} to="/exercises">
              Каталог
            </NavLink>
            <NavLink className={navItemClass} to="/profile">
              Профиль
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-secondary-foreground sm:inline">{user?.email ?? 'пользователь'}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-6 md:pb-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div
          className={`mx-auto grid h-16 w-full max-w-6xl items-center px-4 text-sm ${isTrainer ? 'grid-cols-5' : 'grid-cols-4'}`}
        >
          <NavLink className={navItemClass} to="/home">
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <Home size={16} />
              Главная
            </span>
          </NavLink>
          <NavLink className={navItemClass} to="/clients">
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <Users size={16} />
              Клиенты
            </span>
          </NavLink>
          {isTrainer ? (
            <NavLink className={navItemClass} to="/analytics">
              <span className="mx-auto flex flex-col items-center gap-0.5">
                <BarChart3 size={16} />
                Аналитика
              </span>
            </NavLink>
          ) : null}
          <NavLink className={navItemClass} to="/exercises">
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <Dumbbell size={16} />
              Каталог
            </span>
          </NavLink>
          <NavLink className={navItemClass} to="/profile">
            <span className="mx-auto flex flex-col items-center gap-0.5">
              <ClipboardList size={16} />
              Профиль
            </span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
