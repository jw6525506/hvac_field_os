import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'https://hvacfieldos-production.up.railway.app';
const IRS_RATE = 0.67;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TaxCenter({ token }) {
  const [view, setView] = useState('overview');
  const [taxData, setTaxData] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [mileage, setMileage] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [showContractorForm, setShowContractorForm] = useState(false);
  const [showMileageForm, setShowMileageForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [contractorForm, setContractorForm] = useState({ firstName:'', lastName:'', company:'', email:'', phone:'', address:'', city:'', state:'', zip:'', taxId:'', totalPaid:'', notes:'' });
  const [mileageForm, setMileageForm] = useState({ date: new Date().toISOString().split('T')[0], startLocation:'', endLocation:'', miles:'', purpose:'' });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadTaxData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tax/export?year=${year}`, { headers });
      const data = await res.json();
      setTaxData(data);
    } catch(e) {}
    setLoading(false);
  }, [token, year]);

  const loadContractors = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/contractors-1099?year=${year}`, { headers });
      const data = await res.json();
      setContractors(Array.isArray(data) ? data : []);
    } catch(e) {}
  }, [token, year]);

  const loadMileage = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/mileage?year=${year}`, { headers });
      const data = await res.json();
      setMileage(Array.isArray(data) ? data : []);
    } catch(e) {}
  }, [token, year]);

  useEffect(() => {
    loadTaxData();
    loadContractors();
    loadMileage();
  }, [loadTaxData, loadContractors, loadMileage]);

  const saveContractor = async () => {
    if (!contractorForm.firstName || !contractorForm.lastName) return alert('First and last name required');
    try {
      const url = editingContractor ? `${API}/api/contractors-1099/${editingContractor.id}` : `${API}/api/contractors-1099`;
      const method = editingContractor ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify({ ...contractorForm, year }) });
      setShowContractorForm(false);
      setEditingContractor(null);
      setContractorForm({ firstName:'', lastName:'', company:'', email:'', phone:'', address:'', city:'', state:'', zip:'', taxId:'', totalPaid:'', notes:'' });
      loadContractors();
      loadTaxData();
    } catch(e) { alert('Error saving contractor'); }
  };

  const deleteContractor = async (id) => {
    if (!window.confirm('Delete this contractor?')) return;
    await fetch(`${API}/api/contractors-1099/${id}`, { method: 'DELETE', headers });
    loadContractors();
  };

  const saveMileage = async () => {
    if (!mileageForm.miles || !mileageForm.date) return alert('Date and miles required');
    try {
      await fetch(`${API}/api/mileage`, { method: 'POST', headers, body: JSON.stringify(mileageForm) });
      setShowMileageForm(false);
      setMileageForm({ date: new Date().toISOString().split('T')[0], startLocation:'', endLocation:'', miles:'', purpose:'' });
      loadMileage();
      loadTaxData();
    } catch(e) { alert('Error saving mileage'); }
  };

  const deleteMileage = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await fetch(`${API}/api/mileage/${id}`, { method: 'DELETE', headers });
    loadMileage();
  };

  const totalMiles = mileage.reduce((s, m) => s + parseFloat(m.miles || 0), 0);
  const totalMileageDeduction = totalMiles * IRS_RATE;
  const needs1099 = contractors.filter(c => parseFloat(c.totalPaid || 0) >= 600);

  const S = {
    container: { padding: '16px', maxWidth: '960px', margin: '0 auto', fontFamily: 'sans-serif', color: '#f1f5f9' },
    card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    tab: (a) => ({ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: a ? '#06b6d4' : '#334155', color: a ? '#fff' : '#94a3b8' }),
    btn: (c='#06b6d4') => ({ padding: '8px 16px', background: c, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }),
    input: { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
    grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' },
    th: { padding: '10px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '700', borderBottom: '1px solid #334155' },
    td: { padding: '10px', fontSize: '13px', borderBottom: '1px solid #0f172a' },
    table: { width: '100%', borderCollapse: 'collapse' },
    badge: (c) => ({ background: c, color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }),
    statCard: (c) => ({ background: c, borderRadius: '10px', padding: '16px', textAlign: 'center' }),
  };

  const exportCSV = () => {
    if (!taxData) return;
    const rows = [
      ['Helix8 Tax Export', taxData.year],
      ['Company', taxData.company?.name],
      [],
      ['SUMMARY'],
      ['Total Revenue', `$${taxData.summary?.totalRevenue?.toFixed(2)}`],
      ['Total Expenses', `$${taxData.summary?.totalExpenses?.toFixed(2)}`],
      ['Mileage Deduction', `$${taxData.summary?.mileageDeduction?.toFixed(2)}`],
      ['Net Profit', `$${taxData.summary?.netProfit?.toFixed(2)}`],
      [],
      ['EXPENSES BY CATEGORY'],
      ['Category', 'Schedule C', 'IRS Description', 'Total'],
      ...(taxData.expensesByCategory || []).map(e => [e.category, e.taxCategory, e.irsDescription, `$${e.total?.toFixed(2)}`]),
      [],
      ['1099 CONTRACTORS'],
      ['Name', 'Company', 'Tax ID', 'Total Paid', 'Requires 1099'],
      ...(taxData.contractors1099 || []).map(c => [`${c.firstName} ${c.lastName}`, c.company||'', c.taxId||'', `$${parseFloat(c.totalPaid).toFixed(2)}`, parseFloat(c.totalPaid) >= 600 ? 'YES' : 'No']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Helix8_Tax_${taxData.year}.csv`;
    a.click();
  };

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🧾 Tax Center</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>IRS Schedule C tracking, 1099s, and mileage log</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select style={{ ...S.input, width: '100px' }} value={year} onChange={e => setYear(e.target.value)}>
            {['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
          </select>
          <button style={S.btn('#16a34a')} onClick={exportCSV}>📥 Export CSV</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button style={S.tab(view==='overview')} onClick={() => setView('overview')}>📊 Overview</button>
        <button style={S.tab(view==='expenses')} onClick={() => setView('expenses')}>💸 Expense Categories</button>
        <button style={S.tab(view==='contractors')} onClick={() => setView('contractors')}>👷 1099 Contractors</button>
        <button style={S.tab(view==='mileage')} onClick={() => setView('mileage')}>🚗 Mileage Log</button>
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <>
          {loading ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</p> : taxData && (
            <>
              <div style={S.grid4}>
                <div style={S.statCard('#064e3b')}>
                  <div style={{ fontSize: '11px', color: '#6ee7b7', marginBottom: '4px' }}>TOTAL REVENUE</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#34d399' }}>${taxData.summary?.totalRevenue?.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#6ee7b7' }}>{taxData.summary?.invoiceCount} invoices</div>
                </div>
                <div style={S.statCard('#7f1d1d')}>
                  <div style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '4px' }}>TOTAL EXPENSES</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#f87171' }}>${taxData.summary?.totalExpenses?.toFixed(2)}</div>
                </div>
                <div style={S.statCard('#1e3a5f')}>
                  <div style={{ fontSize: '11px', color: '#93c5fd', marginBottom: '4px' }}>MILEAGE DEDUCTION</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#60a5fa' }}>${taxData.summary?.mileageDeduction?.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#93c5fd' }}>{taxData.summary?.totalMiles?.toFixed(1)} miles @ $0.67</div>
                </div>
                <div style={S.statCard(taxData.summary?.netProfit >= 0 ? '#1e3a5f' : '#7f1d1d')}>
                  <div style={{ fontSize: '11px', color: '#c4b5fd', marginBottom: '4px' }}>NET PROFIT</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: taxData.summary?.netProfit >= 0 ? '#a78bfa' : '#f87171' }}>${taxData.summary?.netProfit?.toFixed(2)}</div>
                </div>
              </div>

              {needs1099.length > 0 && (
                <div style={{ ...S.card, background: '#422006', border: '1px solid #d97706' }}>
                  <h3 style={{ margin: '0 0 8px', color: '#fbbf24' }}>⚠️ 1099 Required</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#fcd34d' }}>
                    {needs1099.length} contractor{needs1099.length > 1 ? 's have' : ' has'} been paid $600 or more and require{needs1099.length === 1 ? 's' : ''} a 1099 form by January 31st.
                  </p>
                  <div style={{ marginTop: '8px' }}>
                    {needs1099.map(c => (
                      <span key={c.id} style={{ ...S.badge('#d97706'), marginRight: '6px' }}>{c.firstName} {c.lastName} — ${parseFloat(c.totalPaid).toFixed(2)}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={S.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Schedule C Summary — {year}</h3>
                <table style={S.table}>
                  <thead><tr><th style={S.th}>Category</th><th style={S.th}>Schedule C Line</th><th style={S.th}>IRS Description</th><th style={S.th}>Amount</th></tr></thead>
                  <tbody>
                    {taxData.expensesByCategory?.map(e => (
                      <tr key={e.category}>
                        <td style={{ ...S.td, fontWeight: '600' }}>{e.category}</td>
                        <td style={{ ...S.td, color: '#06b6d4', fontSize: '12px' }}>{e.taxCategory}</td>
                        <td style={{ ...S.td, color: '#94a3b8', fontSize: '12px' }}>{e.irsDescription}</td>
                        <td style={{ ...S.td, fontWeight: '700', color: '#f87171' }}>${e.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                    {taxData.summary?.mileageDeduction > 0 && (
                      <tr>
                        <td style={{ ...S.td, fontWeight: '600' }}>Mileage</td>
                        <td style={{ ...S.td, color: '#06b6d4', fontSize: '12px' }}>Line 9 - Car and truck</td>
                        <td style={{ ...S.td, color: '#94a3b8', fontSize: '12px' }}>Standard mileage rate ({taxData.summary?.totalMiles?.toFixed(1)} miles)</td>
                        <td style={{ ...S.td, fontWeight: '700', color: '#f87171' }}>${taxData.summary?.mileageDeduction?.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ ...S.card, background: '#1a2744', border: '1px solid #3b82f6' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd' }}>
                  📤 <strong>For your accountant:</strong> Click Export CSV to download a complete tax summary including Schedule C categories, 1099 contractors, and mileage log. This covers the full {year} tax year.
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* ── EXPENSE CATEGORIES ── */}
      {view === 'expenses' && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px' }}>IRS Schedule C — Expense Categories</h3>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Your Category</th><th style={S.th}>Schedule C Line</th><th style={S.th}>IRS Description</th><th style={S.th}>Tax Deductible</th></tr></thead>
            <tbody>
              {[
                ['Parts & Materials', 'Line 22 - Supplies', 'Supplies and materials used in business', true],
                ['Tools & Equipment', 'Line 22 - Supplies', 'Tools and equipment under $2,500', true],
                ['Vehicle & Fuel', 'Line 9 - Car and truck', 'Business use of vehicle at $0.67/mile', true],
                ['Insurance', 'Line 15 - Insurance', 'Business insurance premiums', true],
                ['Marketing & Advertising', 'Line 8 - Advertising', 'All advertising and marketing costs', true],
                ['Office & Admin', 'Line 18 - Office expense', 'Office supplies and administrative costs', true],
                ['Subcontractors', 'Line 11 - Contract labor', 'Payments to subcontractors (1099 if $600+)', true],
                ['Utilities', 'Line 25 - Utilities', 'Business phone, internet, utilities', true],
                ['Training & Licenses', 'Line 27a - Other expenses', 'Professional licenses and education', true],
                ['Other', 'Line 27a - Other expenses', 'Other ordinary and necessary business expenses', true],
              ].map(([cat, line, desc, deductible]) => (
                <tr key={cat}>
                  <td style={{ ...S.td, fontWeight: '600' }}>{cat}</td>
                  <td style={{ ...S.td, color: '#06b6d4', fontSize: '12px' }}>{line}</td>
                  <td style={{ ...S.td, color: '#94a3b8', fontSize: '12px' }}>{desc}</td>
                  <td style={S.td}><span style={S.badge('#16a34a')}>✅ Deductible</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 1099 CONTRACTORS ── */}
      {view === 'contractors' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Subcontractors paid $600+ require a 1099-NEC by January 31st</p>
            <button style={S.btn()} onClick={() => { setShowContractorForm(true); setEditingContractor(null); }}>+ Add Contractor</button>
          </div>

          {showContractorForm && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 16px' }}>{editingContractor ? 'Edit Contractor' : 'Add 1099 Contractor'}</h3>
              <div style={{ ...S.grid2, marginBottom: '12px' }}>
                <div><label style={S.label}>First Name *</label><input style={S.input} value={contractorForm.firstName} onChange={e => setContractorForm({...contractorForm, firstName: e.target.value})} /></div>
                <div><label style={S.label}>Last Name *</label><input style={S.input} value={contractorForm.lastName} onChange={e => setContractorForm({...contractorForm, lastName: e.target.value})} /></div>
                <div><label style={S.label}>Company</label><input style={S.input} value={contractorForm.company} onChange={e => setContractorForm({...contractorForm, company: e.target.value})} /></div>
                <div><label style={S.label}>Tax ID (SSN/EIN)</label><input style={S.input} placeholder="XXX-XX-XXXX" value={contractorForm.taxId} onChange={e => setContractorForm({...contractorForm, taxId: e.target.value})} /></div>
                <div><label style={S.label}>Total Paid This Year ($)</label><input style={S.input} type="number" step="0.01" value={contractorForm.totalPaid} onChange={e => setContractorForm({...contractorForm, totalPaid: e.target.value})} /></div>
                <div><label style={S.label}>Phone</label><input style={S.input} value={contractorForm.phone} onChange={e => setContractorForm({...contractorForm, phone: e.target.value})} /></div>
                <div><label style={S.label}>Email</label><input style={S.input} value={contractorForm.email} onChange={e => setContractorForm({...contractorForm, email: e.target.value})} /></div>
                <div><label style={S.label}>Address</label><input style={S.input} value={contractorForm.address} onChange={e => setContractorForm({...contractorForm, address: e.target.value})} /></div>
              </div>
              <div style={{ ...S.grid3, marginBottom: '16px' }}>
                <div><label style={S.label}>City</label><input style={S.input} value={contractorForm.city} onChange={e => setContractorForm({...contractorForm, city: e.target.value})} /></div>
                <div><label style={S.label}>State</label><input style={S.input} value={contractorForm.state} onChange={e => setContractorForm({...contractorForm, state: e.target.value})} /></div>
                <div><label style={S.label}>ZIP</label><input style={S.input} value={contractorForm.zip} onChange={e => setContractorForm({...contractorForm, zip: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn()} onClick={saveContractor}>{editingContractor ? 'Save Changes' : 'Add Contractor'}</button>
                <button style={S.btn('#475569')} onClick={() => { setShowContractorForm(false); setEditingContractor(null); }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={S.card}>
            {contractors.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No contractors added yet. Add subcontractors you paid this year.</p>
            ) : (
              <table style={S.table}>
                <thead><tr><th style={S.th}>Name</th><th style={S.th}>Company</th><th style={S.th}>Tax ID</th><th style={S.th}>Total Paid</th><th style={S.th}>1099 Required</th><th style={S.th}>Actions</th></tr></thead>
                <tbody>
                  {contractors.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...S.td, fontWeight: '700' }}>{c.firstName} {c.lastName}</td>
                      <td style={S.td}>{c.company || '—'}</td>
                      <td style={S.td}>{c.taxId || '⚠️ Missing'}</td>
                      <td style={{ ...S.td, fontWeight: '700', color: '#f87171' }}>${parseFloat(c.totalPaid).toFixed(2)}</td>
                      <td style={S.td}>
                        {parseFloat(c.totalPaid) >= 600
                          ? <span style={S.badge('#d97706')}>⚠️ YES - File 1099</span>
                          : <span style={S.badge('#334155')}>No</span>}
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={S.btn('#334155')} onClick={() => { setContractorForm({...c}); setEditingContractor(c); setShowContractorForm(true); }}>Edit</button>
                          <button style={S.btn('#dc2626')} onClick={() => deleteContractor(c.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── MILEAGE LOG ── */}
      {view === 'mileage' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ ...S.card, padding: '12px 20px', marginBottom: 0, display: 'flex', gap: '24px' }}>
              <div><div style={{ fontSize: '20px', fontWeight: '700', color: '#60a5fa' }}>{totalMiles.toFixed(1)}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Miles</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: '700', color: '#34d399' }}>${totalMileageDeduction.toFixed(2)}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>Tax Deduction @ $0.67/mi</div></div>
            </div>
            <button style={S.btn()} onClick={() => setShowMileageForm(true)}>+ Log Miles</button>
          </div>

          {showMileageForm && (
            <div style={S.card}>
              <h3 style={{ margin: '0 0 16px' }}>Log Business Miles</h3>
              <div style={{ ...S.grid2, marginBottom: '12px' }}>
                <div><label style={S.label}>Date *</label><input style={S.input} type="date" value={mileageForm.date} onChange={e => setMileageForm({...mileageForm, date: e.target.value})} /></div>
                <div><label style={S.label}>Miles *</label><input style={S.input} type="number" step="0.1" placeholder="0.0" value={mileageForm.miles} onChange={e => setMileageForm({...mileageForm, miles: e.target.value})} /></div>
                <div><label style={S.label}>From</label><input style={S.input} placeholder="Starting location" value={mileageForm.startLocation} onChange={e => setMileageForm({...mileageForm, startLocation: e.target.value})} /></div>
                <div><label style={S.label}>To</label><input style={S.input} placeholder="Destination" value={mileageForm.endLocation} onChange={e => setMileageForm({...mileageForm, endLocation: e.target.value})} /></div>
              </div>
              <div style={{ marginBottom: '16px' }}><label style={S.label}>Purpose</label><input style={S.input} placeholder="Customer visit, supply run, etc." value={mileageForm.purpose} onChange={e => setMileageForm({...mileageForm, purpose: e.target.value})} /></div>
              {mileageForm.miles && <p style={{ margin: '0 0 16px', color: '#34d399', fontSize: '13px' }}>💰 Tax deduction: ${(parseFloat(mileageForm.miles || 0) * IRS_RATE).toFixed(2)}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn()} onClick={saveMileage}>Save Miles</button>
                <button style={S.btn('#475569')} onClick={() => setShowMileageForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={S.card}>
            {mileage.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No mileage logged yet. Start tracking your business miles for tax deductions.</p>
            ) : (
              <table style={S.table}>
                <thead><tr><th style={S.th}>Date</th><th style={S.th}>From → To</th><th style={S.th}>Purpose</th><th style={S.th}>Miles</th><th style={S.th}>Deduction</th><th style={S.th}></th></tr></thead>
                <tbody>
                  {mileage.map(m => (
                    <tr key={m.id}>
                      <td style={S.td}>{new Date(m.date).toLocaleDateString()}</td>
                      <td style={S.td}>{[m.startLocation, m.endLocation].filter(Boolean).join(' → ') || '—'}</td>
                      <td style={S.td}>{m.purpose || '—'}</td>
                      <td style={{ ...S.td, fontWeight: '700' }}>{parseFloat(m.miles).toFixed(1)} mi</td>
                      <td style={{ ...S.td, color: '#34d399', fontWeight: '700' }}>${(parseFloat(m.miles) * IRS_RATE).toFixed(2)}</td>
                      <td style={S.td}><button style={S.btn('#dc2626')} onClick={() => deleteMileage(m.id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
