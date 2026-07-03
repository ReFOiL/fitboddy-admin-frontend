import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, Users } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

type QuickActionsSectionProps = {
  relationsPath: string
  relationsSectionLabel: string
}

export function QuickActionsSection({ relationsPath, relationsSectionLabel }: QuickActionsSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            {relationsSectionLabel}
          </CardTitle>
          <CardDescription>Находите новых клиентов, подключайте их в один клик и ведите активную базу без технических шагов.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <span className="text-sm text-secondary-foreground">Управление отношениями тренер-клиент</span>
          <Button asChild>
            <Link to={relationsPath} className="inline-flex items-center gap-2">
              Открыть
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-primary" />
            Профиль и цели
          </CardTitle>
          <CardDescription>Заполняйте цели, ограничения и инвентарь, чтобы рекомендации были безопасными и персонализированными.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <span className="text-sm text-secondary-foreground">Основа для персональных планов</span>
          <Button asChild>
            <Link to="/profile" className="inline-flex items-center gap-2">
              Открыть
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
