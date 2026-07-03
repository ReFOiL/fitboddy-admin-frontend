export const RELATION_MODE_VALUES = ['invite', 'direct'] as const
export type RelationMode = (typeof RELATION_MODE_VALUES)[number]

export const RELATION_STATUS_VALUES = ['invited', 'active', 'declined', 'ended'] as const
export type RelationStatus = (typeof RELATION_STATUS_VALUES)[number]

export const RELATION_STATUS_LABELS: Record<RelationStatus, string> = {
  invited: 'Приглашение',
  active: 'Активна',
  declined: 'Отклонена',
  ended: 'Завершена',
}

export type CreateRelationRequest = {
  acting_user_id: string
  trainer_user_id: string
  client_user_id: string
  mode: RelationMode
}

export type RelationActionRequest = {
  acting_user_id: string
}

export type TrainerClientRelation = {
  relation_id: string
  trainer_user_id: string
  trainer_login?: string | null
  client_user_id: string
  client_login?: string | null
  client_display_name?: string | null
  status: RelationStatus
  source: string
  created_at: string
  updated_at: string
}

export type TrainerFunnelMetrics = {
  trainer_user_id: string
  invites_sent: number
  invites_pending: number
  invites_accepted: number
  invites_declined: number
  active_clients: number
  invite_acceptance_rate: number
}

export type TrainerPublicationStatus = {
  trainer_user_id: string
  is_published: boolean
}

export type DiscoveryProfile = {
  user_id: string
  login?: string | null
  display_name?: string | null
  role: 'trainer' | 'client'
  created_at: string
  updated_at: string
}

export type UpsertDiscoveryProfileRequest = {
  role: 'trainer' | 'client'
  is_visible: boolean
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
