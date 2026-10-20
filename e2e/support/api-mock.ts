import type { Request as PlaywrightRequest } from '@playwright/test'

import type { AuthUser } from '../../src/types/auth'
import type { TrainerExercise } from '../../src/types/exercise'
import type { GenerationPolicy } from '../../src/types/generation-policy'
import type { NotificationSettings } from '../../src/types/notifications'
import type { PlanDay, PlanExercise, PlanSlotWrite, TodayWorkout, TrainingPlan } from '../../src/types/plan'
import type { ProfileResponse } from '../../src/types/profile'
import type { TrainerClientRelation } from '../../src/types/relation'

/**
 * Состояние API живёт в процессе теста и переживает reload страницы.
 * Неизвестный маршрут отвечает 404, чтобы запрос не висел до таймаута axios.
 */

export const TOKENS = {
  trainer: 'trainer-token',
  anna: 'client-anna-token',
  egor: 'client-egor-token',
} as const

export const IDS = {
  trainer: 'user-trainer-marina',
  anna: 'user-client-anna',
  egor: 'user-client-egor',
} as const

const TENANT = 'tenant-fitboddy'
const STAMP = '2026-09-01T10:00:00.000Z'

type MockResponse = {
  status: number
  contentType: string
  body: string
  headers?: Record<string, string>
}

type SlotWrite = PlanSlotWrite & { note?: string | null }

function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function mondayIndex(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function readBody(request: PlaywrightRequest): unknown {
  const raw = request.postData()
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function user(partial: Pick<AuthUser, 'user_id' | 'login' | 'email' | 'role'>): AuthUser {
  return {
    tenant_id: TENANT,
    is_active: true,
    created_at: '2026-01-15T08:00:00.000Z',
    ...partial,
  }
}

function profile(partial: Pick<ProfileResponse, 'user_id' | 'full_name' | 'city' | 'age' | 'gender' | 'goal' | 'experience_level' | 'workout_location'>): ProfileResponse {
  return {
    profile_id: `profile-${partial.user_id}`,
    tenant_id: TENANT,
    avatar_url: null,
    bio: null,
    unavailable_equipment: [],
    limitations: null,
    medical_notes: null,
    created_at: STAMP,
    updated_at: STAMP,
    ...partial,
  }
}

function catalogExercise(
  partial: Pick<TrainerExercise, 'row_id' | 'exercise_name' | 'workout_category' | 'equipment'> &
    Partial<Pick<TrainerExercise, 'default_sets' | 'default_reps' | 'default_weight_kg' | 'description'>>,
): TrainerExercise {
  return {
    trainer_user_id: IDS.trainer,
    description: partial.description ?? 'Держите корпус ровно и не бросайте вес.',
    is_cardio: false,
    is_hold: false,
    difficulty: 2,
    default_sets: partial.default_sets ?? 3,
    default_reps: partial.default_reps ?? 8,
    default_duration_seconds: null,
    default_rest_seconds: 0,
    default_weight_kg: partial.default_weight_kg ?? 40,
    load_scheme: 'flat',
    scheme_steps: [],
    is_active: true,
    video_url: null,
    start_image_url: null,
    end_image_url: null,
    created_at: STAMP,
    updated_at: STAMP,
    primary_muscles: [],
    secondary_muscles: [],
    ...partial,
  }
}

function planExercise(
  partial: Pick<PlanExercise, 'line_id' | 'exercise_id' | 'exercise_name' | 'sets' | 'reps' | 'weight_kg'> &
    Partial<Pick<PlanExercise, 'sort_order' | 'note' | 'rest_seconds' | 'category'>>,
): PlanExercise {
  return {
    category: partial.category ?? 'upper',
    is_cardio: false,
    sort_order: partial.sort_order ?? 1,
    duration_seconds: null,
    rest_seconds: partial.rest_seconds ?? 90,
    note: partial.note ?? null,
    set_prescriptions: [],
    ...partial,
  }
}

function planDay(
  partial: Pick<PlanDay, 'day_id' | 'day_index' | 'week' | 'day_of_week' | 'scheduled_for' | 'exercises'>,
): PlanDay {
  return {
    volume_multiplier: 1,
    is_completed: false,
    completed_at: null,
    ...partial,
  }
}

export class ApiMock {
  private readonly usersByToken = new Map<string, AuthUser>()
  private readonly profiles = new Map<string, ProfileResponse>()
  private readonly plans = new Map<string, TrainingPlan>()
  private readonly catalog: TrainerExercise[]
  private policy: GenerationPolicy
  private notifications: NotificationSettings
  private revision = 1

  constructor() {
    const trainer = user({
      user_id: IDS.trainer,
      login: 'marina.sokolova',
      email: 'marina.sokolova@fitboddy.test',
      role: 'trainer',
    })
    const anna = user({
      user_id: IDS.anna,
      login: 'anna.ivanova',
      email: 'anna.ivanova@fitboddy.test',
      role: 'client',
    })
    const egor = user({
      user_id: IDS.egor,
      login: 'egor.smirnov',
      email: 'egor.smirnov@fitboddy.test',
      role: 'client',
    })
    this.usersByToken.set(TOKENS.trainer, trainer)
    this.usersByToken.set(TOKENS.anna, anna)
    this.usersByToken.set(TOKENS.egor, egor)

    this.profiles.set(
      IDS.trainer,
      profile({
        user_id: IDS.trainer,
        full_name: 'Марина Соколова',
        city: 'Санкт-Петербург',
        age: 36,
        gender: 'female',
        goal: 'maintenance',
        experience_level: 'advanced',
        workout_location: 'gym',
      }),
    )
    this.profiles.set(
      IDS.anna,
      profile({
        user_id: IDS.anna,
        full_name: 'Анна Иванова',
        city: 'Москва',
        age: 29,
        gender: 'female',
        goal: 'muscle_gain',
        experience_level: 'intermediate',
        workout_location: 'gym',
      }),
    )
    this.profiles.set(
      IDS.egor,
      profile({
        user_id: IDS.egor,
        full_name: 'Егор Смирнов',
        city: 'Казань',
        age: 34,
        gender: 'male',
        goal: 'weight_loss',
        experience_level: 'beginner',
        workout_location: 'home',
      }),
    )

    this.catalog = [
      catalogExercise({
        row_id: 'row-bench',
        exercise_name: 'Жим лёжа',
        workout_category: 'upper',
        equipment: 'barbell',
        description: 'Лопатки сведены, стопы на полу.',
      }),
      catalogExercise({
        row_id: 'row-squat',
        exercise_name: 'Приседания со штангой',
        workout_category: 'lower',
        equipment: 'barbell',
        default_sets: 4,
        default_reps: 6,
        default_weight_kg: 60,
        description: 'Колени в сторону носков, глубина ниже параллели.',
      }),
      catalogExercise({
        row_id: 'row-lat',
        exercise_name: 'Тяга верхнего блока',
        workout_category: 'upper',
        equipment: 'none',
        description: 'Тяните к ключицам, не раскачивайтесь.',
      }),
      catalogExercise({
        row_id: 'row-crunch',
        exercise_name: 'Скручивания',
        workout_category: 'core',
        equipment: 'none',
        default_reps: 15,
        default_weight_kg: null,
        description: 'Поясница прижата, движение коротким.',
      }),
      catalogExercise({
        row_id: 'row-dips',
        exercise_name: 'Отжимания на брусьях',
        workout_category: 'upper',
        equipment: 'none',
        description: 'Корпус чуть вперёд, локти назад.',
      }),
    ]

    this.plans.set(IDS.anna, this.studioPlan())
    this.notifications = {
      timezone: 'Europe/Moscow',
      timezone_is_default: true,
      notifications_enabled: true,
      telegram_linked: false,
    }
    this.policy = {
      excluded_pairs: [],
      default_splits: {},
      default_workouts_per_week: { beginner: 3, intermediate: 3, advanced: 3 },
      exercises_per_session: {
        default: { min: 4, max: 7 },
        beginner: { min: 3, max: 5 },
        intermediate: { min: 4, max: 6 },
        advanced: { min: 4, max: 7 },
        rehabilitation: { min: 3, max: 4 },
      },
    }
  }

  /** У клиента ещё нет плана: студия предлагает собрать его из каталога. */
  clearPlan(clientUserId: string): void {
    this.plans.delete(clientUserId)
  }

  /** Одна сегодняшняя тренировка для клиентского сценария. */
  useTodayWorkout(): void {
    const today = utcToday()
    const bench = this.catalog.find((item) => item.row_id === 'row-bench')
    const plan = this.basePlan(IDS.anna, 'plan-today')
    plan.days = [
      planDay({
        day_id: 'day-today',
        day_index: 1,
        week: 1,
        day_of_week: mondayIndex(today),
        scheduled_for: today,
        exercises: [
          planExercise({
            line_id: 'line-today-bench',
            exercise_id: 'row-bench',
            exercise_name: bench?.exercise_name ?? 'Жим лёжа',
            sets: 3,
            reps: 8,
            weight_kg: 40,
            rest_seconds: 90,
          }),
        ],
      }),
    ]
    this.plans.set(IDS.anna, plan)
  }

  handle(request: PlaywrightRequest): MockResponse {
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method().toUpperCase()
    const actor = this.actor(request)

    if (path === '/api/v1/auth/me' && method === 'GET') {
      return actor ? this.json(200, actor) : this.json(401, { detail: 'unauthorized' })
    }
    if (path === '/api/v1/auth/logout' && method === 'POST') return this.json(200, {})
    if (path === '/api/v1/profiles/meta' && method === 'GET') return this.json(200, this.meta())
    if (path === '/api/v1/messages/unread-count' && method === 'GET') return this.json(200, { unread_count: 0 })
    if (path === '/api/v1/messages/conversations' && method === 'GET') return this.json(200, [])
    if (path === '/api/v1/muscles' && method === 'GET') return this.json(200, [])
    if (path === '/api/v1/marketplace/trainers' && method === 'GET') return this.json(200, [])
    if (path === '/api/v1/plans/me/today' && method === 'GET') return this.today(actor)
    if (path === '/api/v1/plans/generate' && method === 'POST') return this.generate(readBody(request))

    const complete = /^\/api\/v1\/plans\/me\/days\/(\d+)\/complete$/.exec(path)
    if (complete && method === 'POST') return this.completeDay(actor, Number(complete[1]), readBody(request))

    if (path === '/api/v1/auth/clients/by-login' && method === 'GET') {
      return this.lookupLogin(url.searchParams.get('login') ?? '')
    }

    if (path === '/api/v1/plans/me/notifications/settings' && method === 'GET') {
      return this.json(200, structuredClone(this.notifications))
    }
    if (path === '/api/v1/plans/me/notifications/settings' && method === 'PUT') {
      return this.updateNotifications(readBody(request))
    }
    if (path === '/api/v1/plans/me/notifications/telegram/link-code' && method === 'POST') {
      return this.json(200, { code: 'Ab12Cd34', expires_at: '2026-10-20T18:30:00.000Z' })
    }
    if (path === '/api/v1/plans/me/notifications/telegram' && method === 'DELETE') {
      this.notifications = { ...this.notifications, telegram_linked: false }
      return this.json(200, {})
    }

    const profileMatch = /^\/api\/v1\/profiles\/([^/]+)$/.exec(path)
    if (profileMatch && method === 'GET') {
      const found = this.profiles.get(decodeURIComponent(profileMatch[1]))
      return found ? this.json(200, found) : this.json(404, { detail: 'not found' })
    }

    const clients = /^\/api\/v1\/marketplace\/trainers\/([^/]+)\/clients$/.exec(path)
    if (clients && method === 'GET') return this.clients(decodeURIComponent(clients[1]))

    const funnel = /^\/api\/v1\/marketplace\/trainers\/([^/]+)\/funnel$/.exec(path)
    if (funnel && method === 'GET') {
      return this.json(200, {
        trainer_user_id: decodeURIComponent(funnel[1]),
        invites_sent: 4,
        invites_pending: 1,
        invites_accepted: 3,
        invites_declined: 0,
        active_clients: 1,
        invite_acceptance_rate: 0.75,
      })
    }

    const publication = /^\/api\/v1\/marketplace\/trainers\/([^/]+)\/publication-status$/.exec(path)
    if (publication && method === 'GET') {
      return this.json(200, { trainer_user_id: decodeURIComponent(publication[1]), is_published: true })
    }

    const activeRelation = /^\/api\/v1\/marketplace\/clients\/([^/]+)\/active-relation$/.exec(path)
    if (activeRelation && method === 'GET') return this.activeRelation(decodeURIComponent(activeRelation[1]))

    const invites = /^\/api\/v1\/marketplace\/clients\/([^/]+)\/invites$/.exec(path)
    if (invites && method === 'GET') return this.json(200, [])

    const exercises = /^\/api\/v1\/trainers\/([^/]+)\/exercises$/.exec(path)
    if (exercises && method === 'GET') return this.json(200, this.catalog)

    const exercise = /^\/api\/v1\/trainers\/([^/]+)\/exercises\/([^/]+)$/.exec(path)
    if (exercise && method === 'GET') {
      const found = this.catalog.find((item) => item.row_id === decodeURIComponent(exercise[2]))
      return found ? this.json(200, found) : this.json(404, { detail: 'not found' })
    }

    const policy = /^\/api\/v1\/trainers\/([^/]+)\/generation-policy$/.exec(path)
    if (policy && method === 'GET') return this.json(200, this.policy)
    if (policy && method === 'PUT') {
      this.policy = asRecord(readBody(request)) as GenerationPolicy
      return this.json(200, this.policy)
    }

    const userPlan = /^\/api\/v1\/plans\/users\/([^/]+)\/active$/.exec(path)
    if (userPlan && method === 'GET') return this.readPlan(decodeURIComponent(userPlan[1]))

    const trainerPlan = /^\/api\/v1\/plans\/clients\/([^/]+)\/trainers\/([^/]+)\/active$/.exec(path)
    if (trainerPlan && method === 'GET') return this.readPlan(decodeURIComponent(trainerPlan[1]))
    if (trainerPlan && method === 'POST') {
      return this.createEmpty(decodeURIComponent(trainerPlan[1]), decodeURIComponent(trainerPlan[2]), readBody(request))
    }

    const newDay = /^\/api\/v1\/plans\/clients\/([^/]+)\/trainers\/([^/]+)\/days$/.exec(path)
    if (newDay && method === 'POST') {
      return this.addDay(decodeURIComponent(newDay[1]), readBody(request))
    }

    const copyWeek = /^\/api\/v1\/plans\/clients\/([^/]+)\/trainers\/([^/]+)\/weeks\/(\d+)\/copy$/.exec(path)
    if (copyWeek && method === 'POST') {
      return this.copyWeek(decodeURIComponent(copyWeek[1]), Number(copyWeek[3]), readBody(request))
    }

    const copyDay = /^\/api\/v1\/plans\/clients\/([^/]+)\/trainers\/([^/]+)\/days\/(\d+)\/copy$/.exec(path)
    if (copyDay && method === 'POST') {
      return this.copyDay(decodeURIComponent(copyDay[1]), Number(copyDay[3]), readBody(request))
    }

    const dayItem = /^\/api\/v1\/plans\/clients\/([^/]+)\/trainers\/([^/]+)\/days\/(\d+)$/.exec(path)
    if (dayItem && method === 'PUT') {
      return this.replaceSlots(decodeURIComponent(dayItem[1]), Number(dayItem[3]), readBody(request))
    }
    if (dayItem && method === 'PATCH') {
      return this.patchDayTime(decodeURIComponent(dayItem[1]), Number(dayItem[3]), readBody(request))
    }
    if (dayItem && method === 'DELETE') {
      return this.deleteDay(decodeURIComponent(dayItem[1]), Number(dayItem[3]))
    }

    const loads = /^\/api\/v1\/plans\/clients\/([^/]+)\/trainers\/([^/]+)\/loads$/.exec(path)
    if (loads && method === 'GET') return this.json(200, [])

    console.error(`e2e mock: нет обработчика ${method} ${path}`)
    return this.json(404, { detail: `not mocked: ${method} ${path}` })
  }

  private actor(request: PlaywrightRequest): AuthUser | null {
    const header = request.headers().authorization ?? ''
    const token = header.replace(/^Bearer\s+/i, '')
    return this.usersByToken.get(token) ?? null
  }

  private json(status: number, data: unknown, headers?: Record<string, string>): MockResponse {
    return {
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
      headers,
    }
  }

  private meta() {
    return {
      goals: [
        { value: 'maintenance', label: 'Поддержание формы' },
        { value: 'weight_loss', label: 'Похудение' },
        { value: 'muscle_gain', label: 'Набор мышц' },
      ],
      levels: [
        { value: 'beginner', label: 'Новичок' },
        { value: 'intermediate', label: 'Средний' },
        { value: 'advanced', label: 'Продвинутый' },
      ],
      workout_locations: [
        { value: 'gym', label: 'Зал' },
        { value: 'home', label: 'Дом' },
        { value: 'both', label: 'Зал и дом' },
      ],
      genders: [
        { value: 'female', label: 'Женский' },
        { value: 'male', label: 'Мужской' },
      ],
      equipment: [],
    }
  }

  private relation(): TrainerClientRelation {
    return {
      relation_id: 'rel-anna',
      trainer_user_id: IDS.trainer,
      trainer_login: 'marina.sokolova',
      client_user_id: IDS.anna,
      client_login: 'anna.ivanova',
      client_display_name: 'Анна Иванова',
      status: 'active',
      source: 'invite',
      created_at: '2026-09-01T09:00:00.000Z',
      updated_at: '2026-09-02T09:00:00.000Z',
    }
  }

  private clients(trainerUserId: string): MockResponse {
    const items = trainerUserId === IDS.trainer ? [this.relation()] : []
    return this.json(200, items, { 'x-total-count': String(items.length) })
  }

  private activeRelation(clientUserId: string): MockResponse {
    if (clientUserId === IDS.anna) return this.json(200, this.relation())
    return this.json(404, { detail: 'not found' })
  }

  private lookupLogin(login: string): MockResponse {
    const found = [...this.usersByToken.values()].find((item) => item.login === login && item.role === 'client')
    if (!found) return this.json(404, { detail: 'not found' })
    return this.json(200, { user_id: found.user_id, login: found.login })
  }

  private readPlan(clientUserId: string): MockResponse {
    const plan = this.plans.get(clientUserId)
    return plan ? this.json(200, structuredClone(plan)) : this.json(404, { detail: 'not found' })
  }

  private touch(plan: TrainingPlan): void {
    this.revision += 1
    plan.updated_at = new Date(Date.UTC(2026, 9, 20, 0, 0, this.revision)).toISOString()
  }

  private basePlan(clientUserId: string, planId: string): TrainingPlan {
    return {
      plan_id: planId,
      source: 'trainer',
      trainer_user_id: IDS.trainer,
      user_id: clientUserId,
      status: 'active',
      goal: 'muscle_gain',
      level: 'intermediate',
      workouts_per_week: 2,
      start_date: '2026-11-02',
      end_date: '2026-11-15',
      created_at: STAMP,
      updated_at: STAMP,
      days: [],
      previous_adherence: null,
    }
  }

  /** Две недели: пн/ср. Подписи дней не зависят от календарной даты. */
  private studioPlan(): TrainingPlan {
    const plan = this.basePlan(IDS.anna, 'plan-anna')
    const bench = planExercise({
      line_id: 'line-bench',
      exercise_id: 'row-bench',
      exercise_name: 'Жим лёжа',
      sets: 3,
      reps: 8,
      weight_kg: 40,
    })
    const squat = planExercise({
      line_id: 'line-squat',
      exercise_id: 'row-squat',
      exercise_name: 'Приседания со штангой',
      category: 'lower',
      sets: 4,
      reps: 6,
      weight_kg: 60,
    })
    const crunch = planExercise({
      line_id: 'line-crunch',
      exercise_id: 'row-crunch',
      exercise_name: 'Скручивания',
      category: 'core',
      sets: 3,
      reps: 15,
      weight_kg: null,
    })
    plan.days = [
      planDay({
        day_id: 'day-w1-mon',
        day_index: 1,
        week: 1,
        day_of_week: 0,
        scheduled_for: '2026-11-02',
        exercises: [bench],
      }),
      planDay({
        day_id: 'day-w1-wed',
        day_index: 2,
        week: 1,
        day_of_week: 2,
        scheduled_for: '2026-11-04',
        exercises: [squat],
      }),
      planDay({
        day_id: 'day-w2-mon',
        day_index: 3,
        week: 2,
        day_of_week: 0,
        scheduled_for: '2026-11-09',
        exercises: [crunch],
      }),
      planDay({
        day_id: 'day-w2-wed',
        day_index: 4,
        week: 2,
        day_of_week: 2,
        scheduled_for: '2026-11-11',
        exercises: [],
      }),
    ]
    return plan
  }

  private createEmpty(clientUserId: string, trainerUserId: string, body: unknown): MockResponse {
    const record = asRecord(body)
    const count = Math.min(28, Math.max(1, Number(record.day_count) || 1))
    const start = typeof record.start_date === 'string' ? record.start_date : utcToday()
    const plan = this.basePlan(clientUserId, `plan-empty-${clientUserId}`)
    plan.trainer_user_id = trainerUserId
    plan.goal = typeof record.goal === 'string' ? record.goal : plan.goal
    plan.level = typeof record.level === 'string' ? record.level : plan.level
    plan.start_date = start
    plan.days = Array.from({ length: count }, (_, index) =>
      planDay({
        day_id: `day-created-${index + 1}`,
        day_index: index + 1,
        // Первый день всегда понедельник, чтобы подпись чипа не зависела от «сегодня».
        week: 1,
        day_of_week: index % 7,
        scheduled_for: addDays(start, index),
        exercises: [],
      }),
    )
    this.touch(plan)
    this.plans.set(clientUserId, plan)
    return this.json(200, structuredClone(plan))
  }

  private ensurePlan(clientUserId: string): TrainingPlan {
    const existing = this.plans.get(clientUserId)
    if (existing) return existing
    const created = this.basePlan(clientUserId, `plan-${clientUserId}`)
    this.plans.set(clientUserId, created)
    return created
  }

  private scheduledFor(plan: TrainingPlan, week: number, dayOfWeek: number): string {
    return addDays(plan.start_date.slice(0, 10), (week - 1) * 7 + dayOfWeek)
  }

  private nextDayIndex(plan: TrainingPlan): number {
    return plan.days.reduce((max, day) => Math.max(max, day.day_index), 0) + 1
  }

  private addDay(clientUserId: string, body: unknown): MockResponse {
    const plan = this.plans.get(clientUserId)
    if (!plan) return this.json(404, { detail: 'not found' })
    const record = asRecord(body)
    const week = Number(record.week) || 1
    const dayOfWeek = Number(record.day_of_week)
    if (plan.days.some((day) => day.week === week && day.day_of_week === dayOfWeek)) {
      return this.json(409, { detail: 'day exists' })
    }
    const dayIndex = this.nextDayIndex(plan)
    const time = typeof record.scheduled_time === 'string' && record.scheduled_time ? record.scheduled_time : null
    plan.days.push({
      ...planDay({
        day_id: `day-added-${dayIndex}`,
        day_index: dayIndex,
        week,
        day_of_week: dayOfWeek,
        scheduled_for: this.scheduledFor(plan, week, dayOfWeek),
        exercises: [],
      }),
      scheduled_time: time,
    })
    this.touch(plan)
    return this.json(200, structuredClone(plan))
  }

  private deleteDay(clientUserId: string, dayIndex: number): MockResponse {
    const plan = this.plans.get(clientUserId)
    if (!plan) return this.json(404, { detail: 'not found' })
    plan.days = plan.days.filter((day) => day.day_index !== dayIndex)
    this.touch(plan)
    return this.json(200, structuredClone(plan))
  }

  private patchDayTime(clientUserId: string, dayIndex: number, body: unknown): MockResponse {
    const plan = this.plans.get(clientUserId)
    const day = plan?.days.find((item) => item.day_index === dayIndex)
    if (!plan || !day) return this.json(404, { detail: 'not found' })
    const record = asRecord(body)
    day.scheduled_time = typeof record.scheduled_time === 'string' && record.scheduled_time ? record.scheduled_time : null
    this.touch(plan)
    return this.json(200, structuredClone(day))
  }

  private copyDay(clientUserId: string, dayIndex: number, body: unknown): MockResponse {
    const plan = this.plans.get(clientUserId)
    const source = plan?.days.find((day) => day.day_index === dayIndex)
    if (!plan || !source) return this.json(404, { detail: 'not found' })
    const record = asRecord(body)
    const mode = record.mode === 'append' ? 'append' : 'overwrite'
    this.placeCopy(plan, source, Number(record.week) || source.week, Number(record.day_of_week), mode)
    this.touch(plan)
    return this.json(200, structuredClone(plan))
  }

  private copyWeek(clientUserId: string, week: number, body: unknown): MockResponse {
    const plan = this.plans.get(clientUserId)
    if (!plan) return this.json(404, { detail: 'not found' })
    const record = asRecord(body)
    const targetWeek = Number(record.target_week)
    const mode = record.mode === 'append' ? 'append' : 'overwrite'
    const sourceDays = plan.days.filter((day) => day.week === week)
    for (const source of sourceDays) {
      this.placeCopy(plan, source, targetWeek, source.day_of_week, mode)
    }
    this.touch(plan)
    return this.json(200, structuredClone(plan))
  }

  private placeCopy(
    plan: TrainingPlan,
    source: PlanDay,
    week: number,
    dayOfWeek: number,
    mode: 'overwrite' | 'append',
  ): void {
    const cloned = source.exercises.map((exercise, index) =>
      planExercise({
        line_id: `line-copy-${this.revision}-${week}-${dayOfWeek}-${index + 1}`,
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        category: exercise.category,
        sets: exercise.sets,
        reps: exercise.reps,
        weight_kg: exercise.weight_kg,
        rest_seconds: exercise.rest_seconds,
        note: exercise.note,
        sort_order: index + 1,
      }),
    )
    const target = plan.days.find((day) => day.week === week && day.day_of_week === dayOfWeek)
    if (!target) {
      const dayIndex = this.nextDayIndex(plan)
      plan.days.push({
        ...planDay({
          day_id: `day-copy-${dayIndex}`,
          day_index: dayIndex,
          week,
          day_of_week: dayOfWeek,
          scheduled_for: this.scheduledFor(plan, week, dayOfWeek),
          exercises: cloned,
        }),
        scheduled_time: source.scheduled_time ?? null,
      })
      return
    }
    target.exercises = mode === 'append' ? [...target.exercises, ...cloned] : cloned
    target.scheduled_time = source.scheduled_time ?? target.scheduled_time ?? null
  }

  private updateNotifications(body: unknown): MockResponse {
    const record = asRecord(body)
    if ('notifications_enabled' in record) {
      this.notifications.notifications_enabled = Boolean(record.notifications_enabled)
    }
    if ('timezone' in record) {
      if (record.timezone == null || record.timezone === '') {
        this.notifications.timezone = 'Europe/Moscow'
        this.notifications.timezone_is_default = true
      } else if (typeof record.timezone === 'string') {
        this.notifications.timezone = record.timezone
        this.notifications.timezone_is_default = false
      }
    }
    return this.json(200, structuredClone(this.notifications))
  }

  private replaceSlots(clientUserId: string, dayIndex: number, body: unknown): MockResponse {
    const plan = this.ensurePlan(clientUserId)
    let day = plan.days.find((item) => item.day_index === dayIndex)
    if (!day) {
      day = planDay({
        day_id: `day-added-${dayIndex}`,
        day_index: dayIndex,
        week: 1,
        day_of_week: 0,
        scheduled_for: utcToday(),
        exercises: [],
      })
      plan.days.push(day)
    }
    const slots = asRecord(body).slots
    const writes = Array.isArray(slots) ? (slots as SlotWrite[]) : []
    day.exercises = writes.map((slot, index) => {
      const known = this.catalog.find((item) => item.row_id === slot.exercise_id)
      return planExercise({
        line_id: `line-${dayIndex}-${index + 1}-${slot.exercise_id}`,
        exercise_id: slot.exercise_id,
        exercise_name: known?.exercise_name ?? 'Упражнение',
        category: known?.workout_category ?? 'full_body',
        sets: slot.sets ?? null,
        reps: slot.reps ?? null,
        weight_kg: slot.weight_kg ?? null,
        rest_seconds: slot.rest_seconds ?? null,
        note: typeof slot.note === 'string' && slot.note.trim() ? slot.note.trim() : null,
        sort_order: index + 1,
      })
    })
    this.touch(plan)
    return this.json(200, structuredClone(day))
  }

  private generate(body: unknown): MockResponse {
    const record = asRecord(body)
    const clientUserId = typeof record.user_id === 'string' ? record.user_id : IDS.anna
    const plan = this.basePlan(clientUserId, `plan-generated-${this.revision + 1}`)
    plan.days = [
      planDay({
        day_id: 'day-generated-1',
        day_index: 1,
        week: 1,
        day_of_week: 0,
        scheduled_for: '2026-11-02',
        exercises: [
          planExercise({
            line_id: 'line-dips',
            exercise_id: 'row-dips',
            exercise_name: 'Отжимания на брусьях',
            sets: 3,
            reps: 8,
            weight_kg: null,
          }),
        ],
      }),
    ]
    this.touch(plan)
    this.plans.set(clientUserId, plan)
    return this.json(200, structuredClone(plan))
  }

  private today(actor: AuthUser | null): MockResponse {
    if (!actor || actor.role !== 'client') return this.json(404, { detail: 'not found' })
    const plan = this.plans.get(actor.user_id)
    const today = utcToday()
    const day = plan?.days.find((item) => item.scheduled_for.slice(0, 10) === today)
    if (!plan || !day) return this.json(404, { detail: 'not found' })
    return this.json(200, this.toToday(plan, day))
  }

  private completeDay(actor: AuthUser | null, dayIndex: number, body: unknown): MockResponse {
    if (!actor || actor.role !== 'client') return this.json(404, { detail: 'not found' })
    const plan = this.plans.get(actor.user_id)
    const day = plan?.days.find((item) => item.day_index === dayIndex)
    if (!plan || !day) return this.json(404, { detail: 'not found' })
    const record = asRecord(body)
    const finishedAt = new Date().toISOString()
    day.is_completed = true
    day.completed_at = finishedAt
    day.finished_at = finishedAt
    day.started_at = typeof record.started_at === 'string' ? record.started_at : null
    this.touch(plan)
    return this.json(200, this.toToday(plan, day))
  }

  private toToday(plan: TrainingPlan, day: PlanDay): TodayWorkout {
    return {
      plan_id: plan.plan_id,
      source: plan.source,
      trainer_user_id: plan.trainer_user_id,
      day_id: day.day_id,
      day_index: day.day_index,
      scheduled_for: day.scheduled_for,
      week: day.week,
      day_of_week: day.day_of_week,
      volume_multiplier: day.volume_multiplier,
      scheduled_time: day.scheduled_time ?? null,
      is_completed: Boolean(day.is_completed),
      completed_at: day.completed_at ?? null,
      started_at: day.started_at ?? null,
      finished_at: day.finished_at ?? null,
      exercises: day.exercises,
    }
  }
}
