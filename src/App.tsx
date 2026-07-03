import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { ProtectedRoute, RoleRoute, RouteErrorBoundary } from './components'
import { MainLayout } from './components/layout/MainLayout'
import { APP_PATHS, type AppRole, resolveCatalogPath, resolveDocumentTitle, resolveRelationsPath } from './config'
import { useAuth } from './hooks/use-auth'

const AnalyticsPage = lazy(async () => ({ default: (await import('./pages/Analytics')).AnalyticsPage }))
const DashboardPage = lazy(async () => ({ default: (await import('./pages/Dashboard')).DashboardPage }))
const ExerciseDetailsPage = lazy(async () => ({ default: (await import('./pages/ExerciseDetails')).ExerciseDetailsPage }))
const ExercisesPage = lazy(async () => ({ default: (await import('./pages/Exercises')).ExercisesPage }))
const LoginPage = lazy(async () => ({ default: (await import('./pages/Login')).LoginPage }))
const ProfilePage = lazy(async () => ({ default: (await import('./pages/Profile')).ProfilePage }))
const ClientRelationsPage = lazy(async () => ({ default: (await import('./pages/ClientRelations')).ClientRelationsPage }))
const TrainerRelationsPage = lazy(async () => ({ default: (await import('./pages/TrainerRelations')).TrainerRelationsPage }))
const TrainerClientProfilePage = lazy(async () => ({
  default: (await import('./pages/TrainerClientProfile')).TrainerClientProfilePage,
}))

function App() {
  const { user } = useAuth()
  const location = useLocation()
  const role: AppRole = user?.role === 'trainer' || user?.role === 'client' ? user.role : null
  const isTrainer = role === 'trainer'
  const isClient = role === 'client'

  useEffect(() => {
    document.title = resolveDocumentTitle(location.pathname, role)
  }, [location.pathname, role])

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<div className="py-10 text-center text-sm text-secondary-foreground">Загрузка страницы...</div>}>
        <Routes>
          <Route path={APP_PATHS.login} element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to={APP_PATHS.home} replace />} />
            <Route path={APP_PATHS.home.slice(1)} element={<DashboardPage />} />
            <Route
              path={APP_PATHS.clients.slice(1)}
              element={
                <RoleRoute currentRole={role} allowedRoles={['trainer']} fallbackTo={isClient ? APP_PATHS.trainers : APP_PATHS.home}>
                  <TrainerRelationsPage />
                </RoleRoute>
              }
            />
            <Route
              path={APP_PATHS.trainers.slice(1)}
              element={
                <RoleRoute currentRole={role} allowedRoles={['client']} fallbackTo={isTrainer ? APP_PATHS.clients : APP_PATHS.home}>
                  <ClientRelationsPage />
                </RoleRoute>
              }
            />
            <Route
              path={APP_PATHS.clientProfile.slice(1)}
              element={
                <RoleRoute currentRole={role} allowedRoles={['trainer']} fallbackTo={APP_PATHS.home}>
                  <TrainerClientProfilePage />
                </RoleRoute>
              }
            />
            <Route
              path={APP_PATHS.analytics.slice(1)}
              element={
                <RoleRoute currentRole={role} allowedRoles={['trainer']} fallbackTo={APP_PATHS.home}>
                  <AnalyticsPage />
                </RoleRoute>
              }
            />
            <Route
              path={APP_PATHS.exercises.slice(1)}
              element={
                <RoleRoute currentRole={role} allowedRoles={['trainer']} fallbackTo={APP_PATHS.home}>
                  <ExercisesPage />
                </RoleRoute>
              }
            />
            <Route
              path={APP_PATHS.exerciseDetails.slice(1)}
              element={
                <RoleRoute currentRole={role} allowedRoles={['trainer']} fallbackTo={APP_PATHS.home}>
                  <ExerciseDetailsPage />
                </RoleRoute>
              }
            />
            <Route path={APP_PATHS.profile.slice(1)} element={<ProfilePage />} />

            <Route path={APP_PATHS.dashboardAlias.slice(1)} element={<Navigate to={APP_PATHS.home} replace />} />
            <Route path={APP_PATHS.relationsAlias.slice(1)} element={<Navigate to={resolveRelationsPath(role)} replace />} />
            <Route path={APP_PATHS.catalogAlias.slice(1)} element={<Navigate to={resolveCatalogPath(role)} replace />} />
            <Route path={APP_PATHS.profilesAlias.slice(1)} element={<Navigate to={APP_PATHS.profile} replace />} />
          </Route>

          <Route path="*" element={<Navigate to={APP_PATHS.home} replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}

export default App
