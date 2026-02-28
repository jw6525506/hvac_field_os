
import React from 'react';

function PrivacyPolicy() {
  const S = {
    page: { minHeight: '100vh', backgroundColor: '#04081a', color: 'white', fontFamily: 'Segoe UI, sans-serif', padding: '60px 24px' },
    container: { maxWidth: '800px', margin: '0 auto' },
    logo: { fontSize: '28px', fontWeight: '800', color: 'white', marginBottom: '40px', display: 'block', textDecoration: 'none' },
    h1: { fontSize: '36px', fontWeight: '800', marginBottom: '8px' },
    h2: { fontSize: '20px', fontWeight: '700', color: '#06b6d4', marginTop: '40px', marginBottom: '12px' },
    p: { color: '#94a3b8', lineHeight: '1.8', marginBottom: '16px' },
    date: { color: '#64748b', fontSize: '14px', marginBottom: '40px' },
    back: { color: '#06b6d4', textDecoration: 'none', fontSize: '14px', display: 'inline-block', marginBottom: '40px' },
    divider: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '32px 0' },
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <a href="/" style={S.logo}>Helix<span style={{ color: '#06b6d4' }}>8</span></a>
        <a href="/" style={S.back}>← Back to Home</a>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.date}>Last updated: February 28, 2026</p>

        <p style={S.p}>Helix8 ("we," "us," or "our") is operated by Octave Labs LLC. This Privacy Policy explains how we collect, use, and protect your information when you use our field management software.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Information We Collect</h2>
        <p style={S.p}><strong style={{ color: 'white' }}>Account Information:</strong> When you sign up, we collect your name, email address, company name, phone number, and billing information.</p>
        <p style={S.p}><strong style={{ color: 'white' }}>Business Data:</strong> We store the data you enter into Helix8, including customer records, work orders, invoices, photos, and inventory information.</p>
        <p style={S.p}><strong style={{ color: 'white' }}>Usage Data:</strong> We collect information about how you use our service, including log data, device information, and IP addresses.</p>
        <p style={S.p}><strong style={{ color: 'white' }}>Payment Information:</strong> Payments are processed by Stripe. We do not store your credit card numbers on our servers.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>2. How We Use Your Information</h2>
        <p style={S.p}>We use your information to provide and improve our services, process payments, send invoices and notifications, respond to support requests, and comply with legal obligations. We do not sell your personal information to third parties.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>3. Data Storage and Security</h2>
        <p style={S.p}>Your data is stored on secure servers hosted by Railway (cloud infrastructure). We use industry-standard encryption (HTTPS/TLS) for all data transmission. We implement reasonable security measures to protect against unauthorized access, however no method of transmission over the internet is 100% secure.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>4. Data Retention</h2>
        <p style={S.p}>We retain your data for as long as your account is active or as needed to provide services. If you cancel your account, we will delete your data within 90 days unless required by law to retain it longer.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>5. Sharing Your Information</h2>
        <p style={S.p}>We do not sell or rent your personal information. We may share your information with third-party service providers that help us operate our service (Stripe for payments, Resend for email, Railway for hosting). These providers are bound by confidentiality agreements.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>6. Your Rights</h2>
        <p style={S.p}>You have the right to access, correct, or delete your personal information at any time. To exercise these rights, contact us at privacy@helix8.com. You may also export your data from the Settings section of your account.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>7. Cookies</h2>
        <p style={S.p}>We use essential cookies to keep you logged in and maintain your session. We do not use advertising or tracking cookies.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>8. Children's Privacy</h2>
        <p style={S.p}>Helix8 is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>9. Changes to This Policy</h2>
        <p style={S.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through the app. Continued use of Helix8 after changes constitutes acceptance of the updated policy.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>10. Contact Us</h2>
        <p style={S.p}>If you have questions about this Privacy Policy, please contact us at:<br />
          <strong style={{ color: 'white' }}>Octave Labs LLC</strong><br />
          Email: privacy@helix8.com
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
