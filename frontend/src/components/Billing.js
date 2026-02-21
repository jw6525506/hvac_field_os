import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

function Billing({ currentUser }) {
  const [plans, setPlans] = useState([]);
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [plansRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/billing/plans`),
        fetch(`${API_BASE}/billing/status`, { headers }),
      ]);
      const [plansData, statusData] = await Promise.all([plansRes.json(), statusRes.json()]);
      setPlans(plansData.plans || []);
      setBillingStatus(statusData);
    } catch (err) {
      console.error('Billing load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (priceId, planName) => {
    setCheckoutLoading(planName);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Portal error:', err);
    }
  };

  if (loading) return (
    <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b' }}>Loading billing info...</p>
    </div>
  );

  const plan = billingStatus && billingStatus.plan ? billingStatus.plan : 'trial';
  const isOnPaidPlan = plan !== 'trial';
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div style={{ padding: '32px', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '700', color: '#1a2332' }}>Billing and Plans</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Manage your subscription</p>
      </div>

      {billingStatus && (
        <div style={{
          padding: '20px 24px', borderRadius: '12px', marginBottom: '32px',
          backgroundColor: isOnPaidPlan ? '#f0fdf4' : billingStatus.trialExpired ? '#fff1f2' : '#fffbeb',
          border: `1px solid ${isOnPaidPlan ? '#86efac' : billingStatus.trialExpired ? '#fecdd3' : '#fde68a'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '16px', color: '#1a2332' }}>
              {isOnPaidPlan ? `✅ ${planLabel} Plan — Active` :
               billingStatus.trialExpired ? '🔒 Trial Expired' :
               `⏳ Trial — ${billingStatus.trialDaysLeft} days left`}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {isOnPaidPlan ? 'Your subscription is active and all features are unlocked.' :
               billingStatus.trialExpired ? 'Your trial has ended. Please select a plan to continue.' :
               `Your free trial ends in ${billingStatus.trialDaysLeft} days. Upgrade to keep access.`}
            </p>
          </div>
          {isOnPaidPlan && (
            <button onClick={handlePortal}
              style={{ padding: '10px 20px', backgroundColor: '#1a2332', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap' }}>
              Manage Subscription
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {plans.map(plan => (
          <div key={plan.id}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '28px',
              border: plan.popular ? '2px solid #2563eb' : '1px solid #e2e8f0',
              position: 'relative',
              boxShadow: plan.popular ? '0 8px 32px rgba(37,99,235,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
            }}>
            {plan.popular && (
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: '#2563eb', color: 'white', padding: '4px 16px',
                borderRadius: '20px', fontSize: '12px', fontWeight: '700',
              }}>
                MOST POPULAR
              </div>
            )}
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '700', color: '#1a2332' }}>{plan.name}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>{plan.description}</p>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '42px', fontWeight: '800', color: '#1a2332' }}>${plan.price}</span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>/month</span>
            </div>
            <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none' }}>
              {plan.features.map((feature, idx) => (
                <li key={idx} style={{ padding: '6px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span> {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(plan.priceId, plan.name)}
              disabled={checkoutLoading === plan.name || (isOnPaidPlan && billingStatus.plan === plan.id)}
              style={{
                width: '100%', padding: '12px', fontSize: '15px', fontWeight: '700',
                color: plan.popular ? 'white' : '#1a2332',
                backgroundColor: plan.popular ? '#2563eb' : '#f1f5f9',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                opacity: checkoutLoading === plan.name ? 0.7 : 1,
              }}>
              {checkoutLoading === plan.name ? 'Loading...' :
               isOnPaidPlan && billingStatus.plan === plan.id ? '✓ Current Plan' :
               `Get Started with ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94a3b8' }}>
        Test mode — use card 4242 4242 4242 4242 with any future date and CVC
      </p>
    </div>
  );
}

export default Billing;
