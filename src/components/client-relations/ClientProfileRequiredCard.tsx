import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card'

export function ClientProfileRequiredCard() {
  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-300">
          <ClipboardList size={18} />
          Сначала профиль
        </CardTitle>
        <CardDescription>
          Перед поиском и подключением тренера нужно заполнить профиль в разделе{' '}
          <Link to="/profile" className="underline decoration-dotted underline-offset-4">
            «Профиль и цели»
          </Link>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
