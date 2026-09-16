import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import EnquiriesPage from './pages/EnquiriesPage';
import QuotationsPage from './pages/QuotationsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/enquiries"
            element={
              <ProtectedRoute>
                <Layout><EnquiriesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotations"
            element={
              <ProtectedRoute>
                <Layout><QuotationsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-orders"
            element={
              <ProtectedRoute>
                <Layout><SalesOrdersPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/enquiries" replace />} />
          <Route path="*" element={<Navigate to="/enquiries" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
