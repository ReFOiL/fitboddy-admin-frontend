import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import type { ProfileResponse } from '../../types/profile'

type MyProfileCardProps = {
  profile: ProfileResponse | undefined
  isLoading: boolean
  hasNoProfile: boolean
  hasError: boolean
  fallbackName?: string | null
}

export function MyProfileCard({ profile, isLoading, hasNoProfile, hasError, fallbackName }: MyProfileCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Мой профиль</CardTitle>
        <CardDescription>Личные данные и фото, которые можно использовать в сценариях платформы.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
        {!isLoading && hasNoProfile ? (
          <span className="text-sm text-secondary-foreground">Профиль еще не заполнен. Открой раздел «Профиль и цели».</span>
        ) : null}
        {!isLoading && !hasNoProfile && profile ? (
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? 'Аватар пользователя'}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-secondary/40 text-xs text-secondary-foreground">
                без фото
              </div>
            )}
            <div className="space-y-1 text-sm">
              <div className="font-medium">{profile.full_name || fallbackName || 'Пользователь'}</div>
              <div className="text-secondary-foreground">{profile.city || 'Город не указан'}</div>
              {profile.bio ? <div className="text-secondary-foreground">{profile.bio}</div> : null}
            </div>
          </div>
        ) : null}
        {!isLoading && hasError ? <span className="text-sm text-destructive">Не удалось загрузить профиль пользователя.</span> : null}
      </CardContent>
    </Card>
  )
}
