import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../css/Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      // Get user from localStorage to check user type immediately after login
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Redirect admins to admin dashboard, others to regular dashboard
        if (user.user_type === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-layout-single">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-header">
              <div className="auth-logo">
                <i className="fas fa-wrench"></i>
              </div>
              <h1 className="auth-headline">Welcome Back</h1>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
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
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="input-with-icon"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i> Password
                </label>
                <div className="input-wrapper">
             
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="input-with-icon"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  <i className="fas fa-key"></i> Forgot Password?
                </Link>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Signing in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i> Sign In
                  </>
                )}
              </button>

              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              <div className="social-buttons">
                <button type="button" className="btn-social btn-google">
                  <i className="fab fa-google"></i>
                </button>
                <button type="button" className="btn-social btn-apple">
                  <i className="fab fa-apple"></i>
                </button>
              </div>
            </form>

            <p className="auth-footer">
              Don't have an account? <Link to="/register">Create one now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
