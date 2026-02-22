import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'technician' });

  useEffect(() => { loadUsers(); }, []);

  const token = () => localStorage.getItem('token');

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: { 'Authorization': `Bearer ${token()}` } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Load users error:', err);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const url = editingUser ? `${API_BASE}/users/${editingUser.id}` : `${API_BASE}/users`;
      const method = editingUser ? 'PUT' : 'POST';
      const body = { ...form };
      if (editingUser && !form.password) delete body.password;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to save user'); return; }
      setSuccess(editingUser ? 'Team member updated!' : 'Team member added!');
      setShowForm(false);
      setEditingUser(null);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'technician' });
      loadUsers();
    } catch (err) {
      setError('Failed to save user.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '', role: user.role });
    setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Delete ${userName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to delete user'); return; }
      setSuccess('Team member removed.');
      loadUsers();
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm({ firstName: '', lastName: '', email: '', password: '', role: 'technician' });
    setError('');
  };

  const ROLE_COLORS = {
    admin: { color: '#0891b2', bg: '#dbeafe' },
    technician: { color: '#15803d', bg: '#dcfce7' },
  };

  const avatarColors = ['#06b6d4', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: '14px',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    boxSizing: 'border-box', outline: 'none', color: '#0d1b3e',
    backgroundColor: 'white',
  };

  const labelStyle = {
    display: 'block', marginBottom: '5px', fontWeight: '600',
    fontSize: '12px', color: '#64748b', textTransform: 'uppercase',
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#0d1b3e' }}>Team</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Manage your technicians and admins</p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingUser(null); setForm({ firstName: '', lastName: '', email: '', password: '', role: 'technician' }); }}
            style={{ padding: '10px 20px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
            + Add Team Member
          </button>
        )}
      </div>

      {/* Success/Error messages */}
      {success && <div style={{ padding: '12px 16px', marginBottom: '20px', backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: '1px solid #86efac' }}>✅ {success}</div>}
      {error && <div style={{ padding: '12px 16px', marginBottom: '20px', backgroundColor: '#fff1f2', color: '#e11d48', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: '1px solid #fecdd3' }}>⚠️ {error}</div>}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#0d1b3e' }}>
            {editingUser ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input type="text" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="John" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input type="text" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Smith" required style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="john@company.com" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="technician">Technician</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Min 8 characters'}
                required={!editingUser} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit"
                style={{ padding: '10px 24px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
                {editingUser ? 'Save Changes' : 'Add Team Member'}
              </button>
              <button type="button" onClick={handleCancel}
                style={{ padding: '10px 24px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading team...</p>
      ) : users.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '48px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h2 style={{ margin: '0 0 8px', color: '#0d1b3e' }}>No team members yet</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Add your first technician to get started.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Team Member', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const roleStyle = ROLE_COLORS[u.role] || ROLE_COLORS.technician;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: avatarColors[idx % avatarColors.length], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <span style={{ fontWeight: '600', color: '#0d1b3e', fontSize: '14px' }}>{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#475569' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'capitalize', color: roleStyle.color, backgroundColor: roleStyle.bg }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#94a3b8' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(u)}
                          style={{ padding: '6px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(u.id, `${u.firstName} ${u.lastName}`)}
                          style={{ padding: '6px 14px', backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Users;
