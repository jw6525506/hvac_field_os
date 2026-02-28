import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'https://hvacfieldos-production.up.railway.app/api';

function Payroll({ token: tokenProp, user }) {
  const token = tokenProp || localStorage.getItem('token');
  const [clockStatus, setClockStatus] = useState({ clockedIn: false, entry: null });
  const [summary, setSummary] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [editingRates, setEditingRates] = useState({});
  const [clockElapsed, setClockElapsed] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || localStorage.getItem('token')) };

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, summaryRes, entriesRes] = await Promise.all([
        fetch(`${API_BASE}/timeclock/status`, { headers }),
        fetch(`${API_BASE}/payroll/summary?startDate=${startDate}&endDate=${endDate}`, { headers }),
        fetch(`${API_BASE}/timeclock/entries?startDate=${startDate}&endDate=${endDate}`, { headers }),
      ]);
      setClockStatus(await statusRes.json());
      setSummary((await summaryRes.json()).summary || []);
      setEntries((await entriesRes.json()).entries || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [startDate, endDate, token]);

  // Refetch when token becomes available
  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!clockStatus.clockedIn || !clockStatus.entry) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(clockStatus.entry.clockIn).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setClockElapsed(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [clockStatus]);

  const clockIn = async () => { const res = await fetch(`${API_BASE}/timeclock/clockin`, { method: 'POST', headers, body: JSON.stringify({}) }); if (res.ok) fetchAll(); };
  const clockOut = async () => { const res = await fetch(`${API_BASE}/timeclock/clockout`, { method: 'POST', headers, body: JSON.stringify({}) }); if (res.ok) fetchAll(); };

  const saveRates = async (userId) => {
    const rates = editingRates[userId];
    if (!rates) return;
    await fetch(`${API_BASE}/users/${userId}/pay-rates`, { method: 'PUT', headers, body: JSON.stringify(rates) });
    setEditingRates(prev => { const n = {...prev}; delete n[userId]; return n; });
    fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Name','Hours','Hourly Rate','Hourly Pay','Invoiced','Commission %','Commission Pay','Total Pay']];
    summary.forEach(u => rows.push([`${u.firstName} ${u.lastName}`, (u.totalMinutes/60).toFixed(2), `$${parseFloat(u.hourlyRate).toFixed(2)}`, `$${parseFloat(u.hourlyPay).toFixed(2)}`, `$${parseFloat(u.commissionBase).toFixed(2)}`, `${u.commissionRate}%`, `$${parseFloat(u.commissionPay).toFixed(2)}`, `$${parseFloat(u.totalPay).toFixed(2)}`]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `payroll-${startDate}-${endDate}.csv`; a.click();
  };

  const totalPayroll = summary.reduce((sum, u) => sum + parseFloat(u.totalPay || 0), 0);
  const tabStyle = (tab) => ({ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', backgroundColor: activeTab === tab ? '#06b6d4' : 'transparent', color: activeTab === tab ? '#0a0f2c' : '#94a3b8' });

  if (loading) return <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>Loading payroll...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, color: 'white', fontSize: '24px', fontWeight: '800' }}>💰 Payroll</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white', fontSize: '13px' }} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white', fontSize: '13px' }} />
          <button onClick={exportCSV} style={{ padding: '8px 16px', backgroundColor: '#06b6d4', color: '#0a0f2c', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>📥 Export CSV</button>
        </div>
      </div>

      <div style={{ backgroundColor: clockStatus.clockedIn ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)', border: `2px solid ${clockStatus.clockedIn ? '#22c55e' : '#06b6d4'}`, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        {clockStatus.clockedIn ? (
          <>
            <div style={{ fontSize: '40px' }}>🟢</div>
            <p style={{ color: '#22c55e', fontWeight: '700', fontSize: '18px', margin: '8px 0 4px' }}>Clocked In</p>
            <p style={{ color: 'white', margin: '0 0 16px', fontSize: '28px', fontWeight: '800' }}>{clockElapsed}</p>
            <p style={{ color: '#64748b', margin: '0 0 16px', fontSize: '13px' }}>Since {new Date(clockStatus.entry.clockIn).toLocaleTimeString()}</p>
            <button onClick={clockOut} style={{ padding: '12px 32px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>⏹ Clock Out</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '40px' }}>⏰</div>
            <p style={{ color: '#94a3b8', margin: '8px 0 16px' }}>You are currently clocked out</p>
            <button onClick={clockIn} style={{ padding: '12px 32px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>▶ Clock In</button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: '#1e293b', borderRadius: '10px', padding: '4px' }}>
        <button onClick={() => setActiveTab('summary')} style={tabStyle('summary')}>💰 Pay Summary</button>
        <button onClick={() => setActiveTab('timeclock')} style={tabStyle('timeclock')}>⏱ Time Entries</button>
        <button onClick={() => setActiveTab('rates')} style={tabStyle('rates')}>⚙️ Pay Rates</button>
      </div>

      {activeTab === 'summary' && (
        <div>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Total Payroll</span>
            <span style={{ color: '#06b6d4', fontSize: '24px', fontWeight: '800' }}>${totalPayroll.toFixed(2)}</span>
          </div>
          {summary.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No technicians found.</p> : summary.map(u => (
            <div key={u.id} style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '16px' }}>{u.firstName} {u.lastName}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>{u.totalShifts} shifts • {(u.totalMinutes/60).toFixed(1)} hours</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#22c55e', fontWeight: '800', fontSize: '20px' }}>${parseFloat(u.totalPay).toFixed(2)}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>total pay</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[['Hourly Pay', u.hourlyPay], ['Commission', u.commissionPay], ['Invoiced', u.commissionBase]].map(([label, val]) => (
                  <div key={label} style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ margin: 0, color: 'white', fontWeight: '700' }}>${parseFloat(val).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'timeclock' && (
        <div>
          {entries.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No time entries for this period.</p> : entries.map(e => (
            <div key={e.id} style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'white', fontWeight: '600' }}>{e.firstName} {e.lastName}</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>{new Date(e.clockIn).toLocaleDateString()} • {new Date(e.clockIn).toLocaleTimeString()} → {e.clockOut ? new Date(e.clockOut).toLocaleTimeString() : '🟢 Active'}</p>
                {e.jobType && <p style={{ margin: '4px 0 0', color: '#06b6d4', fontSize: '12px' }}>Job: {e.jobType}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, color: 'white', fontWeight: '700' }}>{e.totalMinutes ? `${Math.floor(e.totalMinutes/60)}h ${e.totalMinutes%60}m` : 'In Progress'}</p>
                {e.totalMinutes && <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>${((e.totalMinutes/60)*parseFloat(e.hourlyRate||0)).toFixed(2)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rates' && (
        <div>
          <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px' }}>Set hourly rate and commission % for each technician.</p>
          {summary.length === 0 ? <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No technicians found.</p> : summary.map(u => (
            <div key={u.id} style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ margin: 0, color: 'white', fontWeight: '700' }}>{u.firstName} {u.lastName}</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '11px', display: 'block', marginBottom: '4px' }}>HOURLY RATE</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>$</span>
                      <input type="number" min="0" step="0.50" defaultValue={parseFloat(u.hourlyRate||0).toFixed(2)}
                        onChange={e => setEditingRates(prev => ({ ...prev, [u.id]: { ...prev[u.id], hourlyRate: e.target.value, commissionRate: prev[u.id]?.commissionRate ?? u.commissionRate }}))}
                        style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '14px' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: '11px', display: 'block', marginBottom: '4px' }}>COMMISSION %</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" min="0" max="100" step="0.5" defaultValue={parseFloat(u.commissionRate||0).toFixed(1)}
                        onChange={e => setEditingRates(prev => ({ ...prev, [u.id]: { ...prev[u.id], commissionRate: e.target.value, hourlyRate: prev[u.id]?.hourlyRate ?? u.hourlyRate }}))}
                        style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '14px' }} />
                      <span style={{ color: '#94a3b8' }}>%</span>
                    </div>
                  </div>
                  <button onClick={() => saveRates(u.id)} style={{ padding: '8px 16px', backgroundColor: '#06b6d4', color: '#0a0f2c', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Save</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Payroll;
