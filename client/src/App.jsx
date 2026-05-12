import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Pages (to be implemented)
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ScheduleViewerPage from './pages/ScheduleViewerPage';
import ScheduleManagerPage from './pages/ScheduleManagerPage';
import LeavePage from './pages/LeavePage';
import EmployeesPage from './pages/EmployeesPage';
import ActivityLogPage from './pages/ActivityLogPage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/schedule" element={
              <ProtectedRoute>
                <ScheduleViewerPage />
              </ProtectedRoute>
            } />

            <Route path="/manager" element={
              <ProtectedRoute allowedRoles={['admin', 'shift_manager']}>
                <ScheduleManagerPage />
              </ProtectedRoute>
            } />

            <Route path="/leave" element={
              <ProtectedRoute>
                <LeavePage />
              </ProtectedRoute>
            } />

            <Route path="/employees" element={
              <ProtectedRoute allowedRoles={['admin', 'shift_manager']}>
                <EmployeesPage />
              </ProtectedRoute>
            } />

            <Route path="/activity" element={
              <ProtectedRoute allowedRoles={['admin', 'shift_manager']}>
                <ActivityLogPage />
              </ProtectedRoute>
            } />

            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;
