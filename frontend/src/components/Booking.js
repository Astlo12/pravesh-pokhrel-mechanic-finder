import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createBooking, getMechanicProfile } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { reverseGeocode } from '../utils/geocoding';
import EnhancedMapComponent from './EnhancedMapComponent';
import './css/Booking.css';

const Booking = () => {
  const { mechanicId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [mechanic, setMechanic] = useState(null);
  const [formData, setFormData] = useState({
    service_type: 'on_site',
    vehicle_type: 'car',
    vehicle_brand: '',
    issue_description: '',
    scheduled_date: '',
    address: ''
  });
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [mechanicCurrentLocation, setMechanicCurrentLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMechanicProfile();
    const cleanup = getUserLocation();
    return cleanup;
  }, [mechanicId]);

  useEffect(() => {
    if (socket && userLocation && mechanic) {
      socket.on('booking:eta-update', (data) => {
        setEta(data.eta);
        if (data.mechanicLatitude && data.mechanicLongitude) {
          setMechanicCurrentLocation({
            latitude: data.mechanicLatitude,
            longitude: data.mechanicLongitude
          });
        }
      });

      return () => {
        socket.off('booking:eta-update');
      };
    }
  }, [socket, userLocation, mechanic]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (mechanic) {
      const lat = mechanic.current_latitude || mechanic.latitude;
      const lng = mechanic.current_longitude || mechanic.longitude;
      
      if (lat && lng) {
        setMechanicCurrentLocation({
          latitude: lat,
          longitude: lng
        });
      }
    }
  }, [mechanic]);

  useEffect(() => {
    if (userLocation && mechanicCurrentLocation) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        mechanicCurrentLocation.latitude,
        mechanicCurrentLocation.longitude
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [userLocation, mechanicCurrentLocation]);

  const fetchMechanicProfile = async () => {
    try {
      const response = await getMechanicProfile(mechanicId);
      setMechanic(response.data);
    } catch (error) {
      console.error('Error fetching mechanic:', error);
      setError('Failed to load mechanic information');
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    let locationObtained = false;
    let watchId = null;
    let errorTimeout = null;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setError('Location access is blocked. Please enable location access in your browser settings to book a service.');
        }
      }).catch(() => {});
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationObtained = true;
        if (errorTimeout) {
          clearTimeout(errorTimeout);
          errorTimeout = null;
        }
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        setError('');
        
        reverseGeocode(location.latitude, location.longitude).then(name => {
          if (name) {
            setLocationName(name);
          }
        });
      },
      (err) => {
        console.error('Initial location request error:', err);
        errorTimeout = setTimeout(() => {
          if (!locationObtained) {
          }
        }, 2000);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000
      }
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (errorTimeout) {
          clearTimeout(errorTimeout);
          errorTimeout = null;
        }
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        if (!locationObtained) {
          locationObtained = true;
          setError('');
        }
        setUserLocation(location);
        
        reverseGeocode(location.latitude, location.longitude).then(name => {
          if (name) {
            setLocationName(name);
          }
        });
      },
      (err) => {
        if (!locationObtained) {
          console.error('Location error:', err);
          let errorMessage = '';
          
          if (err.code === 1) {
            errorMessage = 'Location access denied. Please allow location access in your browser settings to book a service.';
          } else if (err.code === 2) {
            errorMessage = 'Unable to determine your location. Please check your device location settings.';
          } else if (err.code === 3) {
            errorMessage = 'Location request timed out. Please try refreshing the page or check your internet connection.';
          } else {
            errorMessage = 'Unable to get your location. Please ensure location services are enabled on your device.';
          }
          
          setError(errorMessage);
        } else {
          console.warn('Watch position error (location already obtained):', err);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000
      }
    );

    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!userLocation) {
      setError('Please enable location services to book a service');
      setLoading(false);
      return;
    }

    if (formData.service_type === 'scheduled' && !formData.scheduled_date) {
      setError('Please select a scheduled date');
      setLoading(false);
      return;
    }

    try {
      const bookingData = {
        mechanic_id: mechanicId, // Keep as string for MongoDB ObjectId
        ...formData,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      };

      const response = await createBooking(bookingData);
      
      if (response && response.data) {
        const bookingId = response.data.id || response.data._id?.toString();
        
        // Join booking room for real-time updates
        if (socket && bookingId) {
          socket.emit('booking:join', { bookingId });
          socket.emit('booking:calculate-eta', {
            bookingId: bookingId,
            mechanicId: mechanicId, // Keep as string for MongoDB ObjectId
            customerLat: userLocation.latitude,
            customerLng: userLocation.longitude
          });
        }
        
        alert('Booking created successfully! Opening live tracking…');
        navigate(`/track-booking/${bookingId}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!mechanic) {
    return (
      <div className="booking-loading-wrapper">
        <div className="booking-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading mechanic details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-wrapper">
        {/* Main Content Grid */}
        <div className="booking-main-grid">
          {/* Left: Booking Form */}
          <div className="booking-form-card">
            <div className="booking-card-header">
              <h3>
                <i className="fas fa-calendar-check"></i>
                Service Details
              </h3>
            </div>

            {error && (
              <div className="booking-error-alert">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="booking-form">
              {/* Service Type Toggle */}
              <div className="booking-form-section">
                <label className="booking-form-label">
                  <i className="fas fa-tools"></i>
                  Service Type
                </label>
                <div className="booking-service-type-toggle">
                  <button
                    type="button"
                    className={`booking-toggle-btn ${formData.service_type === 'on_site' ? 'booking-active' : ''}`}
                    onClick={() => setFormData({ ...formData, service_type: 'on_site' })}
                  >
                    <i className="fas fa-map-marker-alt"></i>
                    On-Site
                  </button>
                  <button
                    type="button"
                    className={`booking-toggle-btn ${formData.service_type === 'scheduled' ? 'booking-active' : ''}`}
                    onClick={() => setFormData({ ...formData, service_type: 'scheduled' })}
                  >
                    <i className="fas fa-calendar"></i>
                    Scheduled
                  </button>
                </div>
              </div>

              {formData.service_type === 'scheduled' && (
                <div className="booking-form-section">
                  <label className="booking-form-label">
                    <i className="fas fa-clock"></i>
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleChange}
                    className="booking-form-input"
                    required={formData.service_type === 'scheduled'}
                  />
                </div>
              )}

              {/* Vehicle Info Row */}
              <div className="booking-form-row">
                <div className="booking-form-section">
                  <label className="booking-form-label">
                    <i className="fas fa-car"></i>
                    Vehicle Type
                  </label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                    className="booking-form-input"
                    required
                  >
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                  </select>
                </div>

                <div className="booking-form-section">
                  <label className="booking-form-label">
                    <i className="fas fa-tag"></i>
                    Brand
                  </label>
                  <input
                    type="text"
                    name="vehicle_brand"
                    value={formData.vehicle_brand}
                    onChange={handleChange}
                    className="booking-form-input"
                    placeholder="Honda, Toyota..."
                    required
                  />
                </div>
              </div>

              <div className="booking-form-section">
                <label className="booking-form-label">
                  <i className="fas fa-file-alt"></i>
                  Issue Description
                </label>
                <textarea
                  name="issue_description"
                  value={formData.issue_description}
                  onChange={handleChange}
                  className="booking-form-textarea"
                  rows="4"
                  placeholder="Describe what's wrong with your vehicle..."
                />
              </div>

              <div className="booking-form-section">
                <label className="booking-form-label">
                  <i className="fas fa-home"></i>
                  Address (Optional)
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="booking-form-input"
                  placeholder="Your address or location"
                />
              </div>

              {userLocation && (
                <div className="booking-location-card">
                  <div className="booking-location-header">
                    <i className="fas fa-map-pin"></i>
                    <span>Your Location</span>
                  </div>
                  {locationName && (
                    <div className="booking-location-name-display">
                      {locationName}
                    </div>
                  )}
                  <div className="booking-location-coords">
                    {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="booking-submit-btn" 
                disabled={loading || !userLocation}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Confirm Booking
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right: Map */}
          {userLocation && (
            <div className="booking-map-card">
              <div className="booking-card-header">
                <div className="booking-mechanic-header-info">
                  {mechanic.profile_picture ? (
                    <img 
                      src={mechanic.profile_picture} 
                      alt={mechanic.business_name || mechanic.name}
                      className="booking-header-mechanic-avatar"
                    />
                  ) : (
                    <div className="booking-header-mechanic-avatar-placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  )}
                  <div className="booking-header-mechanic-details">
                    <span className="booking-header-mechanic-name">
                      {mechanic.business_name || mechanic.name}
                    </span>
                    {distance !== null && (
                      <span className="booking-header-distance">
                        <i className="fas fa-route"></i>
                        {distance.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="booking-map-container">
                <EnhancedMapComponent
                  userLocation={userLocation}
                  mechanics={mechanicCurrentLocation ? [{
                    id: mechanic.id,
                    latitude: mechanicCurrentLocation.latitude,
                    longitude: mechanicCurrentLocation.longitude,
                    service_radius: mechanic.service_radius || 10,
                    business_name: mechanic.business_name,
                    name: mechanic.name,
                    rating: mechanic.rating,
                    is_online: mechanic.is_online,
                    is_available: mechanic.is_available,
                    is_verified: mechanic.is_verified,
                    profile_picture: mechanic.profile_picture || null
                  }] : []}
                  selectedMechanic={null}
                  showServiceRadius={true}
                  emergencyMode={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;
