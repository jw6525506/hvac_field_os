'use strict';

exports.up = function(db) {
  return db.runSql(`
    CREATE TABLE IF NOT EXISTS "Estimates" (
      id SERIAL PRIMARY KEY,
      "estimateNumber" VARCHAR(50) UNIQUE,
      "customerId" INTEGER REFERENCES "Customers"(id) ON DELETE SET NULL,
      "companyId" INTEGER REFERENCES "Companies"(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      "lineItems" JSONB DEFAULT '[]',
      subtotal DECIMAL(10,2) DEFAULT 0,
      "taxRate" DECIMAL(5,2) DEFAULT 8.5,
      "taxAmount" DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      "validDays" INTEGER DEFAULT 30,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "MaintenancePlans" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      interval VARCHAR(50) DEFAULT 'monthly',
      visits INTEGER DEFAULT 2,
      features TEXT,
      "companyId" INTEGER REFERENCES "Companies"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "MaintenanceSubscriptions" (
      id SERIAL PRIMARY KEY,
      "customerId" INTEGER REFERENCES "Customers"(id) ON DELETE CASCADE,
      "planId" INTEGER REFERENCES "MaintenancePlans"(id) ON DELETE CASCADE,
      "companyId" INTEGER REFERENCES "Companies"(id) ON DELETE CASCADE,
      "startDate" DATE,
      "nextServiceDate" DATE,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "Manuals" (
      id SERIAL PRIMARY KEY,
      brand VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      industry VARCHAR(50) DEFAULT 'general',
      "docType" VARCHAR(50) DEFAULT 'service_manual',
      description TEXT,
      "fileUrl" TEXT NOT NULL,
      "publicId" VARCHAR(255),
      "companyId" INTEGER REFERENCES "Companies"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
};

exports.down = function(db) {
  return db.runSql(`
    DROP TABLE IF EXISTS "Manuals";
    DROP TABLE IF EXISTS "MaintenanceSubscriptions";
    DROP TABLE IF EXISTS "MaintenancePlans";
    DROP TABLE IF EXISTS "Estimates";
  `);
};

exports._meta = { "version": 1 };
