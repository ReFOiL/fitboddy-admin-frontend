import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

import { APP_PATHS } from '../../config'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

export function ClientProfileRequiredCard() {
  return (
    <Card className="border-warning/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <ClipboardList size={18} />
          Сначала профиль
        </CardTitle>
        <CardDescription>Заполните профиль, чтобы выбрать тренера.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full sm:w-auto">
          <Link to={APP_PATHS.profileOnboarding}>Заполнить профиль</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
