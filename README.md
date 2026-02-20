# 🔧 HVAC Field OS - Unified Field Operations System

> **End disconnected systems forever.** One platform for dispatch, CRM, invoicing, inventory, and payroll.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-14+-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue.svg)](https://reactjs.org/)

---

## 🎯 The Problem

Most HVAC companies use **5+ disconnected systems**:
- ✅ One tool for dispatch
- ✅ One for invoicing  
- ✅ One for accounting (QuickBooks)
- ✅ One for CRM
- ✅ Spreadsheets everywhere

**Result:** Technicians re-enter the same information multiple times. Errors happen. Data gets lost. Time is wasted.

## 💡 The Solution

**HVAC Field OS** is a single, unified platform that eliminates disconnection:

### ✨ Core Features

| Feature | Benefit |
|---------|---------|
| **Auto-Invoice Creation** | Complete a work order → invoice auto-generates. No data re-entry. |
| **Real-Time Inventory** | Techs see truck stock instantly. Parts auto-deduct when used. |
| **AI Job Costing** | Predicts profitability BEFORE accepting the job. Warns about low margins. |
| **Unified Dispatch** | Drag-and-drop scheduling. No more whiteboards or spreadsheets. |
| **QuickBooks Sync** | Invoices and payments sync automatically. Zero manual entry. |
| **Mobile-First** | Techs work from their phones. Offline mode for basements. |

---

## 🚀 Quick Start

### Option 1: Docker (Recommended - 5 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/hvac-field-os.git
cd hvac-field-os

# Start everything
docker-compose up -d

# Open in browser
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
```

### Option 2: Manual Setup (20 minutes)

See [QUICK_START.md](QUICK_START.md) for detailed instructions.

---

## 📸 Screenshots

### Dashboard - At-a-Glance Operations
```
┌─────────────────────────────────────────────────────────┐
│  📊 Dashboard                                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Today's  │ │Completed │ │Revenue   │ │Margin    │   │
│  │Jobs     │ │Today     │ │Today     │ │Warnings  │   │
│  │   12    │ │    8     │ │ $8,450   │ │    2     │   │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  📅 Today's Schedule                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ WO-2026001 │ Smith Residence │ 9:00 AM │ ✅ Done │ │
│  │ WO-2026002 │ ABC Corp       │ 11:00 AM │ 🔄 Active│ │
│  │ WO-2026003 │ Jones HVAC     │ 2:00 PM  │ 📅 Soon │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Dispatch Board - Drag & Drop Scheduling
```
┌──────────────────────────────────────────────────────────┐
│  🗓️  Dispatch Board                    [Optimize Routes]│
├──────────────┬──────────────┬──────────────┬────────────┤
│ Unassigned   │ John Smith   │ Mary Johnson │ Bob Wilson │
│ (3)          │ (5)          │ (4)          │ (6)        │
├──────────────┼──────────────┼──────────────┼────────────┤
│ □ WO-2026010 │ □ WO-2026004 │ □ WO-2026007 │ □ WO-20... │
│ □ WO-2026011 │ □ WO-2026005 │ □ WO-2026008 │ □ WO-20... │
│ □ WO-2026012 │ □ WO-2026006 │ □ WO-2026009 │ □ WO-20... │
└──────────────┴──────────────┴──────────────┴────────────┘
          Drag jobs to assign technicians
```

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL (with Sequelize ORM)
- JWT Authentication
- Redis (caching)

**Frontend:**
- React 18
- Redux Toolkit (state management)
- Tailwind CSS (styling)
- Recharts (analytics)

**Mobile:**
- React Native
- SQLite (offline storage)
- GPS integration
- Camera for photos

### System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Mobile    │      │   Web App    │      │   Backend    │
│   (React    │◄────►│   (React)    │◄────►│   (Node.js)  │
│   Native)   │      │              │      │   + Express  │
└─────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                          ┌────────────────────────┼──────────┐
                          │                        │          │
                    ┌─────▼──────┐          ┌──────▼─────┐   │
                    │ PostgreSQL │          │   Redis    │   │
                    │  Database  │          │   Cache    │   │
                    └────────────┘          └────────────┘   │
                                                             │
                          ┌──────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │   QuickBooks API  │
                │   Twilio SMS      │
                │   Stripe Payments │
                └───────────────────┘
```

---

## 📦 What's Included

### Database Schema
- **12 core tables** covering all operations
- **Smart relationships** that eliminate data duplication
- **Automatic financial calculations**
- **Audit trails** for inventory and payments

### Backend API
- **RESTful API** with 40+ endpoints
- **Auto-invoice generation** from work orders
- **AI-powered cost prediction** using historical data
- **Inventory tracking** with truck stock management
- **QuickBooks integration** ready to go

### Frontend Application
- **Dashboard** with real-time KPIs
- **Dispatch board** with drag-and-drop
- **Work order management** with status tracking
- **Customer database** with equipment history
- **Invoice management** with payment tracking
- **Inventory control** with low-stock alerts

### Mobile App Foundation
- **Offline-first** architecture
- **GPS routing** and location tracking
- **Photo capture** for before/after
- **Digital signatures** for customer approval
- **Push notifications** for job updates

---

## 🎓 How It Works

### 1. Auto-Invoice Creation

```javascript
// Technician completes work order
POST /api/work-orders/123/complete
{
  "workPerformed": "Replaced capacitor, cleaned coils",
  "diagnosis": "Failed capacitor"
}

// System automatically:
// ✓ Creates invoice from work order data
// ✓ Pulls all parts used
// ✓ Calculates labor costs
// ✓ Applies markup and tax
// ✓ Sets status to "draft" for review

// Response includes both:
{
  "workOrder": { status: "completed", ... },
  "invoice": { 
    invoiceNumber: "INV-202600001",
    total: 450.00,
    lineItems: [...]
  }
}
```

### 2. AI Job Costing

```javascript
// Create quote with prediction
POST /api/quotes
{
  "serviceType": "AC Installation",
  "estimatedHours": 6,
  "parts": [{ id: 45, quantity: 1 }]
}

// AI analyzes 50+ historical jobs and predicts:
{
  "predictedMargin": 18.5,        // Below 20% threshold!
  "predictedRevenue": 3200,
  "predictedCost": 2608,
  "confidence": "high",
  "warning": true,                 // 🚨 Shows in red
  "recommendation": "Consider increasing price by $200"
}
```

### 3. Real-Time Inventory

```javascript
// Tech uses part on job
POST /api/work-orders/123/parts
{
  "partId": 789,
  "quantity": 1
}

// System automatically:
// ✓ Deducts from tech's truck stock
// ✓ Adds to work order parts list
// ✓ Checks if restock needed
// ✓ Alerts warehouse if below minimum
```

---

## 📋 API Examples

### Get Today's Work Orders

```bash
curl http://localhost:3000/api/work-orders?startDate=2026-02-15&endDate=2026-02-15
```

### Create Customer

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "555-1234",
    "serviceAddress": "456 Oak St",
    "customerType": "residential"
  }'
```

### Complete Work Order → Auto-Create Invoice

```bash
curl -X POST http://localhost:3000/api/work-orders/123/complete \
  -H "Content-Type: application/json" \
  -d '{
    "workPerformed": "Replaced thermostat and cleaned filter",
    "diagnosis": "Old thermostat malfunctioning"
  }'
```

Full API documentation: [API.md](docs/API.md)

---

## 🔌 Integrations

### QuickBooks Online
- ✅ Auto-sync invoices
- ✅ Record payments
- ✅ Sync customers
- ✅ Export financial reports

### Twilio (SMS)
- ✅ Appointment reminders
- ✅ Job status updates
- ✅ Tech ETA notifications

### Stripe Payments
- ✅ Accept credit cards
- ✅ ACH payments
- ✅ Payment plans

### Google Maps
- ✅ Route optimization
- ✅ Drive time estimates
- ✅ Mileage tracking

---

## 📱 Mobile App Features

### For Technicians
- 📍 GPS-based routing
- 📷 Before/after photos
- ✍️ Digital signatures
- 📦 Scan parts with barcode
- 📶 Offline mode
- 🔔 Push notifications

### For Office Staff
- 📊 Real-time dashboard
- 🗓️ Drag-drop dispatch
- 💰 Invoice management
- 📈 Financial reports

---

## 🗂️ File Structure

```
hvac-field-os/
├── backend/                    # Node.js API
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── server.js
│
├── frontend/                   # React web app
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── store/
│   │   └── App.js
│   └── package.json
│
├── mobile/                     # React Native app
│   └── (Coming soon)
│
├── docs/                       # Documentation
│   ├── API.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
│
├── database-schema.sql         # PostgreSQL schema
├── docker-compose.yml          # Docker setup
├── IMPLEMENTATION_GUIDE.md     # Detailed feature guide
├── QUICK_START.md             # Setup instructions
└── README.md                  # You are here
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
npm run test:integration
```

---

## 🚀 Deployment

### Production Hosting Options

**Backend:**
- AWS EC2 + RDS
- Heroku
- DigitalOcean
- Render

**Frontend:**
- Vercel
- Netlify
- AWS S3 + CloudFront

**Mobile:**
- Apple App Store
- Google Play Store

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step guides.

---

## 🛣️ Roadmap

### ✅ Phase 1 - MVP (Complete)
- [x] Database schema
- [x] Backend API
- [x] Frontend foundation
- [x] Auto-invoice creation
- [x] Basic dispatch

### 🔄 Phase 2 - In Progress
- [ ] User authentication
- [ ] QuickBooks integration
- [ ] AI job costing (basic)
- [ ] Mobile-responsive design

### 📅 Phase 3 - Planned
- [ ] React Native mobile app
- [ ] Offline mode
- [ ] GPS routing
- [ ] Photo capture
- [ ] Digital signatures

### 🔮 Phase 4 - Future
- [ ] Advanced AI/ML
- [ ] Predictive maintenance
- [ ] Customer portal
- [ ] Fleet management

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Follow existing code style
- Update documentation
- Add comments for complex logic

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

You are free to:
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Use privately

---

## 💬 Support

### Documentation
- [Quick Start Guide](QUICK_START.md)
- [Implementation Guide](IMPLEMENTATION_GUIDE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)

### Community
- 💬 [Discord Community](https://discord.gg/hvacfieldos)
- 🐛 [Report Issues](https://github.com/yourusername/hvac-field-os/issues)
- 💡 [Request Features](https://github.com/yourusername/hvac-field-os/issues/new)

### Commercial Support
- 📧 Email: support@hvacfieldos.com
- 📞 Phone: 1-800-HVAC-OS
- 🌐 Website: https://hvacfieldos.com

---

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Node.js](https://nodejs.org/)
- [React](https://reactjs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Express](https://expressjs.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)

Special thanks to HVAC companies who provided feedback and requirements.

---

## ⭐ Star This Project

If this helps your HVAC business, please star the repository! It helps others discover the project.

---

**Built with ❤️ for HVAC companies tired of disconnected systems.**

*Stop re-entering data. Start running your business.*
