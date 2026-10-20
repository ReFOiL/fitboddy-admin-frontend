import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getNotificationSettings,
  issueTelegramLinkCode,
  queryKeys,
  unlinkTelegram,
  updateNotificationSettings,
} from '../api'
import { notificationSettingsBody } from '../lib/notification-settings'
import { getUserErrorMessage } from '../lib/user-error-message'
import type { NotificationSettingsPatch } from '../types/notifications'

export function useNotificationSettings() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.plans.notificationSettings,
    queryFn: getNotificationSettings,
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: async (patch: NotificationSettingsPatch) => updateNotificationSettings(notificationSettingsBody(patch)),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.plans.notificationSettings, settings)
      toast.success('Настройки уведомлений сохранены')
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось сохранить настройки уведомлений.')),
  })

  const linkMutation = useMutation({
    mutationFn: issueTelegramLinkCode,
  })

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: async () => {
      toast.success('Telegram отключён')
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.notificationSettings })
    },
    onError: (error) => toast.error(getUserErrorMessage(error, 'Не удалось отключить Telegram.')),
  })

  return { settingsQuery, updateMutation, linkMutation, unlinkMutation }
}
