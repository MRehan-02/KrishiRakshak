import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LangProvider } from './context/LangContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Loader from './components/Loader';

// Pages
import LanguageSelect from './pages/LanguageSelect';
import Login from './pages/Login';
import Home from './pages/Home';
import Scan from './pages/Scan';
import History from './pages/History';
import Crops from './pages/Crops';
import Roadmap from './pages/Roadmap';
import Assistant from './pages/Assistant';
import TrapForm from './pages/TrapForm';
import OfficerDashboard from './pages/OfficerDashboard';

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && profile?.role && profile.role !== allowedRole) {
    // If an officer tries to access farmer home or vice versa, redirect
    if (profile.role === 'officer') {
      return <Navigate to="/officer" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-80px)]">{children}</main>
    </>
  );
}

function PublicAuthRoute({ children }) {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (isAuthenticated) {
    if (profile?.role === 'officer') {
      return <Navigate to="/officer" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Language Selection Route */}
      <Route path="/language" element={<LanguageSelect />} />

      {/* Public Auth Route */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <Login />
          </PublicAuthRoute>
        }
      />

      {/* Farmer Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRole="farmer">
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan"
        element={
          <ProtectedRoute allowedRole="farmer">
            <Scan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute allowedRole="farmer">
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crops"
        element={
          <ProtectedRoute allowedRole="farmer">
            <Crops />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roadmap"
        element={
          <ProtectedRoute allowedRole="farmer">
            <Roadmap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traps"
        element={
          <ProtectedRoute allowedRole="farmer">
            <TrapForm />
          </ProtectedRoute>
        }
      />

      {/* Shared Assistant Route */}
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <Assistant />
          </ProtectedRoute>
        }
      />

      {/* Officer Route */}
      <Route
        path="/officer"
        element={
          <ProtectedRoute allowedRole="officer">
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/language" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
