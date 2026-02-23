import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

function SuperAdmin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('superAdminToken') || '');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');

  useEffect(() => {
    if (token) { setAuthed(true); loadStats(); }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/super-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      localStorage.setItem('superAdminToken', data.token);
      setToken(data.token);
      setAuthed(true);
      loadStats(data.token);
    } catch (err) {
      setError('Cannot connect to server');
    }
  };

  const loadStats = async (t) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/super-admin/stats`, {
        headers: { 'Authorization': `Bearer ${t || token}` }
      });
      if (res.status === 401) { setAuthed(false); localStorage.removeItem('superAdminToken'); return; }
      const data = await res.json();
      setStats(data.stats);
      setCompanies(data.companies);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    setAuthed(false);
    setToken('');
    setStats(null);
    setCompanies([]);
  };

  const filtered = companies.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase());
    const matchIndustry = filterIndustry === 'all' || c.industry === filterIndustry;
    return matchSearch && matchIndustry;
  });

  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];

  const S = {
    page: { minHeight: '100vh', backgroundColor: '#04081a', color: 'white', fontFamily: 'Segoe UI, sans-serif' },
    header: { backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(6,182,212,0.2)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { fontSize: '22px', fontWeight: '800', color: 'white' },
    logoAccent: { color: '#06b6d4' },
    badge: { backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
    body: { padding: '32px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
    statCard: { backgroundColor: '#0a0f2c', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '12px', padding: '24px' },
    statNum: { fontSize: '36px', fontWeight: '800', color: '#06b6d4', marginBottom: '4px' },
    statLabel: { fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' },
    filters: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    input: { padding: '10px 14px', backgroundColor: '#0a0f2c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#0a0f2c', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(6,182,212,0.15)' },
    th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '14px 16px', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    logoutBtn: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  };

  if (!authed) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Helix<span style={{ color: '#06b6d4' }}>8</span></div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Super Admin — Octave Labs</div>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter super admin password"
              style={{ ...S.input, width: '100%', marginBottom: '12px', boxSizing: 'border-box', padding: '14px' }}
              required
            />
            {error && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#06b6d4', color: '#04081a', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>Helix<span style={S.logoAccent}>8</span> <span style={{ fontSize: '14px', fontWeight: '400', color: '#64748b' }}>Super Admin</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={S.badge}>Octave Labs</span>
          <button style={S.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={S.body}>
        {loading && <p style={{ color: '#64748b' }}>Loading...</p>}

        {stats && (
          <div style={S.statsGrid}>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.totalCompanies}</div>
              <div style={S.statLabel}>Total Companies</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.totalUsers}</div>
              <div style={S.statLabel}>Total Users</div>
            </div>
            <div style={S.statCard}>
              <div style={{ ...S.statNum, color: '#22c55e' }}>${parseFloat(stats.totalRevenue).toFixed(2)}</div>
              <div style={S.statLabel}>Total Revenue Processed</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.activeToday}</div>
              <div style={S.statLabel}>Active Today</div>
            </div>
          </div>
        )}

        <div style={S.filters}>
          <input style={{ ...S.input, minWidth: '260px' }} placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={S.input} value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
            <option value="all">All Industries</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={() => loadStats()} style={{ ...S.input, cursor: 'pointer', color: '#06b6d4', borderColor: 'rgba(6,182,212,0.3)' }}>↻ Refresh</button>
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Company</th>
              <th style={S.th}>Industry</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Size</th>
              <th style={S.th}>Users</th>
              <th style={S.th}>Customers</th>
              <th style={S.th}>Work Orders</th>
              <th style={S.th}>Revenue</th>
              <th style={S.th}>Signed Up</th>
              <th style={S.th}>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ ...S.td, textAlign: 'center', color: '#64748b', padding: '40px' }}>No companies yet</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} style={{ transition: 'background 0.2s' }}>
                <td style={S.td}>
                  <div style={{ fontWeight: '600', color: 'white' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{c.email}</div>
                </td>
                <td style={S.td}><span style={{ color: '#06b6d4' }}>{c.industry || '—'}</span></td>
                <td style={S.td}>{c.city && c.state ? `${c.city}, ${c.state}` : c.city || c.state || '—'}</td>
                <td style={S.td}>{c.employeeCount || '—'}</td>
                <td style={S.td}><span style={{ fontWeight: '700' }}>{c.userCount}</span></td>
                <td style={S.td}>{c.customerCount}</td>
                <td style={S.td}>{c.workOrderCount}</td>
                <td style={S.td}><span style={{ color: '#22c55e', fontWeight: '700' }}>${parseFloat(c.totalRevenue).toFixed(2)}</span></td>
                <td style={S.td}><span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(c.createdAt).toLocaleDateString()}</span></td>
                <td style={S.td}><span style={{ fontSize: '12px', color: '#94a3b8' }}>{c.referralSource || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SuperAdmin;
