import React, { useState, useEffect } from 'react';
import Customers from './components/Customers';
import WorkOrders from './components/WorkOrders';
import Invoices from './components/Invoices';

const API_BASE = 'http://localhost:3000/api';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stats, setStats] = useState({
    customerCount: 0,
    workOrderCount: 0,
    completedCount: 0,
    totalRevenue: 0
  });

  // On page load check if token exists and is still valid
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (user && currentPage === 'dashboard') {
      loadStats();
    }
  }, [user, currentPage]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [customersRes, workOrdersRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/customers`, { headers }),
        fetch(`${API_BASE}/work-orders`, { headers }),
        fetch(`${API_BASE}/invoices`, { headers }),
      ]);
      const [customersData, workOrdersData, invoicesData] = await Promise.all([
        customersRes.json(),
        workOrdersRes.json(),
        invoicesRes.json(),
      ]);
      const completed = (workOrdersData.workOrders || []).filter(wo => wo.status === 'completed').length;
      const revenue = (invoicesData.invoices || [])
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      setStats({
        customerCount: (customersData.customers || []).length,
        workOrderCount: (workOrdersData.workOrders || []).length,
        completedCount: completed,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Invalid email or password');
        return;
      }
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <p style={{ color: 'white', fontSize: '18px' }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0f172a', fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: '420px', padding: '0 20px' }}>
          {/* Logo area */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❄️</div>
            <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '0 0 8px', letterSpacing: '-0.5px' }}>HVAC Field OS</h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>Sign in to your account</p>
          </div>

          {/* Card */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '36px', border: '1px solid #334155' }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: '15px',
                    border: `2px solid ${error ? '#e11d48' : '#334155'}`,
                    borderRadius: '8px', boxSizing: 'border-box',
                    backgroundColor: '#0f172a', color: 'white', outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: '15px',
                    border: `2px solid ${error ? '#e11d48' : '#334155'}`,
                    borderRadius: '8px', boxSizing: 'border-box',
                    backgroundColor: '#0f172a', color: 'white', outline: 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 14px', marginBottom: '20px',
                  backgroundColor: '#fff1f2', color: '#e11d48',
                  borderRadius: '8px', fontSize: '14px', fontWeight: '500',
                  border: '1px solid #fecdd3',
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', fontSize: '15px', fontWeight: '700',
                  color: 'white', backgroundColor: loading ? '#334155' : '#2563eb',
                  border: 'none', borderRadius: '8px', cursor: loading ? 'default' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { page: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { page: 'customers', icon: '👥', label: 'Customers' },
    { page: 'workorders', icon: '📋', label: 'Work Orders' },
    { page: 'invoices', icon: '💰', label: 'Invoices' },
  ];

  const statCards = [
    { label: 'Customers', value: stats.customerCount, sub: 'Total customers', color: '#2563eb', icon: '👥', page: 'customers' },
    { label: 'Work Orders', value: stats.workOrderCount, sub: 'Total jobs', color: '#16a34a', icon: '📋', page: 'workorders' },
    { label: 'Completed', value: stats.completedCount, sub: 'Jobs finished', color: '#d97706', icon: '✅', page: 'workorders' },
    { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(0)}`, sub: 'Paid invoices', color: '#7c3aed', icon: '💰', page: 'invoices' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: '240px', backgroundColor: '#0f172a', color: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>❄️</div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>HVAC Field OS</h2>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(({ page, icon, label }) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                width: '100%', padding: '11px 14px', marginBottom: '4px',
                backgroundColor: currentPage === page ? '#1e40af' : 'transparent',
                color: currentPage === page ? 'white' : '#94a3b8',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                textAlign: 'left', fontSize: '14px', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.15s',
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>

        {/* User info at bottom */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.firstName} {user.lastName}</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '9px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, backgroundColor: '#f0f4f8', overflow: 'auto' }}>
        {currentPage === 'dashboard' && (
          <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#1a2332', letterSpacing: '-0.5px' }}>Dashboard</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Welcome back, {user.firstName}! Here's what's happening.</p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {statCards.map(({ label, value, sub, color, icon, page }) => (
                <div
                  key={label}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    backgroundColor: color, color: 'white', padding: '28px', borderRadius: '12px',
                    textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</h3>
                  <p style={{ fontSize: '42px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-1px' }}>{value}</p>
                  <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#1a2332' }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { label: '+ New Customer', page: 'customers', color: '#2563eb' },
                  { label: '+ New Work Order', page: 'workorders', color: '#16a34a' },
                  { label: '+ New Invoice', page: 'invoices', color: '#7c3aed' },
                ].map(({ label, page, color }) => (
                  <button
                    key={label}
                    onClick={() => setCurrentPage(page)}
                    style={{ padding: '10px 20px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={loadStats}
                  style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                >
                  🔄 Refresh Stats
                </button>
              </div>
            </div>
          </div>
        )}
        {currentPage === 'customers' && <Customers />}
        {currentPage === 'workorders' && <WorkOrders />}
        {currentPage === 'invoices' && <Invoices />}
      </div>
    </div>
  );
}

export default App;
