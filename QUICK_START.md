# 🚀 Quick Start Guide - HVAC Field OS

Get up and running in **10 minutes** using Docker, or **20 minutes** for manual setup.

---

## Option 1: Docker Setup (Recommended) ⚡

The fastest way to get started. Everything runs in containers.

### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Git

### Steps

```bash
# 1. Clone or create project structure
mkdir hvac-field-os
cd hvac-field-os

# 2. Copy the database schema file
# Place database-schema.sql in the root directory

# 3. Copy the docker-compose.yml file
# Place docker-compose.yml in the root directory

# 4. Start everything
docker-compose up -d

# 5. Check if services are running
docker-compose ps

# Expected output:
# hvac_postgres   running   5432/tcp
# hvac_redis      running   6379/tcp
# hvac_backend    running   3000/tcp
# hvac_frontend   running   3001/tcp
# hvac_pgadmin    running   5050/tcp
```

### Access Your Application

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Health Check:** http://localhost:3000/health
- **PgAdmin (Database UI):** http://localhost:5050
  - Email: `admin@hvacfieldos.com`
  - Password: `admin`

### View Logs

```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just frontend
docker-compose logs -f frontend
```

### Stop Everything

```bash
# Stop but keep data
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

---

## Option 2: Manual Setup (No Docker) 🛠️

If you prefer to run services natively on your machine.

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))
- Git

### Backend Setup

```bash
# 1. Create backend directory
mkdir -p hvac-field-os/backend
cd hvac-field-os/backend

# 2. Initialize Node.js project
npm init -y

# 3. Install dependencies
npm install express pg sequelize bcryptjs jsonwebtoken dotenv cors helmet morgan express-validator uuid

npm install --save-dev nodemon

# 4. Copy backend code
# Place the backend-api-foundation.js content into appropriate files:
#   - server.js (main server code)
#   - config/database.js (database connection)
#   - models/ (data models)
#   - routes/ (API routes)
#   - services/ (business logic)

# 5. Create database
createdb hvac_field_os

# 6. Run migrations
psql hvac_field_os -f ../database-schema.sql

# 7. Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_NAME=hvac_field_os
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret_key_change_in_production
PORT=3000
NODE_ENV=development
EOF

# 8. Update package.json scripts
# Add to scripts section:
# "start": "node server.js",
# "dev": "nodemon server.js"

# 9. Start backend server
npm run dev
```

### Frontend Setup

```bash
# 1. Create frontend with Create React App
cd ..
npx create-react-app frontend
cd frontend

# 2. Install dependencies
npm install react-router-dom redux react-redux @reduxjs/toolkit axios date-fns recharts react-toastify

npm install --save-dev tailwindcss postcss autoprefixer

# 3. Initialize Tailwind CSS
npx tailwindcss init -p

# 4. Configure Tailwind (tailwind.config.js)
# Replace content with:
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

# 5. Add Tailwind to src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# 6. Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3000/api
EOF

# 7. Copy React components
# Place the frontend-react-app.js content into appropriate files:
#   - src/App.js
#   - src/services/api.js
#   - src/store/ (Redux setup)
#   - src/components/ (UI components)

# 8. Start frontend
npm start
```

Your browser should open automatically to http://localhost:3000

---

## 🧪 Verify Everything Works

### 1. Check Backend Health

```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"2026-02-15T..."}
```

### 2. Test Database Connection

```bash
# Connect to database
psql hvac_field_os

# List tables
\dt

# Expected output: work_orders, customers, invoices, inventory, etc.
```

### 3. Test Frontend

Open http://localhost:3001 in your browser. You should see the dashboard.

---

## 📝 Create Your First Work Order (API Test)

```bash
# 1. Create a test customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "serviceAddress": "123 Main St",
    "customerType": "residential"
  }'

# 2. Create a work order
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "jobType": "repair",
    "description": "AC not cooling",
    "scheduledStart": "2026-02-16T09:00:00",
    "scheduledEnd": "2026-02-16T11:00:00"
  }'

# 3. Get all work orders
curl http://localhost:3000/api/work-orders
```

---

## 📂 Project File Structure

After setup, your project should look like this:

```
hvac-field-os/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── WorkOrder.js
│   │   ├── Customer.js
│   │   ├── Invoice.js
│   │   └── ...
│   ├── routes/
│   │   ├── auth.js
│   │   ├── workOrders.js
│   │   └── ...
│   ├── services/
│   │   ├── invoiceService.js
│   │   └── aiCostingService.js
│   ├── middleware/
│   │   └── auth.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── Dispatch/
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── store/
│   │   ├── App.js
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── database-schema.sql
├── docker-compose.yml
└── README.md
```

---

## 🎯 Next Steps

Once everything is running:

1. **Read the Implementation Guide** - `IMPLEMENTATION_GUIDE.md` for detailed feature explanations

2. **Customize for Your Business**
   - Update company name in .env
   - Set your tax rates
   - Configure billing rates
   - Add your logo

3. **Import Your Data**
   - Create SQL scripts to import existing customers
   - Import inventory from your current system
   - Set up your technicians as users

4. **Enable Integrations**
   - QuickBooks: Get API credentials from Intuit
   - Twilio: For SMS notifications
   - Stripe: For payment processing

5. **Deploy to Production**
   - See DEPLOYMENT.md for hosting options
   - Recommended: AWS, Heroku, or DigitalOcean

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check if PostgreSQL is running
pg_isready

# Check if port 3000 is available
lsof -i :3000

# View detailed error logs
npm run dev
```

### Frontend won't connect to backend

1. Verify backend is running: `curl http://localhost:3000/health`
2. Check .env file has correct `REACT_APP_API_URL`
3. Check browser console for CORS errors
4. Restart frontend: `npm start`

### Database connection errors

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d hvac_field_os

# Verify credentials in .env match database
# Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
```

### Docker issues

```bash
# Restart all containers
docker-compose restart

# View container logs
docker-compose logs backend

# Rebuild containers (if code changed)
docker-compose up -d --build
```

---

## 📚 Learn More

- **API Documentation:** See API.md for all endpoints
- **Database Schema:** See DATABASE.md for table relationships
- **Feature Guide:** See IMPLEMENTATION_GUIDE.md for how features work

---

## 🎉 You're All Set!

Your unified HVAC Field OS is now running. Start by:

1. Creating some test customers
2. Adding inventory items
3. Creating a work order
4. Completing it and seeing the auto-generated invoice

**Welcome to the future of field operations! 🚀**
