import React, { useState } from 'react';

const API_BASE = 'http://localhost:3000/api';

function Signup({ onSignupSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.companyName) { setError('Company name is required'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          companyEmail: form.companyEmail,
          companyPhone: form.companyPhone,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Signup failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('company', JSON.stringify(data.company));
      onSignupSuccess(data.user, data.company);
    } catch (err) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: '15px',
    border: '2px solid #334155', borderRadius: '8px',
    boxSizing: 'border-box', backgroundColor: '#0f172a',
    color: 'white', outline: 'none',
  };

  const labelStyle = {
    display: 'block', marginBottom: '6px', fontWeight: '600',
    fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>❄️</div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }}>HVAC Field OS</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>Start your 14-day free trial</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', gap: '8px' }}>
          {[1, 2].map(s => (
            <React.Fragment key={s}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700',
                backgroundColor: step >= s ? '#2563eb' : '#1e293b',
                color: step >= s ? 'white' : '#64748b',
                border: `2px solid ${step >= s ? '#2563eb' : '#334155'}`,
              }}>{s}</div>
              {s < 2 && <div style={{ width: '40px', height: '2px', backgroundColor: step > s ? '#2563eb' : '#334155' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '36px', border: '1px solid #334155' }}>

          {/* Step 1 - Company Info */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '700', color: 'white' }}>Company Information</h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Company Name *</label>
                <input type="text" value={form.companyName} onChange={e => update('companyName', e.target.value)}
                  placeholder="Acme HVAC Services" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Company Email</label>
                <input type="email" value={form.companyEmail} onChange={e => update('companyEmail', e.target.value)}
                  placeholder="info@yourhvaccompany.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Company Phone</label>
                <input type="tel" value={form.companyPhone} onChange={e => update('companyPhone', e.target.value)}
                  placeholder="(555) 123-4567" style={inputStyle} />
              </div>
              {error && <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fff1f2', color: '#e11d48', borderRadius: '8px', fontSize: '14px' }}>⚠️ {error}</div>}
              <button type="submit"
                style={{ width: '100%', padding: '13px', fontSize: '15px', fontWeight: '700', color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Continue →
              </button>
            </form>
          )}

          {/* Step 2 - Admin Account */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: '700', color: 'white' }}>Create Your Account</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)}
                    placeholder="John" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)}
                    placeholder="Smith" required style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Your Email *</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="john@yourhvaccompany.com" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Password *</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                  placeholder="Min 8 characters" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Confirm Password *</label>
                <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                  placeholder="Repeat password" required style={inputStyle} />
              </div>

              {/* Trial callout */}
              <div style={{ padding: '12px 16px', backgroundColor: '#0f172a', borderRadius: '8px', marginBottom: '20px', border: '1px solid #1e40af' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd' }}>
                  ✅ 14-day free trial — no credit card required
                </p>
              </div>

              {error && <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fff1f2', color: '#e11d48', borderRadius: '8px', fontSize: '14px' }}>⚠️ {error}</div>}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setStep(1); setError(''); }}
                  style={{ flex: 1, padding: '13px', fontSize: '15px', fontWeight: '700', color: '#94a3b8', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, padding: '13px', fontSize: '15px', fontWeight: '700', color: 'white', backgroundColor: loading ? '#334155' : '#2563eb', border: 'none', borderRadius: '8px', cursor: loading ? 'default' : 'pointer' }}>
                  {loading ? 'Creating account...' : 'Start Free Trial'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
          Already have an account?{' '}
          <button onClick={() => onSignupSuccess(null, null)}
            style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
