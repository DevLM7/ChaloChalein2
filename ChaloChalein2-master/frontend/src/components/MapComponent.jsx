import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoute } from '../utils/api';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapComponent = ({ origin, destination, onRouteCalculated }) => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const calculateRoute = async () => {
      if (!origin || !destination) return;

      try {
        setLoading(true);
        setError(null);

        const routeData = await getRoute(origin, destination);
        console.log('Route data:', routeData);

        if (routeData && routeData.waypoints) {
          const coordinates = routeData.waypoints.map(point => [point.lat, point.lng]);
          setRoute(coordinates);
          onRouteCalculated?.(routeData);
        }
      } catch (err) {
        console.error('Error calculating route:', err);
        setError('Could not calculate route');
      } finally {
        setLoading(false);
      }
    };

    calculateRoute();
  }, [origin, destination, onRouteCalculated]);

  if (!origin || !destination) {
    return (
      <div className="map-container">
        <p>Please select origin and destination points</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      {loading && <p>Calculating route...</p>}
      {error && <p className="error">{error}</p>}
      
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <Marker position={[origin.lat, origin.lng]}>
          <Popup>Origin</Popup>
        </Marker>
        
        <Marker position={[destination.lat, destination.lng]}>
          <Popup>Destination</Popup>
        </Marker>
        
        {route && (
          <Polyline
            positions={route}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent; 