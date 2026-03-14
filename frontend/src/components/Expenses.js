import React, { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  'Parts & Materials', 'Tools & Equipment', 'Vehicle & Fuel',
  'Insurance', 'Marketing & Advertising', 'Office & Admin',
  'Subcontractors', 'Utilities', 'Training & Licenses', 'Other'
];

const API = process.env.REACT_APP_API_URL || 'https://hvacfieldos-production.up.railway.app';

export default function Expenses({ token }) {
  const [expenses, setExpenses] = useState([]);
  const [report, setReport] = useState(null);
  const [view, setView] = useState('expenses');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterCategory, setFilterCategory] = useState('');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: CATEGORIES[0],
    description: '',
    amount: '',
    vendor: '',
    notes: ''
  });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/expenses?year=${filterYear}`;
      if (filterMonth) url += `&month=${filterMonth}`;
      if (filterCategory) url += `&category=${encodeURIComponent(filterCategory)}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) { setExpenses([]); }
    setLoading(false);
  }, [token, filterMonth, filterYear, filterCategory]);

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/reports/financial?year=${reportYear}`, { headers });
      const data = await res.json();
      setReport(data);
    } catch (e) {}
  }, [token, reportYear]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { if (view === 'report') loadReport(); }, [view, loadReport]);

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], category: CATEGORIES[0], description: '', amount: '', vendor: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.description || !form.amount || !form.date) return alert('Please fill in required fields');
    try {
      const url = editingId ? `${API}/api/expenses/${editingId}` : `${API}/api/expenses`;
      const method = editingId ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(form) });
      resetForm();
      loadExpenses();
    } catch (e) { alert('Error saving expense'); }
  };

  const handleEdit = (exp) => {
    setForm({
      date: exp.date?.split('T')[0] || exp.date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      vendor: exp.vendor || '',
      notes: exp.notes || ''
    });
    setEditingId(exp.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await fetch(`${API}/api/expenses/${id}`, { method: 'DELETE', headers });
    loadExpenses();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const S = {
    container: { padding: '16px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', color: '#f1f5f9' },
    card: { background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    tabRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
    tab: (active) => ({ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: active ? '#06b6d4' : '#334155', color: active ? '#fff' : '#94a3b8' }),
    btn: (color='#06b6d4') => ({ padding: '8px 16px', background: color, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }),
    input: { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
    statCard: (color) => ({ background: color, borderRadius: '10px', padding: '14px', textAlign: 'center', marginBottom: '16px' }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '700', borderBottom: '1px solid #334155' },
    td: { padding: '10px', fontSize: '13px', borderBottom: '1px solid #1e293b' },
    badge: (color) => ({ background: color, color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }),
  };

  const categoryColors = {
    'Parts & Materials': '#0284c7', 'Tools & Equipment': '#7c3aed', 'Vehicle & Fuel': '#dc2626',
    'Insurance': '#059669', 'Marketing & Advertising': '#d97706', 'Office & Admin': '#6366f1',
    'Subcontractors': '#db2777', 'Utilities': '#0891b2', 'Training & Licenses': '#16a34a', 'Other': '#64748b'
  };

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>💰 Expenses & Reports</h2>
        {view === 'expenses' && <button style={S.btn()} onClick={() => { resetForm(); setShowForm(true); }}>+ Add Expense</button>}
      </div>

      <div style={S.tabRow}>
        <button style={S.tab(view === 'expenses')} onClick={() => setView('expenses')}>📋 Expenses</button>
        <button style={S.tab(view === 'report')} onClick={() => setView('report')}>📊 Financial Report</button>
      </div>

      {view === 'expenses' && (
        <>
          {showForm && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
              <div style={S.grid2}>
                <div><label style={S.label}>Date *</label><input style={S.input} type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><label style={S.label}>Category *</label><select style={S.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label style={S.label}>Description *</label><input style={S.input} placeholder="What was this expense for?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div><label style={S.label}>Amount ($) *</label><input style={S.input} type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
                <div><label style={S.label}>Vendor</label><input style={S.input} placeholder="Store or vendor name" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} /></div>
                <div><label style={S.label}>Notes</label><input style={S.input} placeholder="Optional notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button style={S.btn()} onClick={handleSubmit}>{editingId ? 'Save Changes' : 'Add Expense'}</button>
                <button style={S.btn('#475569')} onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{...S.card, padding: '12px'}}>
            <div style={S.grid3}>
              <div><label style={S.label}>Month</label><select style={S.input} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}><option value="">All Months</option>{MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}</select></div>
              <div><label style={S.label}>Year</label><select style={S.input} value={filterYear} onChange={e => setFilterYear(e.target.value)}>{['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}</select></div>
              <div><label style={S.label}>Category</label><select style={S.input} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="">All Categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
          </div>

          <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
            <span style={{ color: '#94a3b8', fontWeight: '600' }}>Total ({expenses.length} items)</span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#f87171' }}>${totalExpenses.toFixed(2)}</span>
          </div>

          <div style={S.card}>
            {loading ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</p> : (
              <table style={S.table}>
                <thead><tr><th style={S.th}>Date</th><th style={S.th}>Category</th><th style={S.th}>Description</th><th style={S.th}>Vendor</th><th style={S.th}>Amount</th><th style={S.th}>Actions</th></tr></thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#64748b', padding: '32px' }}>No expenses yet. Add your first expense above.</td></tr>
                  ) : expenses.map(exp => (
                    <tr key={exp.id}>
                      <td style={S.td}>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={S.td}><span style={S.badge(categoryColors[exp.category] || '#64748b')}>{exp.category}</span></td>
                      <td style={S.td}>{exp.description}{exp.notes && <div style={{ fontSize: '11px', color: '#64748b' }}>{exp.notes}</div>}</td>
                      <td style={S.td}>{exp.vendor || '—'}</td>
                      <td style={{ ...S.td, fontWeight: '700', color: '#f87171' }}>${parseFloat(exp.amount).toFixed(2)}</td>
                      <td style={S.td}><div style={{ display: 'flex', gap: '6px' }}><button style={S.btn('#334155')} onClick={() => handleEdit(exp)}>Edit</button><button style={S.btn('#dc2626')} onClick={() => handleDelete(exp.id)}>Del</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'report' && (
        <>
          <div style={{ ...S.card, padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ ...S.label, margin: 0 }}>Year:</label>
            <select style={{ ...S.input, width: '120px' }} value={reportYear} onChange={e => setReportYear(e.target.value)}>{['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}</select>
            <button style={S.btn()} onClick={loadReport}>Generate Report</button>
          </div>

          {report && (
            <>
              <div style={S.grid3}>
                <div style={S.statCard('#064e3b')}><div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '4px' }}>TOTAL REVENUE</div><div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399' }}>${report.totalRevenue.toFixed(2)}</div></div>
                <div style={S.statCard('#7f1d1d')}><div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '4px' }}>TOTAL EXPENSES</div><div style={{ fontSize: '22px', fontWeight: '700', color: '#f87171' }}>${report.totalExpenses.toFixed(2)}</div></div>
                <div style={S.statCard(report.netProfit >= 0 ? '#1e3a5f' : '#7f1d1d')}><div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '4px' }}>NET PROFIT</div><div style={{ fontSize: '22px', fontWeight: '700', color: report.netProfit >= 0 ? '#60a5fa' : '#f87171' }}>${report.netProfit.toFixed(2)}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{report.profitMargin}% margin</div></div>
              </div>

              <div style={{ ...S.card }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Monthly Breakdown</h3>
                <table style={S.table}>
                  <thead><tr><th style={S.th}>Month</th><th style={S.th}>Revenue</th><th style={S.th}>Expenses</th><th style={S.th}>Net Profit</th><th style={S.th}>Margin</th></tr></thead>
                  <tbody>
                    {report.monthly.map(m => (
                      <tr key={m.month}>
                        <td style={S.td}>{MONTHS[m.month-1]}</td>
                        <td style={{ ...S.td, color: '#34d399' }}>${m.revenue.toFixed(2)}</td>
                        <td style={{ ...S.td, color: '#f87171' }}>${m.expenses.toFixed(2)}</td>
                        <td style={{ ...S.td, fontWeight: '700', color: m.profit >= 0 ? '#60a5fa' : '#f87171' }}>${m.profit.toFixed(2)}</td>
                        <td style={S.td}>{m.revenue > 0 ? ((m.profit/m.revenue)*100).toFixed(1)+'%' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {report.byCategory?.length > 0 && (
                <div style={S.card}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Expenses by Category</h3>
                  {report.byCategory.map(c => (
                    <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                      <span style={S.badge(categoryColors[c.category] || '#64748b')}>{c.category}</span>
                      <span style={{ fontWeight: '700', color: '#f87171' }}>${parseFloat(c.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ ...S.card, background: '#1a2744', border: '1px solid #3b82f6' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd' }}>
                  📤 <strong>Tax Time:</strong> Share this report with your accountant. Revenue comes from paid invoices. Expenses are categorized for easy deduction tracking. This covers the full {reportYear} fiscal year.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
