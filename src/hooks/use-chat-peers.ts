import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getClientActiveRelation, listTrainerClients, listTrainers, queryKeys } from '../api'
import { formatTrainerClientCardSubtitle, formatTrainerClientCardTitle } from '../lib/relations-formatters'
import type { ChatPeerInfo, ChatWritablePeer } from '../lib/messages-formatters'
import type { AuthUser } from '../types/auth'

export function useChatPeerDirectory(user: AuthUser | null | undefined) {
  const userId = user?.user_id ?? ''
  const isTrainer = user?.role === 'trainer'
  const isClient = user?.role === 'client'

  const activeClientsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(userId, 'active'),
    queryFn: () => listTrainerClients(userId, 'active'),
    enabled: isTrainer && Boolean(userId),
  })
  const endedClientsQuery = useQuery({
    queryKey: queryKeys.relations.trainerClients(userId, 'ended'),
    queryFn: () => listTrainerClients(userId, 'ended'),
    enabled: isTrainer && Boolean(userId),
  })
  const clientRelationQuery = useQuery({
    queryKey: queryKeys.relations.clientActiveRelation(userId),
    queryFn: () => getClientActiveRelation(userId),
    enabled: isClient && Boolean(userId),
  })
  const trainersQuery = useQuery({
    queryKey: queryKeys.relations.trainers,
    queryFn: listTrainers,
    enabled: isClient,
  })

  const directory = useMemo(() => {
    const map = new Map<string, ChatPeerInfo>()

    for (const relation of [...(activeClientsQuery.data ?? []), ...(endedClientsQuery.data ?? [])]) {
      map.set(relation.client_user_id, {
        title: formatTrainerClientCardTitle(relation),
        subtitle: formatTrainerClientCardSubtitle(relation) ?? undefined,
      })
    }

    const activeTrainer = clientRelationQuery.data
    if (activeTrainer?.trainer_user_id) {
      map.set(activeTrainer.trainer_user_id, {
        title: activeTrainer.trainer_login?.trim() || 'Тренер',
      })
    }

    for (const trainer of trainersQuery.data ?? []) {
      if (map.has(trainer.user_id)) continue
      map.set(trainer.user_id, {
        title: trainer.display_name?.trim() || trainer.login?.trim() || 'Тренер',
      })
    }

    return map
  }, [activeClientsQuery.data, clientRelationQuery.data, endedClientsQuery.data, trainersQuery.data])

  const writablePeers = useMemo<ChatWritablePeer[]>(() => {
    if (isTrainer) {
      return (activeClientsQuery.data ?? []).map((relation) => ({
        userId: relation.client_user_id,
        title: formatTrainerClientCardTitle(relation),
        subtitle: formatTrainerClientCardSubtitle(relation) ?? undefined,
      }))
    }

    const trainerId = clientRelationQuery.data?.trainer_user_id
    if (!isClient || !trainerId) return []
    return [
      {
        userId: trainerId,
        title: directory.get(trainerId)?.title ?? clientRelationQuery.data?.trainer_login?.trim() ?? 'Тренер',
      },
    ]
  }, [activeClientsQuery.data, clientRelationQuery.data, directory, isClient, isTrainer])

  return {
    directory,
    writablePeers,
    isLoading:
      (isTrainer && activeClientsQuery.isLoading) ||
      (isClient && (clientRelationQuery.isLoading || trainersQuery.isLoading)),
  }
}
