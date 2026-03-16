import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// We will create these pages next
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Vacancies from './pages/Vacancies/Vacancies';
import Candidates from './pages/Candidates/Candidates';
import Messages from './pages/Messages/Messages';
import Layout from './components/Layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="auth-container">
        <div className="animate-fade-in" style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
          Loading your workspace...
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects logged in users away from auth pages)
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return null;
  
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />

          {/* Protected Main Routes defined under a unified Layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vacancies" element={<Vacancies />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/messages" element={<Messages />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
