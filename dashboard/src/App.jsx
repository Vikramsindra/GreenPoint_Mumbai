// filepath: dashboard/src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import WardOverview from "./pages/WardOverview";
import Societies from "./pages/Societies";
import Violations from "./pages/Violations";
import Citizens from "./pages/Citizens";
import Campaigns from "./pages/Campaigns";
import Households from "./pages/Households";
import CollectorAudit from "./pages/CollectorAudit";
import BMCOperations from "./pages/BMCOperations";
import SocietyVouchers from "./pages/SocietyVouchers";
import { useAuthStore } from "./store/authStore";

const ProtectedRoute = ({ children }) => {
  const { token, user, logout } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;

  if (user && user.role !== "officer") {
    logout();
    return (
      <Navigate
        to="/login"
        replace
        state={{ error: "Access Denied. Only BMC Ward Officers can access this dashboard." }}
      />
    );
  }

  return children;
};

export default function App() {
  const { token, user } = useAuthStore();
  const isOfficer = !!(token && user?.role === "officer");

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isOfficer ? <Navigate to="/" replace /> : <Login />}
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<WardOverview />} />
          <Route path="/societies" element={<Societies />} />
          <Route path="/society-vouchers" element={<SocietyVouchers />} />
          <Route path="/bmc-operations" element={<BMCOperations />} />
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
