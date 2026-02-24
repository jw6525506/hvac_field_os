import React, { useState, useEffect } from 'react';

const API_BASE = 'https://hvacfieldos-production.up.railway.app/api';

function Settings() {
  const [branding, setBranding] = useState({ name: '', logo: '', brandColor: '#06b6d4', companyTagline: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => { loadBranding(); }, []);

  const loadBranding = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/branding`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.branding) setBranding(data.branding);
    } catch (err) {}
  };

  const handleSave = async () => {
    console.log('Token:', localStorage.getItem('token'));
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/company/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brandColor: branding.brandColor, companyTagline: branding.companyTagline })
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.message, type: 'error' }); return; }
      setToast({ message: 'Branding saved!', type: 'success' });
      // Update stored company info
      const stored = JSON.parse(localStorage.getItem('company') || '{}');
      localStorage.setItem('company', JSON.stringify({ ...stored, brandColor: branding.brandColor, companyTagline: branding.companyTagline }));
      window.dispatchEvent(new Event('brandingUpdated'));
    } catch (err) {
      setToast({ message: 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setToast({ message: 'Logo must be under 2MB', type: 'error' }); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch(`${API_BASE}/company/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.message, type: 'error' }); return; }
      setBranding(b => ({ ...b, logo: data.logoUrl }));
      setToast({ message: 'Logo uploaded!', type: 'success' });
      const stored = JSON.parse(localStorage.getItem('company') || '{}');
      localStorage.setItem('company', JSON.stringify({ ...stored, logo: data.logoUrl }));
      window.dispatchEvent(new Event('brandingUpdated'));
    } catch (err) {
      setToast({ message: 'Failed to upload logo', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }
  }, [toast]);

  const S = {
    page: { padding: '32px', fontFamily: 'Segoe UI, sans-serif', maxWidth: '600px' },
    title: { margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#0d1b3e' },
    subtitle: { margin: '0 0 32px', color: '#64748b', fontSize: '15px' },
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '20px' },
    cardTitle: { margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#0d1b3e' },
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0d1b3e', boxSizing: 'border-box' },
    saveBtn: { padding: '12px 24px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
    logoBox: { width: '120px', height: '120px', border: '2px dashed #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', marginBottom: '12px' },
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>Settings</h1>
      <p style={S.subtitle}>Customize how Helix8 looks for your company</p>

      {/* Logo */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Company Logo</h2>
        <label style={{ cursor: 'pointer' }}>
          <div style={S.logoBox}>
            {branding.logo ? (
              <img src={`https://hvacfieldos-production.up.railway.app${branding.logo}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px' }}>🏢</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click to upload</div>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </label>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{uploading ? 'Uploading...' : 'PNG, JPG up to 2MB. Recommended: square logo.'}</p>
      </div>

      {/* Brand Color */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Brand Color</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <input type="color" value={branding.brandColor || '#06b6d4'} onChange={e => setBranding(b => ({ ...b, brandColor: e.target.value }))}
            style={{ width: '60px', height: '44px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
          <div>
            <div style={{ fontWeight: '600', color: '#0d1b3e', fontSize: '15px' }}>{branding.brandColor || '#06b6d4'}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>This color will appear on buttons and accents</div>
          </div>
        </div>
        {/* Preview */}
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>PREVIEW</div>
          <button style={{ padding: '10px 20px', backgroundColor: branding.brandColor || '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
            Save Invoice
          </button>
        </div>
      </div>

      {/* Tagline */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Company Tagline</h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={S.label}>Tagline (shows under your company name)</label>
          <input style={S.input} value={branding.companyTagline || ''} onChange={e => setBranding(b => ({ ...b, companyTagline: e.target.value }))}
            placeholder="e.g. Atlanta's #1 HVAC Service" maxLength={100} />
        </div>
      </div>

      <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : '💾 Save Branding'}
      </button>

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', borderRadius: '10px', backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fff1f2', color: toast.type === 'success' ? '#15803d' : '#e11d48', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Settings;
