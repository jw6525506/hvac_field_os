import React, { useState, useEffect } from 'react';

const API_BASE = 'https://hvacfieldos-production.up.railway.app/api';

function SuperAdmin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('superAdminToken') || '');
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [churnRisk, setChurnRisk] = useState([]);
  const [neverUsed, setNeverUsed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [activeTab, setActiveTab] = useState('companies');
  const [leads, setLeads] = useState(JSON.parse(localStorage.getItem('helix8_leads') || '[]'));
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ company: '', contact: '', phone: '', email: '', industry: '', status: 'not_contacted', notes: '', followUpDate: '' });
  const [editingLead, setEditingLead] = useState(null);
  const [dbLeads, setDbLeads] = useState([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(1);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbIndustry, setDbIndustry] = useState('');
  const [dbState2, setDbState2] = useState('');

  useEffect(() => {
    if (token) { setAuthed(true); loadStats(); }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/super-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      localStorage.setItem('superAdminToken', data.token);
      setToken(data.token);
      setAuthed(true);
      loadStats(data.token);
    } catch (err) {
      setError('Cannot connect to server');
    }
  };

  const loadStats = async (t) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/super-admin/stats`, {
        headers: { 'Authorization': `Bearer ${t || token}` }
      });
      if (res.status === 401) { setAuthed(false); localStorage.removeItem('superAdminToken'); return; }
      const data = await res.json();
      setStats(data.stats);
      setCompanies(data.companies);
      setChurnRisk(data.churnRisk || []);
      setNeverUsed(data.neverUsed || []);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadDbLeads = async (page=1, search=dbSearch, industry=dbIndustry, state=dbState2) => {
    setDbLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.append('search', search);
      if (industry) params.append('industry', industry);
      if (state) params.append('state', state);
      const res = await fetch(API_BASE + '/super-admin/leads?' + params, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      setDbLeads(data.leads || []);
      setDbTotal(data.total || 0);
      setDbPage(page);
    } catch(e) { console.error(e); }
    finally { setDbLoading(false); }
  };

  const updateDbLead = async (id, status) => {
    await fetch(API_BASE + '/super-admin/leads/' + id, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes: '' })
    });
    setDbLeads(prev => prev.map(l => l.id === id ? {...l, status} : l));
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    setAuthed(false);
    setToken('');
    setStats(null);
    setCompanies([]);
  };

  const filtered = (companies || []).filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase());
    const matchIndustry = filterIndustry === 'all' || c.industry === filterIndustry;
    return matchSearch && matchIndustry;
  });

  const industries = [...new Set((companies || []).map(c => c.industry).filter(Boolean))];

  const saveLead = () => {
    if (!newLead.company) return;
    const lead = { ...newLead, id: Date.now(), createdAt: new Date().toISOString(), calls: [] };
    const updated = [lead, ...leads];
    setLeads(updated);
    localStorage.setItem('helix8_leads', JSON.stringify(updated));
    setNewLead({ company: '', contact: '', phone: '', email: '', industry: '', status: 'not_contacted', notes: '', followUpDate: '' });
    setShowAddLead(false);
  };

  const updateLead = (id, changes) => {
    const updated = leads.map(l => l.id === id ? { ...l, ...changes } : l);
    setLeads(updated);
    localStorage.setItem('helix8_leads', JSON.stringify(updated));
  };

  const deleteLead = (id) => {
    if (!window.confirm('Delete this lead?')) return;
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    localStorage.setItem('helix8_leads', JSON.stringify(updated));
  };

  const addCallLog = (id, note) => {
    const updated = leads.map(l => l.id === id ? { ...l, calls: [...(l.calls||[]), { note, date: new Date().toISOString() }] } : l);
    setLeads(updated);
    localStorage.setItem('helix8_leads', JSON.stringify(updated));
  };

  const statusColors = {
    not_contacted: '#64748b',
    contacted: '#06b6d4',
    interested: '#f59e0b',
    demo_scheduled: '#8b5cf6',
    signed_up: '#22c55e',
    not_interested: '#ef4444',
  };

  const statusLabels = {
    not_contacted: 'Not Contacted',
    contacted: 'Contacted',
    interested: 'Interested',
    demo_scheduled: 'Demo Scheduled',
    signed_up: '✅ Signed Up',
    not_interested: 'Not Interested',
  };

  const S = {
    page: { minHeight: '100vh', backgroundColor: '#04081a', color: 'white', fontFamily: 'Segoe UI, sans-serif' },
    header: { backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(6,182,212,0.2)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { fontSize: '22px', fontWeight: '800', color: 'white' },
    logoAccent: { color: '#06b6d4' },
    badge: { backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
    body: { padding: '32px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
    statCard: { backgroundColor: '#0a0f2c', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '12px', padding: '24px' },
    statNum: { fontSize: '36px', fontWeight: '800', color: '#06b6d4', marginBottom: '4px' },
    statLabel: { fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' },
    filters: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    input: { padding: '10px 14px', backgroundColor: '#0a0f2c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#0a0f2c', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(6,182,212,0.15)' },
    th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '14px 16px', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    logoutBtn: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  };

  if (!authed) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Helix<span style={{ color: '#06b6d4' }}>8</span></div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Super Admin — Octave Labs</div>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter super admin password"
              style={{ ...S.input, width: '100%', marginBottom: '12px', boxSizing: 'border-box', padding: '14px' }}
              required
            />
            {error && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#06b6d4', color: '#04081a', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.logo}>Helix<span style={S.logoAccent}>8</span> <span style={{ fontSize: '14px', fontWeight: '400', color: '#64748b' }}>Super Admin</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={S.badge}>Octave Labs</span>
          <button style={S.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={S.body}>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', backgroundColor: '#0a0f2c', borderRadius: '10px', padding: '4px', width: 'fit-content', border: '1px solid rgba(6,182,212,0.15)' }}>
          {[['companies', '🏢 Companies'], ['leads', '📞 CRM Leads'], ['dbleads', '📋 Database Leads']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', backgroundColor: activeTab === tab ? '#06b6d4' : 'transparent', color: activeTab === tab ? '#0a0f2c' : '#94a3b8' }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: '#64748b' }}>Loading...</p>}

        {activeTab === 'companies' && <>
        {stats && (
          <div style={S.statsGrid}>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.totalCompanies}</div>
              <div style={S.statLabel}>Total Companies</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.totalUsers}</div>
              <div style={S.statLabel}>Total Users</div>
            </div>
            <div style={S.statCard}>
              <div style={{ ...S.statNum, color: '#22c55e' }}>${parseFloat(stats.totalRevenue).toFixed(2)}</div>
              <div style={S.statLabel}>Total Revenue Processed</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.activeToday}</div>
              <div style={S.statLabel}>Active Today</div>
            </div>
          </div>
        )}

        {/* MRR + Subscription Stats */}
        {stats && (
          <div style={{ ...S.statsGrid, marginBottom: '24px' }}>
            <div style={{ ...S.statCard, borderColor: 'rgba(34,197,94,0.3)' }}>
              <div style={{ ...S.statNum, color: '#22c55e' }}>${stats.mrr || 0}</div>
              <div style={S.statLabel}>Monthly Recurring Revenue</div>
            </div>
            <div style={S.statCard}>
              <div style={S.statNum}>{stats.trialing || 0}</div>
              <div style={S.statLabel}>On Free Trial</div>
            </div>
            <div style={S.statCard}>
              <div style={{ ...S.statNum, color: '#22c55e' }}>{stats.paid || 0}</div>
              <div style={S.statLabel}>Paying Customers</div>
            </div>
            <div style={{ ...S.statCard, borderColor: 'rgba(239,68,68,0.3)' }}>
              <div style={{ ...S.statNum, color: '#ef4444' }}>{stats.cancelled || 0}</div>
              <div style={S.statLabel}>Cancelled</div>
            </div>
          </div>
        )}

        {/* Churn Risk Alerts */}
        {churnRisk.length > 0 && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', color: '#ef4444', marginBottom: '12px', fontSize: '15px' }}>
              ⚠ Churn Risk — {churnRisk.length} companies signed up 3+ days ago with zero work orders
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {churnRisk.map(c => (
                <div key={c.id} style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600', color: 'white' }}>{c.name}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{c.email}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#94a3b8' }}>
              💡 Call or email these companies — they signed up but never created a work order. One personal touch could save the account.
            </div>
          </div>
        )}

        {/* Never Used Alerts */}
        {neverUsed.length > 0 && (
          <div style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', color: '#fbbf24', marginBottom: '12px', fontSize: '15px' }}>
              👋 Never Added a Customer — {neverUsed.length} companies need onboarding help
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {neverUsed.map(c => (
                <div key={c.id} style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600', color: 'white' }}>{c.name}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{c.email}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#94a3b8' }}>
              💡 These companies signed up but never added a customer. Send them a quick setup guide or jump on a call.
            </div>
          </div>
        )}

        <div style={S.filters}>
          <input style={{ ...S.input, minWidth: '260px' }} placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={S.input} value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
            <option value="all">All Industries</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={() => loadStats()} style={{ ...S.input, cursor: 'pointer', color: '#06b6d4', borderColor: 'rgba(6,182,212,0.3)' }}>↻ Refresh</button>
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Company</th>
              <th style={S.th}>Industry</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Size</th>
              <th style={S.th}>Users</th>
              <th style={S.th}>Customers</th>
              <th style={S.th}>Work Orders</th>
              <th style={S.th}>Revenue</th>
              <th style={S.th}>Signed Up</th>
              <th style={S.th}>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ ...S.td, textAlign: 'center', color: '#64748b', padding: '40px' }}>No companies yet</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} style={{ transition: 'background 0.2s' }}>
                <td style={S.td}>
                  <div style={{ fontWeight: '600', color: 'white' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{c.email}</div>
                </td>
                <td style={S.td}><span style={{ color: '#06b6d4' }}>{c.industry || '—'}</span></td>
                <td style={S.td}>{c.city && c.state ? `${c.city}, ${c.state}` : c.city || c.state || '—'}</td>
                <td style={S.td}>{c.employeeCount || '—'}</td>
                <td style={S.td}><span style={{ fontWeight: '700' }}>{c.userCount}</span></td>
                <td style={S.td}>{c.customerCount}</td>
                <td style={S.td}>{c.workOrderCount}</td>
                <td style={S.td}><span style={{ color: '#22c55e', fontWeight: '700' }}>${parseFloat(c.totalRevenue).toFixed(2)}</span></td>
                <td style={S.td}><span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(c.createdAt).toLocaleDateString()}</span></td>
                <td style={S.td}><span style={{ fontSize: '12px', color: '#94a3b8' }}>{c.referralSource || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </>}


        {activeTab === 'dbleads' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <h2 style={{margin:0,color:'white',fontSize:'20px',fontWeight:'800'}}>Database Leads</h2>
                <p style={{margin:'4px 0 0',color:'#64748b',fontSize:'13px'}}>{dbTotal.toLocaleString()} total leads from FL + TX public records</p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'20px'}}>
              <div style={{backgroundColor:'#0a0f2c',border:'1px solid rgba(6,182,212,0.15)',borderRadius:'10px',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:'800',color:'#06b6d4'}}>31,721</div>
                <div style={{fontSize:'12px',color:'#64748b',textTransform:'uppercase',fontWeight:'600'}}>Florida</div>
              </div>
              <div style={{backgroundColor:'#0a0f2c',border:'1px solid rgba(6,182,212,0.15)',borderRadius:'10px',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:'800',color:'#06b6d4'}}>57,180</div>
                <div style={{fontSize:'12px',color:'#64748b',textTransform:'uppercase',fontWeight:'600'}}>Texas</div>
              </div>
              <div style={{backgroundColor:'#0a0f2c',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'10px',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:'800',color:'#22c55e'}}>{dbTotal.toLocaleString()}</div>
                <div style={{fontSize:'12px',color:'#64748b',textTransform:'uppercase',fontWeight:'600'}}>In Database</div>
              </div>
            </div>
            <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
              <input placeholder="Search name, company, city..." value={dbSearch} onChange={e=>setDbSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&loadDbLeads(1, dbSearch, dbIndustry, dbState2)}
                style={{padding:'10px 14px',backgroundColor:'#0a0f2c',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'white',fontSize:'14px',flex:1,minWidth:'200px'}}/>
              <select value={dbIndustry} onChange={e=>setDbIndustry(e.target.value)}
                style={{padding:'10px',backgroundColor:'#0a0f2c',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'white',fontSize:'14px'}}>
                <option value="">All Industries</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Roofing">Roofing</option>
              </select>
              <select value={dbState2} onChange={e=>setDbState2(e.target.value)}
                style={{padding:'10px',backgroundColor:'#0a0f2c',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'white',fontSize:'14px'}}>
                <option value="">All States</option>
                <option value="FL">Florida</option>
                <option value="TX">Texas</option>
              </select>
              <button onClick={()=>loadDbLeads(1, dbSearch, dbIndustry, dbState2)}
                style={{padding:'10px 20px',backgroundColor:'#06b6d4',color:'#0a0f2c',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer'}}>
                Search
              </button>
            </div>
            {dbLoading && <p style={{color:'#64748b',textAlign:'center',padding:'40px'}}>Loading...</p>}
            {dbLeads.length===0 && !dbLoading && (
              <div style={{textAlign:'center',padding:'60px',color:'#64748b'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>📋</div>
                <p>Click Search to load leads</p>
              </div>
            )}
            {dbLeads.length>0 && (<>
              <table style={{width:'100%',borderCollapse:'collapse',backgroundColor:'#0a0f2c',borderRadius:'12px',overflow:'hidden',border:'1px solid rgba(6,182,212,0.15)'}}>
                <thead><tr>
                  {['Name','Company','Industry','City','State','Status','Action'].map(h=>(
                    <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#64748b',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {dbLeads.map(lead=>(
                    <tr key={lead.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'12px 16px',color:'white',fontSize:'14px'}}>{lead.firstName} {lead.lastName}</td>
                      <td style={{padding:'12px 16px',color:'#94a3b8',fontSize:'13px'}}>{lead.company}</td>
                      <td style={{padding:'12px 16px'}}><span style={{color:'#06b6d4',fontSize:'12px',fontWeight:'600'}}>{lead.industry}</span></td>
                      <td style={{padding:'12px 16px',color:'#94a3b8',fontSize:'13px'}}>{lead.city}</td>
                      <td style={{padding:'12px 16px',color:'#64748b',fontSize:'13px'}}>{lead.state}</td>
                      <td style={{padding:'12px 16px'}}>
                        <select value={lead.status} onChange={e=>updateDbLead(lead.id,e.target.value)}
                          style={{padding:'4px 8px',backgroundColor:'#04081a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',fontSize:'12px',cursor:'pointer'}}>
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="interested">Interested</option>
                          <option value="signed_up">Signed Up</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        {lead.phone && <a href={'tel:'+lead.phone} style={{color:'#06b6d4',fontSize:'12px',textDecoration:'none',fontWeight:'600'}}>📞 Call</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',marginTop:'20px'}}>
                <button onClick={()=>loadDbLeads(dbPage-1, dbSearch, dbIndustry, dbState2)} disabled={dbPage===1}
                  style={{padding:'8px 16px',backgroundColor:'#0a0f2c',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:dbPage===1?'#374151':'white',cursor:dbPage===1?'default':'pointer'}}>
                  Prev
                </button>
                <span style={{color:'#64748b',fontSize:'14px'}}>Page {dbPage} of {Math.ceil(dbTotal/50)}</span>
                <button onClick={()=>loadDbLeads(dbPage+1, dbSearch, dbIndustry, dbState2)} disabled={dbPage>=Math.ceil(dbTotal/50)}
                  style={{padding:'8px 16px',backgroundColor:'#0a0f2c',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',color:dbPage>=Math.ceil(dbTotal/50)?'#374151':'white',cursor:dbPage>=Math.ceil(dbTotal/50)?'default':'pointer'}}>
                  Next
                </button>
              </div>
            </>)}
          </div>
        )}

        {/* CRM LEADS TAB */}
        {activeTab === 'leads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: '800' }}>📞 Sales Pipeline</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>{leads.length} leads • {leads.filter(l=>l.status==='signed_up').length} converted</p>
              </div>
              <button onClick={() => setShowAddLead(true)}
                style={{ padding: '10px 20px', backgroundColor: '#06b6d4', color: '#0a0f2c', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                + Add Lead
              </button>
            </div>

            {/* Pipeline summary */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {Object.entries(statusLabels).map(([key, label]) => {
                const count = leads.filter(l => l.status === key).length;
                return (
                  <div key={key} style={{ backgroundColor: '#0a0f2c', border: `1px solid ${statusColors[key]}30`, borderRadius: '8px', padding: '10px 16px', textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ color: statusColors[key], fontWeight: '800', fontSize: '20px' }}>{count}</div>
                    <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>{label}</div>
                  </div>
                );
              })}
            </div>

            {/* Add Lead Form */}
            {showAddLead && (
              <div style={{ backgroundColor: '#0a0f2c', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 16px', color: 'white' }}>New Lead</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  {[['company','Company Name *'],['contact','Contact Name'],['phone','Phone'],['email','Email'],['industry','Industry']].map(([field, placeholder]) => (
                    <input key={field} placeholder={placeholder} value={newLead[field]} onChange={e => setNewLead(p => ({...p, [field]: e.target.value}))}
                      style={{ padding: '10px', backgroundColor: '#04081a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px' }} />
                  ))}
                  <input type="date" value={newLead.followUpDate} onChange={e => setNewLead(p => ({...p, followUpDate: e.target.value}))}
                    style={{ padding: '10px', backgroundColor: '#04081a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px' }} />
                </div>
                <textarea placeholder="Notes from call..." value={newLead.notes} onChange={e => setNewLead(p => ({...p, notes: e.target.value}))}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#04081a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', minHeight: '80px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={saveLead} style={{ padding: '10px 24px', backgroundColor: '#06b6d4', color: '#0a0f2c', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Save Lead</button>
                  <button onClick={() => setShowAddLead(false)} style={{ padding: '10px 24px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Leads List */}
            {leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📞</div>
                <p>No leads yet. Add your first prospect.</p>
              </div>
            ) : leads.map(lead => (
              <div key={lead.id} style={{ backgroundColor: '#0a0f2c', border: `1px solid ${statusColors[lead.status]}30`, borderRadius: '12px', padding: '20px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>{lead.company}</span>
                      <span style={{ backgroundColor: `${statusColors[lead.status]}20`, color: statusColors[lead.status], padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                        {statusLabels[lead.status]}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      {lead.contact && <span style={{ marginRight: '12px' }}>👤 {lead.contact}</span>}
                      {lead.phone && <span style={{ marginRight: '12px' }}>📱 {lead.phone}</span>}
                      {lead.email && <span style={{ marginRight: '12px' }}>✉️ {lead.email}</span>}
                      {lead.industry && <span>🔧 {lead.industry}</span>}
                    </div>
                    {lead.notes && <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>"{lead.notes}"</p>}
                    {lead.followUpDate && <p style={{ margin: '6px 0 0', color: '#f59e0b', fontSize: '12px' }}>📅 Follow up: {new Date(lead.followUpDate).toLocaleDateString()}</p>}
                    {lead.calls && lead.calls.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {lead.calls.slice(-2).map((call, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            📝 {new Date(call.date).toLocaleDateString()} — {call.note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <select value={lead.status} onChange={e => updateLead(lead.id, { status: e.target.value })}
                      style={{ padding: '6px 10px', backgroundColor: '#04081a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '12px', cursor: 'pointer' }}>
                      {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <button onClick={() => { const note = prompt('Call note:'); if (note) addCallLog(lead.id, note); }}
                      style={{ padding: '6px 12px', backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      📝 Log Call
                    </button>
                    <button onClick={() => deleteLead(lead.id)}
                      style={{ padding: '6px 10px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperAdmin;
