# Field Verifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal `/verify` tool that lets Joe walk through every portal field card-by-card, see live SQL values, confirm/flag/edit the mapping, and write developer-ready JSON to the repo.

**Architecture:** A React page at `/verify` (outside RouteGuard, no auth required) backed by a new `FieldVerifierController` on the ASP.NET Core API. The controller reads/writes `docs/field-registry/<screen>.json` files on disk and executes live SQL queries against WinScope. JSON files are committed to the repo by the developer as ground truth for Claude and future work.

**Tech Stack:** React 18 + TypeScript + Ant Design (existing), ASP.NET Core 8 + System.Text.Json + Microsoft.Data.SqlClient (existing)

---

## File Map

**Create:**
- `docs/field-registry/dashboard.json` — seeded field list for Dashboard
- `docs/field-registry/clients.json`
- `docs/field-registry/departments.json`
- `docs/field-registry/repairs.json`
- `docs/field-registry/inventory.json`
- `docs/field-registry/contracts.json`
- `docs/field-registry/onsite-services.json`
- `docs/field-registry/product-sale.json`
- `docs/field-registry/financial.json`
- `docs/field-registry/suppliers.json`
- `docs/field-registry/scope-model.json`
- `server/TSI.Api/Models/FieldRegistry.cs` — C# records for field registry
- `server/TSI.Api/Controllers/FieldVerifierController.cs` — 3 endpoints: GET registry, GET live value, PUT field
- `client/src/pages/FieldVerifier/index.tsx` — main page layout: sidebar + content + tabs
- `client/src/pages/FieldVerifier/VerifierCard.tsx` — single field card (confirm/flag/edit)
- `client/src/pages/FieldVerifier/DeveloperView.tsx` — read-only table for developer

**Modify:**
- `server/TSI.Api/appsettings.Development.json` — add `FieldRegistryPath` key
- `client/src/router.tsx` — add `/verify` route outside RouteGuard

---

## Task 1: Config — Add FieldRegistryPath to appsettings

**Files:**
- Modify: `server/TSI.Api/appsettings.Development.json`

- [ ] **Step 1: Read the current appsettings.Development.json**

Run: open `server/TSI.Api/appsettings.Development.json` and locate the end of the JSON object.

- [ ] **Step 2: Add FieldRegistryPath key**

Add this key to `appsettings.Development.json`:

```json
"FieldRegistryPath": "C:/Projects/redesign-matched/docs/field-registry"
```

The full file should look like:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "..."
  },
  "Jwt": { ... },
  "FieldRegistryPath": "C:/Projects/redesign-matched/docs/field-registry"
}
```

- [ ] **Step 3: Create the directory**

```bash
mkdir -p C:/Projects/redesign-matched/docs/field-registry
```

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/appsettings.Development.json
git commit -m "config: add FieldRegistryPath for field verifier"
```

---

## Task 2: Seed Field Registry JSON Files

**Files:**
- Create: `docs/field-registry/dashboard.json` (and all other screen files)

These files give Joe a complete queue on first launch. All fields start as `unverified` with empty `sqlQuery` — Joe fills those in during verification.

- [ ] **Step 1: Create dashboard.json**

```json
{
  "screen": "Dashboard",
  "lastUpdated": "",
  "fields": [
    { "id": "dash_open_repairs", "label": "Open Repairs", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "openRepairs", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_urgent_repairs", "label": "Urgent Repairs", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "urgentRepairs", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_pending_qc", "label": "Pending QC", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "pendingQC", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_pending_ship", "label": "Pending Ship", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "pendingShip", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_completed_today", "label": "Completed Today", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "completedToday", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_received_today", "label": "Received Today", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "receivedToday", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_expiring_contracts", "label": "Expiring Contracts (90 days)", "sqlTable": "tblContract", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/stats", "responseProperty": "expiringContracts", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_repairs_list_wo", "label": "Repair List — WO#", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/repairs", "responseProperty": "wo", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_repairs_list_client", "label": "Repair List — Client", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/repairs", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_repairs_list_status", "label": "Repair List — Status", "sqlTable": "tblRepairStatuses", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/repairs", "responseProperty": "status", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_repairs_list_days_in", "label": "Repair List — Days In", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/repairs", "responseProperty": "daysIn", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dash_repairs_list_tech", "label": "Repair List — Tech", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/dashboard/repairs", "responseProperty": "tech", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 2: Create clients.json**

```json
{
  "screen": "Clients",
  "lastUpdated": "",
  "fields": [
    { "id": "clients_name", "label": "Client Name", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients", "responseProperty": "clientName", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_city", "label": "City", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients", "responseProperty": "city", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_state", "label": "State", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients", "responseProperty": "state", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_zip", "label": "Zip", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients", "responseProperty": "zip", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_active", "label": "Active", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients", "responseProperty": "active", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_credit_limit", "label": "Credit Limit", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients/{id}", "responseProperty": "creditLimit", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_terms", "label": "Terms", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients/{id}", "responseProperty": "terms", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_portal_months", "label": "Portal Months", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients/{id}", "responseProperty": "portalMonths", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_discount", "label": "Discount %", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients/{id}", "responseProperty": "discount", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "clients_markup", "label": "Markup %", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/clients/{id}", "responseProperty": "markup", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 3: Create departments.json**

```json
{
  "screen": "Departments",
  "lastUpdated": "",
  "fields": [
    { "id": "dept_name", "label": "Department Name", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/departments", "responseProperty": "deptName", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dept_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/departments", "responseProperty": "clientName", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dept_address", "label": "Address", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/departments/{id}", "responseProperty": "address", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dept_contact", "label": "Contact Name", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/departments/{id}", "responseProperty": "contactName", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dept_phone", "label": "Phone", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/departments/{id}", "responseProperty": "phone", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "dept_service_location", "label": "Service Location", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/departments/{id}", "responseProperty": "serviceLocation", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 4: Create repairs.json**

```json
{
  "screen": "Repairs",
  "lastUpdated": "",
  "fields": [
    { "id": "repair_wo", "label": "Work Order #", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "wo", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_dept", "label": "Department", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "dept", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_scope_type", "label": "Scope Type", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "scopeType", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_serial", "label": "Serial #", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "serial", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_date_in", "label": "Date In", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "dateIn", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_status", "label": "Status", "sqlTable": "tblRepairStatuses", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "status", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_tech", "label": "Tech", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "tech", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_amount_approved", "label": "Amount Approved", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs/{id}", "responseProperty": "amountApproved", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_days_in", "label": "Days In", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "daysIn", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "repair_is_urgent", "label": "Urgent Flag", "sqlTable": "tblRepair", "sqlQuery": "", "apiEndpoint": "GET /api/repairs", "responseProperty": "isUrgent", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 5: Create inventory.json**

```json
{
  "screen": "Inventory",
  "lastUpdated": "",
  "fields": [
    { "id": "inv_scope_type", "label": "Scope Type", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/inventory", "responseProperty": "scopeType", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "inv_serial", "label": "Serial #", "sqlTable": "tblInstrument", "sqlQuery": "", "apiEndpoint": "GET /api/inventory", "responseProperty": "serial", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "inv_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/inventory", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "inv_location", "label": "Location", "sqlTable": "tblInstrument", "sqlQuery": "", "apiEndpoint": "GET /api/inventory", "responseProperty": "location", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "inv_status", "label": "Status", "sqlTable": "tblInstrument", "sqlQuery": "", "apiEndpoint": "GET /api/inventory", "responseProperty": "status", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "inv_cost", "label": "Cost", "sqlTable": "tblInstrument", "sqlQuery": "", "apiEndpoint": "GET /api/inventory", "responseProperty": "cost", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 6: Create contracts.json**

```json
{
  "screen": "Contracts",
  "lastUpdated": "",
  "fields": [
    { "id": "contract_number", "label": "Contract #", "sqlTable": "tblContract", "sqlQuery": "", "apiEndpoint": "GET /api/contracts", "responseProperty": "contractNumber", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "contract_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/contracts", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "contract_start_date", "label": "Start Date", "sqlTable": "tblContract", "sqlQuery": "", "apiEndpoint": "GET /api/contracts", "responseProperty": "startDate", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "contract_end_date", "label": "End Date", "sqlTable": "tblContract", "sqlQuery": "", "apiEndpoint": "GET /api/contracts", "responseProperty": "endDate", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "contract_amount", "label": "Amount", "sqlTable": "tblContract", "sqlQuery": "", "apiEndpoint": "GET /api/contracts", "responseProperty": "amount", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "contract_status", "label": "Status", "sqlTable": "tblContract", "sqlQuery": "", "apiEndpoint": "GET /api/contracts", "responseProperty": "status", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 7: Create onsite-services.json**

```json
{
  "screen": "Onsite Services",
  "lastUpdated": "",
  "fields": [
    { "id": "onsite_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/onsite-services", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "onsite_dept", "label": "Department", "sqlTable": "tblDepartment", "sqlQuery": "", "apiEndpoint": "GET /api/onsite-services", "responseProperty": "dept", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "onsite_tech", "label": "Tech", "sqlTable": "tblOnsiteService", "sqlQuery": "", "apiEndpoint": "GET /api/onsite-services", "responseProperty": "tech", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "onsite_date", "label": "Service Date", "sqlTable": "tblOnsiteService", "sqlQuery": "", "apiEndpoint": "GET /api/onsite-services", "responseProperty": "serviceDate", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "onsite_total", "label": "Total Cost", "sqlTable": "tblOnsiteService", "sqlQuery": "", "apiEndpoint": "GET /api/onsite-services", "responseProperty": "totalCost", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "onsite_status", "label": "Status", "sqlTable": "tblOnsiteService", "sqlQuery": "", "apiEndpoint": "GET /api/onsite-services", "responseProperty": "status", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 8: Create product-sale.json**

```json
{
  "screen": "Product Sale",
  "lastUpdated": "",
  "fields": [
    { "id": "ps_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/product-sales", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "ps_product", "label": "Product", "sqlTable": "tblProductSale", "sqlQuery": "", "apiEndpoint": "GET /api/product-sales", "responseProperty": "product", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "ps_qty", "label": "Quantity", "sqlTable": "tblProductSale", "sqlQuery": "", "apiEndpoint": "GET /api/product-sales", "responseProperty": "qty", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "ps_price", "label": "Unit Price", "sqlTable": "tblProductSale", "sqlQuery": "", "apiEndpoint": "GET /api/product-sales", "responseProperty": "price", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "ps_total", "label": "Total", "sqlTable": "tblProductSale", "sqlQuery": "", "apiEndpoint": "GET /api/product-sales", "responseProperty": "total", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "ps_date", "label": "Sale Date", "sqlTable": "tblProductSale", "sqlQuery": "", "apiEndpoint": "GET /api/product-sales", "responseProperty": "saleDate", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 9: Create financial.json**

```json
{
  "screen": "Financial",
  "lastUpdated": "",
  "fields": [
    { "id": "fin_invoice_number", "label": "Invoice #", "sqlTable": "tblInvoice", "sqlQuery": "", "apiEndpoint": "GET /api/financial", "responseProperty": "invoiceNumber", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "fin_client", "label": "Client", "sqlTable": "tblClient", "sqlQuery": "", "apiEndpoint": "GET /api/financial", "responseProperty": "client", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "fin_amount", "label": "Amount", "sqlTable": "tblInvoice", "sqlQuery": "", "apiEndpoint": "GET /api/financial", "responseProperty": "amount", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "fin_status", "label": "Status", "sqlTable": "tblInvoice", "sqlQuery": "", "apiEndpoint": "GET /api/financial", "responseProperty": "status", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "fin_date", "label": "Invoice Date", "sqlTable": "tblInvoice", "sqlQuery": "", "apiEndpoint": "GET /api/financial", "responseProperty": "invoiceDate", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "fin_paid_date", "label": "Paid Date", "sqlTable": "tblInvoice", "sqlQuery": "", "apiEndpoint": "GET /api/financial", "responseProperty": "paidDate", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 10: Create suppliers.json**

```json
{
  "screen": "Suppliers",
  "lastUpdated": "",
  "fields": [
    { "id": "sup_name", "label": "Supplier Name", "sqlTable": "tblSupplier", "sqlQuery": "", "apiEndpoint": "GET /api/suppliers", "responseProperty": "supplierName", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sup_contact", "label": "Contact", "sqlTable": "tblSupplier", "sqlQuery": "", "apiEndpoint": "GET /api/suppliers", "responseProperty": "contact", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sup_phone", "label": "Phone", "sqlTable": "tblSupplier", "sqlQuery": "", "apiEndpoint": "GET /api/suppliers", "responseProperty": "phone", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sup_email", "label": "Email", "sqlTable": "tblSupplier", "sqlQuery": "", "apiEndpoint": "GET /api/suppliers", "responseProperty": "email", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sup_active", "label": "Active", "sqlTable": "tblSupplier", "sqlQuery": "", "apiEndpoint": "GET /api/suppliers", "responseProperty": "active", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 11: Create scope-model.json**

```json
{
  "screen": "Scope Model",
  "lastUpdated": "",
  "fields": [
    { "id": "sm_scope_type", "label": "Scope Type", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/scope-models", "responseProperty": "scopeType", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sm_manufacturer", "label": "Manufacturer", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/scope-models", "responseProperty": "manufacturer", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sm_model", "label": "Model", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/scope-models", "responseProperty": "model", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sm_repair_price", "label": "Repair Price", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/scope-models", "responseProperty": "repairPrice", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" },
    { "id": "sm_active", "label": "Active", "sqlTable": "tblScopeModel", "sqlQuery": "", "apiEndpoint": "GET /api/scope-models", "responseProperty": "active", "status": "unverified", "notes": "", "verifiedAt": "", "verifiedBy": "" }
  ]
}
```

- [ ] **Step 12: Commit all seed files**

```bash
git add docs/field-registry/
git commit -m "feat: seed field registry JSON files for all 11 screens"
```

---

## Task 3: API Model — FieldRegistry.cs

**Files:**
- Create: `server/TSI.Api/Models/FieldRegistry.cs`

- [ ] **Step 1: Create the model file**

```csharp
namespace TSI.Api.Models;

public record FieldRegistryScreen(
    string Screen,
    string LastUpdated,
    List<FieldRegistryEntry> Fields
);

public record FieldRegistryEntry(
    string Id,
    string Label,
    string SqlTable,
    string SqlQuery,
    string ApiEndpoint,
    string ResponseProperty,
    string Status,       // "unverified" | "confirmed" | "flagged"
    string Notes,
    string VerifiedAt,
    string VerifiedBy
);

public record FieldUpdateRequest(
    string ScreenFile,   // e.g. "dashboard"
    string FieldId,
    string Status,
    string SqlQuery,
    string SqlTable,
    string ApiEndpoint,
    string ResponseProperty,
    string Notes,
    string VerifiedBy
);

public record LiveValueRequest(
    string SqlQuery
);

public record LiveValueResponse(
    string Value,
    string Error
);
```

- [ ] **Step 2: Commit**

```bash
git add server/TSI.Api/Models/FieldRegistry.cs
git commit -m "feat: add FieldRegistry models"
```

---

## Task 4: API Controller — FieldVerifierController.cs

**Files:**
- Create: `server/TSI.Api/Controllers/FieldVerifierController.cs`

Three endpoints:
- `GET /api/field-verifier/registry` — returns all screen JSON files merged into one list
- `POST /api/field-verifier/live-value` — executes a SQL query, returns result as string
- `PUT /api/field-verifier/field` — updates one field in its screen JSON file

- [ ] **Step 1: Write the controller**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Text.Json;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/field-verifier")]
[AllowAnonymous]
public class FieldVerifierController(IConfiguration config) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private string RegistryPath => config["FieldRegistryPath"]
        ?? throw new InvalidOperationException("FieldRegistryPath not configured in appsettings.Development.json");

    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // GET /api/field-verifier/registry
    [HttpGet("registry")]
    public IActionResult GetRegistry()
    {
        var screens = new List<FieldRegistryScreen>();
        var screenOrder = new[]
        {
            "dashboard", "clients", "departments", "repairs",
            "inventory", "contracts", "onsite-services",
            "product-sale", "financial", "suppliers", "scope-model"
        };

        foreach (var name in screenOrder)
        {
            var path = Path.Combine(RegistryPath, $"{name}.json");
            if (!System.IO.File.Exists(path)) continue;

            var json = System.IO.File.ReadAllText(path);
            var screen = JsonSerializer.Deserialize<FieldRegistryScreen>(json, JsonOpts);
            if (screen != null) screens.Add(screen);
        }

        return Ok(screens);
    }

    // POST /api/field-verifier/live-value
    [HttpPost("live-value")]
    public async Task<IActionResult> GetLiveValue([FromBody] LiveValueRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SqlQuery))
            return Ok(new LiveValueResponse("", "No SQL query provided"));

        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(request.SqlQuery, conn);
            cmd.CommandTimeout = 15;
            var result = await cmd.ExecuteScalarAsync();
            var value = result == null || result == DBNull.Value ? "(null)" : result.ToString()!;
            return Ok(new LiveValueResponse(value, ""));
        }
        catch (Exception ex)
        {
            return Ok(new LiveValueResponse("", ex.Message));
        }
    }

    // PUT /api/field-verifier/field
    [HttpPut("field")]
    public IActionResult UpdateField([FromBody] FieldUpdateRequest request)
    {
        var path = Path.Combine(RegistryPath, $"{request.ScreenFile}.json");
        if (!System.IO.File.Exists(path))
            return NotFound($"Registry file not found: {request.ScreenFile}.json");

        var json = System.IO.File.ReadAllText(path);
        var screen = JsonSerializer.Deserialize<FieldRegistryScreen>(json, JsonOpts);
        if (screen == null) return BadRequest("Could not parse registry file");

        var field = screen.Fields.FirstOrDefault(f => f.Id == request.FieldId);
        if (field == null) return NotFound($"Field not found: {request.FieldId}");

        var updatedField = field with
        {
            Status = request.Status,
            SqlQuery = request.SqlQuery,
            SqlTable = request.SqlTable,
            ApiEndpoint = request.ApiEndpoint,
            ResponseProperty = request.ResponseProperty,
            Notes = request.Notes,
            VerifiedAt = DateTime.UtcNow.ToString("o"),
            VerifiedBy = request.VerifiedBy
        };

        var updatedFields = screen.Fields
            .Select(f => f.Id == request.FieldId ? updatedField : f)
            .ToList();

        var updatedScreen = screen with
        {
            LastUpdated = DateTime.UtcNow.ToString("o"),
            Fields = updatedFields
        };

        var updatedJson = JsonSerializer.Serialize(updatedScreen, JsonOpts);
        System.IO.File.WriteAllText(path, updatedJson);

        return Ok(updatedField);
    }
}
```

- [ ] **Step 2: Build the API to verify it compiles**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api
dotnet build
```

Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/FieldVerifierController.cs
git commit -m "feat: add FieldVerifierController with registry, live-value, and field update endpoints"
```

---

## Task 5: React — FieldVerifier Page Layout (index.tsx)

**Files:**
- Create: `client/src/pages/FieldVerifier/index.tsx`

This is the main page: sidebar (screen list with progress pills) + content area (card or developer table) + top progress bar.

- [ ] **Step 1: Create index.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Progress, Tabs, Tag } from 'antd';
import { VerifierCard } from './VerifierCard';
import { DeveloperView } from './DeveloperView';

export interface FieldEntry {
  id: string;
  label: string;
  sqlTable: string;
  sqlQuery: string;
  apiEndpoint: string;
  responseProperty: string;
  status: 'unverified' | 'confirmed' | 'flagged';
  notes: string;
  verifiedAt: string;
  verifiedBy: string;
}

export interface ScreenRegistry {
  screen: string;
  lastUpdated: string;
  fields: FieldEntry[];
}

const SCREEN_FILES: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Clients': 'clients',
  'Departments': 'departments',
  'Repairs': 'repairs',
  'Inventory': 'inventory',
  'Contracts': 'contracts',
  'Onsite Services': 'onsite-services',
  'Product Sale': 'product-sale',
  'Financial': 'financial',
  'Suppliers': 'suppliers',
  'Scope Model': 'scope-model',
};

const API = 'http://localhost:5000/api/field-verifier';

function getScreenStatus(fields: FieldEntry[]): 'green' | 'amber' | 'gray' {
  if (fields.length === 0) return 'gray';
  if (fields.every(f => f.status === 'confirmed')) return 'green';
  if (fields.some(f => f.status === 'flagged')) return 'amber';
  return 'gray';
}

export function FieldVerifierPage() {
  const [screens, setScreens] = useState<ScreenRegistry[]>([]);
  const [activeScreen, setActiveScreen] = useState<string>('Dashboard');
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/registry`)
      .then(r => r.json())
      .then((data: ScreenRegistry[]) => {
        setScreens(data);
        setLoading(false);
      });
  }, []);

  const totalFields = screens.reduce((acc, s) => acc + s.fields.length, 0);
  const confirmedFields = screens.reduce(
    (acc, s) => acc + s.fields.filter(f => f.status === 'confirmed').length, 0
  );
  const overallPct = totalFields > 0 ? Math.round((confirmedFields / totalFields) * 100) : 0;

  const currentScreen = screens.find(s => s.screen === activeScreen);

  function handleFieldUpdate(updated: FieldEntry) {
    setScreens(prev =>
      prev.map(s =>
        s.screen === activeScreen
          ? { ...s, fields: s.fields.map(f => f.id === updated.id ? updated : f) }
          : s
      )
    );
    // auto-advance to next unverified field
    const fields = currentScreen?.fields ?? [];
    const nextIndex = fields.findIndex((f, i) => i > activeFieldIndex && f.status === 'unverified');
    setActiveFieldIndex(nextIndex >= 0 ? nextIndex : activeFieldIndex);
  }

  if (loading) return <div style={{ padding: 32 }}>Loading field registry...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#f0f2f5' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: '1px solid #DDE3EE', padding: '16px 0', overflowY: 'auto' }}>
        <div style={{ padding: '0 16px 12px', fontWeight: 700, fontSize: 13, color: '#00257A', textTransform: 'uppercase', letterSpacing: 1 }}>
          Field Verifier
        </div>
        {Object.keys(SCREEN_FILES).map(screenName => {
          const s = screens.find(x => x.screen === screenName);
          const fields = s?.fields ?? [];
          const confirmed = fields.filter(f => f.status === 'confirmed').length;
          const status = getScreenStatus(fields);
          const color = status === 'green' ? '#16A34A' : status === 'amber' ? '#D97706' : '#8896AA';
          return (
            <div
              key={screenName}
              onClick={() => { setActiveScreen(screenName); setActiveFieldIndex(0); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: activeScreen === screenName ? '#DDE6F5' : 'transparent',
                borderLeft: activeScreen === screenName ? '3px solid #00257A' : '3px solid transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <span style={{ color: activeScreen === screenName ? '#00257A' : '#1A202C' }}>{screenName}</span>
              <Tag style={{ fontSize: 10, padding: '0 5px', margin: 0, color, borderColor: color, background: 'transparent' }}>
                {confirmed}/{fields.length}
              </Tag>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top progress bar */}
        <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #DDE3EE' }}>
          <div style={{ fontSize: 12, color: '#4A5568', marginBottom: 4 }}>
            Overall: {confirmedFields} / {totalFields} fields confirmed
          </div>
          <Progress percent={overallPct} strokeColor="#00257A" trailColor="#DDE3EE" showInfo size="small" />
        </div>

        {/* Tabs */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Tabs
            defaultActiveKey="verify"
            items={[
              {
                key: 'verify',
                label: 'Verifier',
                children: currentScreen && currentScreen.fields[activeFieldIndex] ? (
                  <VerifierCard
                    screenFile={SCREEN_FILES[activeScreen]}
                    field={currentScreen.fields[activeFieldIndex]}
                    fieldIndex={activeFieldIndex}
                    totalFields={currentScreen.fields.length}
                    onUpdate={handleFieldUpdate}
                    onNavigate={setActiveFieldIndex}

                  />
                ) : (
                  <div style={{ color: '#8896AA', padding: 32 }}>No fields for this screen.</div>
                ),
              },
              {
                key: 'developer',
                label: 'Developer View',
                children: <DeveloperView screens={screens} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/FieldVerifier/index.tsx
git commit -m "feat: add FieldVerifier page layout with sidebar and progress bar"
```

---

## Task 6: React — VerifierCard.tsx

**Files:**
- Create: `client/src/pages/FieldVerifier/VerifierCard.tsx`

The single field card: shows label, SQL query, live value; handles Confirm / Flag / Edit actions.

- [ ] **Step 1: Create VerifierCard.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Button, Input, Spin, Tag, message } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { FieldEntry } from './index';

const API = 'http://localhost:5000/api/field-verifier';

interface Props {
  screenFile: string;
  field: FieldEntry;
  fieldIndex: number;
  totalFields: number;

  onUpdate: (updated: FieldEntry) => void;
  onNavigate: (index: number) => void;
}

export function VerifierCard({ screenFile, field, fieldIndex, totalFields, onUpdate, onNavigate }: Props) {
  const [liveValue, setLiveValue] = useState<string>('');
  const [liveError, setLiveError] = useState<string>('');
  const [loadingValue, setLoadingValue] = useState(false);
  const [editing, setEditing] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [showFlagInput, setShowFlagInput] = useState(false);

  // Edit form state
  const [editSqlQuery, setEditSqlQuery] = useState(field.sqlQuery);
  const [editSqlTable, setEditSqlTable] = useState(field.sqlTable);
  const [editApiEndpoint, setEditApiEndpoint] = useState(field.apiEndpoint);
  const [editResponseProperty, setEditResponseProperty] = useState(field.responseProperty);
  const [editNotes, setEditNotes] = useState(field.notes);

  useEffect(() => {
    setEditSqlQuery(field.sqlQuery);
    setEditSqlTable(field.sqlTable);
    setEditApiEndpoint(field.apiEndpoint);
    setEditResponseProperty(field.responseProperty);
    setEditNotes(field.notes);
    setEditing(false);
    setShowFlagInput(false);
    setLiveValue('');
    setLiveError('');
    if (field.sqlQuery) fetchLiveValue(field.sqlQuery);
  }, [field.id]);

  async function fetchLiveValue(sql: string) {
    if (!sql) return;
    setLoadingValue(true);
    setLiveValue('');
    setLiveError('');
    try {
      const res = await fetch(`${API}/live-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlQuery: sql }),
      });
      const data = await res.json();
      if (data.error) setLiveError(data.error);
      else setLiveValue(data.value);
    } catch {
      setLiveError('Failed to reach API');
    } finally {
      setLoadingValue(false);
    }
  }

  async function updateField(patch: Partial<FieldEntry>) {
    const updated = { ...field, ...patch };
    const body = {
      screenFile,
      fieldId: field.id,
      status: updated.status,
      sqlQuery: updated.sqlQuery,
      sqlTable: updated.sqlTable,
      apiEndpoint: updated.apiEndpoint,
      responseProperty: updated.responseProperty,
      notes: updated.notes,
      verifiedBy: 'Joe',
    };
    await fetch(`${API}/field`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate({ ...updated, verifiedAt: new Date().toISOString(), verifiedBy: 'Joe' });
  }

  async function handleConfirm() {
    await updateField({ status: 'confirmed' });
    message.success('Confirmed!');
  }

  async function handleFlag() {
    if (!showFlagInput) { setShowFlagInput(true); return; }
    await updateField({ status: 'flagged', notes: flagNote });
    setShowFlagInput(false);
    message.warning('Flagged');
  }

  async function handleSaveEdit() {
    const patch: Partial<FieldEntry> = {
      sqlQuery: editSqlQuery,
      sqlTable: editSqlTable,
      apiEndpoint: editApiEndpoint,
      responseProperty: editResponseProperty,
      notes: editNotes,
    };
    await updateField(patch);
    setEditing(false);
    if (editSqlQuery) fetchLiveValue(editSqlQuery);
    message.success('Saved');
  }

  const statusColor = field.status === 'confirmed' ? '#16A34A' : field.status === 'flagged' ? '#D97706' : '#8896AA';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Button icon={<LeftOutlined />} size="small" disabled={fieldIndex === 0} onClick={() => onNavigate(fieldIndex - 1)}>Prev</Button>
        <span style={{ fontSize: 12, color: '#8896AA' }}>{fieldIndex + 1} / {totalFields}</span>
        <Button icon={<RightOutlined />} size="small" disabled={fieldIndex === totalFields - 1} onClick={() => onNavigate(fieldIndex + 1)}>Next</Button>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #DDE3EE', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1 }}>Field Label</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>{field.label}</div>
          </div>
          <Tag color={field.status === 'confirmed' ? 'green' : field.status === 'flagged' ? 'gold' : 'default'}>
            {field.status}
          </Tag>
        </div>

        {/* SQL */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>SQL Query</div>
          {editing ? (
            <Input.TextArea
              value={editSqlQuery}
              onChange={e => setEditSqlQuery(e.target.value)}
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              placeholder="SELECT ... FROM dbo.TableName WHERE ..."
            />
          ) : (
            <pre style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', color: field.sqlQuery ? '#1A202C' : '#8896AA' }}>
              {field.sqlQuery || '(no SQL set — click Edit to add)'}
            </pre>
          )}
        </div>

        {/* Live Value */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#8896AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Live Value
            {field.sqlQuery && !editing && (
              <Button type="link" size="small" style={{ padding: '0 4px', fontSize: 11 }} onClick={() => fetchLiveValue(field.sqlQuery)}>
                Refresh
              </Button>
            )}
          </div>
          {loadingValue ? (
            <Spin size="small" />
          ) : liveError ? (
            <span style={{ color: '#B71234', fontSize: 13 }}>{liveError}</span>
          ) : liveValue ? (
            <span style={{ fontSize: 24, fontWeight: 700, color: '#00257A' }}>{liveValue}</span>
          ) : (
            <span style={{ color: '#8896AA', fontSize: 13 }}>
              {field.sqlQuery ? 'Click Refresh to load' : 'Add SQL query first'}
            </span>
          )}
        </div>

        {/* Edit form extras */}
        {editing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>SQL Table</div>
              <Input value={editSqlTable} onChange={e => setEditSqlTable(e.target.value)} size="small" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>API Endpoint</div>
              <Input value={editApiEndpoint} onChange={e => setEditApiEndpoint(e.target.value)} size="small" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>Response Property</div>
              <Input value={editResponseProperty} onChange={e => setEditResponseProperty(e.target.value)} size="small" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8896AA', marginBottom: 4 }}>Notes</div>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} size="small" />
            </div>
          </div>
        )}

        {/* Flag note input */}
        {showFlagInput && (
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="What's wrong with this field?"
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              onPressEnter={handleFlag}
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {editing ? (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSaveEdit} style={{ background: '#00257A' }}>
                Save & Test
              </Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm} style={{ background: '#16A34A', borderColor: '#16A34A' }}>
                {field.status === 'confirmed' ? 'Re-verify' : 'Confirm'}
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleFlag} danger>
                {showFlagInput ? 'Submit Flag' : 'Flag'}
              </Button>
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          )}
        </div>

        {/* Notes display */}
        {field.notes && !editing && (
          <div style={{ marginTop: 12, padding: 8, background: '#FFF3CD', borderRadius: 4, fontSize: 12, color: '#856404' }}>
            Note: {field.notes}
          </div>
        )}

        {/* Meta */}
        {field.verifiedAt && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#8896AA' }}>
            Last verified: {new Date(field.verifiedAt).toLocaleString()} by {field.verifiedBy}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/FieldVerifier/VerifierCard.tsx
git commit -m "feat: add VerifierCard component"
```

---

## Task 7: React — DeveloperView.tsx

**Files:**
- Create: `client/src/pages/FieldVerifier/DeveloperView.tsx`

Read-only table for the developer. Filterable by screen and status. Copy button per SQL. Export JSON per screen.

- [ ] **Step 1: Create DeveloperView.tsx**

```tsx
import { useState } from 'react';
import { Table, Select, Button, Tag, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ScreenRegistry, FieldEntry } from './index';

interface Props {
  screens: ScreenRegistry[];
}

export function DeveloperView({ screens }: Props) {
  const [filterScreen, setFilterScreen] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const allFields = screens.flatMap(s =>
    s.fields.map(f => ({ ...f, screenName: s.screen }))
  );

  const filtered = allFields.filter(f => {
    if (filterScreen !== 'All' && f.screenName !== filterScreen) return false;
    if (filterStatus !== 'All' && f.status !== filterStatus) return false;
    return true;
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    message.success('Copied!');
  }

  function exportScreen(s: ScreenRegistry) {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.screen.toLowerCase().replace(/ /g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { title: 'Screen', dataIndex: 'screenName', key: 'screen', width: 120 },
    { title: 'Field Label', dataIndex: 'label', key: 'label', width: 160 },
    {
      title: 'SQL Query',
      dataIndex: 'sqlQuery',
      key: 'sqlQuery',
      render: (sql: string) => sql ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', flex: 1 }}>{sql}</pre>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(sql)} />
        </div>
      ) : <span style={{ color: '#8896AA' }}>—</span>,
    },
    { title: 'API Endpoint', dataIndex: 'apiEndpoint', key: 'apiEndpoint', width: 200 },
    { title: 'Response Property', dataIndex: 'responseProperty', key: 'responseProperty', width: 140 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'confirmed' ? 'green' : status === 'flagged' ? 'gold' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 180,
      render: (notes: string) => notes ? <span style={{ color: '#856404', fontSize: 12 }}>{notes}</span> : null,
    },
  ];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Select
          value={filterScreen}
          onChange={setFilterScreen}
          style={{ width: 160 }}
          options={[{ value: 'All', label: 'All Screens' }, ...screens.map(s => ({ value: s.screen, label: s.screen }))]}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 140 }}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'flagged', label: 'Flagged' },
            { value: 'unverified', label: 'Unverified' },
          ]}
        />
        <span style={{ fontSize: 12, color: '#8896AA' }}>{filtered.length} fields</span>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {screens.map(s => (
          <Button key={s.screen} size="small" icon={<DownloadOutlined />} onClick={() => exportScreen(s)}>
            {s.screen}
          </Button>
        ))}
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20 }}
        rowClassName={record => record.status === 'flagged' ? 'flagged-row' : ''}
      />

      <style>{`.flagged-row td { background: #FFFBEB !important; }`}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/FieldVerifier/DeveloperView.tsx
git commit -m "feat: add DeveloperView component"
```

---

## Task 8: Wire the Router

**Files:**
- Modify: `client/src/router.tsx`

- [ ] **Step 1: Add the lazy import** — add this line after the last existing lazy import (before `const SuspenseWrapper`):

```tsx
const FieldVerifierPage = lazy(() => import('./pages/FieldVerifier/index').then(m => ({ default: m.FieldVerifierPage })));
```

- [ ] **Step 2: Add the route** — add this route at the top of the `createBrowserRouter` array, alongside `/login`, outside the `RouteGuard` block:

```tsx
{
  path: '/verify',
  element: <SuspenseWrapper><FieldVerifierPage /></SuspenseWrapper>,
},
```

The full router array should start:
```tsx
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    path: '/verify',
    element: <SuspenseWrapper><FieldVerifierPage /></SuspenseWrapper>,
  },
  {
    element: <RouteGuard />,
    children: [ ... ],
  },
]);
```

- [ ] **Step 3: Build the client to verify no TypeScript errors**

```bash
cd C:/Projects/redesign-matched/client
npm run build
```

Expected: `built in X.XXs` with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/router.tsx
git commit -m "feat: add /verify route outside RouteGuard for field verifier"
```

---

## Task 9: Smoke Test End-to-End

- [ ] **Step 1: Start the API**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api
dotnet run
```

Expected: API running on `http://localhost:5000`

- [ ] **Step 2: Test the registry endpoint**

```bash
curl http://localhost:5000/api/field-verifier/registry
```

Expected: JSON array of 11 screen objects, each with a `fields` array.

- [ ] **Step 3: Start the React client**

```bash
cd C:/Projects/redesign-matched/client
npm run dev
```

Expected: Dev server on `http://localhost:5173`

- [ ] **Step 4: Open the verifier**

Navigate to `http://localhost:5173/verify`

Expected:
- Sidebar shows 11 screens, all with `0/N` gray pills
- Progress bar shows 0%
- Dashboard card loads with the first field

- [ ] **Step 5: Test Confirm action**

On the first card, enter a SQL query in Edit mode, save it, then click Confirm.

Expected:
- Card advances to next field
- Sidebar Dashboard pill increments
- Progress bar advances
- `docs/field-registry/dashboard.json` updated on disk with `status: "confirmed"`

- [ ] **Step 6: Commit final state**

```bash
git add .
git commit -m "feat: field verifier smoke test passing — ready for use"
```
