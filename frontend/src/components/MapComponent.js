import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  
  return null;
};

const MapComponent = ({ userLocation, mechanicLocation }) => {
  if (!userLocation) {
    return <div className="map-placeholder">Loading map...</div>;
  }

  const center = [userLocation.latitude, userLocation.longitude];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} />
      
      {/* User location marker */}
      <Marker position={[userLocation.latitude, userLocation.longitude]}>
        <Popup>Your Location</Popup>
      </Marker>
      
      {/* Mechanic location marker */}
      {mechanicLocation && (
        <Marker position={[mechanicLocation.latitude, mechanicLocation.longitude]}>
          <Popup>Mechanic Location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapComponent;

