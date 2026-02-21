import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Customers from './components/Customers';
import WorkOrders from './components/WorkOrders';
import Invoices from './components/Invoices';
import Billing from './components/Billing';
import Signup from './components/Signup';
import Users from './components/Users';
import BottomNav from './components/BottomNav';

const API_BASE = 'http://localhost:3000/api';

if (!document.getElementById('mobile-styles')) {
  const s = document.createElement('style');
  s.id = 'mobile-styles';
  s.innerHTML = `
    @media (max-width: 768px) {
      .sidebar-desktop { display: none !important; }
      .bottom-nav { display: grid !important; }
      .main-content { padding-bottom: 70px !important; }
      .grid-4 { grid-template-columns: 1fr 1fr !important; }
      .grid-3 { grid-template-columns: 1fr !important; }
      .grid-2 { grid-template-columns: 1fr !important; }
      .grid-charts { grid-template-columns: 1fr !important; }
      .page-pad { padding: 16px !important; }
    }
    @media (max-width: 480px) {
      .grid-4 { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(s);
}

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [dashData, setDashData] = useState({
    customerCount: 0, workOrderCount: 0, completedCount: 0,
    inProgressCount: 0, scheduledCount: 0, totalRevenue: 0,
    outstandingRevenue: 0, recentWorkOrders: [], recentCustomers: [],
    monthlyRevenue: [], jobTypeBreakdown: [],
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCompany = localStorage.getItem('company');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedCompany) setCompany(JSON.parse(savedCompany));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
      }
    }
    // Check for password reset token in URL
    const params = new URLSearchParams(window.location.search);
    const resetT = params.get('reset');
    if (resetT) {
      setResetToken(resetT);
      setShowReset(true);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (user && currentPage === 'dashboard') loadDashboard();
    if (user) loadBillingStatus();
  }, [user, currentPage]);

  const loadBillingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setBillingStatus(data);
    } catch (err) {
      console.error('Billing status error:', err);
    }
  };

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [cRes, woRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/customers`, { headers }),
        fetch(`${API_BASE}/work-orders`, { headers }),
        fetch(`${API_BASE}/invoices`, { headers }),
      ]);
      const [cData, woData, invData] = await Promise.all([cRes.json(), woRes.json(), invRes.json()]);
      const customers = cData.customers || [];
      const workOrders = woData.workOrders || [];
      const invoices = invData.invoices || [];
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      const outstandingRevenue = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      const now = new Date();
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const monthRevenue = paidInvoices
          .filter(inv => { const id = new Date(inv.createdAt); return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear(); })
          .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
        monthlyRevenue.push({ month: monthName, revenue: parseFloat(monthRevenue.toFixed(2)) });
      }
      const jobTypes = {};
      workOrders.forEach(wo => { const t = wo.jobType || 'other'; jobTypes[t] = (jobTypes[t] || 0) + 1; });
      const jobTypeBreakdown = Object.entries(jobTypes).map(([name, value]) => ({ name, value }));
      setDashData({
        customerCount: customers.length, workOrderCount: workOrders.length,
        completedCount: workOrders.filter(wo => wo.status === 'completed').length,
        inProgressCount: workOrders.filter(wo => wo.status === 'in_progress').length,
        scheduledCount: workOrders.filter(wo => wo.status === 'scheduled').length,
        totalRevenue, outstandingRevenue,
        recentWorkOrders: workOrders.slice(0, 5),
        recentCustomers: customers.slice(0, 5),
        monthlyRevenue, jobTypeBreakdown,
      });
    } catch (err) { console.error('Dashboard error:', err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || 'Invalid email or password'); return; }
      setUser(data.user);
      if (data.company) setCompany(data.company);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('company', JSON.stringify(data.company));
    } catch (err) {
      setError('Cannot connect to server.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotMsg(data.message || 'Reset link sent!');
    } catch (err) {
      setForgotMsg('Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) { setResetMsg('Passwords do not match'); return; }
    if (resetPassword.length < 8) { setResetMsg('Password must be at least 8 characters'); return; }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setResetMsg(data.message || 'Reset failed'); return; }
      setResetMsg('Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setShowReset(false);
        window.history.replaceState({}, '', '/');
      }, 2000);
    } catch (err) {
      setResetMsg('Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null); setCompany(null); setBillingStatus(null);
    setCurrentPage('dashboard');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
  };

  const handleSignupSuccess = (newUser, newCompany) => {
    if (newUser) {
      setUser(newUser);
      setCompany(newCompany);
    }
    setShowSignup(false);
  };

  if (checkingAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
      <p style={{ color: 'white', fontSize: '18px' }}>Loading</p>
    </div>
  );

  if (showSignup) return <Signup onSignupSuccess={handleSignupSuccess} />;

  if (showReset) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>❄️</div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }}>HVAC Field OS</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Set your new password</p>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '36px', border: '1px solid #334155' }}>
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>New Password</label>
              <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Min 8 characters" required
                style={{ width: '100%', padding: '12px 14px', fontSize: '15px', border: '2px solid #334155', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: 'white', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Confirm Password</label>
              <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="Repeat password" required
                style={{ width: '100%', padding: '12px 14px', fontSize: '15px', border: '2px solid #334155', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: 'white', outline: 'none' }} />
            </div>
            {resetMsg && <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: resetMsg.includes('successfully') ? '#f0fdf4' : '#fff1f2', color: resetMsg.includes('successfully') ? '#15803d' : '#e11d48', borderRadius: '8px', fontSize: '14px' }}>{resetMsg}</div>}
            <button type="submit" disabled={resetLoading}
              style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: '700', color: 'white', backgroundColor: resetLoading ? '#334155' : '#2563eb', border: 'none', borderRadius: '8px', cursor: resetLoading ? 'default' : 'pointer' }}>
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (showForgot) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>❄️</div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }}>HVAC Field OS</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Reset your password</p>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '36px', border: '1px solid #334155' }}>
          {!forgotMsg ? (
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Your Email</label>
                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" required
                  style={{ width: '100%', padding: '12px 14px', fontSize: '15px', border: '2px solid #334155', borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: 'white', outline: 'none' }} />
              </div>
              <button type="submit" disabled={forgotLoading}
                style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: '700', color: 'white', backgroundColor: forgotLoading ? '#334155' : '#2563eb', border: 'none', borderRadius: '8px', cursor: forgotLoading ? 'default' : 'pointer', marginBottom: '12px' }}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setShowForgot(false)}
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#94a3b8', backgroundColor: 'transparent', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer' }}>
                Back to Sign In
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
              <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>{forgotMsg}</p>
              <button onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotEmail(''); }}
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '600', color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>❄️</div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }}>HVAC Field OS</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>Sign in to your account</p>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '36px', border: '1px solid #334155' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                style={{ width: '100%', padding: '12px 14px', fontSize: '15px', border: `2px solid ${error ? '#e11d48' : '#334155'}`, borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: 'white', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="........" required
                style={{ width: '100%', padding: '12px 14px', fontSize: '15px', border: `2px solid ${error ? '#e11d48' : '#334155'}`, borderRadius: '8px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: 'white', outline: 'none' }} />
            </div>
            {error && <div style={{ padding: '12px 14px', marginBottom: '20px', backgroundColor: '#fff1f2', color: '#e11d48', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}>⚠️ {error}</div>}
            <div style={{ textAlign: 'right', marginTop: '-16px', marginBottom: '16px' }}>
              <button type="button" onClick={() => setShowForgot(true)}
                style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: '700', color: 'white', backgroundColor: loading ? '#334155' : '#2563eb', border: 'none', borderRadius: '8px', cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'Signing in' : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>New HVAC company?</p>
            <button onClick={() => setShowSignup(true)}
              style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '700', color: '#2563eb', backgroundColor: 'transparent', border: '2px solid #2563eb', borderRadius: '8px', cursor: 'pointer' }}>
              Start Free 14-Day Trial
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const navItems = [
    { page: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { page: 'customers', icon: '👥', label: 'Customers' },
    { page: 'workorders', icon: '📋', label: 'Work Orders' },
    { page: 'invoices', icon: '💰', label: 'Invoices' },
    { page: 'billing', icon: '💳', label: 'Billing' },
    { page: 'users', icon: '👤', label: 'Team' },
  ];

  const PIE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
  const STATUS_COLORS = {
    scheduled: { color: '#1d4ed8', bg: '#dbeafe' },
    in_progress: { color: '#92400e', bg: '#fef3c7' },
    completed: { color: '#15803d', bg: '#dcfce7' },
    cancelled: { color: '#64748b', bg: '#f1f5f9' },
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div className='sidebar-desktop' style={{ width: '240px', backgroundColor: '#0f172a', color: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>❄️</div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>HVAC Field OS</h2>
          {company && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{company.name}</p>}
        </div>
        {billingStatus && billingStatus.plan === 'trial' && (
          <div style={{ margin: '8px 0 16px', padding: '10px 12px', backgroundColor: billingStatus.trialExpired ? '#450a0a' : '#1c1917', borderRadius: '8px', border: `1px solid ${billingStatus.trialExpired ? '#dc2626' : '#d97706'}` }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: billingStatus.trialExpired ? '#f87171' : '#fbbf24' }}>
              {billingStatus.trialExpired ? '🔒 Trial Expired' : `⏳ ${billingStatus.trialDaysLeft} days left in trial`}
            </p>
            <button onClick={() => setCurrentPage('billing')}
              style={{ marginTop: '6px', width: '100%', padding: '5px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
              Upgrade Now
            </button>
          </div>
        )}
        <nav style={{ flex: 1 }}>
          {navItems.filter(item => item.page !== 'users' || user.role === 'admin').map(({ page, icon, label }) => (
            <button key={page} onClick={() => setCurrentPage(page)}
              style={{ width: '100%', padding: '11px 14px', marginBottom: '4px', backgroundColor: currentPage === page ? '#1e40af' : 'transparent', color: currentPage === page ? 'white' : '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>
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
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '9px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: '#f0f4f8', overflow: 'auto' }}>
        {billingStatus && billingStatus.trialExpired && billingStatus.plan === 'trial' && currentPage !== 'billing' && (
          <div style={{ position: 'fixed', top: 0, left: '240px', right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '700', color: '#1a2332' }}>Trial Expired</h2>
              <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '15px' }}>Your 14-day free trial has ended. Choose a plan to keep access.</p>
              <button onClick={() => setCurrentPage('billing')}
                style={{ padding: '14px 32px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}>
                View Plans and Pricing
              </button>
            </div>
          </div>
        )}

        {currentPage === 'dashboard' && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div>
                <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#1a2332' }}>Dashboard</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Welcome back, {user.firstName}!</p>
              </div>
              <button onClick={loadDashboard}
                style={{ padding: '10px 18px', backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                🔄 Refresh
              </button>
            </div>

            <div className='grid-4' style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Customers', value: dashData.customerCount, icon: '👥', color: '#2563eb', bg: '#eff6ff', page: 'customers' },
                { label: 'Total Revenue', value: `$${dashData.totalRevenue.toFixed(0)}`, icon: '💰', color: '#16a34a', bg: '#f0fdf4', page: 'invoices' },
                { label: 'Outstanding', value: `$${dashData.outstandingRevenue.toFixed(0)}`, icon: '⏳', color: '#d97706', bg: '#fffbeb', page: 'invoices' },
                { label: 'Work Orders', value: dashData.workOrderCount, icon: '📋', color: '#7c3aed', bg: '#faf5ff', page: 'workorders' },
              ].map(({ label, value, icon, color, bg, page }) => (
                <div key={label} onClick={() => setCurrentPage(page)}
                  style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = color; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1a2332' }}>{value}</p>
                    </div>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{icon}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className='grid-3' style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Scheduled', value: dashData.scheduledCount, color: '#1d4ed8', bg: '#dbeafe' },
                { label: 'In Progress', value: dashData.inProgressCount, color: '#92400e', bg: '#fef3c7' },
                { label: 'Completed', value: dashData.completedCount, color: '#15803d', bg: '#dcfce7' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} onClick={() => setCurrentPage('workorders')}
                  style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#475569' }}>{label}</p>
                  <span style={{ padding: '4px 14px', borderRadius: '20px', backgroundColor: bg, color, fontWeight: '700', fontSize: '16px' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className='grid-charts' style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#1a2332' }}>Monthly Revenue</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashData.monthlyRevenue}>
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={v => [`$${v}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#1a2332' }}>Job Types</h2>
                {dashData.jobTypeBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={dashData.jobTypeBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                          {dashData.jobTypeBreakdown.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {dashData.jobTypeBreakdown.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          {item.name} ({item.value})
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>No job data yet</div>
                )}
              </div>
            </div>

            <div className='grid-2' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a2332' }}>Recent Work Orders</h2>
                  <button onClick={() => setCurrentPage('workorders')} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>View all</button>
                </div>
                {dashData.recentWorkOrders.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No work orders yet</p>
                ) : dashData.recentWorkOrders.map(wo => {
                  const s = STATUS_COLORS[wo.status] || STATUS_COLORS.scheduled;
                  return (
                    <div key={wo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: '#1a2332' }}>{wo.jobType} — {wo.firstName} {wo.lastName}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : 'No date'}</p>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: s.color, backgroundColor: s.bg }}>{wo.status.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a2332' }}>Recent Customers</h2>
                  <button onClick={() => setCurrentPage('customers')} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>View all</button>
                </div>
                {dashData.recentCustomers.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No customers yet</p>
                ) : dashData.recentCustomers.map((c, idx) => {
                  const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: colors[idx % colors.length], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: '#1a2332' }}>{c.firstName} {c.lastName}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{c.email || c.phone || 'No contact info'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#1a2332' }}>Quick Actions</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { label: '+ New Customer', page: 'customers', color: '#2563eb' },
                  { label: '+ New Work Order', page: 'workorders', color: '#16a34a' },
                  { label: '+ New Invoice', page: 'invoices', color: '#7c3aed' },
                ].map(({ label, page, color }) => (
                  <button key={label} onClick={() => setCurrentPage(page)}
                    style={{ padding: '10px 20px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} userRole={user.role} />
        {currentPage === 'customers' && <Customers />}
        {currentPage === 'workorders' && <WorkOrders />}
        {currentPage === 'invoices' && <Invoices />}
        {currentPage === 'billing' && <Billing currentUser={user} />}
        {currentPage === 'users' && user.role === 'admin' && <Users />}
      </div>
    </div>
  );
}

export default App;
