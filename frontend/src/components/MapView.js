import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_BASE = process.env.REACT_APP_API_URL || 'https://hvacfieldos-production.up.railway.app/api';

const STATUS_COLORS = {
  scheduled: '#2563eb',
  in_progress: '#d97706',
  completed: '#16a34a',
  cancelled: '#64748b',
};

const createColoredIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

function MapView() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [geocoded, setGeocoded] = useState([]);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => { loadWorkOrders(); }, []);

  const loadWorkOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/work-orders`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const orders = data.workOrders || [];
      setWorkOrders(orders);
      await geocodeAddresses(orders);
    } catch (err) {
      console.error('Map load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddresses = async (orders) => {
    setGeocoding(true);
    const results = [];
    for (const wo of orders) {
      const address = wo.address || wo.customerAddress;
      if (!address) continue;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await res.json();
        if (data.length > 0) {
          results.push({ ...wo, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('Geocode error:', err);
      }
    }
    setGeocoded(results);
    setGeocoding(false);
  };

  const filtered = filter === 'all' ? geocoded : geocoded.filter(wo => wo.status === filter);
  const positions = filtered.map(wo => [wo.lat, wo.lng]);
  const counts = {
    all: geocoded.length,
    scheduled: geocoded.filter(wo => wo.status === 'scheduled').length,
    in_progress: geocoded.filter(wo => wo.status === 'in_progress').length,
    completed: geocoded.filter(wo => wo.status === 'completed').length,
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'Segoe UI, sans-serif' }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#1a2332' }}>Job Map</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
            {geocoding ? 'Loading job locations...' : `${geocoded.length} of ${workOrders.length} jobs mapped`}
          </p>
        </div>
        <button onClick={loadWorkOrders}
          style={{ padding: '10px 18px', backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { val: 'all', label: 'All Jobs', color: '#1a2332' },
          { val: 'scheduled', label: 'Scheduled', color: '#2563eb' },
          { val: 'in_progress', label: 'In Progress', color: '#d97706' },
          { val: 'completed', label: 'Completed', color: '#16a34a' },
        ].map(({ val, label, color }) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: '2px solid',
              cursor: 'pointer', fontWeight: '600', fontSize: '13px',
              backgroundColor: filter === val ? color : 'white',
              color: filter === val ? 'white' : '#64748b',
              borderColor: filter === val ? color : '#e2e8f0',
            }}>
            {label} ({counts[val] || 0})
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            {status.replace('_', ' ')}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ height: '500px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b' }}>Loading map...</p>
        </div>
      ) : workOrders.length === 0 ? (
        <div style={{ height: '500px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '48px' }}>Map</div>
          <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>No work orders yet</p>
        </div>
      ) : geocoded.length === 0 && !geocoding ? (
        <div style={{ height: '500px', backgroundColor: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexDirection: 'column', gap: '12px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>Pin</div>
          <p style={{ color: '#1a2332', fontSize: '16px', fontWeight: '700', margin: 0 }}>No addresses found</p>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Make sure your customers have addresses saved to see them on the map.</p>
        </div>
      ) : (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '520px' }}>
          <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="OpenStreetMap contributors"
            />
            {positions.length > 0 && <FitBounds positions={positions} />}
            {filtered.map(wo => (
              <Marker key={wo.id} position={[wo.lat, wo.lng]} icon={createColoredIcon(STATUS_COLORS[wo.status] || '#64748b')}>
                <Popup>
                  <div style={{ minWidth: '180px', fontFamily: 'Segoe UI, sans-serif' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '14px', color: '#1a2332' }}>{wo.jobType}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#475569' }}>{wo.firstName} {wo.lastName}</p>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>{wo.address || wo.customerAddress}</p>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'white', backgroundColor: STATUS_COLORS[wo.status] || '#64748b' }}>
                      {wo.status.replace('_', ' ')}
                    </span>
                    {wo.scheduledDate && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
                        {new Date(wo.scheduledDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {geocoding && (
        <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '13px', color: '#2563eb' }}>
          Mapping job addresses... this may take a moment
        </div>
      )}
    </div>
  );
}

export default MapView;
