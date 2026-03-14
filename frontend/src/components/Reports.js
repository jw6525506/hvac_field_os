import React, { useState, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'https://hvacfieldos-production.up.railway.app';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports({ token }) {
  const [view, setView] = useState('technicians');
  const [techData, setTechData] = useState([]);
  const [jobData, setJobData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadTechReport = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/reports/technicians?year=${year}`;
      if (month) url += `&month=${month}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      setTechData(Array.isArray(data) ? data : []);
    } catch(e) { setTechData([]); }
    setLoading(false);
  }, [token, year, month]);

  const loadJobReport = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/api/reports/jobs?year=${year}`;
      if (month) url += `&month=${month}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      setJobData(data);
    } catch(e) { setJobData(null); }
    setLoading(false);
  }, [token, year, month]);

  const generate = () => {
    if (view === 'technicians') loadTechReport();
    else loadJobReport();
  };

  const S = {
    container: { padding: '16px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', color: '#f1f5f9' },
    card: { background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    tab: (a) => ({ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: a ? '#06b6d4' : '#334155', color: a ? '#fff' : '#94a3b8' }),
    btn: { padding: '8px 20px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
    input: { padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px' },
    label: { fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginRight: '6px' },
    th: { padding: '10px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '700', borderBottom: '1px solid #334155' },
    td: { padding: '10px', fontSize: '13px', borderBottom: '1px solid #0f172a' },
    table: { width: '100%', borderCollapse: 'collapse' },
    badge: (c,b) => ({ background: b||c, color: b?c:'#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }),
  };

  const bar = (val, max, color='#06b6d4') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, background: '#0f172a', borderRadius: '4px', height: '8px' }}>
        <div style={{ width: `${max > 0 ? (val/max)*100 : 0}%`, background: color, height: '8px', borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '40px' }}>{val}</span>
    </div>
  );

  const maxRevenue = techData.length ? Math.max(...techData.map(t => parseFloat(t.total_revenue||0))) : 1;

  return (
    <div style={S.container}>
      <h2 style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: '700' }}>📈 Advanced Reports</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button style={S.tab(view==='technicians')} onClick={() => setView('technicians')}>👷 By Technician</button>
        <button style={S.tab(view==='jobs')} onClick={() => setView('jobs')}>🔧 Job Analysis</button>
      </div>

      <div style={{ ...S.card, padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label style={S.label}>Year:</label>
        <select style={S.input} value={year} onChange={e => setYear(e.target.value)}>
          {['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
        </select>
        <label style={S.label}>Month:</label>
        <select style={S.input} value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">All Year</option>
          {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
        <button style={S.btn} onClick={generate}>Generate Report</button>
      </div>

      {view === 'technicians' && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Technician Performance</h3>
          {loading ? <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p> :
          techData.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '32px' }}>Click Generate Report to load data</p> : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Technician</th>
                  <th style={S.th}>Jobs</th>
                  <th style={S.th}>Completed</th>
                  <th style={S.th}>Completion Rate</th>
                  <th style={S.th}>Hours Worked</th>
                  <th style={S.th}>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {techData.map(t => (
                  <tr key={t.id}>
                    <td style={{ ...S.td, fontWeight: '700' }}>{t.name}</td>
                    <td style={S.td}>{t.total_jobs}</td>
                    <td style={S.td}>{t.completed_jobs}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, background: '#0f172a', borderRadius: '4px', height: '8px' }}>
                          <div style={{ width: `${t.completion_rate||0}%`, background: '#22c55e', height: '8px', borderRadius: '4px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.completion_rate||0}%</span>
                      </div>
                    </td>
                    <td style={S.td}>{Math.round((t.total_minutes||0)/60)}h</td>
                    <td style={S.td}>
                      {bar(parseFloat(t.total_revenue||0).toFixed(0), maxRevenue, '#06b6d4')}
                      <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '700' }}>${parseFloat(t.total_revenue||0).toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'jobs' && (
        <>
          {!jobData && !loading && <p style={{ ...S.card, color: '#64748b', textAlign: 'center', padding: '32px' }}>Click Generate Report to load data</p>}
          {loading && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p>}
          {jobData && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={S.card}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Jobs by Status</h3>
                  {jobData.byStatus?.map(s => (
                    <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #334155' }}>
                      <span style={{ textTransform: 'capitalize', fontSize: '13px' }}>{s.status?.replace('_',' ')}</span>
                      <span style={{ fontWeight: '700', color: '#06b6d4' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Jobs by Type</h3>
                  {jobData.byType?.length === 0 && <p style={{ color: '#64748b', fontSize: '13px' }}>No job type data</p>}
                  {jobData.byType?.map(t => (
                    <div key={t.jobType} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #334155' }}>
                      <span style={{ textTransform: 'capitalize', fontSize: '13px' }}>{t.jobType || 'General'}</span>
                      <span style={{ fontWeight: '700', color: '#06b6d4' }}>{t.count} ({t.completed} done)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.card}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Top Customers by Revenue</h3>
                <table style={S.table}>
                  <thead><tr><th style={S.th}>Customer</th><th style={S.th}>Jobs</th><th style={S.th}>Revenue</th></tr></thead>
                  <tbody>
                    {jobData.topCustomers?.map((c,i) => (
                      <tr key={i}>
                        <td style={{ ...S.td, fontWeight: '700' }}>{c.name}</td>
                        <td style={S.td}>{c.jobs}</td>
                        <td style={{ ...S.td, color: '#34d399', fontWeight: '700' }}>${parseFloat(c.revenue||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
