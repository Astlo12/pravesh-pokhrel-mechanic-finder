import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../../services/api';
import '../css/Auth.css';

const ResetPassword = () => {
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [passwordStrength, setPasswordStrength] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken;

  useEffect(() => {
    if (!resetToken) {
      navigate('/forgot-password');
    }
  }, [resetToken, navigate]);

  const calculatePasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'medium';
    if (password.length < 12) return 'strong';
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return 'very-strong';
    }
    return 'strong';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!resetToken) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(resetToken, formData.password);
      setMessage('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'strong': return '#3498db';
      case 'very-strong': return '#27ae60';
      default: return '#3d3d3d';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      case 'very-strong': return 'Very Strong';
      default: return '';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout-single">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-header">
              <div className="auth-logo">
                <i className="fas fa-lock"></i>
              </div>
              <h1 className="auth-headline">Create a New Password</h1>
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
                <label htmlFor="password">
                  <i className="fas fa-lock"></i> New Password
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    required
                    className="input-with-icon"
                  />
                </div>
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill"
                        style={{
                          width: passwordStrength === 'weak' ? '25%' : 
                                 passwordStrength === 'medium' ? '50%' : 
                                 passwordStrength === 'strong' ? '75%' : 
                                 passwordStrength === 'very-strong' ? '100%' : '0%',
                          backgroundColor: getStrengthColor()
                        }}
                      ></div>
                    </div>
                    <span className="strength-text" style={{ color: getStrengthColor() }}>
                      {getStrengthText()}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <i className="fas fa-lock"></i> Confirm New Password
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    required
                    className="input-with-icon"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Save New Password
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer">
              <Link to="/login">Return to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

