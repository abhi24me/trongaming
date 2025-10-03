import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Users, Calendar, TrendingUp, IndianRupee } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [selectedDate]);

  const fetchAdminData = async () => {
    try {
      const statsResponse = await axios.get(`${API}/admin/stats`, { withCredentials: true });
      setStats(statsResponse.data);

      const bookingsResponse = await axios.get(`${API}/admin/bookings`, {
        params: { date: selectedDate },
        withCredentials: true
      });
      setBookings(bookingsResponse.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (error.response?.status === 403) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <Button 
            data-testid="back-btn"
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="back-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="admin-title">Admin Dashboard</h1>
        </div>

        {stats && (
          <div className="stats-grid">
            <Card data-testid="total-bookings-card" className="stat-card">
              <div className="stat-icon">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Bookings</span>
                <span className="stat-value">{stats.total_bookings}</span>
              </div>
            </Card>

            <Card data-testid="total-users-card" className="stat-card">
              <div className="stat-icon">
                <Users className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{stats.total_users}</span>
              </div>
            </Card>

            <Card data-testid="today-bookings-card" className="stat-card">
              <div className="stat-icon">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <span className="stat-label">Today's Bookings</span>
                <span className="stat-value">{stats.today_bookings}</span>
              </div>
            </Card>

            <Card data-testid="total-revenue-card" className="stat-card highlight">
              <div className="stat-icon">
                <IndianRupee className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Revenue</span>
                <span className="stat-value">₹{stats.total_revenue}</span>
              </div>
            </Card>
          </div>
        )}

        <Card data-testid="bookings-table-card" className="bookings-table-card">
          <div className="table-header">
            <h3 className="table-title">Bookings</h3>
            <input
              data-testid="date-filter-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-filter"
            />
          </div>

          {bookings.length === 0 ? (
            <p className="no-data">No bookings for this date</p>
          ) : (
            <div className="table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>User</th>
                    <th>PS5 Setup</th>
                    <th>Duration</th>
                    <th>Controllers</th>
                    <th>Amount</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} data-testid={`booking-row-${booking.id}`}>
                      <td>{formatDate(booking.date)}</td>
                      <td>{booking.start_time} - {booking.end_time}</td>
                      <td>
                        <div>
                          <div>{booking.user_name}</div>
                          <div className="user-email">{booking.user_email}</div>
                        </div>
                      </td>
                      <td>Setup {booking.ps5_setup}</td>
                      <td>{booking.duration_minutes} min</td>
                      <td>{booking.controllers}</td>
                      <td className="amount">₹{booking.total_price}</td>
                      <td>
                        <span className={`payment-badge ${booking.payment_method}`}>
                          {booking.payment_method === 'wallet' ? 'Wallet' : 'Paid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;