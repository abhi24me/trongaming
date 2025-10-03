import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Gamepad2, Wallet, Calendar, LogOut, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
      
      // Fetch wallet balance
      const balanceResponse = await axios.get(`${API}/wallet/balance`, { withCredentials: true });
      setWalletBalance(balanceResponse.data.balance);
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-nav">
          <h1 className="dashboard-logo">TRONGAMING</h1>
          <div className="dashboard-user">
            <img src={user?.picture || 'https://via.placeholder.com/40'} alt={user?.name} className="user-avatar" />
            <span className="user-name">{user?.name}</span>
            <Button 
              data-testid="logout-btn"
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Wallet Card */}
          <Card data-testid="wallet-card" className="dashboard-card wallet-card">
            <div className="card-icon">
              <Wallet className="w-8 h-8" />
            </div>
            <h3 className="card-title">Wallet Balance</h3>
            <div className="wallet-amount">₹{walletBalance.toFixed(2)}</div>
            <Button 
              data-testid="manage-wallet-btn"
              onClick={() => navigate('/wallet')} 
              className="card-button"
            >
              Manage Wallet
            </Button>
          </Card>

          {/* Book Slot Card */}
          <Card data-testid="book-slot-card" className="dashboard-card book-card">
            <div className="card-icon">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <h3 className="card-title">Book PS5 Slot</h3>
            <p className="card-description">
              Reserve your gaming session now. Two setups available.
            </p>
            <Button 
              data-testid="book-now-btn"
              onClick={() => navigate('/book')} 
              className="card-button"
            >
              Book Now
            </Button>
          </Card>

          {/* My Bookings Card */}
          <Card data-testid="my-bookings-card" className="dashboard-card bookings-card">
            <div className="card-icon">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="card-title">My Bookings</h3>
            <p className="card-description">
              View your upcoming and past gaming sessions.
            </p>
            <Button 
              data-testid="view-bookings-btn"
              onClick={() => navigate('/my-bookings')} 
              className="card-button"
            >
              View Bookings
            </Button>
          </Card>

          {/* Admin Card (if admin) */}
          {user?.is_admin && (
            <Card data-testid="admin-panel-card" className="dashboard-card admin-card">
              <div className="card-icon">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="card-title">Admin Panel</h3>
              <p className="card-description">
                Manage all bookings and view statistics.
              </p>
              <Button 
                data-testid="admin-dashboard-btn"
                onClick={() => navigate('/admin')} 
                className="card-button"
              >
                Open Admin
              </Button>
            </Card>
          )}
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h2 className="info-title">Quick Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Base Rate:</span>
              <span className="info-value">₹149/hour</span>
            </div>
            <div className="info-item">
              <span className="info-label">Extra Controller:</span>
              <span className="info-value">₹40/hour</span>
            </div>
            <div className="info-item">
              <span className="info-label">Min Duration:</span>
              <span className="info-value">30 minutes</span>
            </div>
            <div className="info-item">
              <span className="info-label">Wallet Bonus:</span>
              <span className="info-value">Up to 10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
