import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../../services/api';
import '../css/Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await forgotPassword(email);
      setMessage(response.data.message || 'Verification code sent to your email!');
      setTimeout(() => {
        navigate('/otp-verification', { state: { email } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout-single">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-header">
              <div className="auth-logo">
                <i className="fas fa-key"></i>
              </div>
              <h1 className="auth-headline">Forgot Your Password?</h1>
              <p className="auth-subtext">Enter your registered email and we'll send you a verification code.</p>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            {message && (
              <div className="success-message">
                <i className="fas fa-check-circle"></i>
                <span>{message}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i> Email Address
                </label>
                <div className="input-wrapper">
                
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="input-with-icon"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> Send Verification Code
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer">
              Remembered it? <Link to="/login">Go back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

