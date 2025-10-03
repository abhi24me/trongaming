import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Gamepad2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/my-bookings`, { withCredentials: true });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const isUpcoming = (dateStr, timeStr) => {
    const bookingDate = new Date(dateStr + 'T' + timeStr);
    return bookingDate > new Date();
  };

  if (loading) {
    return (
      <div className="bookings-loading">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="bookings-page">
      <div className="bookings-container">
        <div className="bookings-header">
          <Button 
            data-testid="back-btn"
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="back-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="bookings-title">My Bookings</h1>
        </div>

        {bookings.length === 0 ? (
          <Card data-testid="no-bookings-card" className="no-bookings">
            <Gamepad2 className="w-16 h-16 mb-4 opacity-50" />
            <h3>No Bookings Yet</h3>
            <p>Book your first gaming session to get started!</p>
            <Button 
              data-testid="book-now-btn"
              onClick={() => navigate('/book')} 
              className="mt-4"
            >
              Book Now
            </Button>
          </Card>
        ) : (
          <div className="bookings-list">
            {bookings.map((booking) => (
              <Card 
                key={booking.id} 
                data-testid={`booking-card-${booking.id}`}
                className={`booking-card ${isUpcoming(booking.date, booking.start_time) ? 'upcoming' : 'past'}`}
              >
                <div className="booking-status">
                  {isUpcoming(booking.date, booking.start_time) ? (
                    <span className="status-badge upcoming">Upcoming</span>
                  ) : (
                    <span className="status-badge past">Completed</span>
                  )}
                </div>

                <div className="booking-details">
                  <div className="booking-main">
                    <div className="booking-info-item">
                      <CalendarIcon className="w-5 h-5" />
                      <span>{formatDate(booking.date)}</span>
                    </div>
                    <div className="booking-info-item">
                      <Clock className="w-5 h-5" />
                      <span>{booking.start_time} - {booking.end_time}</span>
                    </div>
                    <div className="booking-info-item">
                      <Gamepad2 className="w-5 h-5" />
                      <span>PS5 Setup {booking.ps5_setup}</span>
                    </div>
                  </div>

                  <div className="booking-meta">
                    <div className="meta-item">
                      <span className="meta-label">Duration</span>
                      <span className="meta-value">{booking.duration_minutes} min</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Controllers</span>
                      <span className="meta-value">{booking.controllers}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Payment</span>
                      <span className="meta-value">{booking.payment_method === 'wallet' ? 'Wallet' : 'Paid'}</span>
                    </div>
                  </div>

                  <div className="booking-price">
                    <div className="price-breakdown">
                      <span>Base: ₹{booking.base_price}</span>
                      {booking.controller_charges > 0 && (
                        <span>Controllers: ₹{booking.controller_charges}</span>
                      )}
                    </div>
                    <div className="price-total">Total: ₹{booking.total_price}</div>
                  </div>
                </div>

                <div className="booking-id">ID: {booking.id}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;