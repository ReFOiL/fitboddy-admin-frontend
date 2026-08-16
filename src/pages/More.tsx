import { CalendarDays, ChevronRight, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { AlertBanner } from '../components/shared'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'

const moreLinks = [
  {
    label: 'План, расписание и настройки',
    description: 'Тренировки, расписание и параметры плана',
    path: APP_PATHS.planGeneration,
    icon: CalendarDays,
  },
  {
    label: 'Профиль',
    description: 'Личные данные и настройки профиля',
    path: APP_PATHS.profile,
    icon: UserRound,
  },
] as const

export function MorePage() {
  const { logoutMutation } = useAuth()

  return (
    <section className="mx-auto max-w-2xl space-y-4" aria-labelledby="more-title">
      <div>
        <h1 id="more-title" className="text-2xl font-semibold">
          Ещё
        </h1>
        <p className="mt-1 text-sm text-secondary-foreground">План и настройки аккаунта</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
          <CardDescription>Управляйте тренировками и профилем</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {moreLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3 transition hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Icon className="shrink-0 text-primary" size={20} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-xs text-secondary-foreground">{item.description}</span>
                </span>
                <ChevronRight className="shrink-0 text-secondary-foreground" size={18} aria-hidden="true" />
              </Link>
            )
          })}
        </CardContent>
      </Card>

      {logoutMutation.isError ? (
        <AlertBanner tone="destructive" title="Не удалось выйти" role="alert">
          Проверьте соединение и попробуйте ещё раз.
        </AlertBanner>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        className="w-full gap-2"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
      >
        <LogOut size={18} aria-hidden="true" />
        {logoutMutation.isPending ? 'Выходим…' : 'Выйти'}
      </Button>
    </section>
  )
}
