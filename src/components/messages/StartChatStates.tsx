import { Link } from 'react-router-dom'
import { MessageSquare, SquarePen, Users } from 'lucide-react'

import type { ChatWritablePeer } from '../../lib/messages-formatters'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { PeerAvatar } from './AvatarStatus'

export function StartablePeersList({
  peers,
  pending,
  onStart,
  heading = true,
}: {
  peers: ChatWritablePeer[]
  pending: boolean
  onStart: (peerId: string) => void
  heading?: boolean
}) {
  return (
    <div className="space-y-1">
      {heading ? <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-secondary-foreground">Можно написать</div> : null}
      <ul aria-label="Доступные собеседники" className="space-y-1">
        {peers.map((peer) => (
          <li key={peer.userId}>
            <button
              type="button"
              disabled={pending}
              onClick={() => onStart(peer.userId)}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
            >
              <PeerAvatar title={peer.title} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{peer.title}</span>
                <span className="block truncate text-xs text-secondary-foreground">{peer.subtitle ?? 'Начать переписку'}</span>
              </span>
              <SquarePen size={14} aria-hidden="true" className="shrink-0 text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StartChatPanel({
  peers,
  peersLoading,
  relationsPath,
  isTrainer,
  pending,
  onStart,
}: {
  peers: ChatWritablePeer[]
  peersLoading: boolean
  relationsPath: string
  isTrainer: boolean
  pending: boolean
  onStart: (peerId: string) => void
}) {
  if (peersLoading) {
    return <div className="space-y-2 p-2"><Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-16 w-full rounded-xl" /></div>
  }
  if (peers.length === 1) {
    const peer = peers[0]
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <PeerAvatar title={peer.title} />
        <div><div className="font-medium">{peer.title}</div>{peer.subtitle ? <div className="mt-0.5 text-xs text-secondary-foreground">{peer.subtitle}</div> : null}</div>
        <p className="max-w-xs text-sm text-secondary-foreground">{isTrainer ? 'Напишите клиенту — переписка откроется сразу.' : 'Напишите тренеру — переписка откроется сразу.'}</p>
        <Button className="h-12 w-full max-w-xs gap-2" onClick={() => onStart(peer.userId)} disabled={pending}><SquarePen size={14} />{isTrainer ? 'Написать клиенту' : 'Написать тренеру'}</Button>
      </div>
    )
  }
  if (peers.length > 1) {
    return <div className="space-y-2 p-1"><div className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-secondary-foreground">Кому написать</div><StartablePeersList peers={peers} pending={pending} onStart={onStart} heading={false} /></div>
  }
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <Users size={22} className="text-primary" />
      <div className="font-medium">Пока некому написать</div>
      <p className="max-w-xs text-sm text-secondary-foreground">{isTrainer ? 'Сначала подключите клиента — после этого чат появится здесь.' : 'Сначала выберите тренера — после этого чат появится здесь.'}</p>
      <Button asChild className="h-12 w-full max-w-xs"><Link to={relationsPath}>{isTrainer ? 'К клиентам' : 'К тренерам'}</Link></Button>
    </div>
  )
}

export function EmptyThreadPane({
  peers,
  peersLoading,
  hasConversations,
  relationsPath,
  isTrainer,
  pending,
  onStart,
}: {
  peers: ChatWritablePeer[]
  peersLoading: boolean
  hasConversations: boolean
  relationsPath: string
  isTrainer: boolean
  pending: boolean
  onStart: (peerId: string) => void
}) {
  const singlePeer = !hasConversations && peers.length === 1 ? peers[0] : null
  let description = 'Выберите диалог слева.'
  if (!hasConversations && peersLoading) description = 'Загружаем, кому можно написать…'
  else if (singlePeer) description = isTrainer ? 'Откройте чат с клиентом в один клик.' : 'Откройте чат с тренером в один клик.'
  else if (!hasConversations && peers.length > 1) description = 'Выберите, кому написать, в списке слева.'
  else if (!hasConversations) description = isTrainer ? 'Подключите клиента — и чат появится здесь.' : 'Выберите тренера — и чат появится здесь.'
  else if (peers.length > 0) description = 'Выберите диалог слева или начните новый из списка «Можно написать».'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <MessageSquare size={28} className="text-primary" />
      <div className="text-base font-medium">{singlePeer ? `Написать ${singlePeer.title}` : 'Выберите переписку'}</div>
      <div className="max-w-sm text-sm text-secondary-foreground">{description}</div>
      {singlePeer ? (
        <Button className="gap-2" onClick={() => onStart(singlePeer.userId)} disabled={pending}><SquarePen size={14} />{isTrainer ? 'Написать клиенту' : 'Написать тренеру'}</Button>
      ) : !hasConversations && peers.length === 0 && !peersLoading ? (
        <Button asChild><Link to={relationsPath}>{isTrainer ? 'К клиентам' : 'К тренерам'}</Link></Button>
      ) : null}
    </div>
  )
}
