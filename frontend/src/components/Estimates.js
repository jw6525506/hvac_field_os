
import React, { useState, useEffect } from "react";

const API_BASE = "https://hvacfieldos-production.up.railway.app/api";

function Estimates({ user }) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewEstimate, setPreviewEstimate] = useState(null);
  const isAdmin = user && (user.role === "admin" || user.role === "manager");

  const EMPTY = {
    customerId: "", title: "", description: "", validDays: 30,
    lineItems: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    taxRate: 8.5, notes: ""
  };
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [estRes, custRes] = await Promise.all([
        fetch(`${API_BASE}/estimates`, { headers }),
        fetch(`${API_BASE}/customers`, { headers })
      ]);
      const estData = await estRes.json();
      const custData = await custRes.json();
      setEstimates(estData.estimates || []);
      setCustomers(custData.customers || []);
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

  const updateLineItem = (index, field, value) => {
    const items = [...form.lineItems];
    items[index][field] = value;
    if (field === "quantity" || field === "unitPrice") {
      items[index].total = parseFloat(items[index].quantity || 0) * parseFloat(items[index].unitPrice || 0);
    }
    setForm(f => ({ ...f, lineItems: items }));
  };

  const addLineItem = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }] }));
  const removeLineItem = (i) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));

  const subtotal = form.lineItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
  const taxAmount = subtotal * (parseFloat(form.taxRate) / 100);
  const total = subtotal + taxAmount;

  const saveEstimate = async () => {
    if (!form.customerId || !form.title) return showToast("Customer and title required", "error");
    try {
      const res = await fetch(`${API_BASE}/estimates`, {
        method: "POST", headers,
        body: JSON.stringify({ ...form, subtotal, taxAmount, total })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Estimate created!");
        setShowForm(false);
        setForm(EMPTY);
        fetchAll();
      } else {
        showToast(data.message || "Failed to create", "error");
      }
    } catch (err) {
      showToast("Error saving estimate", "error");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/estimates/${id}/status`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status })
      });
      if (res.ok) { showToast("Status updated!"); fetchAll(); }
    } catch (err) { showToast("Error updating status", "error"); }
  };

  const convertToWorkOrder = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/estimates/${id}/convert`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok) { showToast("Converted to work order!"); fetchAll(); }
      else showToast(data.message || "Failed to convert", "error");
    } catch (err) { showToast("Error converting", "error"); }
  };

  const statusColors = {
    draft: "#64748b", sent: "#06b6d4", approved: "#22c55e",
    declined: "#ef4444", converted: "#8b5cf6"
  };

  const S = {
    page: { padding: "24px", fontFamily: "Segoe UI, sans-serif", backgroundColor: "#04081a", minHeight: "100vh", color: "white" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
    title: { fontSize: "24px", fontWeight: "800", margin: 0 },
    btn: { padding: "10px 20px", backgroundColor: "#06b6d4", color: "#0a0f2c", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
    card: { backgroundColor: "#0a0f2c", border: "1px solid rgba(6,182,212,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
    label: { fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" },
    input: { width: "100%", padding: "10px 12px", backgroundColor: "#04081a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "14px", boxSizing: "border-box" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
    grid3: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "center" },
    badge: (status) => ({ display: "inline-block", padding: "3px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", backgroundColor: `${statusColors[status]}20`, color: statusColors[status] }),
  };

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", padding: "14px 20px", borderRadius: "10px", backgroundColor: toast.type === "success" ? "#f0fdf4" : "#fff1f2", color: toast.type === "success" ? "#15803d" : "#e11d48", fontWeight: "600", fontSize: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast.message}
        </div>
      )}

      <div style={S.header}>
        <div>
          <h1 style={S.title}>📋 Estimates</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "14px" }}>
            {estimates.length} total • {estimates.filter(e => e.status === "approved").length} approved • ${estimates.filter(e => e.status === "approved").reduce((s, e) => s + parseFloat(e.total || 0), 0).toFixed(2)} pipeline
          </p>
        </div>
        {isAdmin && <button style={S.btn} onClick={() => setShowForm(true)}>+ New Estimate</button>}
      </div>

      {/* New Estimate Form */}
      {showForm && (
        <div style={{ ...S.card, border: "1px solid rgba(6,182,212,0.4)", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>New Estimate</h2>

          <div style={{ ...S.grid2, marginBottom: "16px" }}>
            <div>
              <div style={S.label}>Customer *</div>
              <select style={S.input} value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div>
              <div style={S.label}>Estimate Title *</div>
              <input style={S.input} placeholder="e.g. AC Unit Replacement" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={S.label}>Description</div>
            <textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} placeholder="Describe the work to be done..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={S.label}>Line Items</div>
            </div>
            <div style={{ marginBottom: "8px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "8px" }}>
              {["Description", "Qty", "Unit Price", "Total", ""].map(h => <div key={h} style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>{h}</div>)}
            </div>
            {form.lineItems.map((item, i) => (
              <div key={i} style={{ ...S.grid3, marginBottom: "8px" }}>
                <input style={S.input} placeholder="Labor, parts, etc." value={item.description} onChange={e => updateLineItem(i, "description", e.target.value)} />
                <input style={S.input} type="number" min="1" value={item.quantity} onChange={e => updateLineItem(i, "quantity", e.target.value)} />
                <input style={S.input} type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={e => updateLineItem(i, "unitPrice", e.target.value)} />
                <div style={{ color: "#22c55e", fontWeight: "700", fontSize: "14px" }}>${parseFloat(item.total || 0).toFixed(2)}</div>
                <button onClick={() => removeLineItem(i)} style={{ padding: "8px", backgroundColor: "rgba(239,68,68,0.1)", border: "none", borderRadius: "6px", color: "#ef4444", cursor: "pointer", fontWeight: "700" }}>✕</button>
              </div>
            ))}
            <button onClick={addLineItem} style={{ padding: "8px 16px", backgroundColor: "rgba(6,182,212,0.1)", border: "1px dashed rgba(6,182,212,0.3)", borderRadius: "8px", color: "#06b6d4", cursor: "pointer", fontSize: "13px", marginTop: "8px" }}>+ Add Line Item</button>
          </div>

          {/* Totals */}
          <div style={{ backgroundColor: "#04081a", borderRadius: "8px", padding: "16px", marginBottom: "16px", textAlign: "right" }}>
            <div style={{ color: "#64748b", marginBottom: "6px" }}>Subtotal: <span style={{ color: "white" }}>${subtotal.toFixed(2)}</span></div>
            <div style={{ color: "#64748b", marginBottom: "6px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
              Tax: <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} style={{ width: "60px", padding: "4px 8px", backgroundColor: "#0a0f2c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "white", fontSize: "13px" }} />%
              <span style={{ color: "white" }}>${taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ color: "#22c55e", fontWeight: "800", fontSize: "20px" }}>Total: ${total.toFixed(2)}</div>
          </div>

          <div style={{ ...S.grid2, marginBottom: "16px" }}>
            <div>
              <div style={S.label}>Valid for (days)</div>
              <input style={S.input} type="number" value={form.validDays} onChange={e => setForm(f => ({ ...f, validDays: e.target.value }))} />
            </div>
            <div>
              <div style={S.label}>Notes</div>
              <input style={S.input} placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={saveEstimate} style={S.btn}>Save Estimate</button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY); }} style={{ padding: "10px 20px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Estimates List */}
      {loading ? <p style={{ color: "#64748b" }}>Loading...</p> : estimates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No estimates yet</p>
          <p style={{ fontSize: "14px" }}>Create your first estimate to start winning more jobs</p>
        </div>
      ) : estimates.map(est => (
        <div key={est.id} style={{ ...S.card, borderColor: est.status === "approved" ? "rgba(34,197,94,0.3)" : est.status === "declined" ? "rgba(239,68,68,0.2)" : "rgba(6,182,212,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span style={{ fontWeight: "700", fontSize: "16px" }}>{est.title}</span>
                <span style={S.badge(est.status)}>{est.status.toUpperCase()}</span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>
                👤 {est.customerFirstName} {est.customerLastName}
                {est.description && <span style={{ marginLeft: "12px" }}>— {est.description}</span>}
              </div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>
                Created {new Date(est.createdAt).toLocaleDateString()} • Valid for {est.validDays} days • EST-{String(est.id).padStart(4, "0")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#22c55e" }}>${parseFloat(est.total || 0).toFixed(2)}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>incl. tax</div>
            </div>
          </div>

          {isAdmin && (
            <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
              <select value={est.status} onChange={e => updateStatus(est.id, e.target.value)}
                style={{ padding: "6px 10px", backgroundColor: "#04081a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", fontSize: "12px", cursor: "pointer" }}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
              {est.status === "approved" && (
                <button onClick={() => convertToWorkOrder(est.id)}
                  style={{ padding: "6px 14px", backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", color: "#8b5cf6", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                  ⚡ Convert to Work Order
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Estimates;
