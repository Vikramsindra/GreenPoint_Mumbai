// filepath: dashboard/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import WardOverview from './pages/WardOverview';
import Violations from './pages/Violations';
import Citizens from './pages/Citizens';
import Campaigns from './pages/Campaigns';
import Households from './pages/Households';
import CollectorAudit from './pages/CollectorAudit';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  // Officer check could also go here if needed
  if (user && user.role !== 'officer') {
      alert('Access Denied. Only officers can view this dashboard.');
      return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  const { token } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<WardOverview />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="/citizens" element={<Citizens />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/households" element={<Households />} />
          <Route path="/collector-audit" element={<CollectorAudit />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
