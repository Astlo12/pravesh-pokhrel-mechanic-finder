import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './css/EnhancedMapComponent.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color, icon) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
      <i class="fas ${icon}"></i>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Create icon with profile picture
const createProfileIcon = (profilePicture, name, isOnline = true) => {
  return L.divIcon({
    className: 'profile-marker',
    html: `<div style="
      width: 40px; 
      height: 40px; 
      border-radius: 50%; 
      border: 3px solid ${isOnline ? '#28a745' : '#dc3545'}; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.4); 
      overflow: hidden;
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${profilePicture 
        ? `<img src="${profilePicture}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<div style="color: white; font-size: 18px; font-weight: bold;">${name ? name.charAt(0).toUpperCase() : 'M'}</div>`
      }
      ${isOnline ? '<div style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #28a745; border: 2px solid white; border-radius: 50%;"></div>' : ''}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const userIcon = createCustomIcon('#dc143c', 'fa-user');
const mechanicIcon = createCustomIcon('#28a745', 'fa-wrench');
const emergencyIcon = createCustomIcon('#ff4444', 'fa-exclamation-triangle');

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  
  return null;
};

const EnhancedMapComponent = ({ 
  userLocation, 
  mechanics = [], 
  selectedMechanic = null,
  showServiceRadius = true,
  emergencyMode = false,
  searchRadius = null, // Customer's chosen search radius in km
  showSearchRadius = false // Whether to show the search radius effect
}) => {
  if (!userLocation) {
    return <div className="enhancedmap-placeholder">Loading map...</div>;
  }

  const center = [userLocation.latitude, userLocation.longitude];
  
  // Create bounds to include all mechanics and user location
  let bounds = null;
  if (mechanics.length > 0) {
    const allPoints = [
      [userLocation.latitude, userLocation.longitude],
      ...mechanics
        .filter(m => m.latitude && m.longitude)
        .map(m => [m.latitude, m.longitude])
    ];
    bounds = L.latLngBounds(allPoints);
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      bounds={bounds}
      boundsOptions={{ padding: [50, 50] }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} />
      
      {/* Search radius circle - shows customer's chosen search radius */}
      {showSearchRadius && searchRadius && userLocation && (
        <Circle
          center={[userLocation.latitude, userLocation.longitude]}
          radius={searchRadius * 1000} // Convert km to meters
          pathOptions={{
            color: '#dc143c',
            fillColor: '#dc143c',
            fillOpacity: 0.2,
            weight: 3,
            dashArray: '15, 10',
            className: 'search-radius-circle-pulse'
          }}
        />
      )}
      
      {/* User location marker */}
      <Marker 
        position={[userLocation.latitude, userLocation.longitude]}
        icon={emergencyMode ? emergencyIcon : userIcon}
      >
        <Popup>
          <strong>{emergencyMode ? '🚨 Emergency Location' : '📍 Your Location'}</strong>
          {showSearchRadius && searchRadius && (
            <>
              <br />
              <span style={{ color: '#dc143c', fontSize: '12px' }}>
                🔍 Searching within {searchRadius} km radius
              </span>
            </>
          )}
        </Popup>
      </Marker>
      
      {/* Mechanics markers */}
      {mechanics.map((mechanic, index) => {
        if (!mechanic.latitude || !mechanic.longitude) return null;
        
        const isSelected = selectedMechanic && selectedMechanic.id === mechanic.id;
        
        return (
          <React.Fragment key={mechanic.id || index}>
            {/* Line connecting customer to mechanic */}
            {userLocation && (
              <Polyline
                positions={[
                  [userLocation.latitude, userLocation.longitude],
                  [mechanic.latitude, mechanic.longitude]
                ]}
                pathOptions={{
                  color: isSelected ? '#000000' : '#000000',
                  weight: isSelected ? 4 : 3,
                  opacity: isSelected ? 0.8 : 0.6,
                  dashArray: isSelected ? '10, 5' : '5, 5',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            )}
            
            {/* Service radius circle */}
            {showServiceRadius && mechanic.service_radius && (
              <Circle
                center={[mechanic.latitude, mechanic.longitude]}
                radius={mechanic.service_radius * 1000} // Convert km to meters
                pathOptions={{
                  color: isSelected ? '#dc143c' : '#28a745',
                  fillColor: isSelected ? '#dc143c' : '#28a745',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: isSelected ? '10, 5' : '5, 5'
                }}
              />
            )}
            
            {/* Mechanic marker */}
            <Marker 
              position={[mechanic.latitude, mechanic.longitude]}
              icon={mechanic.profile_picture 
                ? createProfileIcon(mechanic.profile_picture, mechanic.business_name || mechanic.name, mechanic.is_online)
                : mechanicIcon
              }
            >
              <Popup>
                <div style={{ minWidth: '200px', textAlign: 'center' }}>
                  {mechanic.profile_picture && (
                    <img 
                      src={mechanic.profile_picture} 
                      alt={mechanic.business_name || mechanic.name}
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        marginBottom: '8px',
                        display: 'block',
                        margin: '0 auto 8px'
                      }}
                    />
                  )}
                  <strong>{mechanic.business_name || mechanic.name}</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    ⭐ {mechanic.rating ? parseFloat(mechanic.rating).toFixed(1) : 'N/A'}
                  </span>
                  {mechanic.distance && (
                    <>
                      <br />
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        📍 {mechanic.distance.toFixed(2)} km away
                      </span>
                    </>
                  )}
                  {mechanic.service_radius && (
                    <>
                      <br />
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        🔵 Service radius: {mechanic.service_radius} km
                      </span>
                    </>
                  )}
                  <br />
                  <span className={mechanic.is_online ? 'status-online' : 'status-offline'}>
                    {mechanic.is_online ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default EnhancedMapComponent;

