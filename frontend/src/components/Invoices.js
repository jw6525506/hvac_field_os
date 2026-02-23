import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3000/api';

const S = {
  page: { padding: '32px', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", backgroundColor: '#f0f4f8', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#0d1b3e', margin: 0, letterSpacing: '-0.5px' },
  addBtn: { padding: '11px 22px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  filters: { display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' },
  filterBtn: (active) => ({
    padding: '8px 16px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
    backgroundColor: active ? '#0d1b3e' : 'white', color: active ? 'white' : '#64748b', borderColor: active ? '#0d1b3e' : '#e2e8f0',
  }),
  summaryBar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' },
  summaryCard: (color) => ({ backgroundColor: color, borderRadius: '12px', padding: '20px', color: 'white' }),
  summaryLabel: { fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85, margin: '0 0 6px' },
  summaryValue: { fontSize: '28px', fontWeight: '700', margin: 0 },
  card: { backgroundColor: 'white', padding: '24px', marginBottom: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  invoiceNum: { fontWeight: '700', fontSize: '16px', color: '#0d1b3e', margin: '0 0 4px' },
  customerName: { fontSize: '14px', color: '#64748b', margin: 0 },
  totalAmount: { fontSize: '26px', fontWeight: '700', color: '#16a34a', margin: '0 0 6px', textAlign: 'right' },
  lineItemsTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '14px' },
  th: { textAlign: 'left', padding: '8px 0', color: '#94a3b8', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 0', borderBottom: '1px solid #f8fafc', color: '#334155' },
  totalsRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px', color: '#64748b' },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: '4px', borderTop: '2px solid #e2e8f0', fontWeight: '700', fontSize: '16px', color: '#0d1b3e' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' },
  badge: (color, bg) => ({ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color, backgroundColor: bg }),
  actionBtns: { display: 'flex', gap: '8px' },
  emailBtn: { padding: '7px 14px', backgroundColor: '#eff6ff', color: '#06b6d4', border: '1px solid #bfdbfe', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  markPaidBtn: { padding: '7px 14px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  markUnpaidBtn: { padding: '7px 14px', backgroundColor: '#fef9c3', color: '#a16207', border: '1px solid #fef08a', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  deleteBtn: { padding: '7px 14px', backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#0d1b3e' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px' },
  input: { width: '100%', padding: '10px 12px', marginBottom: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#0d1b3e', outline: 'none' },
  select: { width: '100%', padding: '10px 12px', marginBottom: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#0d1b3e', backgroundColor: 'white' },
  lineItemGrid: { display: 'grid', gridTemplateColumns: '2fr 80px 100px 36px', gap: '8px', alignItems: 'end', marginBottom: '8px' },
  addItemBtn: { padding: '7px 14px', backgroundColor: '#eff6ff', color: '#06b6d4', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  totalsBox: { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  saveBtn: { padding: '10px 22px', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  toast: (type) => ({ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', borderRadius: '10px', color: 'white', fontWeight: '600', fontSize: '14px', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', backgroundColor: type === 'error' ? '#e11d48' : '#16a34a' }),
  confirmModal: { backgroundColor: 'white', padding: '28px', borderRadius: '14px', width: '380px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' },
  confirmDelete: { padding: '10px 24px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
};

const STATUS_CONFIG = {
  unpaid:   { label: 'Unpaid',   color: '#92400e', bg: '#fef3c7' },
  paid:     { label: 'Paid',     color: '#15803d', bg: '#dcfce7' },
  overdue:  { label: 'Overdue',  color: '#991b1b', bg: '#fee2e2' },
  cancelled:{ label: 'Cancelled',color: '#64748b', bg: '#f1f5f9' },
};

const EMPTY_LINE_ITEM = { description: '', quantity: 1, price: '' };

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div style={S.toast(type)}>{type === 'error' ? '✕' : '✓'} {message}</div>;
}

export default function Invoices() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE_ITEM }]);
  const [taxRate, setTaxRate] = useState(8.5);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, custRes, woRes] = await Promise.all([
        fetch(`${API_BASE}/invoices`, { headers: authHeaders() }),
        fetch(`${API_BASE}/customers`, { headers: authHeaders() }),
        fetch(`${API_BASE}/work-orders`, { headers: authHeaders() }),
      ]);
      const [invData, custData, woData] = await Promise.all([invRes.json(), custRes.json(), woRes.json()]);
      setInvoices(invData.invoices || []);
      setCustomers(custData.customers || []);
      setWorkOrders(woData.workOrders || []);
    } catch (err) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const updateLineItem = (idx, field, val) => setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const addLineItem = () => setLineItems(prev => [...prev, { ...EMPTY_LINE_ITEM }]);
  const removeLineItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const openCreate = () => {
    setSelectedCustomerId('');
    setSelectedWorkOrderId('');
    setLineItems([{ ...EMPTY_LINE_ITEM }]);
    setTaxRate(8.5);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lineItems.some(li => !li.description || !li.price)) {
      showToast('Please fill in all line items', 'error'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          customerId: selectedCustomerId,
          workOrderId: selectedWorkOrderId || null,
          lineItems,
          subtotal: subtotal.toFixed(2),
          taxRate,
          taxAmount: taxAmount.toFixed(2),
          total: total.toFixed(2),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Server error'); }
      setShowForm(false);
      await load();
      showToast('Invoice created.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${id}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed to update');
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
      showToast(`Marked as ${status}.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEmailInvoice = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/invoices/${id}/email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Failed to send email'); return; }
      showToast('Invoice emailed successfully!');
    } catch (err) {
      showToast('Failed to send email.');
    }
  };

  const handlePaymentLink = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/invoices/${id}/payment-link`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed to create payment link'); return; }
      window.open(data.url, '_blank');
    } catch (err) {
      alert('Failed to create payment link');
    }
  };

  const handleDelete = async () => {
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API_BASE}/invoices/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      showToast('Invoice deleted.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filtered = filter === 'all' ? invoices : invoices.filter(inv => inv.status === filter);

  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
  const totalOutstanding = invoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

  const getCustomerName = (inv) => {
    if (inv.firstName) return `${inv.firstName} ${inv.lastName}`;
    const c = customers.find(c => c.id === inv.customerId);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  const customerWorkOrders = workOrders.filter(wo => wo.customerId == selectedCustomerId);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Invoices</h1>
        <button style={S.addBtn} onClick={openCreate}>+ New Invoice</button>
      </div>

      {/* Summary Bar */}
      {!loading && (
        <div style={S.summaryBar}>
          <div style={S.summaryCard('#06b6d4')}>
            <p style={S.summaryLabel}>Total Invoices</p>
            <p style={S.summaryValue}>{invoices.length}</p>
          </div>
          <div style={S.summaryCard('#16a34a')}>
            <p style={S.summaryLabel}>Revenue Collected</p>
            <p style={S.summaryValue}>${totalRevenue.toFixed(0)}</p>
          </div>
          <div style={S.summaryCard('#d97706')}>
            <p style={S.summaryLabel}>Outstanding</p>
            <p style={S.summaryValue}>${totalOutstanding.toFixed(0)}</p>
          </div>
          <div style={S.summaryCard('#7c3aed')}>
            <p style={S.summaryLabel}>Unpaid Count</p>
            <p style={S.summaryValue}>{invoices.filter(inv => inv.status === 'unpaid').length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={S.filters}>
        {[['all', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['overdue', 'Overdue']].map(([val, label]) => (
          <button key={val} style={S.filterBtn(filter === val)} onClick={() => setFilter(val)}>
            {label} ({val === 'all' ? invoices.length : invoices.filter(inv => inv.status === val).length})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '60px' }}>Loading invoices…</p>
      ) : filtered.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
          <p style={{ margin: 0, fontSize: '16px' }}>No invoices yet. Create your first one!</p>
        </div>
      ) : (
        filtered.map(inv => {
          const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.unpaid;
          const lineItems = Array.isArray(inv.lineItems) ? inv.lineItems : (typeof inv.lineItems === 'string' ? JSON.parse(inv.lineItems) : []);
          return (
            <div key={inv.id} style={S.card}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <div style={S.cardHeader}>
                <div>
                  <p style={S.invoiceNum}>{inv.invoiceNumber}</p>
                  <p style={S.customerName}>{getCustomerName(inv)}</p>
                </div>
                <div>
                  <p style={S.totalAmount}>${parseFloat(inv.total || 0).toFixed(2)}</p>
                  <div style={{ textAlign: 'right' }}>
                    <span style={S.badge(statusCfg.color, statusCfg.bg)}>{statusCfg.label}</span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {lineItems.length > 0 && (
                <table style={S.lineItemsTable}>
                  <thead>
                    <tr>
                      <th style={S.th}>Description</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>Qty</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Price</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={S.td}>{item.description}</td>
                        <td style={{ ...S.td, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>${parseFloat(item.price || 0).toFixed(2)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>${(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={S.totalsRow}><span>Subtotal</span><span>${parseFloat(inv.subtotal || 0).toFixed(2)}</span></div>
              <div style={S.totalsRow}><span>Tax ({inv.taxRate}%)</span><span>${parseFloat(inv.taxAmount || 0).toFixed(2)}</span></div>
              <div style={S.totalRow}><span>Total</span><span style={{ color: '#16a34a' }}>${parseFloat(inv.total || 0).toFixed(2)}</span></div>

              <div style={S.cardFooter}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div style={S.actionBtns}>
                  {inv.status === 'unpaid' && (
                    <button style={S.markPaidBtn} onClick={() => handleStatusChange(inv.id, 'paid')}>✓ Mark Paid</button>
                  )}
                  {inv.status === 'paid' && (
                    <button style={S.markUnpaidBtn} onClick={() => handleStatusChange(inv.id, 'unpaid')}>↩ Mark Unpaid</button>
                  )}
                  <button style={S.emailBtn} onClick={() => handleEmailInvoice(inv.id)}>📧 Email</button>
                  <button onClick={() => handlePaymentLink(inv.id)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    💳 Pay Now
                  </button>
                  <button style={S.deleteBtn} onClick={() => setDeleteTarget(inv)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Create Invoice Modal */}
      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>New Invoice</h2>
            <form onSubmit={handleSubmit}>
              <label style={S.label}>Customer</label>
              <select value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); setSelectedWorkOrderId(''); }} required style={S.select}>
                <option value="">Select a customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>

              {selectedCustomerId && (
                <>
                  <label style={S.label}>Work Order (optional)</label>
                  <select value={selectedWorkOrderId} onChange={e => setSelectedWorkOrderId(e.target.value)} style={S.select}>
                    <option value="">No linked work order</option>
                    {customerWorkOrders.map(wo => (
                      <option key={wo.id} value={wo.id}>{wo.jobType} — {wo.scheduledDate?.slice(0, 10) || 'No date'}</option>
                    ))}
                  </select>
                </>
              )}

              {/* Line Items */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...S.label, margin: 0 }}>Line Items</label>
                <button type="button" style={S.addItemBtn} onClick={addLineItem}>+ Add Item</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 100px 36px', gap: '6px', marginBottom: '6px' }}>
                {[t('description'), 'Qty', 'Price ($)', ''].map((h, i) => <span key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>{h}</span>)}
              </div>

              {lineItems.map((item, idx) => (
                <div key={idx} style={S.lineItemGrid}>
                  <input type="text" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)}
                    placeholder="e.g. Labor, Capacitor…" required
                    style={{ ...S.input, marginBottom: 0 }} />
                  <input type="number" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                    min="0.5" step="0.5" required style={{ ...S.input, marginBottom: 0 }} />
                  <input type="number" value={item.price} onChange={e => updateLineItem(idx, 'price', e.target.value)}
                    min="0" step="0.01" placeholder="0.00" required style={{ ...S.input, marginBottom: 0 }} />
                  <button type="button" onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1}
                    style={{ padding: '10px', backgroundColor: lineItems.length === 1 ? '#f1f5f9' : '#fff1f2', color: lineItems.length === 1 ? '#cbd5e1' : '#e11d48', border: 'none', borderRadius: '8px', cursor: lineItems.length === 1 ? 'default' : 'pointer', fontWeight: '700' }}>
                    ✕
                  </button>
                </div>
              ))}

              {/* Totals */}
              <div style={{ ...S.totalsBox, marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: '600' }}>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Tax Rate</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                      min="0" max="100" step="0.1"
                      style={{ width: '60px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }} />
                    <span style={{ color: '#64748b' }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                  <span style={{ color: '#64748b' }}>Tax</span>
                  <span style={{ fontWeight: '600' }}>${taxAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div style={S.modalFooter}>
                <button type="button" style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" style={S.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Generate Invoice'}</button>
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
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0d1b3e' }}>Delete Invoice?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
              This will permanently delete <strong>{deleteTarget.invoiceNumber}</strong>.
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

