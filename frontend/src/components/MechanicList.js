import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNearbyMechanics, searchMechanicsEmergency } from '../services/api';
import { reverseGeocode } from '../utils/geocoding';
import EnhancedMapComponent from './EnhancedMapComponent';
import './css/MechanicList.css';

const MechanicList = () => {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    vehicle_type: '',
    vehicle_brand: ''
  });
  const [userLocation, setUserLocation] = useState(null);
  const [searchLocation, setSearchLocation] = useState(null); // For travel to new locations
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [radius, setRadius] = useState(10);
  const [locationError, setLocationError] = useState(false);
  const [locationName, setLocationName] = useState(null);
  const [showSearchRadiusEffect, setShowSearchRadiusEffect] = useState(false);

  useEffect(() => {
    // Automatically get user's location when component loads
    if (navigator.geolocation) {
      setLoading(true);
      setError('');
      
      // Try to get high accuracy location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          setSearchLocation(location); // Automatically use current location
          setLocationError(false);
          console.log('Location detected:', location);
          
          // Get location name via reverse geocoding
          reverseGeocode(location.latitude, location.longitude).then(name => {
            if (name) {
              setLocationName(name);
            }
          });
        },
        (err) => {
          console.error('Error getting location:', err);
          setLocationError(true);
          setError('Unable to get your location automatically. Please enable location services in your browser settings.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      // Watch position for updates (optional - updates location as user moves)
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          // Only update if location changed significantly (more than 100m)
          if (searchLocation) {
            const distance = calculateDistance(
              searchLocation.latitude,
              searchLocation.longitude,
              location.latitude,
              location.longitude
            );
            if (distance > 0.1) { // More than 100 meters
              setUserLocation(location);
              setSearchLocation(location);
              // Update location name when location changes significantly
              reverseGeocode(location.latitude, location.longitude).then(name => {
                if (name) {
                  setLocationName(name);
                }
              });
            }
          } else {
            setUserLocation(location);
            setSearchLocation(location);
            // Get location name for new location
            reverseGeocode(location.latitude, location.longitude).then(name => {
              if (name) {
                setLocationName(name);
              }
            });
          }
        },
        (err) => {
          // Silent fail for watch position
          console.error('Watch position error:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Accept cached position up to 1 minute old
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      setLocationError(true);
      setError('Geolocation is not supported by your browser. Please use a browser that supports location services.');
      setLoading(false);
    }
  }, []);

  // Helper function to calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (searchLocation) {
      fetchMechanics();
    }
  }, [searchLocation, filters, emergencyMode]);

  // Show search radius effect when radius changes
  useEffect(() => {
    if (searchLocation && radius) {
      // Show the search radius effect for 3 seconds
      setShowSearchRadiusEffect(true);
      const timer = setTimeout(() => {
        setShowSearchRadiusEffect(false);
      }, 3000);

      // Fetch mechanics immediately (the effect will show while searching)
      fetchMechanics();

      return () => {
        clearTimeout(timer);
      };
    }
  }, [radius]); // Only trigger when radius changes

  const fetchMechanics = async () => {
    if (!searchLocation) return;

    setLoading(true);
    try {
      const params = {
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        // In emergency mode, don't send radius - backend will return all active mechanics
        ...(emergencyMode ? {} : { radius: radius }),
        emergency: emergencyMode,
        ...filters
      };

      const response = emergencyMode 
        ? await searchMechanicsEmergency(params)
        : await getNearbyMechanics(params);
      
      setMechanics(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load mechanics. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      setError('');
      setLocationError(false);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          setSearchLocation(location);
          setLocationError(false);
          setLoading(false);
          
          // Get location name via reverse geocoding
          reverseGeocode(location.latitude, location.longitude).then(name => {
            if (name) {
              setLocationName(name);
            }
          });
        },
        (err) => {
          setLocationError(true);
          setError('Unable to get your current location. Please enable location services in your browser settings.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  const toggleEmergencyMode = () => {
    setEmergencyMode(!emergencyMode);
    if (!emergencyMode) {
      setRadius(25); // Increase radius for emergency
    } else {
      setRadius(10); // Reset to default
    }
  };

  if (loading && !searchLocation) {
    return (
      <div className="mechaniclist-initial-loading">
        <div className="mechaniclist-loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>Detecting your location...</p>
        <p className="mechaniclist-loading-hint">Please allow location access when prompted</p>
      </div>
    );
  }

  return (
    <div className="mechaniclist-container">
      <div className="mechaniclist-header">
        <div className="mechaniclist-title-section">
          <h1>
            {emergencyMode ? '🚨 Emergency Mechanic Search' : 'Find Nearby Mechanics'}
          </h1>
          <button 
            className={`mechaniclist-emergency-btn ${emergencyMode ? 'active' : ''}`}
            onClick={toggleEmergencyMode}
          >
            <i className="fas fa-exclamation-triangle"></i>
            {emergencyMode ? 'Exit Emergency Mode' : 'Emergency Search'}
          </button>
        </div>
        <p className="mechaniclist-verified-hint">
          <i className="fas fa-check-circle" aria-hidden />
          Only <strong>admin-verified</strong> mechanics are shown here.
        </p>
        
        <div className="mechaniclist-controls">
          <div className="mechaniclist-filters">
            <select
              name="vehicle_type"
              value={filters.vehicle_type}
              onChange={handleFilterChange}
              className="mechaniclist-filter-select"
            >
              <option value="">All Vehicle Types</option>
              <option value="bike">Bike</option>
              <option value="car">Car</option>
            </select>
            <input
              type="text"
              name="vehicle_brand"
              placeholder="Brand (e.g., Honda, Toyota)"
              value={filters.vehicle_brand}
              onChange={handleFilterChange}
              className="mechaniclist-filter-input"
            />
            <select
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="mechaniclist-filter-select"
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="15">15 km</option>
              <option value="20">20 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
            </select>
          </div>

          {locationError && (
            <div className="mechaniclist-location-controls">
              <div className="mechaniclist-location-section">
                <h3>📍 Location Required</h3>
                {!searchLocation ? (
                  <div className="mechaniclist-location-options">
                    <button 
                      onClick={handleUseCurrentLocation}
                      className="mechaniclist-location-btn"
                    >
                      <i className="fas fa-crosshairs"></i> Try Current Location Again
                    </button>
                    <p className="mechaniclist-location-help">
                      Please enable location services in your browser settings to find nearby mechanics.
                    </p>
                  </div>
                ) : (
                  <div className="mechaniclist-location-info">
                    <p className="mechaniclist-current-location">
                      <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
                      Location detected: {searchLocation.latitude.toFixed(4)}, {searchLocation.longitude.toFixed(4)}
                    </p>
                    {locationName && (
                      <p className="mechaniclist-location-name">
                        <i className="fas fa-map-marker-alt"></i>
                        You are currently in: <strong>{locationName}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!locationError && searchLocation && (
            <div className="mechaniclist-location-status">
              <p className="mechaniclist-current-location">
                <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
                Location detected: {searchLocation.latitude.toFixed(4)}, {searchLocation.longitude.toFixed(4)}
              </p>
              {locationName && (
                <p className="mechaniclist-location-name">
                  <i className="fas fa-map-marker-alt"></i>
                  You are currently in: <strong>{locationName}</strong>
                </p>
              )}
              <button 
                onClick={handleUseCurrentLocation}
                className="mechaniclist-refresh-location-btn"
              >
                <i className="fas fa-sync-alt"></i> Refresh Location
              </button>
            </div>
          )}

          <button 
            onClick={() => setShowMap(!showMap)}
            className="mechaniclist-toggle-map-btn"
          >
            <i className={`fas ${showMap ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
        </div>
      </div>

      {error && <div className="mechaniclist-error-message">{error}</div>}

      <div className="mechaniclist-content">
        {showMap && searchLocation && (
          <div className="mechaniclist-map-section">
            {showSearchRadiusEffect && !emergencyMode && (
              <div className="mechaniclist-search-indicator">
                <i className="fas fa-search-location fa-spin"></i>
                <span>Searching within {radius} km radius...</span>
              </div>
            )}
            {emergencyMode && (
              <div className="mechaniclist-emergency-indicator">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Emergency Mode: Showing all active mechanics</span>
              </div>
            )}
            <EnhancedMapComponent
              userLocation={searchLocation}
              mechanics={mechanics}
              selectedMechanic={selectedMechanic}
              showServiceRadius={true}
              emergencyMode={emergencyMode}
              searchRadius={emergencyMode ? null : radius} // Don't show search radius circle in emergency mode
              showSearchRadius={showSearchRadiusEffect && !emergencyMode} // Only show radius effect in normal mode
            />
          </div>
        )}

        <div className="mechaniclist-results-section">
          {loading ? (
            <div className="mechaniclist-loading">Loading mechanics...</div>
          ) : mechanics.length === 0 ? (
            <div className="mechaniclist-no-mechanics">
              <i className="fas fa-search"></i>
              <p>No mechanics found nearby.</p>
              <p>Try adjusting your filters, increasing search radius, or searching in a different location.</p>
            </div>
          ) : (
            <>
              <div className="mechaniclist-results-header">
                <h2>Found {mechanics.length} mechanic{mechanics.length !== 1 ? 's' : ''}</h2>
                {emergencyMode && (
                  <div className="mechaniclist-emergency-notice">
                    <i className="fas fa-exclamation-triangle"></i>
                    Emergency mode: Showing all active mechanics.
                  </div>
                )}
              </div>
              <div className="mechaniclist-grid">
                {mechanics.map((mechanic) => (
                  <div 
                    key={mechanic.id} 
                    className={`mechaniclist-card ${selectedMechanic?.id === mechanic.id ? 'selected' : ''}`}
                    onMouseEnter={() => setSelectedMechanic(mechanic)}
                    onMouseLeave={() => setSelectedMechanic(null)}
                  >
                    <div className="mechaniclist-card-header">
                      {mechanic.profile_picture && (
                        <img 
                          src={mechanic.profile_picture} 
                          alt={mechanic.business_name || mechanic.name}
                          className="mechaniclist-card-avatar"
                        />
                      )}
                      <h3>{mechanic.business_name || mechanic.name}</h3>
                      {mechanic.is_verified && (
                        <span className="mechaniclist-verified-badge">
                          <i className="fas fa-check-circle"></i> Verified
                        </span>
                      )}
                      <div className="mechaniclist-rating">
                        <i className="fas fa-star"></i> {mechanic.rating ? parseFloat(mechanic.rating).toFixed(1) : 'N/A'}
                        <span className="mechaniclist-review-count">({mechanic.total_reviews || 0} reviews)</span>
                      </div>
                    </div>
                    <div className="mechaniclist-card-info">
                      <p>
                        <i className="fas fa-map-marker-alt"></i>
                        <strong>Distance:</strong> {mechanic.distance ? mechanic.distance.toFixed(2) : 'N/A'} km
                      </p>
                      {mechanic.service_radius && (
                        <p>
                          <i className="fas fa-circle"></i>
                          <strong>Service Radius:</strong> {mechanic.service_radius} km
                        </p>
                      )}
                      <p>
                        <i className="fas fa-users"></i>
                        <strong>Customers served:</strong> {mechanic.total_customers || 0}
                      </p>
                      <p>
                        <strong>Status:</strong> 
                        <span className={mechanic.is_online ? 'mechaniclist-status-online' : 'mechaniclist-status-offline'}>
                          {mechanic.is_online ? ' 🟢 Online' : ' 🔴 Offline'}
                        </span>
                        {mechanic.is_available && mechanic.is_online && (
                          <span className="mechaniclist-available-badge">Available</span>
                        )}
                      </p>
                    </div>
                    {mechanic.vehicle_capabilities && mechanic.vehicle_capabilities.length > 0 && (
                      <div className="mechaniclist-vehicle-capabilities">
                        <strong>Capable of repairing:</strong>
                        <div className="mechaniclist-capability-tags">
                          {mechanic.vehicle_capabilities.map((cap, idx) => (
                            <span key={idx} className="mechaniclist-capability-tag">
                              {cap.brand_name || cap.brand} ({cap.type_name || cap.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <Link 
                      to={`/mechanic/${mechanic.id}`} 
                      className="mechaniclist-btn-view-profile"
                    >
                      View Profile
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicList;

