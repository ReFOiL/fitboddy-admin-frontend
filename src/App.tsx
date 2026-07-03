import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { type AppRole, resolveCatalogPath, resolveDocumentTitle, resolveRelationsPath } from './config/app-routes'
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
    <Suspense fallback={<div className="py-10 text-center text-sm text-secondary-foreground">Загрузка страницы...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<DashboardPage />} />
          <Route path="clients" element={isTrainer ? <TrainerRelationsPage /> : <Navigate to={isClient ? '/trainers' : '/home'} replace />} />
          <Route path="trainers" element={isClient ? <ClientRelationsPage /> : <Navigate to={isTrainer ? '/clients' : '/home'} replace />} />
          <Route path="clients/profile" element={isTrainer ? <TrainerClientProfilePage /> : <Navigate to="/home" replace />} />
          <Route path="analytics" element={isTrainer ? <AnalyticsPage /> : <Navigate to="/home" replace />} />
          <Route path="exercises" element={isTrainer ? <ExercisesPage /> : <Navigate to="/home" replace />} />
          <Route path="exercises/:exerciseId" element={isTrainer ? <ExerciseDetailsPage /> : <Navigate to="/home" replace />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route path="dashboard" element={<Navigate to="/home" replace />} />
          <Route path="relations" element={<Navigate to={resolveRelationsPath(role)} replace />} />
          <Route path="catalog" element={<Navigate to={resolveCatalogPath(role)} replace />} />
          <Route path="profiles" element={<Navigate to="/profile" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
