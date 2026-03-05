import React, { useState } from "react";

function BottomNav({ currentPage, setCurrentPage, userRole, onLogout }) {
  const [showMore, setShowMore] = useState(false);

  const mainItems = [
    { page: "dashboard", icon: "🏠", label: "Home" },
    { page: "customers", icon: "👥", label: "Customers" },
    { page: "workorders", icon: "📋", label: "Jobs" },
    { page: "invoices", icon: "💰", label: "Invoices" },
  ];

  const moreItems = [
    { page: "estimates", icon: "📄", label: "Estimates" },
    { page: "maintenance", icon: "🔧", label: "Maintenance" },
    { page: "manuals", icon: "📚", label: "Manuals" },
    { page: "inventory", icon: "📦", label: "Inventory" },
    { page: "payroll", icon: "⏱️", label: "Payroll" },
    { page: "map", icon: "🗺️", label: "Map" },
    { page: "settings", icon: "⚙️", label: "Settings" },
  ];

  const techOnlyPages = ["workorders", "map"];
  const filteredMain = userRole === "technician" ? mainItems.filter(i => techOnlyPages.includes(i.page)) : mainItems;
  const filteredMore = userRole === "technician" ? [] : moreItems;
  const isMoreActive = moreItems.some(i => i.page === currentPage);

  return (
    <>
      {showMore && (
        <>
          <div onClick={() => setShowMore(false)} style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 997
          }} />
          <div style={{
            position: "fixed", bottom: "62px", left: 0, right: 0,
            backgroundColor: "#0a0f2c", borderTop: "1px solid #1e293b",
            zIndex: 998, padding: "16px",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px"
            }}>
              {filteredMore.map(({ page, icon, label }) => (
                <button key={page} onClick={() => { setCurrentPage(page); setShowMore(false); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "4px", border: "none", borderRadius: "12px", padding: "12px 8px",
                    cursor: "pointer",
                    backgroundColor: currentPage === page ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.05)",
                    color: currentPage === page ? "#06b6d4" : "#94a3b8",
                  }}>
                  <span style={{ fontSize: "22px" }}>{icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: "600" }}>{label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { onLogout && onLogout(); setShowMore(false); }}
              style={{
                width: "100%", padding: "14px", backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px",
                color: "#ef4444", fontWeight: "700", fontSize: "15px", cursor: "pointer",
              }}>
              🚪 Log Out
            </button>
          </div>
        </>
      )}

      <div style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#0a0f2c", borderTop: "1px solid #1e293b",
        zIndex: 999, height: "62px",
        gridTemplateColumns: "repeat(5, 1fr)",
      }} className="bottom-nav">
        {filteredMain.map(({ page, icon, label }) => (
          <button key={page} onClick={() => { setCurrentPage(page); setShowMore(false); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "2px", border: "none",
              backgroundColor: "transparent", cursor: "pointer", padding: "8px 4px",
              color: currentPage === page ? "#06b6d4" : "#64748b",
              borderTop: currentPage === page ? "2px solid #06b6d4" : "2px solid transparent",
            }}>
            <span style={{ fontSize: "20px" }}>{icon}</span>
            <span style={{ fontSize: "10px", fontWeight: "600" }}>{label}</span>
          </button>
        ))}
        <button onClick={() => setShowMore(!showMore)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "2px", border: "none",
            backgroundColor: "transparent", cursor: "pointer", padding: "8px 4px",
            color: isMoreActive || showMore ? "#06b6d4" : "#64748b",
            borderTop: isMoreActive || showMore ? "2px solid #06b6d4" : "2px solid transparent",
          }}>
          <span style={{ fontSize: "20px" }}>☰</span>
          <span style={{ fontSize: "10px", fontWeight: "600" }}>More</span>
        </button>
      </div>
    </>
  );
}

export default BottomNav;
