import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Reports from './pages/Reports.tsx';
import DataSources from './pages/admin/DataSources.tsx';
import Brokers from './pages/admin/Brokers.tsx';
import Users from './pages/admin/Users.tsx';
import ReportFormsAdmin from './pages/admin/ReportForms.tsx';

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
          path="/admin/data-sources"
          element={
            <ProtectedRoute>
              <AdminRoute><DataSources /></AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/brokers"
          element={
            <ProtectedRoute>
              <AdminRoute><Brokers /></AdminRoute>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
