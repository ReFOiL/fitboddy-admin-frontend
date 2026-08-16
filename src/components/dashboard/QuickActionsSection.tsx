import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, MessageSquare, Users } from 'lucide-react'

import { APP_PATHS } from '../../config'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

type QuickActionsSectionProps = {
  relationsPath: string
  relationsSectionLabel: string
  unreadCount?: number
}

export function QuickActionsSection({ relationsPath, relationsSectionLabel, unreadCount = 0 }: QuickActionsSectionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            {relationsSectionLabel}
          </CardTitle>
          <CardDescription>Находите новых клиентов, подключайте их в один клик и ведите активную базу без технических шагов.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-secondary-foreground">Управление отношениями тренер-клиент</span>
          <Button asChild className="w-full sm:w-auto">
            <Link to={relationsPath} className="inline-flex items-center justify-center gap-2">
              Открыть
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Сообщения
            </span>
            {unreadCount > 0 ? (
              <span className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {unreadCount}
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            {unreadCount > 0
              ? `Есть непрочитанные сообщения: ${unreadCount}`
              : 'Напишите тренеру или клиенту без лишних шагов — чат откроется сразу.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-secondary-foreground">
            {unreadCount > 0 ? 'Откройте чат, чтобы ответить' : 'Переписки по активным связям'}
          </span>
          <Button asChild className="w-full sm:w-auto">
            <Link to={APP_PATHS.messages} className="inline-flex items-center justify-center gap-2">
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
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-secondary-foreground">Основа для персональных планов</span>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/profile" className="inline-flex items-center justify-center gap-2">
              Открыть
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
