import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', borderRadius: '10px', backgroundColor: type === 'success' ? '#f0fdf4' : '#fff1f2', color: type === 'success' ? '#15803d' : '#e11d48', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}>
      {message}
    </div>
  );
}

const EMPTY_FORM = { name: '', description: '', sku: '', quantity: 0, minQuantity: 0, unitCost: 0, unitPrice: 0, category: '', assignedTo: '' };

const CATEGORIES = ['Parts', 'Tools', 'Equipment', 'Electrical', 'Plumbing', 'Hardware', 'Safety', 'Chemicals', 'Consumables', 'Other'];

function Inventory() {
  const { t } = useTranslation();
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => { loadInventory(); loadUsers(); }, []);

  const loadInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setUsers(data.users || []); }
    } catch (err) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editTarget ? `${API_BASE}/inventory/${editTarget.id}` : `${API_BASE}/inventory`;
      const method = editTarget ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.message, type: 'error' }); return; }
      setToast({ message: editTarget ? 'Item updated!' : 'Item added!', type: 'success' });
      setShowForm(false); setEditTarget(null); setFormData(EMPTY_FORM);
      loadInventory();
    } catch (err) {
      setToast({ message: 'Something went wrong', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setToast({ message: 'Item deleted', type: 'success' });
      loadInventory();
    } catch (err) {}
  };

  const handleAdjust = async (id, adjustment) => {
    try {
      await fetch(`${API_BASE}/inventory/${id}/adjust`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adjustment }),
      });
      loadInventory();
    } catch (err) {}
  };

  const filtered = inventory.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || (item.sku||'').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || item.category === filterCategory;
    const matchUser = filterUser === 'all' || String(item.assignedTo) === filterUser;
    return matchSearch && matchCat && matchUser;
  });

  const lowStock = inventory.filter(i => i.quantity <= i.minQuantity && i.minQuantity > 0);

  const S = {
    page: { padding: '32px', fontFamily: 'Segoe UI, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    title: { margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#0d1b3e' },
    subtitle: { margin: 0, color: '#64748b', fontSize: '15px' },
    addBtn: { padding: '11px 20px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
    filters: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    input: { padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0d1b3e', backgroundColor: 'white', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
    td: { padding: '14px 16px', fontSize: '14px', color: '#0d1b3e', borderBottom: '1px solid #f1f5f9' },
    badge: (low) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: low ? '#fee2e2' : '#dcfce7', color: low ? '#991b1b' : '#15803d' }),
    actionBtn: { padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    modal: { backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' },
    modalTitle: { margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#0d1b3e' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
    cancelBtn: { padding: '10px 18px', backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    saveBtn: { padding: '10px 20px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Inventory</h1>
          <p style={S.subtitle}>{inventory.length} items{lowStock.length > 0 && <span style={{ color: '#e11d48', marginLeft: '8px' }}>⚠ {lowStock.length} low stock</span>}</p>
        </div>
        {isAdmin && <button style={S.addBtn} onClick={() => { setEditTarget(null); setFormData(EMPTY_FORM); setShowForm(true); }}>+ Add Item</button>}
      </div>

      {lowStock.length > 0 && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: '#e11d48' }}>
          ⚠ Low stock alert: {lowStock.map(i => i.name).join(', ')}
        </div>
      )}

      <div style={S.filters}>
        <input style={{ ...S.input, maxWidth: '280px' }} placeholder="Search items or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...S.input, maxWidth: '180px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={{ ...S.input, maxWidth: '180px' }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="all">All Technicians</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading inventory...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#0d1b3e' }}>No items yet</p>
          <p style={{ fontSize: '14px' }}>Add your first inventory item to get started</p>
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Item</th>
              <th style={S.th}>SKU</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Assigned To</th>
              <th style={S.th}>Qty</th>
              <th style={S.th}>Unit Price</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const isLow = item.minQuantity > 0 && item.quantity <= item.minQuantity;
              return (
                <tr key={item.id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: '600' }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{item.description}</div>}
                  </td>
                  <td style={S.td}><span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>{item.sku || '—'}</span></td>
                  <td style={S.td}>{item.category || '—'}</td>
                  <td style={S.td}>{item.firstName ? `${item.firstName} ${item.lastName}` : <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button style={{ ...S.actionBtn, backgroundColor: '#f1f5f9', color: '#475569' }} onClick={() => handleAdjust(item.id, -1)}>−</button>
                      <span style={S.badge(isLow)}>{item.quantity}</span>
                      <button style={{ ...S.actionBtn, backgroundColor: '#f1f5f9', color: '#475569' }} onClick={() => handleAdjust(item.id, 1)}>+</button>
                    </div>
                  </td>
                  <td style={S.td}>${parseFloat(item.unitPrice).toFixed(2)}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && (
                        <>
                          <button style={{ ...S.actionBtn, backgroundColor: '#eff6ff', color: '#2563eb' }} onClick={() => { setEditTarget(item); setFormData({ name: item.name, description: item.description||'', sku: item.sku||'', quantity: item.quantity, minQuantity: item.minQuantity, unitCost: item.unitCost, unitPrice: item.unitPrice, category: item.category||'', assignedTo: item.assignedTo||'' }); setShowForm(true); }}>Edit</button>
                          <button style={{ ...S.actionBtn, backgroundColor: '#fff1f2', color: '#e11d48' }} onClick={() => handleDelete(item.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>{editTarget ? 'Edit Item' : 'Add Inventory Item'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={S.formGroup}>
                <label style={S.label}>Item Name *</label>
                <input style={S.input} value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. 5-Ton Capacitor" />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Description</label>
                <input style={S.input} value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>SKU</label>
                  <input style={S.input} value={formData.sku} onChange={e => setFormData(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. CAP-5T-440" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Category</label>
                  <select style={S.input} value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Quantity</label>
                  <input type="number" style={S.input} value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: parseInt(e.target.value)||0 }))} min="0" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Low Stock Alert At</label>
                  <input type="number" style={S.input} value={formData.minQuantity} onChange={e => setFormData(f => ({ ...f, minQuantity: parseInt(e.target.value)||0 }))} min="0" />
                </div>
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.label}>Unit Cost ($)</label>
                  <input type="number" style={S.input} value={formData.unitCost} onChange={e => setFormData(f => ({ ...f, unitCost: parseFloat(e.target.value)||0 }))} min="0" step="0.01" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Unit Price ($)</label>
                  <input type="number" style={S.input} value={formData.unitPrice} onChange={e => setFormData(f => ({ ...f, unitPrice: parseFloat(e.target.value)||0 }))} min="0" step="0.01" />
                </div>
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Assign to Technician</label>
                <select style={S.input} value={formData.assignedTo} onChange={e => setFormData(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">Unassigned (shop stock)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>
              <div style={S.modalFooter}>
                <button type="button" style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" style={S.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Inventory;
