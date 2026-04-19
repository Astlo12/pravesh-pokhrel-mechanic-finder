import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyOTP, forgotPassword } from '../../services/api';
import '../css/Auth.css';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length - 1, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await verifyOTP(email, code);
      navigate('/reset-password', { 
        state: { 
          email, 
          resetToken: response.data.resetToken 
        } 
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();

    try {
      await forgotPassword(email);
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout-single">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-header">
              <div className="auth-logo">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h1 className="auth-headline">Enter the 6-Digit Code</h1>
              <p className="auth-subtext">We've sent a verification code to {email}</p>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="otp-input"
                    required
                  />
                ))}
              </div>

              <button type="submit" className="btn-primary" disabled={otp.join('').length !== 6 || loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Verifying...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Continue
                  </>
                )}
              </button>

              <div className="otp-actions">
                {canResend ? (
                  <button type="button" className="resend-link" onClick={handleResend}>
                    <i className="fas fa-redo"></i> Resend Code
                  </button>
                ) : (
                  <p className="resend-timer">
                    <i className="fas fa-clock"></i> Resend code in {timer}s
                  </p>
                )}
                <Link to="/forgot-password" className="change-email-link">
                  <i className="fas fa-edit"></i> Change Email
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;

