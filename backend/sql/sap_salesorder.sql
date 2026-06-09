-- ============================================================
-- SAP-side Sales Order landing table (SQL Server).
-- EFB Meals pushes one row per "ready" meal request here; SAP picks them up.
-- Adjust columns to match the real SAP Sales Order interface table, then
-- update the INSERT mapping in backend/src/sapService.js (insertIntoSap).
--
-- Configure the app to target this DB via .env:
--   SAP_MSSQL_HOST=...   SAP_MSSQL_USER=...   SAP_MSSQL_PASS=...
--   SAP_MSSQL_DB=SAP     SAP_SALESORDER_TABLE=SalesOrder
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SalesOrder')
BEGIN
  CREATE TABLE dbo.SalesOrder (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    RequestId   INT            NOT NULL,           -- EFB Meals request id
    Requester   NVARCHAR(200)  NULL,
    Department  NVARCHAR(200)  NULL,
    MealName    NVARCHAR(400)  NULL,
    Quantity    INT            NULL,               -- number of people / portions
    LineTotal   DECIMAL(12,2)  NULL,
    NeededDate  NVARCHAR(20)   NULL,
    Payload     NVARCHAR(MAX)  NULL,               -- full JSON for reference
    Status      NVARCHAR(20)   NOT NULL DEFAULT('New'),
    CreatedAt   DATETIME2      NOT NULL DEFAULT(SYSUTCDATETIME())
  );
END;
GO

-- Optional: also stand up the full app schema on SQL Server (DB_TYPE=mssql).
-- The app creates these automatically via Knex migrations, so this is only for
-- reference / manual provisioning.
--
--   meals(id, name_en, name_ar, description_en, description_ar, category, emoji, price, active)
--   meal_requests(id, requester_name, requester_email, department, meal_id, meal_name,
--                 is_special, special_request, people, needed_date, status, created_at)
--   budget_requests(id, meal_request_id, amount, currency, vendor, notes,
--                   attachment_path, created_by, created_at)
--   sales_orders(id, meal_request_id, sap_id, status, payload, created_at)
