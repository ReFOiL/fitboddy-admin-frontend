import { ArrowRight, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/use-auth'
import { HeroCard, QuickActionsSection } from '../components/dashboard'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export function DashboardPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const relationsPath = isClient ? '/trainers' : '/clients'
  const relationsSectionLabel = isClient ? 'Тренеры и связи' : 'Клиенты и связи'
  const roleLabel =
    user?.role === 'trainer' ? 'Тренер' : user?.role === 'client' ? 'Клиент' : 'Пользователь'

  return (
    <div className="space-y-6">
      <HeroCard login={user?.login} email={user?.email} roleLabel={roleLabel} />
      <QuickActionsSection relationsPath={relationsPath} relationsSectionLabel={relationsSectionLabel} />
      {isClient ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket size={18} className="text-primary" />
              Мой план
            </CardTitle>
            <CardDescription>На одной странице: просмотр текущего плана и обновление из анкеты при необходимости.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <span className="text-sm text-secondary-foreground">Открой активный план и при необходимости обнови его из анкеты</span>
            <Button asChild>
              <Link to="/plan-generation" className="inline-flex items-center gap-2">
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
