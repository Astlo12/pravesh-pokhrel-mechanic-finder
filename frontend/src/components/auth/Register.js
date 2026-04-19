import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../css/Register.css';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Role selection, 2: Form
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    user_type: 'customer',
    business_name: '',
    years_experience: '',
    vehicle_expertise: 'bike',
    brand_specializations: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const bikeBrands = ['Honda', 'Yamaha', 'Suzuki', 'Bajaj', 'TVS', 'Hero', 'Royal Enfield', 'KTM', 'Kawasaki', 'Harley-Davidson'];

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setFormData({ ...formData, user_type: role });
    setStep(2);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBrandToggle = (brand) => {
    const brands = formData.brand_specializations;
    if (brands.includes(brand)) {
      setFormData({ ...formData, brand_specializations: brands.filter(b => b !== brand) });
    } else {
      setFormData({ ...formData, brand_specializations: [...brands, brand] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      user_type: formData.user_type
    });
    
    if (result.success) {
      if (formData.user_type === 'mechanic') {
        navigate('/mechanic-profile-setup', { state: { formData } });
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="register-page">
      <div className="register-layout">
        <div className="register-form-container">
          <div className="register-form-card">
            {step === 1 ? (
              <>
                <div className="register-header">
                  <div className="register-logo">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <h1 className="register-headline">Who are you creating an account as?</h1>
                </div>
                <div className="register-role-selection">
                  <div 
                    className={`register-role-card ${selectedRole === 'customer' ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('customer')}
                  >
                    <div className="register-role-icon">
                      <i className="fas fa-motorcycle"></i>
                    </div>
                    <h3>Vehicle Owner</h3>
                    <ul className="register-role-features">
                      <li><i className="fas fa-check-circle"></i> Request repairs</li>
                      <li><i className="fas fa-check-circle"></i> Track mechanics live</li>
                      <li><i className="fas fa-check-circle"></i> Rate & review service</li>
                      <li><i className="fas fa-check-circle"></i> Manage bookings</li>
                    </ul>
                  </div>

                  <div 
                    className={`register-role-card ${selectedRole === 'mechanic' ? 'selected' : ''}`}
                    onClick={() => handleRoleSelect('mechanic')}
                  >
                    <div className="register-role-icon">
                      <i className="fas fa-tools"></i>
                    </div>
                    <h3>Mechanic / Technician</h3>
                    <ul className="register-role-features">
                      <li><i className="fas fa-check-circle"></i> Receive job requests</li>
                      <li><i className="fas fa-check-circle"></i> Update live availability</li>
                      <li><i className="fas fa-check-circle"></i> Show ETA to clients</li>
                      <li><i className="fas fa-check-circle"></i> Manage service history & earnings</li>
                      <li className="register-role-note">
                        <i className="fas fa-info-circle"></i> Admin must verify your profile before you appear in customer search
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button className="register-back-button" onClick={() => setStep(1)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <div className="register-header">
                  <div className="register-logo">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <h1 className="register-headline">Let's Get You Set Up</h1>
                  <p className="register-subtext">Create your account to get started</p>
                </div>
                
                {error && (
                  <div className="register-error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    <span>{error}</span>
                  </div>
                )}

                {formData.user_type === 'mechanic' && (
                  <div className="register-verification-callout" role="note">
                    <i className="fas fa-shield-alt" aria-hidden />
                    <div>
                      <strong>Verification required</strong>
                      <p>
                        After you sign up, an administrator will review your mechanic profile. You will{' '}
                        <strong>not</strong> appear on the Find Mechanics page or receive new customer bookings until
                        your account is verified. You can still log in and complete your profile in the meantime.
                      </p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="register-form">
                  <div className="register-form-fields">
                    <div className="register-form-group">
                      <label htmlFor="name">
                        <i className="fas fa-user"></i> Full Name
                      </label>
                      <div className="register-input-wrapper">
                        <i className="fas fa-user register-input-icon"></i>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          required
                          className="register-input"
                        />
                      </div>
                    </div>

                    <div className="register-form-group">
                      <label htmlFor="email">
                        <i className="fas fa-envelope"></i> Email
                      </label>
                      <div className="register-input-wrapper">
                        <i className="fas fa-envelope register-input-icon"></i>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          required
                          className="register-input"
                        />
                      </div>
                    </div>

                    <div className="register-form-group">
                      <label htmlFor="phone">
                        <i className="fas fa-phone"></i> Phone Number
                      </label>
                      <div className="register-input-wrapper">
                        <i className="fas fa-phone register-input-icon"></i>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter your phone number"
                          required
                          className="register-input"
                        />
                      </div>
                    </div>

                    <div className="register-form-group">
                      <label htmlFor="password">
                        <i className="fas fa-lock"></i> Password
                      </label>
                      <div className="register-input-wrapper">
                        <i className="fas fa-lock register-input-icon"></i>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Create a password"
                          required
                          minLength="6"
                          className="register-input"
                        />
                        <button
                          type="button"
                          className="register-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>

                    <div className="register-form-group full-width">
                      <label htmlFor="confirmPassword">
                        <i className="fas fa-lock"></i> Confirm Password
                      </label>
                      <div className="register-input-wrapper">
                        <i className="fas fa-lock register-input-icon"></i>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          required
                          className="register-input"
                        />
                        <button
                          type="button"
                          className="register-password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {formData.user_type === 'mechanic' && (
                    <>
                      <div className="register-form-fields">
                        <div className="register-form-group">
                          <label htmlFor="business_name">
                            <i className="fas fa-store"></i> Workshop / Business Name
                          </label>
                          <div className="register-input-wrapper">
                            <i className="fas fa-store register-input-icon"></i>
                            <input
                              type="text"
                              id="business_name"
                              name="business_name"
                              value={formData.business_name}
                              onChange={handleChange}
                              placeholder="Enter your business name"
                              className="register-input"
                            />
                          </div>
                        </div>

                        <div className="register-form-group">
                          <label htmlFor="years_experience">
                            <i className="fas fa-calendar-alt"></i> Years of Experience
                          </label>
                          <div className="register-input-wrapper">
                            <i className="fas fa-calendar-alt register-input-icon"></i>
                            <input
                              type="number"
                              id="years_experience"
                              name="years_experience"
                              value={formData.years_experience}
                              onChange={handleChange}
                              placeholder="Years"
                              min="0"
                              className="register-input"
                            />
                          </div>
                        </div>

                        <div className="register-form-group full-width">
                          <label htmlFor="vehicle_expertise">
                            <i className="fas fa-cog"></i> Vehicle Expertise
                          </label>
                          <div className="register-input-wrapper">
                            <i className="fas fa-cog register-input-icon"></i>
                            <select
                              id="vehicle_expertise"
                              name="vehicle_expertise"
                              value={formData.vehicle_expertise}
                              onChange={handleChange}
                              className="register-input"
                            >
                              <option value="bike">Bikes</option>
                              <option value="both">Bikes & Cars</option>
                            </select>
                          </div>
                        </div>

                        <div className="register-form-group full-width">
                          <label>
                            <i className="fas fa-tags"></i> Brand Specializations
                          </label>
                          <div className="register-brand-chips">
                            {bikeBrands.map(brand => (
                              <button
                                key={brand}
                                type="button"
                                className={`register-brand-chip ${formData.brand_specializations.includes(brand) ? 'selected' : ''}`}
                                onClick={() => handleBrandToggle(brand)}
                              >
                                <i className="fas fa-check" style={{ display: formData.brand_specializations.includes(brand) ? 'inline' : 'none' }}></i>
                                {brand}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <button type="submit" className="register-btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Creating account...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i> Create Account
                      </>
                    )}
                  </button>

                  <div className="register-divider">
                    <span>or continue with</span>
                  </div>

                  <div className="register-social-buttons">
                    <button type="button" className="register-btn-social register-btn-google">
                      <i className="fab fa-google"></i>
                    </button>
                    <button type="button" className="register-btn-social register-btn-apple">
                      <i className="fab fa-apple"></i>
                    </button>
                  </div>
                </form>

                <p className="register-footer">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
