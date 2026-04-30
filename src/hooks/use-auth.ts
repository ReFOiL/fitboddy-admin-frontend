import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { login, logout, me, queryKeys, refresh, register } from '../api'
import { useAuthStore } from '../stores/auth.store'
import type { LoginRequest, RegisterRequest } from '../types/auth'

export function useAuth() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const payload = await me()
      setUser(payload)
      return payload
    },
    enabled: Boolean(accessToken),
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginRequest) => login(payload),
    onSuccess: (payload) => {
      setSession({
        accessToken: payload.tokens.access_token,
        refreshToken: payload.tokens.refresh_token,
        user: payload.user,
      })
      queryClient.setQueryData(queryKeys.auth.me, payload.user)
      toast.success('Вход выполнен')
    },
    onError: (error) => {
      const detail = axios.isAxiosError(error)
        ? (error.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      toast.error(detail ?? 'Не удалось войти')
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterRequest) => register(payload),
    onSuccess: (payload) => {
      setSession({
        accessToken: payload.tokens.access_token,
        refreshToken: payload.tokens.refresh_token,
        user: payload.user,
      })
      queryClient.setQueryData(queryKeys.auth.me, payload.user)
      toast.success('Регистрация выполнена')
    },
    onError: (error) => {
      const detail = axios.isAxiosError(error)
        ? (error.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      toast.error(detail ?? 'Не удалось зарегистрироваться')
    },
  })

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!refreshToken) throw new Error('missing refresh token')
      return refresh(refreshToken)
    },
    onSuccess: (payload) => {
      setSession({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user,
      })
    },
    onError: () => clearSession(),
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!refreshToken) return
      await logout(refreshToken)
    },
    onSettled: () => {
      clearSession()
      queryClient.removeQueries({ queryKey: queryKeys.auth.me })
    },
  })

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated: Boolean(accessToken),
    meQuery,
    loginMutation,
    registerMutation,
    refreshMutation,
    logoutMutation,
    clearSession,
  }
}
