import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, uploadUserProfilePicture } from '../services/api';
import './css/CustomerProfile.css';

const CustomerProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_models: [],
    preferred_service_locations: [],
    service_requirements: ''
  });
  const [newVehicle, setNewVehicle] = useState({ type: 'bike', brand: '', model: '' });
  const [newLocation, setNewLocation] = useState({ name: '', latitude: '', longitude: '' });
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureKey, setPictureKey] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getUserProfile();
      setProfile(response.data);
      setFormData({
        vehicle_models: response.data.vehicle_models || [],
        preferred_service_locations: response.data.preferred_service_locations || [],
        service_requirements: response.data.service_requirements || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddVehicle = () => {
    if (newVehicle.brand && newVehicle.model) {
      setFormData({
        ...formData,
        vehicle_models: [...formData.vehicle_models, { ...newVehicle }]
      });
      setNewVehicle({ type: 'bike', brand: '', model: '' });
    }
  };

  const handleRemoveVehicle = (index) => {
    setFormData({
      ...formData,
      vehicle_models: formData.vehicle_models.filter((_, i) => i !== index)
    });
  };

  const handleAddLocation = () => {
    if (newLocation.name && newLocation.latitude && newLocation.longitude) {
      setFormData({
        ...formData,
        preferred_service_locations: [...formData.preferred_service_locations, {
          ...newLocation,
          latitude: parseFloat(newLocation.latitude),
          longitude: parseFloat(newLocation.longitude)
        }]
      });
      setNewLocation({ name: '', latitude: '', longitude: '' });
    }
  };

  const handleRemoveLocation = (index) => {
    setFormData({
      ...formData,
      preferred_service_locations: formData.preferred_service_locations.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      await updateUserProfile(formData);
      await fetchProfile();
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const response = await uploadUserProfilePicture(file);
      
      if (response.data && response.data.profile_picture) {
        const newProfilePicture = response.data.profile_picture;
        setProfile(prev => ({
          ...prev,
          profile_picture: newProfilePicture
        }));
        
        updateUser({
          ...user,
          profile_picture: newProfilePicture
        });
        
        setPictureKey(prev => prev + 1);
      }
      
      await fetchProfile();
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <div className="customerprofile-loading">Loading profile...</div>;
  }

  return (
    <div className="customerprofile-container">
      {/* Header */}
      <div className="customerprofile-header">
        <div className="customerprofile-header-content">
          <h1 className="customerprofile-title">My Profile</h1>
          <p className="customerprofile-subtitle">Manage your personal information and preferences</p>
        </div>
        <button 
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`customerprofile-edit-btn ${editing ? 'customerprofile-save-btn' : ''}`}
        >
          {editing ? (
            <>
              <i className="fas fa-check"></i>
              Save Changes
            </>
          ) : (
            <>
              <i className="fas fa-edit"></i>
              Edit Profile
            </>
          )}
        </button>
      </div>

      {/* Profile Card */}
      <div className="customerprofile-main-card">
        <div className="customerprofile-profile-section">
          <div className="customerprofile-avatar-wrapper">
            <div className="customerprofile-avatar-container">
              {profile?.profile_picture || user?.profile_picture ? (
                <img 
                  key={pictureKey}
                  src={`${profile?.profile_picture || user?.profile_picture}${(profile?.profile_picture || user?.profile_picture)?.includes('?') ? '&' : '?'}v=${pictureKey}`}
                  alt="Profile" 
                  className="customerprofile-avatar-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentElement.querySelector('.customerprofile-avatar-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    const placeholder = e.target.parentElement.querySelector('.customerprofile-avatar-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                  }}
                />
              ) : null}
              <div 
                className="customerprofile-avatar-placeholder"
                style={{ display: (profile?.profile_picture || user?.profile_picture) ? 'none' : 'flex' }}
              >
                <span>{getUserInitials(user?.name)}</span>
              </div>
              {uploadingPicture && (
                <div className="customerprofile-avatar-overlay">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              )}
              <button 
                className="customerprofile-avatar-edit-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
              >
                <i className="fas fa-camera"></i>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePictureChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="customerprofile-info-grid">
            <div className="customerprofile-info-item">
              <div className="customerprofile-info-label">
                <i className="fas fa-user"></i>
                <span>Full Name</span>
              </div>
              <div className="customerprofile-info-value">{user?.name || 'N/A'}</div>
            </div>
            <div className="customerprofile-info-item">
              <div className="customerprofile-info-label">
                <i className="fas fa-envelope"></i>
                <span>Email Address</span>
              </div>
              <div className="customerprofile-info-value">{user?.email || 'N/A'}</div>
            </div>
            <div className="customerprofile-info-item">
              <div className="customerprofile-info-label">
                <i className="fas fa-phone"></i>
                <span>Phone Number</span>
              </div>
              <div className="customerprofile-info-value">{profile?.phone || 'Not provided'}</div>
            </div>
            <div className="customerprofile-info-item">
              <div className="customerprofile-info-label">
                <i className="fas fa-user-tag"></i>
                <span>Account Type</span>
              </div>
              <div className="customerprofile-info-value">
                <span className="customerprofile-badge customerprofile-badge-customer">Customer</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="customerprofile-content-grid">
        {/* Vehicles Section */}
        <div className="customerprofile-card">
          <div className="customerprofile-card-header">
            <div className="customerprofile-card-title">
              <i className="fas fa-car"></i>
              <h2>My Vehicles</h2>
            </div>
            {editing && (
              <button 
                className="customerprofile-card-action"
                onClick={handleAddVehicle}
                disabled={!newVehicle.brand || !newVehicle.model}
              >
                <i className="fas fa-plus"></i>
              </button>
            )}
          </div>

          {formData.vehicle_models.length === 0 ? (
            <div className="customerprofile-empty-state">
              <i className="fas fa-car-side"></i>
              <p>No vehicles added yet</p>
              {editing && (
                <span className="customerprofile-empty-hint">Add your first vehicle below</span>
              )}
            </div>
          ) : (
            <div className="customerprofile-vehicles-grid">
              {formData.vehicle_models.map((vehicle, index) => (
                <div key={index} className="customerprofile-vehicle-item">
                  <div className="customerprofile-vehicle-icon">
                    <i className={`fas fa-${vehicle.type === 'car' ? 'car' : 'motorcycle'}`}></i>
                  </div>
                  <div className="customerprofile-vehicle-details">
                    <div className="customerprofile-vehicle-brand">{vehicle.brand}</div>
                    <div className="customerprofile-vehicle-model">{vehicle.model}</div>
                    <div className="customerprofile-vehicle-type-badge">
                      {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)}
                    </div>
                  </div>
                  {editing && (
                    <button 
                      className="customerprofile-item-remove"
                      onClick={() => handleRemoveVehicle(index)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {editing && (
            <div className="customerprofile-add-form">
              <select
                value={newVehicle.type}
                onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
                className="customerprofile-form-input"
              >
                <option value="bike">Bike</option>
                <option value="car">Car</option>
              </select>
              <input
                type="text"
                placeholder="Brand (e.g., Honda)"
                value={newVehicle.brand}
                onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                className="customerprofile-form-input"
              />
              <input
                type="text"
                placeholder="Model (e.g., CBR 250)"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="customerprofile-form-input"
              />
            </div>
          )}
        </div>

        {/* Locations Section */}
        <div className="customerprofile-card">
          <div className="customerprofile-card-header">
            <div className="customerprofile-card-title">
              <i className="fas fa-map-marker-alt"></i>
              <h2>Preferred Locations</h2>
            </div>
            {editing && (
              <button 
                className="customerprofile-card-action"
                onClick={handleAddLocation}
                disabled={!newLocation.name || !newLocation.latitude || !newLocation.longitude}
              >
                <i className="fas fa-plus"></i>
              </button>
            )}
          </div>

          {formData.preferred_service_locations.length === 0 ? (
            <div className="customerprofile-empty-state">
              <i className="fas fa-map-pin"></i>
              <p>No locations added yet</p>
              {editing && (
                <span className="customerprofile-empty-hint">Add your preferred service locations below</span>
              )}
            </div>
          ) : (
            <div className="customerprofile-locations-list">
              {formData.preferred_service_locations.map((location, index) => (
                <div key={index} className="customerprofile-location-item">
                  <div className="customerprofile-location-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="customerprofile-location-details">
                    <div className="customerprofile-location-name">{location.name}</div>
                    <div className="customerprofile-location-coords">
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </div>
                  </div>
                  {editing && (
                    <button 
                      className="customerprofile-item-remove"
                      onClick={() => handleRemoveLocation(index)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {editing && (
            <div className="customerprofile-add-form">
              <input
                type="text"
                placeholder="Location name (e.g., Home, Office)"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                className="customerprofile-form-input"
              />
              <div className="customerprofile-location-inputs">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={newLocation.latitude}
                  onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })}
                  className="customerprofile-form-input"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={newLocation.longitude}
                  onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })}
                  className="customerprofile-form-input"
                />
              </div>
              <button 
                className="customerprofile-location-gps-btn"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                      setNewLocation({
                        ...newLocation,
                        latitude: position.coords.latitude.toString(),
                        longitude: position.coords.longitude.toString()
                      });
                    });
                  }
                }}
              >
                <i className="fas fa-crosshairs"></i>
                Use Current Location
              </button>
            </div>
          )}
        </div>

        {/* Service Requirements Section */}
        <div className="customerprofile-card customerprofile-card-full">
          <div className="customerprofile-card-header">
            <div className="customerprofile-card-title">
              <i className="fas fa-clipboard-list"></i>
              <h2>Service Requirements</h2>
            </div>
          </div>

          {editing ? (
            <textarea
              name="service_requirements"
              value={formData.service_requirements}
              onChange={handleChange}
              placeholder="Describe your service requirements, preferences, or special needs..."
              className="customerprofile-textarea"
              rows="6"
            />
          ) : (
            <div className="customerprofile-requirements-content">
              {formData.service_requirements ? (
                <p>{formData.service_requirements}</p>
              ) : (
                <div className="customerprofile-empty-state">
                  <i className="fas fa-clipboard"></i>
                  <p>No service requirements specified</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
