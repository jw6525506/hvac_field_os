import React, { useState, useEffect } from 'react';

function PaymentPage({ invoiceId }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoiceId) return;
    fetch(`https://hvacfieldos-production.up.railway.app/api/invoices/${invoiceId}/public`)
      .then(r => r.json())
      .then(data => { setInvoice(data.invoice); setLoading(false); })
      .catch(() => { setError('Invoice not found'); setLoading(false); });
  }, [invoiceId]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await fetch(`https://hvacfieldos-production.up.railway.app/api/invoices/${invoiceId}/payment-link-public`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError('Failed to create payment link');
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally { setPaying(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f2c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: '18px' }}>Loading invoice...</div>
    </div>
  );

  if (error || !invoice) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f2c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#f87171', fontSize: '18px' }}>{error || 'Invoice not found'}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f2c', fontFamily: 'Segoe UI, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'white', fontSize: '32px', fontWeight: '800', margin: '0 0 8px' }}>Helix<span style={{ color: '#06b6d4' }}>8</span></h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Secure Invoice Payment</p>
        </div>
        <div style={{ backgroundColor: '#0d1426', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ backgroundColor: '#06b6d4', padding: '24px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px', color: '#0a0f2c', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Invoice</p>
                <h2 style={{ margin: 0, color: '#0a0f2c', fontSize: '20px', fontWeight: '800' }}>{invoice.invoiceNumber}</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px', color: '#0a0f2c', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Total Due</p>
                <h2 style={{ margin: 0, color: '#0a0f2c', fontSize: '28px', fontWeight: '800' }}>${parseFloat(invoice.total || 0).toFixed(2)}</h2>
              </div>
            </div>
          </div>
          <div style={{ padding: '32px' }}>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>From: <strong style={{ color: 'white' }}>{invoice.companyName}</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '8px 0', textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'center', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '8px 0', textAlign: 'right', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems || []).map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 0', color: 'white' }}>{item.description}</td>
                    <td style={{ padding: '12px 0', color: '#94a3b8', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 0', color: 'white', textAlign: 'right' }}>${parseFloat(item.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Subtotal</span>
                <span style={{ color: 'white' }}>${parseFloat(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ color: '#64748b' }}>Tax ({invoice.taxRate || 0}%)</span>
                <span style={{ color: 'white' }}>${parseFloat(invoice.taxAmount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.3)' }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>Total Due</span>
                <span style={{ color: '#06b6d4', fontWeight: '800', fontSize: '24px' }}>${parseFloat(invoice.total || 0).toFixed(2)}</span>
              </div>
            </div>
            {invoice.status === 'paid' ? (
              <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                <p style={{ color: '#4ade80', fontWeight: '700', margin: 0 }}>This invoice has been paid</p>
              </div>
            ) : (
              <button onClick={handlePay} disabled={paying}
                style={{ width: '100%', padding: '18px', backgroundColor: '#06b6d4', color: '#0a0f2c', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '800', cursor: paying ? 'not-allowed' : 'pointer' }}>
                {paying ? 'Redirecting to payment...' : `💳 Pay $${parseFloat(invoice.total || 0).toFixed(2)} Now`}
              </button>
            )}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '24px' }}>Secured by Stripe • Powered by Helix8</p>
      </div>
    </div>
  );
}

export default PaymentPage;
