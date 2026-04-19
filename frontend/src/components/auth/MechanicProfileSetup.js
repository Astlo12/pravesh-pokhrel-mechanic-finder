import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateMechanicProfile } from '../../services/api';
import '../css/Auth.css';

const MechanicProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { formData: initialData } = location.state || {};
  
  const [formData, setFormData] = useState({
    service_radius: '',
    available_services: [],
    profile_photo: null,
    workshop_images: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const services = [
    'On-site repair',
    'Battery jumpstart',
    'Tire puncture repair',
    'Full service',
    'Towing assistance'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleServiceToggle = (service) => {
    const services = formData.available_services;
    if (services.includes(service)) {
      setFormData({ ...formData, available_services: services.filter(s => s !== service) });
    } else {
      setFormData({ ...formData, available_services: [...services, service] });
    }
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === 'profile') {
      setFormData({ ...formData, profile_photo: files[0] });
    } else {
      setFormData({ ...formData, workshop_images: files });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get mechanic ID from user data (would be available after registration)
      // For now, we'll navigate to dashboard
      // In real implementation, you'd call updateMechanicProfile API
      
      setTimeout(() => {
        setLoading(false);
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-layout-single">
        <div className="auth-form-container profile-setup">
          <div className="auth-form-card">
            <div className="auth-header">
              <div className="auth-logo">
                <i className="fas fa-user-cog"></i>
              </div>
              <h1 className="auth-headline">Complete Your Profile</h1>
             
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="profile_photo">
                  <i className="fas fa-camera"></i> Profile Photo
                </label>
                <input
                  type="file"
                  id="profile_photo"
                  name="profile_photo"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'profile')}
                  className="file-input"
                />
                {formData.profile_photo && (
                  <p className="file-name">Selected: {formData.profile_photo.name}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="service_radius">
                  <i className="fas fa-map-marker-alt"></i> Service Radius (km)
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-map-marker-alt input-icon"></i>
                  <input
                    type="number"
                    id="service_radius"
                    name="service_radius"
                    value={formData.service_radius}
                    onChange={handleChange}
                    placeholder="e.g., 10"
                    min="1"
                    required
                    className="input-with-icon"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-list-check"></i> Available Services
                </label>
                <div className="service-checkboxes">
                  {services.map(service => (
                    <label key={service} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.available_services.includes(service)}
                        onChange={() => handleServiceToggle(service)}
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-images"></i> Upload Images of Workshop or Tools
                </label>
                <input
                  type="file"
                  id="workshop_images"
                  name="workshop_images"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(e, 'workshop')}
                  className="file-input"
                />
                {formData.workshop_images.length > 0 && (
                  <p className="file-name">{formData.workshop_images.length} file(s) selected</p>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleSkip}>
                  <i className="fas fa-forward"></i> Skip for Now
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Complete Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanicProfileSetup;

