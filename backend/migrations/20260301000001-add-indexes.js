'use strict';

exports.up = function(db) {
  return db.runSql(`
    CREATE INDEX IF NOT EXISTS idx_users_company ON "Users"("companyId");
    CREATE INDEX IF NOT EXISTS idx_users_email ON "Users"(email);
    CREATE INDEX IF NOT EXISTS idx_customers_company ON "Customers"("companyId");
    CREATE INDEX IF NOT EXISTS idx_workorders_company ON "WorkOrders"("companyId");
    CREATE INDEX IF NOT EXISTS idx_workorders_customer ON "WorkOrders"("customerId");
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON "Invoices"("companyId");
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON "Invoices"("customerId");
    CREATE INDEX IF NOT EXISTS idx_inventory_company ON "Inventory"("companyId");
    CREATE INDEX IF NOT EXISTS idx_estimates_company ON "Estimates"("companyId");
    CREATE INDEX IF NOT EXISTS idx_manuals_company ON "Manuals"("companyId");
  `);
};

exports.down = function(db) {
  return db.runSql(`
    DROP INDEX IF EXISTS idx_users_company;
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_customers_company;
    DROP INDEX IF EXISTS idx_workorders_company;
    DROP INDEX IF EXISTS idx_workorders_customer;
    DROP INDEX IF EXISTS idx_invoices_company;
    DROP INDEX IF EXISTS idx_invoices_customer;
    DROP INDEX IF EXISTS idx_inventory_company;
    DROP INDEX IF EXISTS idx_estimates_company;
    DROP INDEX IF EXISTS idx_manuals_company;
  `);
};

exports._meta = { "version": 1 };
