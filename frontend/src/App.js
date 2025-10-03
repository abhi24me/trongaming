import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import BookingForm from './components/BookingForm';
import WalletPage from './components/WalletPage';
import MyBookings from './components/MyBookings';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Handler Component
function AuthHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      // Check for session_id in URL fragment
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          // Process session with backend
          const response = await axios.post(
            `${API}/auth/session?session_id=${sessionId}`,
            {},
            { withCredentials: true }
          );
          
          // Clean URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Navigate to dashboard
          setProcessing(false);
          // Already on dashboard, just reload the page component
        } catch (error) {
          console.error('Auth error:', error);
          navigate('/');
        }
      } else {
        // Check if already authenticated
        try {
          await axios.get(`${API}/auth/me`, { withCredentials: true });
          setProcessing(false);
        } catch (error) {
          navigate('/');
        }
      }
    };

    handleAuth();
  }, [navigate]);

  if (processing) {
    return (
      <div className="auth-loading">
        <div className="loader"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  return null;
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Handle session_id first
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          await axios.post(
            `${API}/auth/session?session_id=${sessionId}`,
            {},
            { withCredentials: true }
          );
          
          window.history.replaceState(null, '', window.location.pathname);
          setIsAuthenticated(true);
          return;
        } catch (error) {
          console.error('Auth error:', error);
          setIsAuthenticated(false);
          return;
        }
      }

      // Check existing session
      try {
        await axios.get(`${API}/auth/me`, { withCredentials: true });
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location]);

  if (isAuthenticated === null) {
    return (
      <div className="auth-loading">
        <div className="loader"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/book" 
            element={
              <ProtectedRoute>
                <BookingForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/wallet" 
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-bookings" 
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;