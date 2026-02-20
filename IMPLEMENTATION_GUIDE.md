# HVAC Field OS - Implementation Guide
## Unified Field Operations System

---

## 🎯 Project Overview

This is a complete foundation for a unified HVAC field operations system that eliminates disconnected systems by integrating:

- **Dispatch Management** - Assign and schedule jobs
- **CRM** - Customer and equipment tracking
- **Invoicing** - Auto-generated from completed work orders
- **Inventory** - Real-time truck stock and warehouse management
- **Payroll** - Time tracking integrated with jobs
- **AI-Powered Costing** - Predictive margin analysis

---

## 📁 Project Structure

```
hvac-field-os/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── models/
│   │   ├── WorkOrder.js
│   │   ├── Customer.js
│   │   ├── Invoice.js
│   │   ├── Inventory.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── workOrders.js
│   │   ├── customers.js
│   │   ├── invoices.js
│   │   ├── inventory.js
│   │   └── dispatch.js
│   ├── services/
│   │   ├── invoiceService.js    # Auto-invoice creation
│   │   ├── aiCostingService.js  # Predictive margin
│   │   └── quickbooksSync.js    # Accounting integration
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── migrations/
│   │   └── 001-initial-schema.sql
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── Dispatch/
│   │   │   │   └── DispatchBoard.jsx
│   │   │   ├── WorkOrders/
│   │   │   │   ├── WorkOrderList.jsx
│   │   │   │   ├── WorkOrderForm.jsx
│   │   │   │   └── WorkOrderDetails.jsx
│   │   │   ├── Customers/
│   │   │   │   ├── CustomerList.jsx
│   │   │   │   └── CustomerForm.jsx
│   │   │   ├── Inventory/
│   │   │   │   ├── InventoryList.jsx
│   │   │   │   └── TruckStock.jsx
│   │   │   └── Invoicing/
│   │   │       ├── InvoiceList.jsx
│   │   │       └── InvoiceDetail.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   └── store.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
│
├── mobile/                       # React Native (future)
│   └── (Similar structure to frontend)
│
└── docs/
    ├── API.md
    ├── DATABASE.md
    └── DEPLOYMENT.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_NAME=hvac_field_os
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432

JWT_SECRET=your_jwt_secret_key_here
PORT=3000

# QuickBooks Integration (optional)
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
EOF

# Create database
createdb hvac_field_os

# Run migrations
psql hvac_field_os < migrations/001-initial-schema.sql

# Start server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3000/api
EOF

# Start development server
npm start
```

Access the application at `http://localhost:3001`

---

## 🔑 Key Features & Implementation

### 1. Auto-Invoice Creation

**Problem Solved:** Eliminates manual invoice creation and data re-entry.

**How it Works:**
1. Technician completes work order in the field
2. System automatically:
   - Pulls all parts used from work order
   - Pulls all labor hours
   - Calculates totals with markup
   - Applies tax
   - Creates invoice in "draft" status
3. Office reviews and sends to customer

**Code Location:** `backend/services/invoiceService.js`

```javascript
// Usage in work order completion
POST /api/work-orders/:id/complete
{
  "workPerformed": "Replaced capacitor and cleaned coils",
  "diagnosis": "Bad capacitor causing system failure"
}

// Response includes both work order AND auto-generated invoice
{
  "workOrder": { ... },
  "invoice": {
    "invoiceNumber": "INV-202600001",
    "total": 450.00,
    "lineItems": [...]
  }
}
```

### 2. Real-Time Inventory Tracking

**Problem Solved:** Techs know what's on their truck without calling the office.

**How it Works:**
1. Each technician has a "truck stock" inventory
2. When parts are used on a job, inventory auto-decrements
3. System alerts when truck stock is low
4. Warehouse manager can see all truck inventory in real-time

**Code Location:** `backend/routes/inventory.js`

```javascript
// Get technician's truck stock
GET /api/inventory/truck-stock/:technicianId

// Response
{
  "technicianId": 5,
  "technicianName": "John Smith",
  "stock": [
    {
      "partName": "3-Ton AC Capacitor",
      "quantity": 3,
      "minimumQuantity": 2,
      "needsRestock": true
    }
  ]
}
```

### 3. AI-Powered Job Costing

**Problem Solved:** Prevents accepting unprofitable jobs.

**How it Works:**
1. When creating a quote, system analyzes:
   - Historical data for similar jobs
   - Actual hours vs. estimated hours (past performance)
   - Parts costs with current pricing
2. Predicts actual margin before sending quote
3. Warns if margin will be below threshold (e.g., 20%)

**Code Location:** `backend/services/aiCostingService.js`

```javascript
// Create quote with AI analysis
POST /api/quotes
{
  "customerId": 123,
  "serviceType": "AC Installation",
  "estimatedHours": 6,
  "parts": [
    { "id": 45, "quantity": 1 }
  ]
}

// Response includes AI prediction
{
  "quote": { ... },
  "aiAnalysis": {
    "predictedMargin": 18.5,
    "predictedRevenue": 3200,
    "predictedCost": 2608,
    "confidence": "high",
    "warning": true,
    "recommendation": "Consider increasing price by $200 or reducing scope"
  }
}
```

### 4. Unified Dispatch Board

**Problem Solved:** No more spreadsheets or whiteboards for scheduling.

**Features:**
- Drag-and-drop job assignment
- Technician availability at a glance
- Route optimization
- Real-time status updates from the field

**Code Location:** `frontend/src/components/Dispatch/DispatchBoard.jsx`

### 5. QuickBooks Auto-Sync

**Problem Solved:** No manual entry into accounting software.

**How it Works:**
1. When invoice is marked "sent", it syncs to QuickBooks
2. When payment is recorded, it syncs back
3. Automated nightly sync for all transactions

**Code Location:** `backend/services/quickbooksSync.js`

---

## 🎨 User Interface

### Dashboard View
- KPI cards: Today's jobs, completed, revenue, warnings
- Today's schedule with status indicators
- Weekly revenue chart
- Low margin alerts highlighted in red

### Dispatch Board
- Column for unassigned jobs
- Column per technician showing their schedule
- Color-coded by priority (red = emergency, yellow = high, etc.)
- Estimated drive time between jobs

### Work Order Detail
- Customer information auto-filled from CRM
- Equipment history for this customer
- Parts selector from inventory (shows truck stock)
- Labor time tracking
- Before/after photo upload (mobile)
- Digital signature capture (mobile)
- One-click complete → auto-generates invoice

---

## 📊 Database Design Highlights

### Key Tables

**work_orders** - Central hub
- Links to customer, technician, invoice
- Tracks estimated vs. actual costs/margins
- Status workflow: scheduled → in_progress → completed

**inventory & truck_stock** - Two-tier system
- `inventory`: Warehouse stock
- `truck_stock`: Per-technician mobile inventory
- Automatic transactions when parts are used

**invoices & work_orders** - One-to-one relationship
- Invoice auto-created from work order
- Line items pulled from work order parts and labor
- No duplicate data entry

### Smart Indexing
```sql
-- Fast lookups for common queries
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_start);
CREATE INDEX idx_invoices_status ON invoices(status);
```

---

## 🔐 Security Features

1. **JWT Authentication**
   - Secure token-based auth
   - Role-based access control (admin, dispatcher, technician)

2. **Data Isolation**
   - Multi-tenant support via `company_id`
   - Each company's data is isolated

3. **Input Validation**
   - All API endpoints use express-validator
   - SQL injection protection via Sequelize ORM

---

## 📱 Mobile App Strategy (React Native)

### Critical Mobile Features

1. **Offline Mode**
   - SQLite local database
   - Sync when connection restored
   - Queue actions (complete job, use parts)

2. **GPS Integration**
   - Auto-calculate drive time
   - Track technician location
   - Optimize routing

3. **Camera**
   - Before/after photos
   - Barcode scanner for parts
   - Equipment model number OCR

4. **Digital Signature**
   - Customer approval on-site
   - Embedded in invoice PDF

5. **Push Notifications**
   - New job assigned
   - Schedule changes
   - Low truck stock alerts

### Mobile Tech Stack
```javascript
// Key React Native libraries
{
  "dependencies": {
    "react-native": "^0.72.0",
    "@react-navigation/native": "^6.1.0",
    "react-native-sqlite-storage": "^6.0.1",  // Offline
    "react-native-maps": "^1.7.0",            // GPS/Routing
    "react-native-camera": "^4.2.1",          // Photos
    "react-native-signature-capture": "^0.4.12",
    "@react-native-firebase/messaging": "^18.0.0"  // Push
  }
}
```

---

## 🧪 Testing Strategy

### Backend Tests
```bash
# Unit tests for services
npm test services/invoiceService.test.js
npm test services/aiCostingService.test.js

# Integration tests for API
npm test routes/workOrders.test.js
```

### Frontend Tests
```bash
# Component tests
npm test components/Dashboard.test.jsx

# Redux store tests
npm test store/slices/workOrdersSlice.test.js
```

---

## 🚀 Deployment

### Backend (API)
- **Platform:** AWS EC2, Heroku, or DigitalOcean
- **Database:** AWS RDS PostgreSQL or managed PostgreSQL
- **File Storage:** AWS S3 for photos/PDFs

### Frontend (Web App)
- **Platform:** Vercel, Netlify, or AWS S3 + CloudFront
- **Build:** `npm run build` → static files

### Mobile App
- **iOS:** Apple App Store (requires Apple Developer account)
- **Android:** Google Play Store

---

## 🔄 Integration Points

### QuickBooks Online
```javascript
// OAuth 2.0 flow
const quickbooks = require('node-quickbooks');

// Sync invoice
await quickbooks.createInvoice({
  Line: invoiceLineItems,
  CustomerRef: { value: customerId }
});
```

### Twilio (SMS Notifications)
```javascript
// Send appointment reminder
await twilio.messages.create({
  to: customer.phone,
  body: `Reminder: Your HVAC service is scheduled for ${date} between ${timeWindow}`
});
```

### Stripe (Payment Processing)
```javascript
// Accept credit card payment
const payment = await stripe.paymentIntents.create({
  amount: invoice.totalAmount * 100,
  currency: 'usd',
  customer: customer.stripeId
});
```

---

## 📈 Scaling Considerations

### Performance Optimization

1. **Database**
   - Index frequently queried columns
   - Use connection pooling
   - Implement read replicas for reporting

2. **API**
   - Redis caching for frequently accessed data
   - Rate limiting to prevent abuse
   - Horizontal scaling with load balancer

3. **Frontend**
   - Lazy loading for routes
   - Memoization for expensive calculations
   - Virtualized lists for large datasets

### Multi-Company Support
- Already built into schema via `company_id`
- Easy to convert to SaaS model
- Separate database per company for enterprise clients

---

## 🎯 Next Steps & Roadmap

### Phase 1 (MVP) - 8 weeks
- [x] Database schema
- [x] Backend API foundation
- [x] Frontend React app structure
- [ ] Authentication & authorization
- [ ] Basic CRUD for all modules
- [ ] Auto-invoice creation
- [ ] Deploy to staging

### Phase 2 - 4 weeks
- [ ] Dispatch board with drag-drop
- [ ] AI job costing (basic version)
- [ ] QuickBooks integration
- [ ] Email/SMS notifications
- [ ] Mobile-responsive web app

### Phase 3 - 6 weeks
- [ ] React Native mobile app
- [ ] Offline mode
- [ ] GPS routing
- [ ] Photo capture
- [ ] Digital signatures
- [ ] App store deployment

### Phase 4 - Ongoing
- [ ] Advanced AI (machine learning model)
- [ ] Route optimization algorithm
- [ ] Customer portal
- [ ] Predictive maintenance scheduling
- [ ] Fleet management integration

---

## 💡 Best Practices

1. **Keep It Simple**
   - Start with core features that solve the main problem
   - Don't over-engineer initially

2. **User Feedback**
   - Get real HVAC technicians to test early
   - Iterate based on actual field usage

3. **Data Quality**
   - Garbage in = garbage out
   - Validate all inputs
   - Clean historical data before importing

4. **Training**
   - Build in-app tutorials
   - Create video guides for each module
   - Offer onboarding support

---

## 📞 Support & Community

### Documentation
- API Reference: `/docs/API.md`
- Database Schema: `/docs/DATABASE.md`
- Deployment Guide: `/docs/DEPLOYMENT.md`

### Getting Help
- GitHub Issues for bug reports
- Discord community for questions
- Email support: support@hvacfieldos.com

---

## 📄 License

MIT License - Feel free to use and modify for your business needs.

---

## 🙏 Credits

Built with modern technologies:
- Node.js + Express
- PostgreSQL
- React + Redux
- React Native
- Tailwind CSS

**Built to solve real problems for HVAC companies tired of disconnected systems.**
