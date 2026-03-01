
import React, { useState, useEffect } from "react";

const API_BASE = "https://hvacfieldos-production.up.railway.app/api";

function Manuals({ user }) {
  const token = localStorage.getItem("token");
  const headers = { Authorization: "Bearer " + token };
  const isAdmin = user && (user.role === "admin" || user.role === "manager");

  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({ brand: "", model: "", industry: "hvac", docType: "service_manual", description: "" });

  const industries = ["hvac", "plumbing", "electrical", "roofing", "general"];
  const docTypes = ["service_manual", "installation_guide", "wiring_diagram", "parts_list", "spec_sheet", "other"];
  const industryIcons = { hvac: "🌡️", plumbing: "🔧", electrical: "⚡", roofing: "🏠", general: "🔩" };
  const industryLabels = { hvac: "HVAC", plumbing: "Plumbing", electrical: "Electrical", roofing: "Roofing", general: "General" };
  const docTypeLabels = { service_manual: "Service Manual", installation_guide: "Installation Guide", wiring_diagram: "Wiring Diagram", parts_list: "Parts List", spec_sheet: "Spec Sheet", other: "Other" };

  useEffect(() => { fetchManuals(); }, []);

  const fetchManuals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/manuals`, { headers });
      const data = await res.json();
      setManuals(data.manuals || []);
    } catch { showToast("Failed to load manuals", "error"); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const uploadManual = async () => {
    if (!selectedFile || !form.brand || !form.model) return showToast("File, brand and model required", "error");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("brand", form.brand);
      formData.append("model", form.model);
      formData.append("industry", form.industry);
      formData.append("docType", form.docType);
      formData.append("description", form.description);

      const res = await fetch(`${API_BASE}/manuals`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Manual uploaded!");
        setShowForm(false);
        setSelectedFile(null);
        setForm({ brand: "", model: "", industry: "hvac", docType: "service_manual", description: "" });
        fetchManuals();
      } else {
        showToast(data.message || "Upload failed", "error");
      }
    } catch { showToast("Upload error", "error"); }
    finally { setUploading(false); }
  };

  const deleteManual = async (id) => {
    if (!window.confirm("Delete this manual?")) return;
    try {
      await fetch(`${API_BASE}/manuals/${id}`, { method: "DELETE", headers });
      fetchManuals();
      showToast("Deleted");
    } catch { showToast("Error deleting", "error"); }
  };

  const filtered = manuals.filter(m => {
    const matchSearch = !search || m.brand.toLowerCase().includes(search.toLowerCase()) || m.model.toLowerCase().includes(search.toLowerCase()) || (m.description || "").toLowerCase().includes(search.toLowerCase());
    const matchIndustry = filterIndustry === "all" || m.industry === filterIndustry;
    const matchType = filterType === "all" || m.docType === filterType;
    return matchSearch && matchIndustry && matchType;
  });

  const S = {
    page: { padding: "24px", fontFamily: "Segoe UI, sans-serif", backgroundColor: "#04081a", minHeight: "100vh", color: "white" },
    card: { backgroundColor: "#0a0f2c", border: "1px solid rgba(6,182,212,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "12px" },
    btn: { padding: "10px 20px", backgroundColor: "#06b6d4", color: "#0a0f2c", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
    input: { width: "100%", padding: "10px 12px", backgroundColor: "#04081a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "14px", boxSizing: "border-box" },
    label: { fontSize: "12px", color: "#64748b", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
  };

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", padding: "14px 20px", borderRadius: "10px", backgroundColor: toast.type === "success" ? "#f0fdf4" : "#fff1f2", color: toast.type === "success" ? "#15803d" : "#e11d48", fontWeight: "600", zIndex: 9999 }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 4px" }}>📚 Equipment Manuals</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>{manuals.length} manuals across all industries</p>
        </div>
        {isAdmin && <button style={S.btn} onClick={() => setShowForm(true)}>+ Upload Manual</button>}
      </div>

      {/* Industry quick filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => setFilterIndustry("all")} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", backgroundColor: filterIndustry === "all" ? "#06b6d4" : "#0a0f2c", color: filterIndustry === "all" ? "#0a0f2c" : "#94a3b8" }}>All</button>
        {industries.map(ind => (
          <button key={ind} onClick={() => setFilterIndustry(ind)} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", backgroundColor: filterIndustry === ind ? "#06b6d4" : "#0a0f2c", color: filterIndustry === ind ? "#0a0f2c" : "#94a3b8" }}>
            {industryIcons[ind]} {industryLabels[ind]}
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input style={{ ...S.input, maxWidth: "300px" }} placeholder="Search brand, model..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...S.input, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {docTypes.map(t => <option key={t} value={t}>{docTypeLabels[t]}</option>)}
        </select>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div style={{ ...S.card, border: "1px solid rgba(6,182,212,0.4)", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px" }}>Upload Manual</h3>
          <div style={S.grid2}>
            <div><div style={S.label}>Brand *</div><input style={S.input} placeholder="e.g. Carrier, Rheem, Kohler" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
            <div><div style={S.label}>Model *</div><input style={S.input} placeholder="e.g. 24ACC636A003" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
            <div>
              <div style={S.label}>Industry</div>
              <select style={S.input} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                {industries.map(i => <option key={i} value={i}>{industryIcons[i]} {industryLabels[i]}</option>)}
              </select>
            </div>
            <div>
              <div style={S.label}>Document Type</div>
              <select style={S.input} value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}>
                {docTypes.map(t => <option key={t} value={t}>{docTypeLabels[t]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={S.label}>Description</div>
            <input style={S.input} placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={S.label}>PDF File *</div>
            <input type="file" accept=".pdf" onChange={e => setSelectedFile(e.target.files[0])}
              style={{ ...S.input, padding: "8px" }} />
            {selectedFile && <div style={{ color: "#22c55e", fontSize: "13px", marginTop: "4px" }}>✓ {selectedFile.name}</div>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={uploadManual} disabled={uploading} style={{ ...S.btn, opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "Uploading..." : "Upload Manual"}
            </button>
            <button onClick={() => { setShowForm(false); setSelectedFile(null); }} style={{ padding: "10px 20px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#94a3b8", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Manuals List */}
      {loading ? <p style={{ color: "#64748b" }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px", color: "#64748b" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📚</div>
          <p style={{ fontSize: "16px" }}>{search ? "No manuals match your search" : "No manuals uploaded yet"}</p>
          {isAdmin && !search && <p style={{ fontSize: "14px" }}>Upload your first equipment manual</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map(manual => (
            <div key={manual.id} style={{ ...S.card, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <span style={{ fontSize: "24px" }}>{industryIcons[manual.industry]}</span>
                  <span style={{ backgroundColor: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "700" }}>{docTypeLabels[manual.docType]}</span>
                </div>
                <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "2px" }}>{manual.brand}</div>
                <div style={{ color: "#06b6d4", fontSize: "14px", marginBottom: "6px" }}>{manual.model}</div>
                {manual.description && <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "8px" }}>{manual.description}</div>}
                <div style={{ color: "#475569", fontSize: "11px" }}>{industryLabels[manual.industry]} • {new Date(manual.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <a href={manual.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: "8px", backgroundColor: "#06b6d4", color: "#0a0f2c", borderRadius: "8px", fontWeight: "700", fontSize: "13px", textDecoration: "none", textAlign: "center" }}>
                  📄 Open PDF
                </a>
                {isAdmin && (
                  <button onClick={() => deleteManual(manual.id)}
                    style={{ padding: "8px 12px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Manuals;
