import { ArrowRight, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/use-auth'
import { useUnreadCount } from '../hooks/use-messages'
import { HeroCard, QuickActionsSection } from '../components/dashboard'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export function DashboardPage() {
  const { user } = useAuth()
  const unreadQuery = useUnreadCount(Boolean(user))
  const unreadCount = unreadQuery.data?.unread_count ?? 0
  const isClient = user?.role === 'client'
  const relationsPath = isClient ? '/trainers' : '/clients'
  const relationsSectionLabel = isClient ? 'Тренеры и связи' : 'Клиенты и связи'
  const roleLabel =
    user?.role === 'trainer' ? 'Тренер' : user?.role === 'client' ? 'Клиент' : 'Пользователь'

  return (
    <div className="space-y-6">
      <HeroCard login={user?.login} email={user?.email} roleLabel={roleLabel} />
      <QuickActionsSection
        relationsPath={relationsPath}
        relationsSectionLabel={relationsSectionLabel}
        unreadCount={unreadCount}
      />
      {isClient ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket size={18} className="text-primary" />
              Мой план
            </CardTitle>
            <CardDescription>
              Самостоятельно или с тренером: генерация плана из анкеты и просмотр расписания.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-secondary-foreground">
              Можно начать без тренера — «Тренироваться самостоятельно»
            </span>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/plan-generation" className="inline-flex items-center justify-center gap-2">
                К плану
                <ArrowRight size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
