
import React, { useState, useEffect } from "react";

const API_BASE = "https://hvacfieldos-production.up.railway.app/api";

function MaintenancePlans({ user }) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  const isAdmin = user && (user.role === "admin" || user.role === "manager");

  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [toast, setToast] = useState(null);

  const EMPTY_PLAN = { name: "", description: "", price: "", interval: "monthly", visits: 2, features: "" };
  const EMPTY_SUB = { customerId: "", planId: "", startDate: new Date().toISOString().split("T")[0], notes: "" };
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [subForm, setSubForm] = useState(EMPTY_SUB);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, subsRes, custRes] = await Promise.all([
        fetch(`${API_BASE}/maintenance/plans`, { headers }),
        fetch(`${API_BASE}/maintenance/subscriptions`, { headers }),
        fetch(`${API_BASE}/customers`, { headers })
      ]);
      setPlans((await plansRes.json()).plans || []);
      setSubscriptions((await subsRes.json()).subscriptions || []);
      setCustomers((await custRes.json()).customers || []);
    } catch (err) {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const savePlan = async () => {
    if (!planForm.name || !planForm.price) return showToast("Name and price required", "error");
    try {
      const res = await fetch(`${API_BASE}/maintenance/plans`, {
        method: "POST", headers,
        body: JSON.stringify(planForm)
      });
      if (res.ok) { showToast("Plan created!"); setShowPlanForm(false); setPlanForm(EMPTY_PLAN); fetchAll(); }
      else showToast("Failed to create plan", "error");
    } catch { showToast("Error", "error"); }
  };

  const saveSub = async () => {
    if (!subForm.customerId || !subForm.planId) return showToast("Customer and plan required", "error");
    try {
      const res = await fetch(`${API_BASE}/maintenance/subscriptions`, {
        method: "POST", headers,
        body: JSON.stringify(subForm)
      });
      if (res.ok) { showToast("Customer enrolled!"); setShowSubForm(false); setSubForm(EMPTY_SUB); fetchAll(); }
      else showToast("Failed to enroll", "error");
    } catch { showToast("Error", "error"); }
  };

  const updateSubStatus = async (id, status) => {
    try {
      await fetch(`${API_BASE}/maintenance/subscriptions/${id}/status`, {
        method: "PATCH", headers, body: JSON.stringify({ status })
      });
      fetchAll();
    } catch { showToast("Error", "error"); }
  };

  const totalMRR = subscriptions.filter(s => s.status === "active").reduce((sum, s) => sum + parseFloat(s.planPrice || 0), 0);
  const activeCount = subscriptions.filter(s => s.status === "active").length;

  const intervalLabel = { monthly: "/mo", quarterly: "/qtr", yearly: "/yr" };

  const S = {
    page: { padding: "24px", fontFamily: "Segoe UI, sans-serif", backgroundColor: "#04081a", minHeight: "100vh", color: "white" },
    card: { backgroundColor: "#0a0f2c", border: "1px solid rgba(6,182,212,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
    btn: { padding: "10px 20px", backgroundColor: "#06b6d4", color: "#0a0f2c", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
    input: { width: "100%", padding: "10px 12px", backgroundColor: "#04081a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "14px", boxSizing: "border-box" },
    label: { fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
    tabBtn: (active) => ({ padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", backgroundColor: active ? "#06b6d4" : "transparent", color: active ? "#0a0f2c" : "#94a3b8" }),
  };

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", padding: "14px 20px", borderRadius: "10px", backgroundColor: toast.type === "success" ? "#f0fdf4" : "#fff1f2", color: toast.type === "success" ? "#15803d" : "#e11d48", fontWeight: "600", zIndex: 9999 }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 4px" }}>🔧 Maintenance Plans</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>Recurring service agreements for your customers</p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...S.btn, backgroundColor: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }} onClick={() => setShowPlanForm(true)}>+ New Plan</button>
            <button style={S.btn} onClick={() => setShowSubForm(true)}>+ Enroll Customer</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Monthly Recurring", value: "$" + totalMRR.toFixed(0), color: "#22c55e" },
          { label: "Active Subscribers", value: activeCount, color: "#06b6d4" },
          { label: "Plans Available", value: plans.length, color: "#8b5cf6" },
          { label: "Annual Revenue", value: "$" + (totalMRR * 12).toFixed(0), color: "#f59e0b" },
        ].map(stat => (
          <div key={stat.label} style={{ ...S.card, padding: "16px" }}>
            <div style={{ fontSize: "28px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", backgroundColor: "#0a0f2c", borderRadius: "10px", padding: "4px", width: "fit-content", marginBottom: "20px", border: "1px solid rgba(6,182,212,0.15)" }}>
        <button style={S.tabBtn(activeTab === "subscriptions")} onClick={() => setActiveTab("subscriptions")}>👥 Subscribers</button>
        <button style={S.tabBtn(activeTab === "plans")} onClick={() => setActiveTab("plans")}>📋 Plans</button>
      </div>

      {/* New Plan Form */}
      {showPlanForm && (
        <div style={{ ...S.card, border: "1px solid rgba(6,182,212,0.4)", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px" }}>Create Maintenance Plan</h3>
          <div style={S.grid2}>
            <div><div style={S.label}>Plan Name *</div><input style={S.input} placeholder="e.g. AC Tune-Up Annual" value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><div style={S.label}>Price *</div><input style={S.input} type="number" placeholder="29.99" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div>
              <div style={S.label}>Billing Interval</div>
              <select style={S.input} value={planForm.interval} onChange={e => setPlanForm(f => ({ ...f, interval: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div><div style={S.label}>Visits Per Year</div><input style={S.input} type="number" min="1" value={planForm.visits} onChange={e => setPlanForm(f => ({ ...f, visits: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: "16px" }}><div style={S.label}>Description</div><input style={S.input} placeholder="What's included..." value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div style={{ marginBottom: "16px" }}><div style={S.label}>Features (comma separated)</div><input style={S.input} placeholder="Priority scheduling, 10% off parts, Annual inspection" value={planForm.features} onChange={e => setPlanForm(f => ({ ...f, features: e.target.value }))} /></div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={savePlan} style={S.btn}>Save Plan</button>
            <button onClick={() => { setShowPlanForm(false); setPlanForm(EMPTY_PLAN); }} style={{ padding: "10px 20px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Enroll Customer Form */}
      {showSubForm && (
        <div style={{ ...S.card, border: "1px solid rgba(34,197,94,0.4)", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px" }}>Enroll Customer in Plan</h3>
          <div style={S.grid2}>
            <div>
              <div style={S.label}>Customer *</div>
              <select style={S.input} value={subForm.customerId} onChange={e => setSubForm(f => ({ ...f, customerId: e.target.value }))}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div>
              <div style={S.label}>Plan *</div>
              <select style={S.input} value={subForm.planId} onChange={e => setSubForm(f => ({ ...f, planId: e.target.value }))}>
                <option value="">Select plan...</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}/{p.interval}</option>)}
              </select>
            </div>
            <div><div style={S.label}>Start Date</div><input style={S.input} type="date" value={subForm.startDate} onChange={e => setSubForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><div style={S.label}>Notes</div><input style={S.input} placeholder="Any notes..." value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={saveSub} style={S.btn}>Enroll Customer</button>
            <button onClick={() => { setShowSubForm(false); setSubForm(EMPTY_SUB); }} style={{ padding: "10px 20px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: "#64748b" }}>Loading...</p> : (
        <>
          {/* Subscriptions Tab */}
          {activeTab === "subscriptions" && (
            subscriptions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px", color: "#64748b" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔧</div>
                <p>No subscribers yet. Create a plan and enroll your first customer.</p>
              </div>
            ) : subscriptions.map(sub => (
              <div key={sub.id} style={{ ...S.card, borderColor: sub.status === "active" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>{sub.customerFirstName} {sub.customerLastName}</div>
                    <div style={{ color: "#06b6d4", fontSize: "14px", marginBottom: "4px" }}>{sub.planName}</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                      Started {new Date(sub.startDate).toLocaleDateString()} • {sub.visits} visits/year
                      {sub.notes && <span> • {sub.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "22px", fontWeight: "800", color: "#22c55e" }}>${parseFloat(sub.planPrice).toFixed(0)}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>per {sub.planInterval}</div>
                    </div>
                    {isAdmin && (
                      <select value={sub.status} onChange={e => updateSubStatus(sub.id, e.target.value)}
                        style={{ padding: "6px 10px", backgroundColor: "#04081a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: sub.status === "active" ? "#22c55e" : "#ef4444", fontSize: "12px", cursor: "pointer" }}>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Plans Tab */}
          {activeTab === "plans" && (
            plans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px", color: "#64748b" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
                <p>No plans yet. Create your first maintenance plan.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {plans.map(plan => (
                  <div key={plan.id} style={{ ...S.card, border: "1px solid rgba(6,182,212,0.2)" }}>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#22c55e", marginBottom: "4px" }}>${parseFloat(plan.price).toFixed(0)}<span style={{ fontSize: "14px", color: "#64748b" }}>{intervalLabel[plan.interval]}</span></div>
                    <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "8px" }}>{plan.name}</div>
                    {plan.description && <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "8px" }}>{plan.description}</p>}
                    <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "8px" }}>📅 {plan.visits} service visits per year</div>
                    {plan.features && plan.features.split(",").map((f, i) => (
                      <div key={i} style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>✓ {f.trim()}</div>
                    ))}
                    <div style={{ marginTop: "12px", color: "#64748b", fontSize: "12px" }}>
                      {subscriptions.filter(s => s.planId === plan.id && s.status === "active").length} active subscribers
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

export default MaintenancePlans;
