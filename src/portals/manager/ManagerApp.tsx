import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/services/auth.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary.tsx';
import { ToastProvider } from '@/components/Toast/ToastProvider.tsx';
import { ManagerLayout } from './layouts/ManagerLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DriversListPage } from './pages/DriversListPage.tsx';
import { ClaimsOverviewPage } from './pages/ClaimsOverviewPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /><p className="loading-screen-text">Loading...</p></div>;
  }

  if (!user || !profile) {
    return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  }

  if (profile.role !== 'manager') {
    return <div className="loading-screen"><p className="loading-screen-text">Access denied. This portal is for company managers only.</p></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<ManagerLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/drivers" element={<DriversListPage />} />
        <Route path="/claims" element={<ClaimsOverviewPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function ManagerApp() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}
