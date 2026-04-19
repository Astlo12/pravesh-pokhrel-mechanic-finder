import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getMechanicProfile, getMechanicReviews, updateMechanicProfile, uploadMechanicProfilePicture } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EnhancedMapComponent from './EnhancedMapComponent';
import './css/MechanicProfile.css';

const MechanicProfile = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [mechanic, setMechanic] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationFormData, setLocationFormData] = useState({
    service_radius: '',
    latitude: '',
    longitude: ''
  });
  const [locationError, setLocationError] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureKey, setPictureKey] = useState(0); // For forcing image reload
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMechanicProfile();
    fetchReviews();
  }, [id]);

  const fetchMechanicProfile = async () => {
    try {
      const response = await getMechanicProfile(id);
      const mechanicData = response.data;
      setMechanic(mechanicData);
      
      // Initialize form data with current values
      if (mechanicData) {
        setLocationFormData({
          service_radius: mechanicData.service_radius || '',
          latitude: mechanicData.base_latitude || mechanicData.latitude || '',
          longitude: mechanicData.base_longitude || mechanicData.longitude || ''
        });
      }
    } catch (error) {
      console.error('Error fetching mechanic profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await getMechanicReviews(id);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleBookService = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/booking/${id}`);
  };

  const formatWorkingHours = (workingTime) => {
    if (!workingTime) return 'Not specified';
    if (typeof workingTime === 'string') return workingTime;
    if (workingTime.start && workingTime.end) {
      return `${workingTime.start} - ${workingTime.end}`;
    }
    return 'Not specified';
  };

  // Check if current user is viewing their own profile
  const isOwnProfile = user && user.user_type === 'mechanic' && mechanic && mechanic.user_id && 
    (mechanic.user_id.toString() === (user._id || user.id).toString());

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationFormData({
      ...locationFormData,
      [name]: value
    });
    setLocationError('');
  };

  const handleUpdateLocationFromGPS = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setUpdatingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        setLocationFormData({
          ...locationFormData,
          latitude: location.latitude.toFixed(6),
          longitude: location.longitude.toFixed(6)
        });
        
        setUpdatingLocation(false);
        setLocationError('');
      },
      (error) => {
        setUpdatingLocation(false);
        let errorMessage = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location services in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Please enable location services.';
        }
        
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSaveLocation = async () => {
    setLocationError('');
    
    // Validate form data
    if (!locationFormData.service_radius || parseFloat(locationFormData.service_radius) <= 0) {
      setLocationError('Service radius must be greater than 0');
      return;
    }
    
    if (!locationFormData.latitude || !locationFormData.longitude) {
      setLocationError('Please update your location using GPS first');
      return;
    }
    
    const lat = parseFloat(locationFormData.latitude);
    const lng = parseFloat(locationFormData.longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError('Invalid coordinates. Please update location using GPS again');
      return;
    }

    try {
      setUpdatingLocation(true);
      await updateMechanicProfile(id, {
        service_radius: parseFloat(locationFormData.service_radius),
        latitude: lat,
        longitude: lng
      });
      
      // Refresh profile data
      await fetchMechanicProfile();
      setEditingLocation(false);
      setLocationError('');
    } catch (error) {
      console.error('Error updating location:', error);
      setLocationError(error.response?.data?.error || 'Failed to update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const response = await uploadMechanicProfilePicture(id, file);
      
      // Update mechanic state immediately with new picture URL
      if (response.data && response.data.profile_picture) {
        const newProfilePicture = response.data.profile_picture;
        setMechanic(prev => ({
          ...prev,
          profile_picture: newProfilePicture
        }));
        
        // Update user in AuthContext so it's updated everywhere
        if (user && user.id === mechanic.user_id) {
          updateUser({
            ...user,
            profile_picture: newProfilePicture
          });
        }
        
        // Force image reload by updating key
        setPictureKey(prev => prev + 1);
      }
      
      // Also refresh full profile to ensure consistency
      await fetchMechanicProfile();
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

  if (loading) {
    return <div className="mechanicprofile-loading">Loading mechanic profile...</div>;
  }

  if (!mechanic) {
    return <div className="mechanicprofile-error">Mechanic not found</div>;
  }

  return (
    <div className="mechanicprofile-container">
      {isOwnProfile && (
        <div className="mechanicprofile-owner-toolbar">
          <Link to="/mechanic/workspace/edit-profile" className="mechanicprofile-edit-pro-link">
            <i className="fas fa-user-edit" /> Edit professional profile
          </Link>
          <Link to="/mechanic/workspace/bookings" className="mechanicprofile-edit-pro-link secondary">
            <i className="fas fa-calendar-check" /> Bookings
          </Link>
          <Link to="/mechanic/workspace/reviews" className="mechanicprofile-edit-pro-link secondary">
            <i className="fas fa-star" /> Reviews
          </Link>
          <Link to="/mechanic/workspace/history" className="mechanicprofile-edit-pro-link secondary">
            <i className="fas fa-history" /> Service history
          </Link>
        </div>
      )}

      {isOwnProfile && !mechanic.is_verified && (
        <div className="mechanicprofile-pending-banner" role="status">
          <i className="fas fa-hourglass-half" />
          <div>
            <strong>Profile not verified yet</strong>
            <p>
              Customers cannot find you in search or book you until an administrator verifies your account. Complete
              your details — we’ll enable your listing after review.
            </p>
          </div>
        </div>
      )}
      <div className="mechanicprofile-header">
        <div className="mechanicprofile-main">
          <div className="mechanicprofile-title-section">
            <h1>{mechanic.business_name || mechanic.name}</h1>
            {mechanic.is_verified && (
              <span className="mechanicprofile-verified-badge">
                <i className="fas fa-check-circle"></i> Verified
              </span>
            )}
          </div>
          <div className="mechanicprofile-rating">
            <span className="mechanicprofile-rating-value">
              <i className="fas fa-star"></i> {mechanic.rating ? parseFloat(mechanic.rating).toFixed(1) : 'N/A'}
            </span>
            <span className="mechanicprofile-rating-details">
              ({mechanic.total_reviews || 0} reviews) • {mechanic.total_customers || 0} customers served
            </span>
          </div>
          <div className="mechanicprofile-status">
            <span className={mechanic.is_online ? 'mechanicprofile-status-online' : 'mechanicprofile-status-offline'}>
              {mechanic.is_online ? '🟢 Online' : '🔴 Offline'}
            </span>
            {mechanic.is_available && mechanic.is_online && (
              <span className="mechanicprofile-available-badge">Available</span>
            )}
          </div>
        </div>
        {user &&
          user.user_type === 'customer' &&
          mechanic.is_verified &&
          mechanic.is_available &&
          mechanic.is_online && (
            <button onClick={handleBookService} className="mechanicprofile-btn-book">
              Book Service
            </button>
          )}
      </div>

      <div className="mechanicprofile-content">
        <div className="mechanicprofile-section">
          <h2><i className="fas fa-address-card"></i> Contact Information</h2>
          <div className="mechanicprofile-profile-picture-section">
            <div className="mechanicprofile-picture-container">
              <img 
                key={pictureKey}
                src={mechanic.profile_picture ? `${mechanic.profile_picture}?v=${pictureKey}` : 'https://via.placeholder.com/150?text=No+Image'} 
                alt="Profile" 
                className="mechanicprofile-picture"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                }}
              />
              {uploadingPicture && (
                <div className="mechanicprofile-picture-overlay">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              )}
            </div>
            {user && user.id === mechanic.user_id && (
              <div className="mechanicprofile-picture-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePictureChange}
                  style={{ display: 'none' }}
                  id="mechanic-profile-picture-input"
                />
                <label 
                  htmlFor="mechanic-profile-picture-input" 
                  className="mechanicprofile-upload-btn"
                  disabled={uploadingPicture}
                >
                  <i className="fas fa-camera"></i> {uploadingPicture ? 'Uploading...' : 'Change Picture'}
                </label>
              </div>
            )}
          </div>
          <div className="mechanicprofile-info-grid">
            <p><strong>Name:</strong> {mechanic.name}</p>
            <p><strong>Phone:</strong> {mechanic.phone || 'Not provided'}</p>
            <p><strong>Email:</strong> {mechanic.email || 'Not provided'}</p>
            {mechanic.business_name && (
              <p><strong>Business Name:</strong> {mechanic.business_name}</p>
            )}
            {mechanic.license_number && (
              <p><strong>License Number:</strong> {mechanic.license_number}</p>
            )}
          </div>
        </div>

        {mechanic.years_experience && (
          <div className="mechanicprofile-section">
            <h2><i className="fas fa-briefcase"></i> Professional Experience</h2>
            <p><strong>Years of Experience:</strong> {mechanic.years_experience} years</p>
          </div>
        )}

        {mechanic.certifications && mechanic.certifications.length > 0 && (
          <div className="mechanicprofile-section">
            <h2><i className="fas fa-certificate"></i> Certifications</h2>
            <div className="mechanicprofile-certifications">
              {mechanic.certifications.map((cert, idx) => (
                <div key={idx} className="mechanicprofile-cert-item">
                  <i className="fas fa-award"></i>
                  <span>{cert.name || cert}</span>
                  {cert.issuing_authority && (
                    <span className="mechanicprofile-cert-authority">{cert.issuing_authority}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mechanic.vehicle_capabilities && mechanic.vehicle_capabilities.length > 0 && (
          <div className="mechanicprofile-section">
            <h2><i className="fas fa-cog"></i> Vehicle Capabilities & Specializations</h2>
            <div className="mechanicprofile-capabilities-grid">
              {mechanic.vehicle_capabilities.map((cap, idx) => (
                <div key={idx} className="mechanicprofile-capability-item">
                  <span className="mechanicprofile-capability-type">{cap.type_name?.toUpperCase() || cap.type?.toUpperCase() || 'N/A'}</span>
                  <span className="mechanicprofile-capability-brand">{cap.brand_name || cap.brand || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mechanic.services_offered && mechanic.services_offered.length > 0 && (
          <div className="mechanicprofile-section">
            <h2><i className="fas fa-tools"></i> Services Offered</h2>
            <div className="mechanicprofile-services">
              {mechanic.services_offered.map((service, idx) => (
                <span key={idx} className="mechanicprofile-service-tag">
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {(mechanic.service_radius || mechanic.latitude || mechanic.longitude || isOwnProfile) && (
          <div className="mechanicprofile-section">
            <div className="mechanicprofile-section-header">
              <h2><i className="fas fa-map-marked-alt"></i> Geographical Area of Work</h2>
              {isOwnProfile && (
                <button
                  onClick={() => editingLocation ? handleSaveLocation() : setEditingLocation(true)}
                  className="mechanicprofile-edit-location-btn"
                  disabled={updatingLocation}
                >
                  {editingLocation ? (
                    updatingLocation ? (
                      <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                    ) : (
                      <><i className="fas fa-save"></i> Save</>
                    )
                  ) : (
                    <><i className="fas fa-edit"></i> Edit</>
                  )}
                </button>
              )}
            </div>

            {editingLocation && isOwnProfile ? (
              <div className="mechanicprofile-location-edit-form">
                {locationError && (
                  <div className="mechanicprofile-location-error">
                    <i className="fas fa-exclamation-circle"></i> {locationError}
                  </div>
                )}
                
                <div className="mechanicprofile-location-form-group">
                  <label htmlFor="service_radius">
                    <i className="fas fa-ruler"></i> Service Radius (km)
                  </label>
                  <input
                    type="number"
                    id="service_radius"
                    name="service_radius"
                    value={locationFormData.service_radius}
                    onChange={handleLocationChange}
                    min="1"
                    max="100"
                    step="1"
                    placeholder="e.g., 15"
                  />
                </div>

                <div className="mechanicprofile-location-info">
                  <p><i className="fas fa-info-circle"></i> Click the button below to update your location using GPS</p>
                </div>

                <button
                  type="button"
                  onClick={handleUpdateLocationFromGPS}
                  className="mechanicprofile-update-location-btn"
                  disabled={updatingLocation}
                >
                  {updatingLocation ? (
                    <><i className="fas fa-spinner fa-spin"></i> Getting Location...</>
                  ) : (
                    <><i className="fas fa-crosshairs"></i> Update Location from GPS</>
                  )}
                </button>

                {locationFormData.latitude && locationFormData.longitude && (
                  <div className="mechanicprofile-location-preview">
                    <p><strong>Location will be set to:</strong></p>
                    <p>{parseFloat(locationFormData.latitude).toFixed(6)}, {parseFloat(locationFormData.longitude).toFixed(6)}</p>
                  </div>
                )}

                <div className="mechanicprofile-location-form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLocation(false);
                      setLocationError('');
                      // Reset form data
                      if (mechanic) {
                        setLocationFormData({
                          service_radius: mechanic.service_radius || '',
                          latitude: mechanic.base_latitude || mechanic.latitude || '',
                          longitude: mechanic.base_longitude || mechanic.longitude || ''
                        });
                      }
                    }}
                    className="mechanicprofile-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLocation}
                    className="mechanicprofile-save-location-btn"
                    disabled={updatingLocation || !locationFormData.latitude || !locationFormData.longitude}
                  >
                    {updatingLocation ? (
                      <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                    ) : (
                      <><i className="fas fa-save"></i> Save</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {mechanic.service_radius && (
                  <p><strong>Service Radius:</strong> {mechanic.service_radius} km</p>
                )}
                {mechanic.latitude && mechanic.longitude && (
                  <>
                    <p>
                      <strong>{mechanic.location_is_current ? '📍 Current Location' : '📍 Base Location'}:</strong>{' '}
                      {mechanic.latitude.toFixed(4)}, {mechanic.longitude.toFixed(4)}
                      {mechanic.location_is_current && (
                        <span className="mechanicprofile-location-badge">
                          <i className="fas fa-circle" style={{ color: '#27ae60', fontSize: '0.5rem', marginLeft: '0.5rem' }}></i> Live
                        </span>
                      )}
                    </p>
                    {mechanic.base_latitude && mechanic.base_longitude && mechanic.location_is_current && (
                      <p className="mechanicprofile-base-location">
                        <strong>Base Location:</strong> {mechanic.base_latitude.toFixed(4)}, {mechanic.base_longitude.toFixed(4)}
                      </p>
                    )}
                    {mechanic.location_updated_at && (
                      <p className="mechanicprofile-location-updated">
                        <small>Last updated: {new Date(mechanic.location_updated_at).toLocaleString()}</small>
                      </p>
                    )}
                  </>
                )}
                {mechanic.latitude && mechanic.longitude && (
                  <div className="mechanicprofile-map-container">
                    <EnhancedMapComponent
                      userLocation={{
                        latitude: mechanic.latitude,
                        longitude: mechanic.longitude
                      }}
                      mechanics={[{
                        id: mechanic.id,
                        latitude: mechanic.latitude,
                        longitude: mechanic.longitude,
                        service_radius: mechanic.service_radius,
                        business_name: mechanic.business_name,
                        name: mechanic.name,
                        rating: mechanic.rating,
                        is_online: mechanic.is_online,
                        is_available: mechanic.is_available,
                        is_verified: mechanic.is_verified
                      }]}
                      selectedMechanic={null}
                      showServiceRadius={true}
                      emergencyMode={false}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {mechanic.working_time && (
          <div className="mechanicprofile-section">
            <h2><i className="fas fa-clock"></i> Working Time</h2>
            <p>{formatWorkingHours(mechanic.working_time)}</p>
          </div>
        )}

        {mechanic.work_history && mechanic.work_history.length > 0 && (
          <div className="mechanicprofile-section">
            <h2><i className="fas fa-history"></i> Work History</h2>
            <div className="mechanicprofile-work-history">
              {mechanic.work_history.map((work, idx) => (
                <div key={idx} className="mechanicprofile-work-item">
                  <div className="mechanicprofile-work-header">
                    <strong>{work.company || work.position || 'Previous Work'}</strong>
                    {work.start_date && work.end_date && (
                      <span className="mechanicprofile-work-dates">
                        {new Date(work.start_date).getFullYear()} - {work.end_date ? new Date(work.end_date).getFullYear() : 'Present'}
                      </span>
                    )}
                  </div>
                  {work.description && (
                    <p className="mechanicprofile-work-description">{work.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mechanicprofile-section">
          <h2><i className="fas fa-star"></i> Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="mechanicprofile-no-reviews">No reviews yet.</p>
          ) : (
            <div className="mechanicprofile-reviews-list">
              {reviews.map((review) => (
                <div key={review.id || review._id} className="mechanicprofile-review-item">
                  <div className="mechanicprofile-review-header">
                    <strong>{review.customer_name || 'Anonymous'}</strong>
                    <span className="mechanicprofile-review-rating">
                      <i className="fas fa-star"></i> {review.rating}/5
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mechanicprofile-review-comment">{review.comment}</p>
                  )}
                  <span className="mechanicprofile-review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mechanicprofile-section">
          <h2><i className="fas fa-users"></i> Customer Statistics</h2>
          <div className="mechanicprofile-stats">
            <div className="mechanicprofile-stat-item">
              <span className="mechanicprofile-stat-value">{mechanic.total_customers || 0}</span>
              <span className="mechanicprofile-stat-label">Total Customers Served</span>
            </div>
            <div className="mechanicprofile-stat-item">
              <span className="mechanicprofile-stat-value">{mechanic.total_reviews || 0}</span>
              <span className="mechanicprofile-stat-label">Total Reviews</span>
            </div>
            <div className="mechanicprofile-stat-item">
              <span className="mechanicprofile-stat-value">
                {mechanic.rating ? parseFloat(mechanic.rating).toFixed(1) : 'N/A'}
              </span>
              <span className="mechanicprofile-stat-label">Average Rating</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanicProfile;

