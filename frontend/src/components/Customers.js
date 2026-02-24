import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';

function Customers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://hvacfieldos-production.up.railway.app/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const filterCustomers = () => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = customers.filter(customer => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      return fullName.includes(term) || 
             customer.email.toLowerCase().includes(term) || 
             customer.phone.toLowerCase().includes(term) ||
             customer.address.toLowerCase().includes(term);
    });

    setFilteredCustomers(filtered);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://hvacfieldos-production.up.railway.app/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({ firstName: '', lastName: '', phone: '', email: '', address: '' });
        loadCustomers();
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const customers = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        customers.push({
          firstName: row['firstname'] || row['first name'] || row['first_name'] || '',
          lastName: row['lastname'] || row['last name'] || row['last_name'] || '',
          phone: row['phone'] || row['telephone'] || '',
          email: row['email'] || '',
          address: row['address'] || '',
        });
      }
      const token = localStorage.getItem('token');
      const res = await fetch('https://hvacfieldos-production.up.railway.app/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ customers }),
      });
      const data = await res.json();
      if (!res.ok) { setImportMsg(data.message || 'Import failed'); return; }
      setImportMsg('✅ ' + data.message);
      loadCustomers();
    } catch (err) {
      setImportMsg('Failed to read file.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1>Customers</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ padding: '12px 18px', backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            {'📥 ' + (importing ? t('loading') : t('importCSV'))}
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button onClick={() => setShowForm(true)} style={{ padding: '12px 24px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Add Customer
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={t('search') + '...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' }}
        />
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '500px' }}>
            <h2>Add Customer</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" name="firstName" placeholder={t('firstName')} value={formData.firstName} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              <input type="text" name="lastName" placeholder={t('lastName')} value={formData.lastName} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              <input type="tel" name="phone" placeholder={t('phone')} value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              <input type="email" name="email" placeholder={t('email')} value={formData.email} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              <input type="text" name="address" placeholder={t('address')} value={formData.address} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', marginRight: '10px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
            </form>
          </div>
        </div>
      )}

      <div>
        {filteredCustomers.map(c => (
          <div key={c.id} style={{ backgroundColor: 'white', padding: '20px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>{c.firstName} {c.lastName}</h3>
            <p>📞 {c.phone}</p>
            <p>📧 {c.email}</p>
            <p>📍 {c.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Customers;
