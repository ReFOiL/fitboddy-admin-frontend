import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { useAuth } from './hooks/use-auth'
import { AnalyticsPage } from './pages/Analytics'
import { DashboardPage } from './pages/Dashboard'
import { ExerciseDetailsPage } from './pages/ExerciseDetails'
import { ExercisesPage } from './pages/Exercises'
import { LoginPage } from './pages/Login'
import { ProfilePage } from './pages/Profile'
import { ClientRelationsPage } from './pages/ClientRelations'
import { TrainerRelationsPage } from './pages/TrainerRelations'
import { TrainerClientProfilePage } from './pages/TrainerClientProfile'

function App() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const isClient = user?.role === 'client'

  return (
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
        <Route path="clients" element={isTrainer ? <TrainerRelationsPage /> : <Navigate to="/trainers" replace />} />
        <Route path="trainers" element={isClient ? <ClientRelationsPage /> : <Navigate to="/clients" replace />} />
        <Route path="clients/profile" element={isTrainer ? <TrainerClientProfilePage /> : <Navigate to="/home" replace />} />
        <Route path="analytics" element={isTrainer ? <AnalyticsPage /> : <Navigate to="/home" replace />} />
        <Route path="exercises" element={isTrainer ? <ExercisesPage /> : <Navigate to="/home" replace />} />
        <Route path="exercises/:exerciseId" element={isTrainer ? <ExerciseDetailsPage /> : <Navigate to="/home" replace />} />
        <Route path="profile" element={<ProfilePage />} />

        <Route path="dashboard" element={<Navigate to="/home" replace />} />
        <Route path="relations" element={<Navigate to={isTrainer ? '/clients' : '/trainers'} replace />} />
        <Route path="catalog" element={<Navigate to={isTrainer ? '/exercises' : '/home'} replace />} />
        <Route path="profiles" element={<Navigate to="/profile" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
