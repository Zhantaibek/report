import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Reports from './pages/Reports.tsx';
import Users from './pages/admin/Users.tsx';
import ReportFormsAdmin from './pages/admin/ReportForms.tsx';
import Reference from './pages/admin/Reference.tsx';
import CommissionTariffs from './pages/admin/CommissionTariffs.tsx';
import CurrencyRates from './pages/admin/CurrencyRates.tsx';
import TradeClasses from './pages/admin/TradeClasses.tsx';
import Emitents from './pages/admin/Emitents.tsx';
import Profile from './pages/Profile.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Загрузка…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute><Users /></AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-forms"
          element={
            <ProtectedRoute>
              <AdminRoute><ReportFormsAdmin /></AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reference"
          element={
            <ProtectedRoute>
              <AdminRoute><Reference /></AdminRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="tariffs" replace />} />
          <Route path="tariffs" element={<CommissionTariffs />} />
          <Route path="currency-rates" element={<CurrencyRates />} />
          <Route path="trade-classes" element={<TradeClasses />} />
          <Route path="emitents" element={<Emitents />} />
        </Route>
        <Route path="/admin/commission-tariffs" element={<Navigate to="/admin/reference/tariffs" replace />} />
        <Route path="/admin/currency-rates" element={<Navigate to="/admin/reference/currency-rates" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}
