-- HVAC Field OS Database Schema
-- Unified system for dispatch, CRM, invoicing, inventory, and payroll

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Companies (for multi-tenant support)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    tax_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Technicians, Dispatchers, Admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50), -- 'admin', 'dispatcher', 'technician', 'manager'
    hourly_rate DECIMAL(10, 2), -- For payroll
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'on_leave'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CRM MODULE
-- ============================================================================

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    business_name VARCHAR(255),
    customer_type VARCHAR(20), -- 'residential', 'commercial'
    email VARCHAR(255),
    phone VARCHAR(20),
    secondary_phone VARCHAR(20),
    billing_address TEXT,
    service_address TEXT,
    notes TEXT,
    preferred_contact_method VARCHAR(20), -- 'phone', 'email', 'text'
    customer_since DATE,
    lifetime_value DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Equipment (tracking HVAC systems at customer sites)
CREATE TABLE customer_equipment (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    equipment_type VARCHAR(50), -- 'furnace', 'ac_unit', 'heat_pump', 'thermostat'
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    install_date DATE,
    warranty_expiration DATE,
    location_notes TEXT, -- 'basement', 'attic', 'closet'
    last_service_date DATE,
    next_service_due DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DISPATCH & WORK ORDERS
-- ============================================================================

-- Work Orders (Jobs)
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    customer_id INTEGER REFERENCES customers(id),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    job_type VARCHAR(50), -- 'installation', 'repair', 'maintenance', 'inspection'
    priority VARCHAR(20) DEFAULT 'normal', -- 'emergency', 'high', 'normal', 'low'
    status VARCHAR(30) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    
    -- Scheduling
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    assigned_technician_id INTEGER REFERENCES users(id),
    
    -- Job Details
    description TEXT,
    customer_complaint TEXT,
    diagnosis TEXT,
    work_performed TEXT,
    
    -- Financial (pre-calculated)
    estimated_cost DECIMAL(10, 2),
    estimated_margin DECIMAL(5, 2), -- Percentage
    actual_cost DECIMAL(10, 2),
    actual_margin DECIMAL(5, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order Parts (materials used)
CREATE TABLE work_order_parts (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id),
    part_id INTEGER REFERENCES inventory(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    markup_percentage DECIMAL(5, 2),
    total_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order Labor
CREATE TABLE work_order_labor (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id),
    technician_id INTEGER REFERENCES users(id),
    hours_worked DECIMAL(5, 2),
    hourly_rate DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    billable_hours DECIMAL(5, 2), -- May differ from actual
    billable_rate DECIMAL(10, 2),
    total_billable DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INVENTORY MODULE
-- ============================================================================

-- Inventory (Parts & Materials)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'filters', 'capacitors', 'thermostats', 'refrigerant'
    unit_of_measure VARCHAR(20), -- 'each', 'lbs', 'gallons'
    
    -- Pricing
    cost DECIMAL(10, 2),
    default_markup_percentage DECIMAL(5, 2) DEFAULT 50.00,
    retail_price DECIMAL(10, 2),
    
    -- Stock
    quantity_on_hand INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    
    -- Supplier Info
    supplier_name VARCHAR(255),
    supplier_part_number VARCHAR(100),
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Truck Stock (inventory assigned to technician vehicles)
CREATE TABLE truck_stock (
    id SERIAL PRIMARY KEY,
    technician_id INTEGER REFERENCES users(id),
    part_id INTEGER REFERENCES inventory(id),
    quantity INTEGER DEFAULT 0,
    last_restocked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(technician_id, part_id)
);

-- Inventory Transactions (audit trail)
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES inventory(id),
    transaction_type VARCHAR(30), -- 'purchase', 'usage', 'adjustment', 'transfer'
    quantity INTEGER,
    work_order_id INTEGER REFERENCES work_orders(id),
    technician_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INVOICING & PAYMENTS
-- ============================================================================

-- Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    customer_id INTEGER REFERENCES customers(id),
    work_order_id INTEGER REFERENCES work_orders(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    
    -- Amounts
    subtotal DECIMAL(12, 2),
    tax_rate DECIMAL(5, 2),
    tax_amount DECIMAL(12, 2),
    discount_amount DECIMAL(12, 2),
    total_amount DECIMAL(12, 2),
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    balance_due DECIMAL(12, 2),
    
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    notes TEXT,
    terms TEXT,
    
    -- QuickBooks Integration
    quickbooks_id VARCHAR(100),
    synced_to_accounting BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    item_type VARCHAR(20), -- 'part', 'labor', 'service'
    description TEXT,
    quantity DECIMAL(10, 2),
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    sort_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    customer_id INTEGER REFERENCES customers(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30), -- 'cash', 'check', 'credit_card', 'ach'
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRICING & ESTIMATION
-- ============================================================================

-- Service Catalog (pre-defined services)
CREATE TABLE service_catalog (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    estimated_hours DECIMAL(5, 2),
    base_price DECIMAL(10, 2),
    
    -- AI Cost Prediction Data
    avg_actual_hours DECIMAL(5, 2),
    avg_actual_cost DECIMAL(10, 2),
    avg_margin DECIMAL(5, 2),
    complexity_score INTEGER, -- 1-10 for AI model
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes/Estimates
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    customer_id INTEGER REFERENCES customers(id),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    quote_date DATE NOT NULL,
    expiration_date DATE,
    
    -- Details
    description TEXT,
    estimated_total DECIMAL(12, 2),
    estimated_margin DECIMAL(5, 2),
    margin_warning BOOLEAN DEFAULT FALSE, -- AI sets this if margin too low
    
    status VARCHAR(30) DEFAULT 'draft', -- 'draft', 'sent', 'approved', 'rejected'
    converted_to_work_order_id INTEGER REFERENCES work_orders(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAYROLL
-- ============================================================================

-- Time Tracking
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    technician_id INTEGER REFERENCES users(id),
    work_order_id INTEGER REFERENCES work_orders(id),
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    total_hours DECIMAL(5, 2),
    entry_type VARCHAR(20), -- 'regular', 'overtime', 'travel'
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Periods
CREATE TABLE payroll_periods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'open', -- 'open', 'processing', 'closed'
    total_payroll DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_technician ON work_orders(assigned_technician_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_start);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_truck_stock_technician ON truck_stock(technician_id);
