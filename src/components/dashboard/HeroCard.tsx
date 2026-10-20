import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

type HeroCardProps = {
  login?: string | null
  email?: string | null
  roleLabel: string
}

export function HeroCard({ login, email, roleLabel }: HeroCardProps) {
  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-[28px]">Добро пожаловать в Fitboddy</CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">
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
