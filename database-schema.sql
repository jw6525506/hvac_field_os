-- HVAC Field OS Database Schema

CREATE TABLE IF NOT EXISTS "Companies" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  plan VARCHAR(50) DEFAULT 'trial',
  "stripeCustomerId" VARCHAR(255),
  "stripeSubscriptionId" VARCHAR(255),
  active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Users" (
  id SERIAL PRIMARY KEY,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'technician',
  "companyId" INTEGER REFERENCES "Companies"(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Customers" (
  id SERIAL PRIMARY KEY,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  "companyId" INTEGER REFERENCES "Companies"(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WorkOrders" (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER REFERENCES "Customers"(id),
  "jobType" VARCHAR(100),
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  "scheduledDate" DATE,
  "scheduledTime" TIME,
  status VARCHAR(50) DEFAULT 'scheduled',
  "assignedTo" INTEGER REFERENCES "Users"(id),
  "companyId" INTEGER REFERENCES "Companies"(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Invoices" (
  id SERIAL PRIMARY KEY,
  "invoiceNumber" VARCHAR(50) UNIQUE,
  "workOrderId" INTEGER REFERENCES "WorkOrders"(id),
  "customerId" INTEGER REFERENCES "Customers"(id),
  "lineItems" JSONB,
  subtotal DECIMAL(10,2),
  "taxRate" DECIMAL(5,2),
  "taxAmount" DECIMAL(10,2),
  total DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'unpaid',
  "companyId" INTEGER REFERENCES "Companies"(id),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default company
INSERT INTO "Companies" (name, email, plan, "createdAt", "updatedAt")
VALUES ('Default Company', 'admin@hvacfieldos.com', 'trial', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Default admin user (password: password123)
INSERT INTO "Users" ("firstName", "lastName", email, password, role, "companyId", "createdAt", "updatedAt")
VALUES ('Admin', 'User', 'admin@hvacfieldos.com', '$2b$10$rf2/u4n5qA5n5zrVU7wEvOIrdCy3AXk6ex3ii.4AmabNLjyW6YprC', 'admin', 1, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
