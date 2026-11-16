import { Eye } from 'lucide-react'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

type TrainerVisibilityCardProps = {
  visibilityLabel: string
  selfVisibleAsTrainer: boolean
  disabled: boolean
  onToggle: () => void
}

export function TrainerVisibilityCard({
  visibilityLabel,
  selfVisibleAsTrainer,
  disabled,
  onToggle,
}: TrainerVisibilityCardProps) {
  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye size={18} className="text-accent-ink" />
          Видимость в каталоге
        </CardTitle>
        <CardDescription>Вы можете в любой момент открыть профиль в каталоге тренеров и снова скрыть его.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
          <span className="mb-3 block text-sm">Видимость в каталоге тренеров: {visibilityLabel}</span>
          <Button size="sm" onClick={onToggle} disabled={disabled}>
            {selfVisibleAsTrainer ? 'Скрыть профиль тренера' : 'Опубликовать профиль тренера'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
