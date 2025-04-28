// src/components/MapComponent.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { searchLocations, getRoute } from './utils/api';

// Fix for default marker icon issue in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = ({ 
  searchQuery = '', 
  origin = null, 
  destination = null,
  center = [51.505, -0.09], 
  zoom = 13 
}) => {
  const [locations, setLocations] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search locations when searchQuery changes
  useEffect(() => {
    if (searchQuery) {
      setLoading(true);
      searchLocations(searchQuery)
        .then(data => {
          setLocations(data.locations || []);
          setError(null);
        })
        .catch(err => {
          setError(err.message);
          setLocations([]);
        })
        .finally(() => setLoading(false));
    }
  }, [searchQuery]);

  // Get route when origin and destination change
  useEffect(() => {
    if (origin && destination) {
      setLoading(true);
      getRoute(origin, destination)
        .then(data => {
          setRoute(data);
          setError(null);
        })
        .catch(err => {
          setError(err.message);
          setRoute(null);
        })
        .finally(() => setLoading(false));
    }
  }, [origin, destination]);

  if (loading) {
    return <div>Loading map data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {locations.map((location, index) => (
          <Marker 
            key={index} 
            position={[location.position.lat, location.position.lng]}
          >
            <Popup>
              <div>
                <h3>{location.name}</h3>
                <p>{location.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {route && Array.isArray(route.polyline) && (
          <Polyline
            positions={route.polyline}
            color="blue"
            weight={3}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;