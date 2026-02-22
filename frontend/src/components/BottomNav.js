import React from 'react';

function BottomNav({ currentPage, setCurrentPage, userRole }) {
  const techItems = ['workorders', 'map'];
  const allItems = [
    { page: 'dashboard', icon: '🏠', label: 'Home' },
    { page: 'customers', icon: '👥', label: 'Customers' },
    { page: 'workorders', icon: '📋', label: 'Jobs' },
    { page: 'invoices', icon: '💰', label: 'Invoices' },
    { page: 'billing', icon: '💳', label: 'Billing' },
  ];
  const navItems = userRole === 'technician' ? allItems.filter(i => techItems.includes(i.page)) : allItems;

  return (
    <div className="bottom-nav" style={{
      display: 'none',
      position: 'fixed', bottom: 0, left: 0, right: 0,
      backgroundColor: '#0a0f2c', borderTop: '1px solid #1e293b',
      zIndex: 999, height: '62px',
      gridTemplateColumns: 'repeat(5, 1fr)',
    }}>
      {navItems.map(({ page, icon, label }) => (
        <button key={page} onClick={() => setCurrentPage(page)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '2px', border: 'none',
            backgroundColor: 'transparent', cursor: 'pointer', padding: '8px 4px',
            color: currentPage === page ? '#06b6d4' : '#64748b',
            borderTop: currentPage === page ? '2px solid #2563eb' : '2px solid transparent',
          }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ fontSize: '10px', fontWeight: '600' }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export default BottomNav;
