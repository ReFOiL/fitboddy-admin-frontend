import { Sparkles } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

type HeroCardProps = {
  login?: string | null
  email?: string | null
  roleLabel: string
}

export function HeroCard({ login, email, roleLabel }: HeroCardProps) {
  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="relative pb-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Sparkles size={14} />
              Персональная фитнес-платформа
            </div>
            <CardTitle className="text-2xl md:text-3xl">Добро пожаловать в Fitboddy</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Все под рукой: клиенты, профили и персональные рекомендации. Фокус только на том, что важно для прогресса.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
          <span className="text-secondary-foreground">Логин:</span> {login ?? 'не указан'}
        </div>
        <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
          <span className="text-secondary-foreground">Почта:</span> {email ?? 'не указана'}
        </div>
        <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
          <span className="text-secondary-foreground">Роль:</span> {roleLabel}
        </div>
      </CardContent>
    </Card>
  )
}
