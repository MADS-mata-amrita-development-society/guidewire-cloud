import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/services/auth.tsx';
import { DriverLayout } from './layouts/DriverLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { FileClaimPage } from './pages/FileClaimPage.tsx';
import { ClaimHistoryPage } from './pages/ClaimHistoryPage.tsx';
import { WalletPage } from './pages/WalletPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p className="loading-screen-text">Loading...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<DriverLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/file-claim" element={<FileClaimPage />} />
        <Route path="/claims" element={<ClaimHistoryPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function DriverApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
