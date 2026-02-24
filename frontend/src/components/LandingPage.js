import React, { useState, useEffect } from 'react';

function LandingPage({ onLogin, onSignup }) {
  const [contactForm, setContactForm] = React.useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [contactSent, setContactSent] = React.useState(false);
  const [contactLoading, setContactLoading] = React.useState(false);
  const [contactError, setContactError] = React.useState('');

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactError('Please fill in name, email and message');
      return;
    }
    setContactLoading(true);
    setContactError('');
    try {
      const res = await fetch('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      const data = await res.json();
      if (!res.ok) { setContactError(data.message); return; }
      setContactSent(true);
    } catch (err) {
      setContactError('Failed to send message. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', backgroundColor: '#0a0f2c',
    border: '2px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    color: 'white', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
  };
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .landing { font-family: 'DM Sans', sans-serif; background: #04081a; color: white; overflow-x: hidden; }
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 20px 48px; display: flex; align-items: center; justify-content: space-between; transition: all 0.3s ease; }
    .nav.scrolled { background: rgba(4,8,26,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(6,182,212,0.15); }
    .nav-logo { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.5px; }
    .nav-logo span { color: #06b6d4; }
    .nav-actions { display: flex; gap: 12px; align-items: center; }
    .btn-ghost { padding: 10px 22px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: transparent; color: white; cursor: pointer; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
    .btn-ghost:hover { border-color: #06b6d4; color: #06b6d4; }
    .btn-primary { padding: 10px 22px; border: none; border-radius: 6px; background: #06b6d4; color: #04081a; cursor: pointer; font-size: 14px; font-weight: 700; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
    .btn-primary:hover { background: #22d3ee; transform: translateY(-1px); }
    .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; padding: 120px 48px 80px; text-align: center; background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.12) 0%, transparent 70%); }
    .hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 100px; border: 1px solid rgba(6,182,212,0.3); background: rgba(6,182,212,0.08); font-size: 13px; color: #06b6d4; font-weight: 500; margin-bottom: 32px; position: relative; z-index: 1; }
    .hero-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #06b6d4; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .hero-title { font-family: 'Syne', sans-serif; font-size: clamp(42px, 7vw, 80px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; position: relative; z-index: 1; }
    .hero-title .accent { color: #06b6d4; }
    .hero-sub { font-size: clamp(16px, 2vw, 19px); color: #94a3b8; line-height: 1.7; max-width: 560px; margin: 0 auto 48px; position: relative; z-index: 1; font-weight: 300; }
    .hero-cta { display: flex; gap: 14px; justify-content: center; position: relative; z-index: 1; flex-wrap: wrap; }
    .btn-hero { padding: 16px 36px; border-radius: 8px; font-size: 16px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-hero-primary { background: #06b6d4; color: #04081a; }
    .btn-hero-primary:hover { background: #22d3ee; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(6,182,212,0.3); }
    .btn-hero-secondary { background: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); }
    .btn-hero-secondary:hover { border-color: #06b6d4; color: #06b6d4; }
    .hero-stats { display: flex; gap: 48px; justify-content: center; margin-top: 72px; position: relative; z-index: 1; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-num { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #06b6d4; }
    .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }
    .section { padding: 100px 48px; max-width: 1200px; margin: 0 auto; }
    .section-label { font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #06b6d4; margin-bottom: 16px; }
    .section-title { font-family: 'Syne', sans-serif; font-size: clamp(32px, 4vw, 48px); font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; }
    .section-sub { color: #64748b; font-size: 17px; max-width: 480px; line-height: 1.7; font-weight: 300; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2px; margin-top: 64px; }
    .feature-card { padding: 40px 36px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); transition: all 0.3s; }
    .feature-card:hover { background: rgba(6,182,212,0.05); border-color: rgba(6,182,212,0.2); transform: translateY(-4px); }
    .feature-icon { font-size: 32px; margin-bottom: 20px; }
    .feature-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .feature-desc { color: #64748b; font-size: 15px; line-height: 1.7; font-weight: 300; }
    .how-section { padding: 100px 48px; background: rgba(6,182,212,0.03); border-top: 1px solid rgba(6,182,212,0.08); border-bottom: 1px solid rgba(6,182,212,0.08); }
    .how-inner { max-width: 1200px; margin: 0 auto; }
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 40px; margin-top: 64px; }
    .step { text-align: center; }
    .step-num { width: 56px; height: 56px; border-radius: 50%; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #06b6d4; }
    .step-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 10px; }
    .step-desc { color: #64748b; font-size: 14px; line-height: 1.7; font-weight: 300; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 64px; }
    .pricing-card { padding: 40px 32px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); position: relative; transition: all 0.3s; }
    .pricing-card:hover { transform: translateY(-4px); }
    .pricing-card.popular { background: rgba(6,182,212,0.08); border-color: #06b6d4; }
    .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #06b6d4; color: #04081a; font-size: 11px; font-weight: 800; padding: 4px 16px; border-radius: 100px; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; }
    .plan-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #06b6d4; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
    .plan-price { font-family: 'Syne', sans-serif; font-size: 52px; font-weight: 800; letter-spacing: -2px; margin-bottom: 4px; }
    .plan-period { color: #64748b; font-size: 14px; margin-bottom: 28px; }
    .plan-features { list-style: none; margin-bottom: 32px; }
    .plan-features li { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #94a3b8; display: flex; align-items: center; gap: 10px; }
    .plan-features li::before { content: "✓"; color: #06b6d4; font-weight: 700; }
    .btn-plan { width: 100%; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; border: none; }
    .btn-plan-outline { background: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); }
    .btn-plan-outline:hover { border-color: #06b6d4; color: #06b6d4; }
    .btn-plan-filled { background: #06b6d4; color: #04081a; }
    .btn-plan-filled:hover { background: #22d3ee; }
    .cta-section { padding: 100px 48px; text-align: center; background: radial-gradient(ellipse 60% 80% at 50% 50%, rgba(6,182,212,0.1) 0%, transparent 70%); }
    .cta-title { font-family: 'Syne', sans-serif; font-size: clamp(36px, 5vw, 60px); font-weight: 800; letter-spacing: -2px; margin-bottom: 20px; }
    .cta-sub { color: #64748b; font-size: 18px; margin-bottom: 40px; font-weight: 300; }
    .footer { padding: 40px 48px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .footer-logo { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; }
    .footer-logo span { color: #06b6d4; }
    .footer-copy { color: #334155; font-size: 13px; }
    @media (max-width: 768px) {
      .nav { padding: 16px 24px; } .hero { padding: 100px 24px 60px; }
      .section { padding: 60px 24px; } .how-section { padding: 60px 24px; }
      .cta-section { padding: 60px 24px; } .footer { padding: 32px 24px; flex-direction: column; text-align: center; }
      .hero-stats { gap: 32px; }
    }
  `;

  return (
    <div className="landing">
      <style>{styles}</style>
      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <div className="nav-logo">Helix<span>8</span></div>
        <div className="nav-actions">
          <button className="btn-ghost" onClick={onLogin}>Log In</button>
          <button className="btn-primary" onClick={onSignup}>Start Free Trial</button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <div className="hero-badge">Built for trades businesses</div>
          <h1 className="hero-title">Run your entire<br />trades business<br /><span className="accent">from one place.</span></h1>
          <p className="hero-sub">Customers, work orders, invoices, and your whole team managed from your phone or desktop. No paperwork. No chaos.</p>
          <div className="hero-cta">
            <button className="btn-hero btn-hero-primary" onClick={onSignup}>Start 14-Day Free Trial</button>
            <button className="btn-hero btn-hero-secondary" onClick={onLogin}>Log In</button>
          </div>
          <div className="hero-stats">
            <div className="stat"><div className="stat-num">14</div><div className="stat-label">Day free trial</div></div>
            <div className="stat"><div className="stat-num">$79</div><div className="stat-label">Starting per month</div></div>
            <div className="stat"><div className="stat-num">0</div><div className="stat-label">Setup fees</div></div>
          </div>
        </div>
      </section>

      <div style={{background: "#04081a"}}>
        <div className="section">
          <div className="section-label">Everything you need</div>
          <h2 className="section-title">Less paperwork.<br />More jobs done.</h2>
          <p className="section-sub">Everything your team needs to manage jobs from the office or the field.</p>
          <div className="features-grid">
            {[
              {icon:"👥", title:"Customer Management", desc:"Store every customer, their history, and contact info in one place. Import your existing list in seconds."},
              {icon:"📋", title:"Work Orders", desc:"Create and assign jobs to your techs. They see their schedule on their phone and update status in real time."},
              {icon:"💰", title:"Invoicing", desc:"Generate professional invoices and email them directly to customers with one click. Get paid faster."},
              {icon:"📷", title:"Photo Uploads", desc:"Techs upload before and after photos directly from the job site. Proof of work, every time."},
              {icon:"🗺️", title:"Job Map", desc:"See all your scheduled jobs plotted on a live map. Know where every tech is working today."},
              {icon:"📱", title:"Mobile Friendly", desc:"Works on any phone or tablet. Your techs don't need to download anything — just open the browser."},
            ].map((f,i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="how-section">
        <div className="how-inner">
          <div className="section-label">How it works</div>
          <h2 className="section-title">Up and running<br />in minutes.</h2>
          <div className="steps">
            {[
              {num:"1", title:"Sign up free", desc:"Create your company account in under 2 minutes. No credit card required to start."},
              {num:"2", title:"Import your customers", desc:"Upload your existing customer list as a CSV. Everyone loaded instantly."},
              {num:"3", title:"Add your techs", desc:"Invite your technicians. They log in and see only their assigned jobs."},
              {num:"4", title:"Start dispatching", desc:"Create work orders, assign jobs, send invoices. Your whole operation in one place."},
            ].map((s,i) => (
              <div className="step" key={i}>
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background: "#04081a"}}>
        <div className="section">
          <div className="section-label">Simple pricing</div>
          <h2 className="section-title">No surprises.<br />No per-user fees.</h2>
          <p className="section-sub">One flat monthly price for your whole company. Cancel anytime.</p>
          <div className="pricing-grid">
            {[
              {name:"Basic", price:"$79", features:["Up to 3 users","Customers & Work Orders","Invoicing & Email","Photo uploads","Email support"], btn:"btn-plan-outline", popular:false},
              {name:"Pro", price:"$149", features:["Unlimited users","Everything in Basic","Job map view","Advanced dashboard","Priority support"], btn:"btn-plan-filled", popular:true},
              {name:"Enterprise", price:"$299", features:["Everything in Pro","Multi-location ready","CSV bulk import","Dedicated support","SLA guarantee"], btn:"btn-plan-outline", popular:false},
            ].map((plan,i) => (
              <div className={"pricing-card" + (plan.popular ? " popular" : "")} key={i}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price">{plan.price}</div>
                <div className="plan-period">/month · 14-day free trial</div>
                <ul className="plan-features">{plan.features.map((f,j) => <li key={j}>{f}</li>)}</ul>
                <button className={"btn-plan " + plan.btn} onClick={onSignup}>Start Free Trial</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h2 className="cta-title">Ready to clean up<br />the chaos?</h2>
        <p className="cta-sub">Join trades businesses already running smarter with Helix8.</p>
        <button className="btn-hero btn-hero-primary" onClick={onSignup}>Start Your Free Trial Today</button>
      </div>


      <div style={{ padding: '80px 24px', backgroundColor: '#0a0f2c' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'white', margin: '0 0 16px' }}>Get in Touch</h2>
            <p style={{ color: '#94a3b8', fontSize: '18px', margin: 0 }}>Have questions? Send us a message and we will get back to you within 24 hours.</p>
          </div>
          {contactSent ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Message Sent</h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>We will get back to you within 24 hours.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#0d1426', borderRadius: '16px', padding: '40px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>NAME *</label>
                  <input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Smith" style={{ width: '100%', padding: '12px 14px', backgroundColor: '#0a0f2c', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>EMAIL *</label>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@company.com" style={{ width: '100%', padding: '12px 14px', backgroundColor: '#0a0f2c', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>COMPANY</label>
                  <input value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="ACME HVAC" style={{ width: '100%', padding: '12px 14px', backgroundColor: '#0a0f2c', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>PHONE</label>
                  <input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(404) 555-0100" style={{ width: '100%', padding: '12px 14px', backgroundColor: '#0a0f2c', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>MESSAGE *</label>
                <textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your business and what you are looking for..."
                  rows={5} style={{ width: '100%', padding: '12px 14px', backgroundColor: '#0a0f2c', border: '2px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              {contactError && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{contactError}</p>}
              <button onClick={handleContactSubmit} disabled={contactLoading}
                style={{ width: '100%', padding: '14px', backgroundColor: '#06b6d4', color: '#0a0f2c', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                {contactLoading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          )}
        </div>
      </div>
      <footer className="footer">
        <div className="footer-logo">Helix<span>8</span></div>
        <div className="footer-copy">© 2026 Helix8 by Octave Labs. Built for trades professionals.</div>
      </footer>
    </div>
  );
}

export default LandingPage;
