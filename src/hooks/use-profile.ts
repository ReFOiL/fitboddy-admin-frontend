import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getProfile, getProfileMeta, queryKeys, upsertProfile, uploadProfileAvatar } from '../api'
import type { UpsertProfileRequest } from '../types/profile'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  return (error.response?.data as { detail?: string } | undefined)?.detail ?? fallback
}

export function useProfile(targetUserId: string) {
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: queryKeys.profiles.detail(targetUserId),
    queryFn: async () => getProfile(targetUserId),
    enabled: Boolean(targetUserId),
    retry: false,
  })

  const metaQuery = useQuery({
    queryKey: queryKeys.profiles.meta,
    queryFn: getProfileMeta,
    retry: false,
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: UpsertProfileRequest) => upsertProfile(targetUserId, payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profiles.detail(targetUserId), profile)
      toast.success('Профиль сохранен')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Не удалось сохранить профиль'))
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => uploadProfileAvatar(targetUserId, file),
    onSuccess: () => {
      toast.success('Аватар загружен')
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Не удалось загрузить аватар'))
    },
  })

  return {
    profileQuery,
    metaQuery,
    upsertMutation,
    uploadAvatarMutation,
  }
}
