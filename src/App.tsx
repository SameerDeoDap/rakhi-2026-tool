import { Routes, Route, Navigate, useLocation } from 'react-router';
import { AppProvider, useApp } from '@/store/AppContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Income from '@/pages/Income';
import Expenses from '@/pages/Expenses';
import Inventory from '@/pages/Inventory';
import ImportExcel from '@/pages/ImportExcel';
import Duplicates from '@/pages/Duplicates';
import Categories from '@/pages/Categories';
import MarketplacePnL from '@/pages/MarketplacePnL';
import PostMortem from '@/pages/PostMortem';
import Settings from '@/pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { role } = useApp();
  const location = useLocation();
  if (!role) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function AppRoutes() {
  const { role } = useApp();
  return (
    <Routes>
      <Route path="/login" element={role ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/income" element={<Income />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/import" element={<ImportExcel />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/marketplace" element={<MarketplacePnL />} />
        <Route path="/postmortem" element={<PostMortem />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
