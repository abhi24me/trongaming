import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, CreditCard, Wallet, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const BookingForm = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [ps5Setup, setPs5Setup] = useState(1);
  const [controllers, setControllers] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('mock');
  const [pricing, setPricing] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  useEffect(() => {
    if (date && ps5Setup) {
      checkAvailability();
    }
  }, [date, ps5Setup]);

  useEffect(() => {
    calculatePrice();
  }, [duration, controllers]);

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get(`${API}/wallet/balance`, { withCredentials: true });
      setWalletBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const checkAvailability = async () => {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const response = await axios.get(`${API}/bookings/availability`, {
        params: { date: formattedDate, ps5_setup: ps5Setup },
        withCredentials: true
      });
      setAvailability(response.data.occupied_slots);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const calculatePrice = async () => {
    try {
      const response = await axios.get(`${API}/bookings/calculate-price`, {
        params: { duration_minutes: duration, controllers },
        withCredentials: true
      });
      setPricing(response.data);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedDate = date.toISOString().split('T')[0];
      
      const bookingData = {
        date: formattedDate,
        start_time: startTime,
        duration_minutes: duration,
        ps5_setup: ps5Setup,
        controllers: controllers,
        payment_method: paymentMethod
      };

      await axios.post(`${API}/bookings`, bookingData, { withCredentials: true });
      
      toast.success('Booking confirmed! Ready to game! 🎮');
      setTimeout(() => navigate('/my-bookings'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [];
  for (let hour = 10; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  const isTimeSlotAvailable = (time) => {
    for (const slot of availability) {
      if (time >= slot.start_time && time < slot.end_time) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <Button 
            data-testid="back-btn"
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="back-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="booking-title">Book Your Gaming Session</h1>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-grid">
            {/* Left Column */}
            <div className="form-column">
              <Card data-testid="date-selection-card" className="form-card">
                <h3 className="form-card-title">Select Date</h3>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="booking-calendar"
                />
              </Card>

              <Card data-testid="setup-selection-card" className="form-card">
                <h3 className="form-card-title">
                  <Gamepad2 className="w-5 h-5 inline mr-2" />
                  PS5 Setup
                </h3>
                <div className="setup-selector">
                  <button
                    type="button"
                    data-testid="setup-1-btn"
                    className={`setup-option ${ps5Setup === 1 ? 'active' : ''}`}
                    onClick={() => setPs5Setup(1)}
                  >
                    Setup 1
                  </button>
                  <button
                    type="button"
                    data-testid="setup-2-btn"
                    className={`setup-option ${ps5Setup === 2 ? 'active' : ''}`}
                    onClick={() => setPs5Setup(2)}
                  >
                    Setup 2
                  </button>
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="form-column">
              <Card data-testid="time-selection-card" className="form-card">
                <h3 className="form-card-title">Time & Duration</h3>
                
                <div className="form-group">
                  <label>Start Time</label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger data-testid="start-time-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem 
                          key={time} 
                          value={time}
                          disabled={!isTimeSlotAvailable(time)}
                        >
                          {time} {!isTimeSlotAvailable(time) ? '(Booked)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <label>Duration</label>
                  <Select value={duration.toString()} onValueChange={(val) => setDuration(parseInt(val))}>
                    <SelectTrigger data-testid="duration-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <label>Controllers</label>
                  <Select value={controllers.toString()} onValueChange={(val) => setControllers(parseInt(val))}>
                    <SelectTrigger data-testid="controllers-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Controller</SelectItem>
                      <SelectItem value="2">2 Controllers</SelectItem>
                      <SelectItem value="3">3 Controllers</SelectItem>
                      <SelectItem value="4">4 Controllers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <Card data-testid="payment-card" className="form-card">
                <h3 className="form-card-title">Payment Method</h3>
                
                <div className="payment-options">
                  <button
                    type="button"
                    data-testid="wallet-payment-btn"
                    className={`payment-option ${paymentMethod === 'wallet' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('wallet')}
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Wallet</span>
                    <span className="payment-balance">₹{walletBalance.toFixed(2)}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="mock-payment-btn"
                    className={`payment-option ${paymentMethod === 'mock' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('mock')}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Pay Now</span>
                  </button>
                </div>
              </Card>

              {pricing && (
                <Card data-testid="price-summary-card" className="form-card price-card">
                  <h3 className="form-card-title">Price Summary</h3>
                  <div className="price-breakdown">
                    <div className="price-item">
                      <span>Base Rate ({duration} min)</span>
                      <span>₹{pricing.base_price}</span>
                    </div>
                    {pricing.controller_charges > 0 && (
                      <div className="price-item">
                        <span>Extra Controllers ({controllers - 1})</span>
                        <span>₹{pricing.controller_charges}</span>
                      </div>
                    )}
                    <div className="price-item total">
                      <span>Total</span>
                      <span>₹{pricing.total_price}</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <Button 
            data-testid="confirm-booking-btn"
            type="submit" 
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Processing...' : 'Confirm Booking'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
