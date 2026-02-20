import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3000/api';

const S = {
  page: { padding: '32px', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", backgroundColor: '#f0f4f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a2332', margin: 0, letterSpacing: '-0.5px' },
  addBtn: { padding: '11px 22px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  card: { backgroundColor: 'white', padding: '20px 24px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: (color) => ({ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 }),
  name: { fontWeight: '600', fontSize: '16px', color: '#1a2332', margin: '0 0 4px' },
  email: { fontSize: '13px', color: '#64748b', margin: 0 },
  cardActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  badge: (color, bg) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color, backgroundColor: bg }),
  editBtn: { padding: '7px 14px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  deleteBtn: { padding: '7px 14px', backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '480px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#1a2332' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px' },
  input: { width: '100%', padding: '10px 12px', marginBottom: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#1a2332', outline: 'none' },
  select: { width: '100%', padding: '10px 12px', marginBottom: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#1a2332', backgroundColor: 'white' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  saveBtn: { padding: '10px 22px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  toast: (type) => ({ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', borderRadius: '10px', color: 'white', fontWeight: '600', fontSize: '14px', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', backgroundColor: type === 'error' ? '#e11d48' : '#16a34a' }),
  confirmModal: { backgroundColor: 'white', padding: '28px', borderRadius: '14px', width: '380px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' },
  confirmDelete: { padding: '10px 24px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  hintBox: { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#1d4ed8' },
};

const ROLE_CONFIG = {
  admin:      { color: '#7c3aed', bg: '#ede9fe' },
  technician: { color: '#0369a1', bg: '#e0f2fe' },
};

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div style={S.toast(type)}>{type === 'error' ? '✕' : '✓'} {message}</div>;
}

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', role: 'technician' };

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setFormData(EMPTY_FORM); setShowForm(true); };
  const openEdit = (user) => {
    setEditTarget(user);
    setFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '', role: user.role });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isEdit = !!editTarget;
    const url = isEdit ? `${API_BASE}/users/${editTarget.id}` : `${API_BASE}/users`;
    const method = isEdit ? 'PUT' : 'POST';
    const body = { ...formData };
    if (isEdit && !body.password) delete body.password;
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Server error'); }
      setShowForm(false);
      await load();
      showToast(isEdit ? 'User updated.' : 'User created.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Failed to delete'); }
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('User deleted.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Team Members</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={S.addBtn} onClick={openCreate}>+ Add User</button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '60px' }}>Loading users…</p>
      ) : users.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
          <p style={{ margin: 0, fontSize: '16px' }}>No users yet. Add your first technician!</p>
        </div>
      ) : (
        users.map((u, idx) => {
          const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.technician;
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const isCurrentUser = currentUser?.id === u.id;
          return (
            <div key={u.id} style={S.card}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={S.cardLeft}>
                <div style={S.avatar(avatarColor)}>{getInitials(u.firstName, u.lastName)}</div>
                <div>
                  <p style={S.name}>{u.firstName} {u.lastName} {isCurrentUser && <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>(you)</span>}</p>
                  <p style={S.email}>{u.email}</p>
                </div>
              </div>
              <div style={S.cardActions}>
                <span style={S.badge(roleCfg.color, roleCfg.bg)}>{u.role}</span>
                <button style={S.editBtn} onClick={() => openEdit(u)}>Edit</button>
                {!isCurrentUser && (
                  <button style={S.deleteBtn} onClick={() => setDeleteTarget(u)}>Delete</button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>{editTarget ? 'Edit User' : 'Add Team Member'}</h2>
            {editTarget && (
              <div style={S.hintBox}>
                💡 Leave password blank to keep the current password unchanged.
              </div>
            )}
            <form onSubmit={handleSave}>
              <div style={S.row2}>
                <div>
                  <label style={S.label}>First Name</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))} required style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Last Name</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))} required style={S.input} />
                </div>
              </div>
              <label style={S.label}>Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} required style={S.input} />
              <label style={S.label}>{editTarget ? 'New Password (optional)' : 'Password'}</label>
              <input type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} required={!editTarget} placeholder={editTarget ? 'Leave blank to keep current' : 'Min 6 characters'} style={S.input} />
              <label style={S.label}>Role</label>
              <select value={formData.role} onChange={e => setFormData(f => ({ ...f, role: e.target.value }))} style={S.select}>
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
              </select>
              <div style={S.modalFooter}>
                <button type="button" style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" style={S.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div style={S.confirmModal}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#1a2332' }}>Delete User?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
              This will permanently delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button style={S.cancelBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button style={S.confirmDelete} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

