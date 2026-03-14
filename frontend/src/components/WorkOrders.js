import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'https://hvacfieldos-production.up.railway.app/api';

const S = {
  page: { padding: '32px', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", backgroundColor: '#f0f4f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#0d1b3e', margin: 0, letterSpacing: '-0.5px' },
  addBtn: { padding: '11px 22px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  filters: { display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' },
  filterBtn: (active) => ({
    padding: '8px 16px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.15s',
    backgroundColor: active ? '#0d1b3e' : 'white', color: active ? 'white' : '#64748b', borderColor: active ? '#0d1b3e' : '#e2e8f0',
  }),
  countLabel: { fontSize: '13px', color: '#64748b', marginBottom: '16px' },
  card: {
    backgroundColor: 'white', padding: '20px 24px', marginBottom: '12px', borderRadius: '12px',
    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardTitle: { fontWeight: '700', fontSize: '16px', color: '#0d1b3e', margin: '0 0 4px' },
  cardMeta: { fontSize: '13px', color: '#64748b', margin: 0 },
  cardActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  cardBottom: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #f1f5f9' },
  badge: (color, bg) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color, backgroundColor: bg }),
  metaItem: { fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' },
  progressBtn: (color) => ({ padding: '6px 14px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }),
  editBtn: { padding: '7px 14px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  deleteBtn: { padding: '7px 14px', backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '540px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#0d1b3e' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px' },
  input: { width: '100%', padding: '10px 12px', marginBottom: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#0d1b3e', outline: 'none' },
  select: { width: '100%', padding: '10px 12px', marginBottom: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#0d1b3e', backgroundColor: 'white' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  saveBtn: { padding: '10px 22px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  toast: (type) => ({
    position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', borderRadius: '10px', color: 'white',
    fontWeight: '600', fontSize: '14px', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    backgroundColor: type === 'error' ? '#e11d48' : '#16a34a',
  }),
  confirmModal: { backgroundColor: 'white', padding: '28px', borderRadius: '14px', width: '380px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' },
  confirmDelete: { padding: '10px 24px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
};

const STATUS_CONFIG = {
  scheduled:   { label: 'Scheduled',   color: '#0891b2', bg: '#dbeafe', next: 'in_progress', nextLabel: '▶ Start Job' , nextColor: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#92400e', bg: '#fef3c7', next: 'completed',   nextLabel: '✓ Complete',  nextColor: '#16a34a' },
  completed:   { label: 'Completed',   color: '#15803d', bg: '#dcfce7', next: null },
  cancelled:   { label: 'Cancelled',   color: '#64748b', bg: '#f1f5f9', next: null },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#64748b', bg: '#f1f5f9' },
  normal: { label: 'Normal', color: '#0891b2', bg: '#dbeafe' },
  high:   { label: 'High',   color: '#92400e', bg: '#fef3c7' },
  urgent: { label: 'Urgent', color: '#991b1b', bg: '#fee2e2' },
};

const EMPTY_FORM = { customerId: '', jobType: 'repair', description: '', priority: 'normal', scheduledDate: '', scheduledTime: '', assignedTo: '' };

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div style={S.toast(type)}>{type === 'error' ? '✕' : '✓'} {message}</div>;
}

export default function WorkOrders() {
  const { t } = useTranslation();
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, custRes] = await Promise.all([
        fetch(`${API_BASE}/work-orders`, { headers: authHeaders() }),
        fetch(`${API_BASE}/customers`, { headers: authHeaders() }),
      ]);
      if (!woRes.ok || !custRes.ok) throw new Error('Failed to load data');
      const [woData, custData] = await Promise.all([woRes.json(), custRes.json()]);
      setWorkOrders(woData.workOrders || []);
      setCustomers(custData.customers || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://hvacfieldos-production.up.railway.app/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  useEffect(() => { load(); loadUsers(); }, [load]);

  const openCreate = () => { setEditTarget(null); setFormData(EMPTY_FORM); setShowForm(true); };
  const openEdit = (wo) => {
    setEditTarget(wo);
    setFormData({
      customerId: wo.customerId, jobType: wo.jobType, description: wo.description,
      priority: wo.priority, scheduledDate: wo.scheduledDate?.slice(0, 10) || '', scheduledTime: wo.scheduledTime || '', assignedTo: wo.assignedTo || '',
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isEdit = !!editTarget;
    const url = isEdit ? `${API_BASE}/work-orders/${editTarget.id}` : `${API_BASE}/work-orders`;
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(formData) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Server error'); }
      setShowForm(false);
      await load();
      showToast(isEdit ? 'Work order updated.' : 'Work order created.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const [photoTarget, setPhotoTarget] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (woId, files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('photos', f));
      const res = await fetch(`${API_BASE}/work-orders/${woId}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Upload failed'); return; }
      setWorkOrders(prev => prev.map(wo => wo.id === woId ? { ...wo, photos: data.photos } : wo));
      setPhotoTarget(prev => prev ? { ...prev, photos: data.photos } : prev);
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async (woId, filename) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      const res = await fetch(`${API_BASE}/work-orders/${woId}/photos/${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Delete failed'); return; }
      setWorkOrders(prev => prev.map(wo => wo.id === woId ? { ...wo, photos: data.photos } : wo));
      setPhotoTarget(prev => prev ? { ...prev, photos: data.photos } : prev);
    } catch (err) {
      alert('Delete failed');
    }
  };

  const [sigTarget, setSigTarget] = React.useState(null);
  const [sigName, setSigName] = React.useState('');
  const [sigDrawing, setSigDrawing] = React.useState(false);
  const sigCanvasRef = React.useRef(null);

  const startSig = (e, canvas) => {
    setSigDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.moveTo(x, y);
  };

  const drawSig = (e, canvas) => {
    if (!sigDrawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0a0f2c';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearSig = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = async () => {
    if (!sigName.trim()) return alert('Please enter customer name');
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    try {
      const res = await fetch(`${API_BASE}/workorders/${sigTarget.id}/sign`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ signatureData, signedBy: sigName })
      });
      if (!res.ok) throw new Error('Failed to save signature');
      setWorkOrders(prev => prev.map(wo => wo.id === sigTarget.id ? { ...wo, signedBy: sigName, signedAt: new Date() } : wo));
      setSigTarget(null);
      setSigName('');
      alert('Signature saved successfully!');
    } catch (e) { alert('Error saving signature'); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/work-orders/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed to update status');
      setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status } : wo));
      showToast('Status updated.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API_BASE}/work-orders/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      showToast('Work order deleted.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filtered = filter === 'all' ? workOrders : workOrders.filter(wo => wo.status === filter);
  const counts = { all: workOrders.length, scheduled: 0, in_progress: 0, completed: 0 };
  workOrders.forEach(wo => { if (counts[wo.status] !== undefined) counts[wo.status]++; });

  const getCustomerName = (wo) => {
    if (wo.firstName) return `${wo.firstName} ${wo.lastName}`;
    const c = customers.find(c => c.id === wo.customerId);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown Customer';
  };

  const SigModal = sigTarget && (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#0a0f2c' }}>✍️ Customer Signature</h3>
        <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#64748b' }}>Work Order: {sigTarget.title}</p>
        <input
          placeholder="Customer full name *"
          value={sigName}
          onChange={e => setSigName(e.target.value)}
          style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box' }}
        />
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>Sign below:</p>
        <canvas
          ref={sigCanvasRef}
          width={430} height={150}
          style={{ border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'crosshair', touchAction: 'none', width: '100%', background: '#f8fafc' }}
          onMouseDown={e => startSig(e, sigCanvasRef.current)}
          onMouseMove={e => drawSig(e, sigCanvasRef.current)}
          onMouseUp={() => setSigDrawing(false)}
          onTouchStart={e => startSig(e, sigCanvasRef.current)}
          onTouchMove={e => drawSig(e, sigCanvasRef.current)}
          onTouchEnd={() => setSigDrawing(false)}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button onClick={submitSignature} style={{ flex: 1, padding: '10px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Save Signature</button>
          <button onClick={clearSig} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Clear</button>
          <button onClick={() => setSigTarget(null)} style={{ padding: '10px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {SigModal}
      <div style={S.header}>
        <h1 style={S.title}>Work Orders</h1>
        <button style={S.addBtn} onClick={openCreate}>+ Create Work Order</button>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        {[['all', 'All'], ['scheduled', 'Scheduled'], ['in_progress', 'In Progress'], ['completed', 'Completed']].map(([val, label]) => (
          <button key={val} style={S.filterBtn(filter === val)} onClick={() => setFilter(val)}>
            {label} ({counts[val] ?? workOrders.filter(wo => wo.status === val).length})
          </button>
        ))}
      </div>

      {!loading && <p style={S.countLabel}>{filtered.length} work order{filtered.length !== 1 ? 's' : ''}</p>}

      {/* List */}
      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '60px' }}>Loading work orders…</p>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <p style={{ margin: 0, fontSize: '16px' }}>No {filter !== 'all' ? filter.replace('_', ' ') + ' ' : ''}work orders yet.</p>
        </div>
      ) : (
        filtered.map(wo => {
          const statusCfg = STATUS_CONFIG[wo.status || 'scheduled'] || STATUS_CONFIG.scheduled;
          const priorityCfg = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.normal;
          return (
            <div key={wo.id} style={S.card}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={S.cardTop}>
                <div>
                  <p style={S.cardTitle}>{wo.jobType?.charAt(0).toUpperCase() + wo.jobType?.slice(1)} — {getCustomerName(wo)}</p>
                  <p style={S.cardMeta}>{wo.description}</p>
                </div>
                <div style={S.cardActions}>
                  <button style={S.editBtn} onClick={() => openEdit(wo)}>Edit</button>
                  <button onClick={() => setPhotoTarget(wo)}
                    style={{ padding: '7px 14px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    📷 {wo.photos && wo.photos.length > 0 ? `Photos (${wo.photos.length})` : t('photos')}
                  </button>
                  <button onClick={() => { setSigTarget(wo); setSigName(''); }}
                    style={{ padding: '7px 14px', backgroundColor: wo.signedBy ? '#f0fdf4' : '#eff6ff', color: wo.signedBy ? '#15803d' : '#1d4ed8', border: `1px solid ${wo.signedBy ? '#86efac' : '#93c5fd'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {wo.signedBy ? '✅ Signed' : '✍️ Sign'}
                  </button>
                  <button style={S.deleteBtn} onClick={() => setDeleteTarget(wo)}>Delete</button>
                </div>
              </div>
              <div style={S.cardBottom}>
                <span style={S.badge(statusCfg.color, statusCfg.bg)}>{statusCfg.label}</span>
                <span style={S.badge(priorityCfg.color, priorityCfg.bg)}>{priorityCfg.label} Priority</span>
                {wo.signedBy && <span style={{...S.badge('#15803d','#dcfce7')}}>✅ Signed by {wo.signedBy}</span>}
                {wo.scheduledDate && <span style={S.metaItem}>📅 {new Date(wo.scheduledDate).toLocaleDateString()}</span>}
                {wo.scheduledTime && <span style={S.metaItem}>🕐 {wo.scheduledTime}</span>}
                {statusCfg.next && (
                  <button style={{ ...S.progressBtn(statusCfg.nextColor), marginLeft: 'auto' }}
                    onClick={() => handleStatusUpdate(wo.id, statusCfg.next)}>
                    {statusCfg.nextLabel}
                  </button>
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
            <h2 style={S.modalTitle}>{editTarget ? 'Edit Work Order' : 'Create Work Order'}</h2>
            <form onSubmit={handleSave}>
              <label style={S.label}>Customer</label>
              <select name="customerId" value={formData.customerId} onChange={e => setFormData(f => ({ ...f, customerId: e.target.value }))} required style={S.select}>
                <option value="">Select a customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Job Type</label>
                  <select name="jobType" value={formData.jobType} onChange={e => setFormData(f => ({ ...f, jobType: e.target.value }))} style={S.select}>
                    <option value="repair">Repair</option>
                    <option value="installation">Installation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inspection">Inspection</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Priority</label>
                  <select name="priority" value={formData.priority} onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))} style={S.select}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <label style={S.label}>Description</label>
              <textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the job…" rows={3}
                style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }} />

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Scheduled Date</label>
                  <input type="date" value={formData.scheduledDate} onChange={e => setFormData(f => ({ ...f, scheduledDate: e.target.value }))} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Scheduled Time</label>
                  <input type="time" value={formData.scheduledTime} onChange={e => setFormData(f => ({ ...f, scheduledTime: e.target.value }))} style={S.input} />
                </div>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Assign To</label>
                <select value={formData.assignedTo} onChange={e => setFormData(f => ({ ...f, assignedTo: e.target.value }))}
                  style={S.input}>
                  <option value=''>Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div style={S.modalFooter}>
                <button type="button" style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" style={S.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save Work Order'}</button>
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
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0d1b3e' }}>Delete Work Order?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button style={S.cancelBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button style={S.confirmDelete} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}


      {/* Before/After Photo Modal */}
      {photoTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setPhotoTarget(null)}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white' }}>📷 Before & After — {photoTarget.jobType}</h2>
              <button onClick={() => setPhotoTarget(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* BEFORE */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '3px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Before</span>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Photos taken before work started</span>
              </div>
              <label style={{ display: 'block', padding: '14px', border: '2px dashed #ef4444', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px', backgroundColor: 'rgba(239,68,68,0.05)' }}>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={async e => {
                    const formData = new FormData();
                    Array.from(e.target.files).forEach(f => formData.append('photos', f));
                    const res = await fetch(`${API_BASE}/work-orders/${photoTarget.id}/before-photos`, { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }, body: formData });
                    const data = await res.json();
                    setPhotoTarget(prev => ({ ...prev, beforePhotos: data.beforePhotos }));
                    setWorkOrders(prev => prev.map(wo => wo.id === photoTarget.id ? { ...wo, beforePhotos: data.beforePhotos } : wo));
                  }} />
                <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>+ Add Before Photos</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {(photoTarget.beforePhotos || []).map((photo, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', border: '2px solid #ef4444' }}>
                    <img src={`https://hvacfieldos-production.up.railway.app${photo}`} alt="before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={async () => {
                      const res = await fetch(`${API_BASE}/work-orders/${photoTarget.id}/before-photos/${photo.split('/').pop()}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
                      const data = await res.json();
                      setPhotoTarget(prev => ({ ...prev, beforePhotos: data.beforePhotos }));
                      setWorkOrders(prev => prev.map(wo => wo.id === photoTarget.id ? { ...wo, beforePhotos: data.beforePhotos } : wo));
                    }} style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                ))}
                {(!photoTarget.beforePhotos || photoTarget.beforePhotos.length === 0) && <p style={{ color: '#64748b', fontSize: '13px', gridColumn: 'span 3', margin: '8px 0' }}>No before photos yet</p>}
              </div>
            </div>

            {/* AFTER */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ backgroundColor: '#22c55e', color: 'white', padding: '3px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>After</span>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Photos taken after work completed</span>
              </div>
              <label style={{ display: 'block', padding: '14px', border: '2px dashed #22c55e', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px', backgroundColor: 'rgba(34,197,94,0.05)' }}>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={async e => {
                    const formData = new FormData();
                    Array.from(e.target.files).forEach(f => formData.append('photos', f));
                    const res = await fetch(`${API_BASE}/work-orders/${photoTarget.id}/after-photos`, { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }, body: formData });
                    const data = await res.json();
                    setPhotoTarget(prev => ({ ...prev, afterPhotos: data.afterPhotos }));
                    setWorkOrders(prev => prev.map(wo => wo.id === photoTarget.id ? { ...wo, afterPhotos: data.afterPhotos } : wo));
                  }} />
                <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>+ Add After Photos</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {(photoTarget.afterPhotos || []).map((photo, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', border: '2px solid #22c55e' }}>
                    <img src={`https://hvacfieldos-production.up.railway.app${photo}`} alt="after" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={async () => {
                      const res = await fetch(`${API_BASE}/work-orders/${photoTarget.id}/after-photos/${photo.split('/').pop()}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
                      const data = await res.json();
                      setPhotoTarget(prev => ({ ...prev, afterPhotos: data.afterPhotos }));
                      setWorkOrders(prev => prev.map(wo => wo.id === photoTarget.id ? { ...wo, afterPhotos: data.afterPhotos } : wo));
                    }} style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.9)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                ))}
                {(!photoTarget.afterPhotos || photoTarget.afterPhotos.length === 0) && <p style={{ color: '#64748b', fontSize: '13px', gridColumn: 'span 3', margin: '8px 0' }}>No after photos yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
