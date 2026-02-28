
import React from 'react';

function TermsOfService() {
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
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.date}>Last updated: February 28, 2026</p>

        <p style={S.p}>These Terms of Service ("Terms") govern your use of Helix8, operated by Octave Labs LLC. By using Helix8, you agree to these Terms. Please read them carefully.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Acceptance of Terms</h2>
        <p style={S.p}>By creating an account or using Helix8, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use our service.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>2. Description of Service</h2>
        <p style={S.p}>Helix8 is a cloud-based field management software for trades businesses. Features include customer management, work order tracking, invoicing, inventory management, and payroll tracking. We reserve the right to modify or discontinue features at any time.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>3. Account Responsibilities</h2>
        <p style={S.p}>You are responsible for maintaining the security of your account credentials. You must notify us immediately of any unauthorized access. You are responsible for all activity that occurs under your account. You must provide accurate information when creating your account.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>4. Subscription and Billing</h2>
        <p style={S.p}><strong style={{ color: 'white' }}>Free Trial:</strong> New accounts receive a 14-day free trial with full access to all features.</p>
        <p style={S.p}><strong style={{ color: 'white' }}>Subscription Plans:</strong> After the trial, continued use requires a paid subscription (Basic $79/month, Pro $149/month, Enterprise $299/month).</p>
        <p style={S.p}><strong style={{ color: 'white' }}>Billing:</strong> Subscriptions are billed monthly. You authorize us to charge your payment method on a recurring basis.</p>
        <p style={S.p}><strong style={{ color: 'white' }}>Cancellation:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial months.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>5. Acceptable Use</h2>
        <p style={S.p}>You agree not to use Helix8 to violate any laws or regulations, transmit harmful or malicious content, attempt to gain unauthorized access to our systems, resell or sublicense our service without permission, or interfere with other users' access to the service.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>6. Your Data</h2>
        <p style={S.p}>You own all data you enter into Helix8. We do not claim ownership of your business data. You grant us a limited license to store and process your data solely to provide our service. You are responsible for the accuracy and legality of the data you enter.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>7. Limitation of Liability</h2>
        <p style={S.p}>To the maximum extent permitted by law, Octave Labs LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of Helix8, including loss of data, lost profits, or business interruption. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>8. Disclaimer of Warranties</h2>
        <p style={S.p}>Helix8 is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or completely secure. We are not responsible for any losses resulting from service outages or data loss.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>9. Termination</h2>
        <p style={S.p}>We reserve the right to suspend or terminate your account for violation of these Terms, non-payment, or any activity we determine to be harmful to our service or other users. You may terminate your account at any time from the Settings page.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>10. Governing Law</h2>
        <p style={S.p}>These Terms are governed by the laws of the State of Georgia, United States. Any disputes shall be resolved in the courts of Georgia.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>11. Changes to Terms</h2>
        <p style={S.p}>We may update these Terms at any time. We will notify you of material changes by email or through the app. Continued use of Helix8 after changes constitutes acceptance of the updated Terms.</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>12. Contact Us</h2>
        <p style={S.p}>If you have questions about these Terms, contact us at:<br />
          <strong style={{ color: 'white' }}>Octave Labs LLC</strong><br />
          Email: legal@helix8.com
        </p>
      </div>
    </div>
  );
}

export default TermsOfService;
