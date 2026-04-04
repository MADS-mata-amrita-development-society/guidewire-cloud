import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/services/auth.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary.tsx';
import { ToastProvider } from '@/components/Toast/ToastProvider.tsx';
import { AdminLayout } from './layouts/AdminLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ClaimReviewPage } from './pages/ClaimReviewPage.tsx';
import { CompaniesPage } from './pages/CompaniesPage.tsx';
import { DriversPage } from './pages/DriversPage.tsx';
import { WalletManagementPage } from './pages/WalletManagementPage.tsx';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /><p className="loading-screen-text">Loading...</p></div>;
  }

  if (!user || !profile) {
    return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  }

  if (profile.role !== 'admin') {
    return <div className="loading-screen"><p className="loading-screen-text">Access denied. This portal is for administrators only.</p></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/claims" element={<ClaimReviewPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/wallets" element={<WalletManagementPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AdminApp() {
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
