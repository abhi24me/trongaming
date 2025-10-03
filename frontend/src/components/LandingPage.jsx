import React from 'react';
import { Button } from './ui/button';
import { Gamepad2, Zap, Trophy, Wallet } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const LandingPage = () => {
  const handleLogin = () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="glitch-container">
            <h1 className="hero-title" data-text="TRONGAMING">TRONGAMING</h1>
          </div>
          <p className="hero-subtitle">
            Premium PS5 Gaming Experience
          </p>
          <p className="hero-description">
            Two elite PS5 setups with cutting-edge controllers. Book your slot, power up your wallet, and dominate the game.
          </p>
          <Button 
            data-testid="get-started-btn"
            onClick={handleLogin} 
            className="cta-button"
          >
            <Zap className="w-5 h-5 mr-2" />
            Enter Arena
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Gamepad2 className="w-12 h-12" />
            </div>
            <h3 className="feature-title">Dual PS5 Setups</h3>
            <p className="feature-description">
              Two premium PlayStation 5 stations with up to 4 controllers each. Choose your battlefield.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Wallet className="w-12 h-12" />
            </div>
            <h3 className="feature-title">Wallet Rewards</h3>
            <p className="feature-description">
              Top up ₹500-999 for 5% bonus. Add ₹1000+ and unlock 10% bonus credits instantly.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Trophy className="w-12 h-12" />
            </div>
            <h3 className="feature-title">Flexible Booking</h3>
            <p className="feature-description">
              Book from 30 minutes to 3 hours. ₹149/hour base rate + ₹40 per extra controller.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="pricing-section">
        <h2 className="section-title">Power Up Pricing</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Base Rate</h3>
              <div className="price">₹149<span>/hour</span></div>
            </div>
            <ul className="pricing-features">
              <li>1 Controller Included</li>
              <li>Premium PS5 Setup</li>
              <li>High-Speed Internet</li>
            </ul>
          </div>

          <div className="pricing-card highlight">
            <div className="pricing-badge">Popular</div>
            <div className="pricing-header">
              <h3>Extra Controllers</h3>
              <div className="price">₹40<span>/hour each</span></div>
            </div>
            <ul className="pricing-features">
              <li>Up to 4 Controllers</li>
              <li>Multiplayer Ready</li>
              <li>Same Premium Quality</li>
            </ul>
          </div>

          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Minimum</h3>
              <div className="price">30<span>mins</span></div>
            </div>
            <ul className="pricing-features">
              <li>Quick Sessions</li>
              <li>Extended Play Options</li>
              <li>Up to 3 Hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2025 Trongaming. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
