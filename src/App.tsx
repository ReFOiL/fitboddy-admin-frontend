import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { AnalyticsPage } from './pages/Analytics'
import { DashboardPage } from './pages/Dashboard'
import { ExerciseDetailsPage } from './pages/ExerciseDetails'
import { ExercisesPage } from './pages/Exercises'
import { LoginPage } from './pages/Login'
import { ProfilePage } from './pages/Profile'
import { RelationsPage } from './pages/Relations'

function App() {
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
        <Route path="clients" element={<RelationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/:exerciseId" element={<ExerciseDetailsPage />} />
        <Route path="profile" element={<ProfilePage />} />

        <Route path="dashboard" element={<Navigate to="/home" replace />} />
        <Route path="relations" element={<Navigate to="/clients" replace />} />
        <Route path="catalog" element={<Navigate to="/exercises" replace />} />
        <Route path="profiles" element={<Navigate to="/profile" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
