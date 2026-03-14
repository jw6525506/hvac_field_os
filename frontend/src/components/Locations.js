import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'https://hvacfieldos-production.up.railway.app';

export default function Locations({ token, user }) {
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', address:'', city:'', state:'', zip:'', phone:'', email:'', managerName:'' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/locations`, { headers });
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch(e) { setLocations([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm({ name:'', address:'', city:'', state:'', zip:'', phone:'', email:'', managerName:'' }); setEditing(null); setShowForm(false); };

  const submit = async () => {
    if (!form.name.trim()) return alert('Location name is required');
    try {
      const url = editing ? `${API}/api/locations/${editing.id}` : `${API}/api/locations`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Failed');
      reset(); load();
    } catch(e) { alert('Error saving location'); }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this location?')) return;
    await fetch(`${API}/api/locations/${id}`, { method: 'DELETE', headers });
    load();
  };

  const startEdit = (loc) => {
    setForm({ name: loc.name, address: loc.address||'', city: loc.city||'', state: loc.state||'', zip: loc.zip||'', phone: loc.phone||'', email: loc.email||'', managerName: loc.managerName||'' });
    setEditing(loc);
    setShowForm(true);
  };

  const S = {
    container: { padding: '16px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', color: '#f1f5f9' },
    card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    btn: (c='#06b6d4') => ({ padding: '8px 16px', background: c, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }),
    input: { width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
    statBox: (c) => ({ background: c, borderRadius: '8px', padding: '10px 14px', textAlign: 'center' }),
  };

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🏢 Locations</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Manage your business locations and branches</p>
        </div>
        {user?.role === 'admin' && <button style={S.btn()} onClick={() => { reset(); setShowForm(true); }}>+ Add Location</button>}
      </div>

      {showForm && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{editing ? 'Edit Location' : 'Add New Location'}</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>Location Name *</label>
            <input style={S.input} placeholder="e.g. Atlanta Branch, North Location" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div style={{ ...S.grid2, marginBottom: '12px' }}>
            <div>
              <label style={S.label}>Manager Name</label>
              <input style={S.input} placeholder="Branch manager" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} />
            </div>
            <div>
              <label style={S.label}>Phone</label>
              <input style={S.input} placeholder="(404) 555-0100" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>Address</label>
            <input style={S.input} placeholder="Street address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
          <div style={{ ...S.grid3, marginBottom: '12px' }}>
            <div>
              <label style={S.label}>City</label>
              <input style={S.input} placeholder="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <label style={S.label}>State</label>
              <input style={S.input} placeholder="GA" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
            </div>
            <div>
              <label style={S.label}>ZIP</label>
              <input style={S.input} placeholder="30301" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={S.label}>Location Email</label>
            <input style={S.input} placeholder="atlanta@yourcompany.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={S.btn()} onClick={submit}>{editing ? 'Save Changes' : 'Add Location'}</button>
            <button style={S.btn('#475569')} onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</p> : (
        <>
          {locations.length === 0 ? (
            <div style={{ ...S.card, textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ margin: '0 0 8px', color: '#f1f5f9' }}>No locations yet</h3>
              <p style={{ color: '#64748b', margin: '0 0 20px' }}>Add your first location to start managing multiple branches</p>
              <button style={S.btn()} onClick={() => { reset(); setShowForm(true); }}>+ Add First Location</button>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={S.statBox('#0f172a')}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#06b6d4' }}>{locations.length}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Locations</div>
                </div>
                <div style={S.statBox('#0f172a')}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#34d399' }}>{locations.reduce((s,l) => s + parseInt(l.user_count||0), 0)}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Staff</div>
                </div>
                <div style={S.statBox('#0f172a')}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{locations.reduce((s,l) => s + parseInt(l.job_count||0), 0)}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Jobs</div>
                </div>
              </div>

              {locations.map(loc => (
                <div key={loc.id} style={{ ...S.card, opacity: loc.active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{loc.name}</h3>
                        <span style={{ background: loc.active ? '#064e3b' : '#374151', color: loc.active ? '#34d399' : '#9ca3af', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                          {loc.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      {loc.managerName && <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94a3b8' }}>👤 Manager: {loc.managerName}</p>}
                      {(loc.address || loc.city) && <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94a3b8' }}>📍 {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}</p>}
                      {loc.phone && <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94a3b8' }}>📞 {loc.phone}</p>}
                      {loc.email && <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>✉️ {loc.email}</p>}
                    </div>
                    {user?.role === 'admin' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={S.btn('#334155')} onClick={() => startEdit(loc)}>Edit</button>
                        <button style={S.btn('#dc2626')} onClick={() => deactivate(loc.id)}>Deactivate</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={S.statBox('#0f172a')}>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#60a5fa' }}>{loc.user_count || 0}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Staff Members</div>
                    </div>
                    <div style={S.statBox('#0f172a')}>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>{loc.job_count || 0}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Total Jobs</div>
                    </div>
                    <div style={S.statBox('#0f172a')}>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399' }}>
                        {new Date(loc.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Since</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
