import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../hooks/use-auth'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { StyledSelect } from '../components/ui/styled-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { AlertBanner } from '../components/shared'

const loginSchema = z.object({
  email_or_login: z
    .string()
    .trim()
    .min(3, 'Введите email или логин')
    .max(254, 'Слишком длинное значение'),
  password: z.string().min(8, 'Минимум 8 символов'),
})

const registerSchema = z
  .object({
    role: z.enum(['trainer', 'client']),
    login: z
      .string()
      .min(3, 'Логин: минимум 3 символа')
      .max(32, 'Логин: максимум 32 символа')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Логин: только латиница, цифры, _, -, .'),
    email: z.string().email('Введите корректный email'),
    password: z.string().min(8, 'Минимум 8 символов'),
    confirmPassword: z.string().min(8, 'Минимум 8 символов'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли должны совпадать',
    path: ['confirmPassword'],
  })

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

export const DEFAULT_REGISTRATION_ROLE: RegisterFormValues['role'] = 'client'

function getPasswordStrengthMeta(password: string): { label: string; colorClass: string; progress: number } {
  if (!password) {
    return { label: 'Не задан', colorClass: 'bg-secondary', progress: 0 }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 2) return { label: 'Слабый', colorClass: 'bg-destructive', progress: 33 }
  if (score <= 4) return { label: 'Нормальный', colorClass: 'bg-warning', progress: 66 }
  return { label: 'Сильный', colorClass: 'bg-success', progress: 100 }
}

export function LoginPage() {
  const navigate = useNavigate()
  const { loginMutation, registerMutation } = useAuth()
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false)

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email_or_login: '',
      password: '',
    },
  })

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: DEFAULT_REGISTRATION_ROLE,
      login: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const registerPassword = useWatch({ control: registerForm.control, name: 'password' }) ?? ''
  const watchedRole = useWatch({ control: registerForm.control, name: 'role' })
  const passwordStrength = useMemo(() => getPasswordStrengthMeta(registerPassword), [registerPassword])

  return (
    <main className="min-h-dvh bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] md:py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="order-2 border-primary/30 lg:order-1">
          <CardHeader>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Sparkles size={14} />
              Fitboddy для тренировок
            </div>
            <CardTitle className="text-2xl md:text-3xl">Тренируйтесь системно, а не хаотично</CardTitle>
            <CardDescription className="text-base">План, связь с тренером и прогресс — в одном месте.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-secondary-foreground">
            <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-foreground">
                <Users size={16} className="text-primary" />
                Клиент и тренер на связи
              </div>
              Меньше ручной рутины, больше фокуса на результате.
            </div>
            <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-foreground">
                <ShieldCheck size={16} className="text-primary" />
                Безопасность и прозрачность
              </div>
              Доступ к данным только у связанных пользователей.
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 border-primary/20 lg:order-2">
          <CardHeader>
            <CardTitle>Вход в аккаунт</CardTitle>
            <CardDescription>Войди в существующий аккаунт или создай новый за минуту.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {loginMutation.isError ? (
                  <AlertBanner className="mb-4" tone="destructive" title="Не удалось войти" role="alert">
                    Проверьте логин, пароль и соединение.
                  </AlertBanner>
                ) : null}
                <form
                  className="grid gap-4"
                  onSubmit={loginForm.handleSubmit((values) => {
                    loginMutation.mutate(
                      {
                        email_or_login: values.email_or_login.trim().toLowerCase(),
                        password: values.password,
                      },
                      {
                        onSuccess: () => navigate('/home', { replace: true }),
                      },
                    )
                  })}
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="login_email_or_login">Email или логин</Label>
                    <Input
                      id="login_email_or_login"
                      type="text"
                      autoComplete="username"
                      aria-invalid={Boolean(loginForm.formState.errors.email_or_login)}
                      aria-describedby={loginForm.formState.errors.email_or_login ? 'login_email_or_login-error' : undefined}
                      placeholder="ivan@example.com или ivan"
                      {...loginForm.register('email_or_login')}
                    />
                    {loginForm.formState.errors.email_or_login?.message ? (
                      <span id="login_email_or_login-error" className="text-xs text-destructive">
                        {loginForm.formState.errors.email_or_login.message}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="login_password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="login_password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        aria-invalid={Boolean(loginForm.formState.errors.password)}
                        aria-describedby={loginForm.formState.errors.password ? 'login_password-error' : undefined}
                        className="pr-12"
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-secondary-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        onClick={() => setShowLoginPassword((value) => !value)}
                        aria-label={showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password?.message ? (
                      <span id="login_password-error" className="text-xs text-destructive">{loginForm.formState.errors.password.message}</span>
                    ) : null}
                  </div>

                  <Button type="submit" size="lg" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? 'Входим…' : 'Войти'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                {registerMutation.isError ? (
                  <AlertBanner className="mb-4" tone="destructive" title="Не удалось зарегистрироваться" role="alert">
                    Проверьте данные и попробуйте ещё раз.
                  </AlertBanner>
                ) : null}
                <form
                  className="grid gap-4"
                  onSubmit={registerForm.handleSubmit((values) => {
                    registerMutation.mutate(
                      {
                        role: values.role,
                        login: values.login.trim().toLowerCase(),
                        email: values.email,
                        password: values.password,
                      },
                      {
                        onSuccess: () => navigate('/home', { replace: true }),
                      },
                    )
                  })}
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="register_role">Роль</Label>
                    <StyledSelect
                      id="register_role"
                      value={watchedRole}
                      onChange={(nextRole) =>
                        registerForm.setValue('role', nextRole as RegisterFormValues['role'], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      options={[
                        { value: 'client', label: 'Клиент' },
                        { value: 'trainer', label: 'Тренер' },
                      ]}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="register_login">Логин</Label>
                    <Input
                      id="register_login"
                      autoComplete="username"
                      aria-invalid={Boolean(registerForm.formState.errors.login)}
                      aria-describedby={registerForm.formState.errors.login ? 'register_login-error' : undefined}
                      placeholder="ivan"
                      {...registerForm.register('login')}
                    />
                    {registerForm.formState.errors.login?.message ? (
                      <span id="register_login-error" className="text-xs text-destructive">{registerForm.formState.errors.login.message}</span>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="register_email">Email</Label>
                    <Input
                      id="register_email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={Boolean(registerForm.formState.errors.email)}
                      aria-describedby={registerForm.formState.errors.email ? 'register_email-error' : undefined}
                      {...registerForm.register('email')}
                    />
                    {registerForm.formState.errors.email?.message ? (
                      <span id="register_email-error" className="text-xs text-destructive">{registerForm.formState.errors.email.message}</span>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="register_password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="register_password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        aria-invalid={Boolean(registerForm.formState.errors.password)}
                        aria-describedby={registerForm.formState.errors.password ? 'register_password-error' : 'register_password-strength'}
                        className="pr-12"
                        {...registerForm.register('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-secondary-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        onClick={() => setShowRegisterPassword((value) => !value)}
                        aria-label={showRegisterPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 rounded bg-secondary">
                        <div
                          className={`h-1.5 rounded transition-all ${passwordStrength.colorClass}`}
                          style={{ width: `${passwordStrength.progress}%` }}
                        />
                      </div>
                      <span id="register_password-strength" className="text-xs text-secondary-foreground" aria-live="polite">
                        Надёжность: {passwordStrength.label}
                      </span>
                    </div>
                    {registerForm.formState.errors.password?.message ? (
                      <span id="register_password-error" className="text-xs text-destructive">{registerForm.formState.errors.password.message}</span>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="register_confirm_password">Повторите пароль</Label>
                    <div className="relative">
                      <Input
                        id="register_confirm_password"
                        type={showRegisterConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        aria-invalid={Boolean(registerForm.formState.errors.confirmPassword)}
                        aria-describedby={registerForm.formState.errors.confirmPassword ? 'register_confirm_password-error' : undefined}
                        className="pr-12"
                        {...registerForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-secondary-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        onClick={() => setShowRegisterConfirmPassword((value) => !value)}
                        aria-label={showRegisterConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showRegisterConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword?.message ? (
                      <span id="register_confirm_password-error" className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</span>
                    ) : null}
                  </div>

                  <Button type="submit" size="lg" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
