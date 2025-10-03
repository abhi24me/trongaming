import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ArrowLeft, TrendingUp, History } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const WalletPage = () => {
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const balanceResponse = await axios.get(`${API}/wallet/balance`, { withCredentials: true });
      setWalletBalance(balanceResponse.data.balance);

      const transactionsResponse = await axios.get(`${API}/wallet/transactions`, { withCredentials: true });
      setTransactions(transactionsResponse.data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const handleTopup = async (amount) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/wallet/topup`, 
        { amount },
        { withCredentials: true }
      );
      
      toast.success(`₹${response.data.credited_amount} credited! Bonus: ₹${response.data.bonus}`);
      await fetchWalletData();
      setTopupAmount('');
    } catch (error) {
      toast.error('Topup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTopup = (e) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (amount >= 100) {
      handleTopup(amount);
    } else {
      toast.error('Minimum topup amount is ₹100');
    }
  };

  const getBonus = (amount) => {
    if (amount >= 1000) return '10%';
    if (amount >= 500) return '5%';
    return '0%';
  };

  return (
    <div className="wallet-page">
      <div className="wallet-container">
        <div className="wallet-header">
          <Button 
            data-testid="back-btn"
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="back-button"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="wallet-title">Wallet Management</h1>
        </div>

        <Card data-testid="balance-card" className="balance-card">
          <div className="balance-content">
            <div className="balance-info">
              <span className="balance-label">Current Balance</span>
              <div className="balance-amount">₹{walletBalance.toFixed(2)}</div>
            </div>
            <div className="balance-icon">
              <TrendingUp className="w-16 h-16" />
            </div>
          </div>
        </Card>

        <div className="wallet-grid">
          <Card data-testid="topup-card" className="topup-card">
            <h3 className="card-title">Quick Topup</h3>
            <div className="topup-options">
              <button
                data-testid="topup-500-btn"
                onClick={() => handleTopup(500)}
                disabled={loading}
                className="topup-option"
              >
                <div className="topup-amount">₹500</div>
                <div className="topup-bonus">+5% Bonus</div>
              </button>
              <button
                data-testid="topup-1000-btn"
                onClick={() => handleTopup(1000)}
                disabled={loading}
                className="topup-option featured"
              >
                <div className="topup-amount">₹1000</div>
                <div className="topup-bonus">+10% Bonus</div>
              </button>
              <button
                data-testid="topup-2000-btn"
                onClick={() => handleTopup(2000)}
                disabled={loading}
                className="topup-option"
              >
                <div className="topup-amount">₹2000</div>
                <div className="topup-bonus">+10% Bonus</div>
              </button>
            </div>

            <form onSubmit={handleCustomTopup} className="custom-topup">
              <Input
                data-testid="custom-amount-input"
                type="number"
                placeholder="Enter custom amount"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                min="100"
                className="topup-input"
              />
              <Button 
                data-testid="custom-topup-btn"
                type="submit" 
                disabled={loading}
                className="topup-button"
              >
                {loading ? 'Processing...' : 'Add Funds'}
              </Button>
            </form>

            <div className="bonus-info">
              <p>• ₹500 - ₹999: Get 5% bonus</p>
              <p>• ₹1000+: Get 10% bonus</p>
            </div>
          </Card>

          <Card data-testid="transactions-card" className="transactions-card">
            <h3 className="card-title">
              <History className="w-5 h-5 inline mr-2" />
              Transaction History
            </h3>
            <div className="transactions-list">
              {transactions.length === 0 ? (
                <p className="no-transactions">No transactions yet</p>
              ) : (
                transactions.map((txn) => (
                  <div key={txn.id} className="transaction-item">
                    <div className="transaction-info">
                      <span className="transaction-type">
                        {txn.transaction_type === 'topup' ? 'Wallet Topup' : 'Booking Payment'}
                      </span>
                      <span className="transaction-date">
                        {new Date(txn.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className={`transaction-amount ${txn.final_amount >= 0 ? 'positive' : 'negative'}`}>
                      {txn.final_amount >= 0 ? '+' : ''}₹{Math.abs(txn.final_amount).toFixed(2)}
                      {txn.bonus > 0 && <span className="bonus-tag">+₹{txn.bonus} bonus</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;