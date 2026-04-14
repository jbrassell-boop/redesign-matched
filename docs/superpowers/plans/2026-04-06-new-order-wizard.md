# New Order Wizard — Full Feature Parity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the 3-step React wizard (Client → Department → Confirm) to a 4-step wizard (Client → Department → Scope → Intake) matching the HTML version, with proper WO prefixes, department defaults, and complete intake capture.

**Architecture:** Backend-first. Add 3 new GET endpoints for scope/type lookups, expand the POST /api/orders to accept all intake fields and generate proper WO numbers. Then rebuild the frontend wizard with scope selection and intake form steps.

**Tech Stack:** ASP.NET Core 8 (C#, raw SqlClient), React 19 + TypeScript, Ant Design 5

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/TSI.Api/Models/Order.cs` | Modify | Add scope/type models, expand CreateOrderRequest |
| `server/TSI.Api/Controllers/OrdersController.cs` | Modify | Add 3 wizard endpoints, rewrite CreateOrder |
| `client/src/api/orders.ts` | Modify | Add scope/type API functions, expand request type |
| `client/src/components/shell/NewOrderWizard.tsx` | Modify | Add Steps 3 & 4, expand from 3→4 steps |

---

### Task 1: Expand backend models

**Files:**
- Modify: `server/TSI.Api/Models/Order.cs`

- [ ] **Step 1: Replace Order.cs with expanded models**

```csharp
namespace TSI.Api.Models;

public record CreateOrderRequest(
    int DepartmentKey,
    string OrderType,
    int? ScopeKey,
    string? SerialNumber,
    int? ScopeTypeKey,
    string? Complaint,
    string? PurchaseOrder,
    string? RackPosition,
    int? PackageTypeKey,
    string? IncludesCaseYN,
    string? IncludesETOCapYN,
    string? IncludesWaterProofCapYN
);

public record CreateOrderResponse(
    int RepairKey,
    string WorkOrderNumber
);

public record WizardClient(
    int ClientKey,
    string Name,
    string City,
    string State,
    string Zip,
    bool IsActive
);

public record WizardDepartment(
    int DepartmentKey,
    int ClientKey,
    string Name
);

public record WizardScope(
    int ScopeKey,
    string SerialNumber,
    string Model,
    string Manufacturer,
    string Type
);

public record WizardInstrumentType(
    string TypeCode,
    string Label
);

public record WizardScopeType(
    int ScopeTypeKey,
    string Description,
    string Manufacturer
);
```

- [ ] **Step 2: Build**

Run: `cd server/TSI.Api && dotnet build`
Expected: Build succeeded. 0 Errors.

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Models/Order.cs
git commit -m "feat: expand Order models for full wizard"
```

---

### Task 2: Add wizard lookup endpoints

**Files:**
- Modify: `server/TSI.Api/Controllers/OrdersController.cs`

- [ ] **Step 1: Add scopes endpoint after GetWizardDepartments**

Add this method after the `GetWizardDepartments` method (after line 93):

```csharp
    /// <summary>
    /// GET /api/orders/wizard/scopes?deptKey=X — scopes for a department
    /// </summary>
    [HttpGet("wizard/scopes")]
    public async Task<IActionResult> GetWizardScopes([FromQuery] int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT s.lScopeKey, ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible
            FROM tblScope s
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            WHERE s.lDepartmentKey = @deptKey AND ISNULL(s.sScopeIsDead, 'N') <> 'Y'
            ORDER BY s.sSerialNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var scopes = new List<WizardScope>();
        while (await reader.ReadAsync())
        {
            scopes.Add(new WizardScope(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                Model: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
                Type: reader["sRigidOrFlexible"]?.ToString() ?? ""
            ));
        }

        return Ok(scopes);
    }

    /// <summary>
    /// GET /api/orders/wizard/instrument-types — distinct instrument types
    /// </summary>
    [HttpGet("wizard/instrument-types")]
    public async Task<IActionResult> GetInstrumentTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT DISTINCT sRigidOrFlexible AS type
            FROM tblScopeType
            WHERE (bActive = 1 OR bActive IS NULL) AND sRigidOrFlexible IS NOT NULL
            ORDER BY sRigidOrFlexible
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var labelMap = new Dictionary<string, string>
            { { "F", "Flexible" }, { "R", "Rigid" }, { "C", "Camera" }, { "I", "Instrument" } };

        var types = new List<WizardInstrumentType>();
        while (await reader.ReadAsync())
        {
            var code = reader["type"]?.ToString() ?? "";
            if (labelMap.TryGetValue(code, out var label))
                types.Add(new WizardInstrumentType(code, label));
        }

        return Ok(types);
    }

    /// <summary>
    /// GET /api/orders/wizard/scope-types?instrumentType=F — scope types by instrument type
    /// </summary>
    [HttpGet("wizard/scope-types")]
    public async Task<IActionResult> GetWizardScopeTypes([FromQuery] string instrumentType)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT st.lScopeTypeKey, ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer
            FROM tblScopeType st
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            WHERE (st.bActive = 1 OR st.bActive IS NULL) AND st.sRigidOrFlexible = @type
            ORDER BY st.sScopeTypeDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@type", instrumentType);

        await using var reader = await cmd.ExecuteReaderAsync();
        var types = new List<WizardScopeType>();
        while (await reader.ReadAsync())
        {
            types.Add(new WizardScopeType(
                ScopeTypeKey: Convert.ToInt32(reader["lScopeTypeKey"]),
                Description: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? ""
            ));
        }

        return Ok(types);
    }
```

- [ ] **Step 2: Build**

Run: `cd server/TSI.Api && dotnet build`
Expected: Build succeeded. 0 Errors.

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/OrdersController.cs
git commit -m "feat: add wizard scopes + instrument-types + scope-types endpoints"
```

---

### Task 3: Rewrite CreateOrder with full fields

**Files:**
- Modify: `server/TSI.Api/Controllers/OrdersController.cs`

- [ ] **Step 1: Replace the CreateOrder method (everything from `[HttpPost]` to the closing catch brace)**

Replace the entire `CreateOrder` method with:

```csharp
    /// <summary>
    /// POST /api/orders — create a new repair work order
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();

            // 1. Look up department defaults
            const string deptSql = """
                SELECT d.lServiceLocationKey, d.lSalesRepKey, d.lPricingCategoryKey,
                       ISNULL(c.lPaymentTermsKey, 0) AS lPaymentTermsKey,
                       c.lSalesRepKey AS lClientSalesRepKey,
                       c.lPricingCategoryKey AS lClientPricingCategoryKey
                FROM tblDepartment d
                LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                WHERE d.lDepartmentKey = @deptKey
                """;
            await using var deptCmd = new SqlCommand(deptSql, conn);
            deptCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
            await using var deptReader = await deptCmd.ExecuteReaderAsync();

            int svcKey = 1, salesRepKey = 0, pricingKey = 0, payTermsKey = 0;
            if (await deptReader.ReadAsync())
            {
                svcKey = deptReader["lServiceLocationKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lServiceLocationKey"]) : 1;
                salesRepKey = deptReader["lSalesRepKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lSalesRepKey"])
                    : (deptReader["lClientSalesRepKey"] != DBNull.Value
                        ? Convert.ToInt32(deptReader["lClientSalesRepKey"]) : 0);
                pricingKey = deptReader["lPricingCategoryKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lPricingCategoryKey"])
                    : (deptReader["lClientPricingCategoryKey"] != DBNull.Value
                        ? Convert.ToInt32(deptReader["lClientPricingCategoryKey"]) : 0);
                payTermsKey = deptReader["lPaymentTermsKey"] != DBNull.Value
                    ? Convert.ToInt32(deptReader["lPaymentTermsKey"]) : 0;
            }
            await deptReader.CloseAsync();

            // 2. If no existing scope, create one
            int scopeKey = request.ScopeKey ?? 0;
            if (scopeKey == 0 && !string.IsNullOrWhiteSpace(request.SerialNumber))
            {
                const string scopeSql = """
                    DISABLE TRIGGER ALL ON tblScope;
                    INSERT INTO tblScope (lDepartmentKey, lScopeTypeKey, sSerialNumber, dtCreateDate)
                    VALUES (@deptKey, @scopeTypeKey, @sn, GETDATE());
                    DECLARE @sk INT = SCOPE_IDENTITY();
                    ENABLE TRIGGER ALL ON tblScope;
                    SELECT @sk;
                    """;
                await using var scopeCmd = new SqlCommand(scopeSql, conn);
                scopeCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
                scopeCmd.Parameters.AddWithValue("@scopeTypeKey", (object?)request.ScopeTypeKey ?? DBNull.Value);
                scopeCmd.Parameters.AddWithValue("@sn", request.SerialNumber);
                scopeKey = Convert.ToInt32(await scopeCmd.ExecuteScalarAsync());
            }

            // 3. Get "Received" status ID
            await using var statusCmd = new SqlCommand(
                "SELECT TOP 1 lRepairStatusID FROM tblRepairStatuses WHERE sRepairStatus = 'Received' ORDER BY lRepairStatusSortOrder", conn);
            var statusObj = await statusCmd.ExecuteScalarAsync();
            var statusId = statusObj != null ? Convert.ToInt32(statusObj) : 1;

            // 4. Generate WO number: {N|S}{R|I|K} + YYMMDDHHMM
            var locPrefix = svcKey == 2 ? "S" : "N";
            var typeCode = request.OrderType switch
            {
                "product-sale" => "I",
                "endocart" => "K",
                _ => "R" // repair, instrument
            };
            var now = DateTime.Now;
            var woNumber = $"{locPrefix}{typeCode}{now:yyMMddHHmm}";

            // 5. Insert the repair record
            const string insertSql = """
                DISABLE TRIGGER ALL ON tblRepair;
                INSERT INTO tblRepair (
                    lDepartmentKey, lScopeKey, lRepairStatusID, sWorkOrderNumber,
                    dtDateIn, lServiceLocationKey, sComplaintDesc, sPurchaseOrder,
                    sRackPosition, lPackageTypeKey,
                    sIncludesCaseYN, sIncludesETOCapYN, sIncludesWaterProofCapYN,
                    lSalesRepKey, lPricingCategoryKey, lPaymentTermsKey
                ) VALUES (
                    @deptKey, @scopeKey, @statusId, @woNumber,
                    GETDATE(), @svcKey, @complaint, @po,
                    @rack, @pkgTypeKey,
                    @inclCase, @inclETOCap, @inclWPCap,
                    @salesRepKey, @pricingKey, @payTermsKey
                );
                DECLARE @newKey INT = SCOPE_IDENTITY();
                ENABLE TRIGGER ALL ON tblRepair;
                SELECT @newKey;
                """;

            await using var insertCmd = new SqlCommand(insertSql, conn);
            insertCmd.Parameters.AddWithValue("@deptKey", request.DepartmentKey);
            insertCmd.Parameters.AddWithValue("@scopeKey", scopeKey > 0 ? scopeKey : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@statusId", statusId);
            insertCmd.Parameters.AddWithValue("@woNumber", woNumber);
            insertCmd.Parameters.AddWithValue("@svcKey", svcKey);
            insertCmd.Parameters.AddWithValue("@complaint", (object?)request.Complaint ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@po", (object?)request.PurchaseOrder ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@rack", (object?)request.RackPosition ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@pkgTypeKey", (object?)request.PackageTypeKey ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@inclCase", (object?)request.IncludesCaseYN ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@inclETOCap", (object?)request.IncludesETOCapYN ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@inclWPCap", (object?)request.IncludesWaterProofCapYN ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("@salesRepKey", salesRepKey > 0 ? salesRepKey : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@pricingKey", pricingKey > 0 ? pricingKey : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@payTermsKey", payTermsKey > 0 ? payTermsKey : DBNull.Value);

            var newKey = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

            return Ok(new CreateOrderResponse(newKey, woNumber));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }
```

- [ ] **Step 2: Build**

Run: `cd server/TSI.Api && dotnet build`
Expected: Build succeeded. 0 Errors.

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/OrdersController.cs
git commit -m "feat: CreateOrder with WO prefix, dept defaults, scope, intake fields"
```

---

### Task 4: Expand frontend API client

**Files:**
- Modify: `client/src/api/orders.ts`

- [ ] **Step 1: Replace orders.ts with expanded API**

```typescript
import apiClient from './client';

export interface WizardClient {
  clientKey: number;
  name: string;
  city: string;
  state: string;
  zip: string;
  isActive: boolean;
}

export interface WizardDepartment {
  departmentKey: number;
  clientKey: number;
  name: string;
}

export interface WizardScope {
  scopeKey: number;
  serialNumber: string;
  model: string;
  manufacturer: string;
  type: string; // F, R, C, I
}

export interface WizardInstrumentType {
  typeCode: string;
  label: string;
}

export interface WizardScopeType {
  scopeTypeKey: number;
  description: string;
  manufacturer: string;
}

export interface CreateOrderRequest {
  departmentKey: number;
  orderType: string;
  scopeKey?: number | null;
  serialNumber?: string | null;
  scopeTypeKey?: number | null;
  complaint?: string | null;
  purchaseOrder?: string | null;
  rackPosition?: string | null;
  packageTypeKey?: number | null;
  includesCaseYN?: string | null;
  includesETOCapYN?: string | null;
  includesWaterProofCapYN?: string | null;
}

export interface CreateOrderResponse {
  repairKey: number;
  workOrderNumber: string;
}

export const getWizardClients = async (search?: string): Promise<WizardClient[]> => {
  const { data } = await apiClient.get<WizardClient[]>('/orders/wizard/clients', {
    params: search ? { search } : undefined,
  });
  return data;
};

export const getWizardDepartments = async (clientKey: number): Promise<WizardDepartment[]> => {
  const { data } = await apiClient.get<WizardDepartment[]>('/orders/wizard/departments', {
    params: { clientKey },
  });
  return data;
};

export const getWizardScopes = async (deptKey: number): Promise<WizardScope[]> => {
  const { data } = await apiClient.get<WizardScope[]>('/orders/wizard/scopes', {
    params: { deptKey },
  });
  return data;
};

export const getInstrumentTypes = async (): Promise<WizardInstrumentType[]> => {
  const { data } = await apiClient.get<WizardInstrumentType[]>('/orders/wizard/instrument-types');
  return data;
};

export const getWizardScopeTypes = async (instrumentType: string): Promise<WizardScopeType[]> => {
  const { data } = await apiClient.get<WizardScopeType[]>('/orders/wizard/scope-types', {
    params: { instrumentType },
  });
  return data;
};

export const createOrder = async (req: CreateOrderRequest): Promise<CreateOrderResponse> => {
  const { data } = await apiClient.post<CreateOrderResponse>('/orders', req);
  return data;
};
```

- [ ] **Step 2: TypeScript check**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing unrelated warnings)

- [ ] **Step 3: Commit**

```bash
git add client/src/api/orders.ts
git commit -m "feat: expand orders API with scope/type lookups and full request"
```

---

### Task 5: Rebuild the wizard frontend — Steps 3 & 4

**Files:**
- Modify: `client/src/components/shell/NewOrderWizard.tsx`

- [ ] **Step 1: Replace NewOrderWizard.tsx with full 4-step wizard**

This is a complete rewrite. The file is self-contained (no new files needed). Replace the entire contents of `NewOrderWizard.tsx` with the code below.

Key changes from existing:
- Steps go from 3 → 4: Client, Department, Scope, Intake
- Step 3: scope grid with search + "Add New Scope" inline form
- Step 4: complaint (required), PO, rack, packaging, accessories checkboxes
- handleCreate sends full payload

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getWizardClients, getWizardDepartments, getWizardScopes,
  getInstrumentTypes, getWizardScopeTypes, createOrder,
} from '../../api/orders';
import type {
  WizardClient, WizardDepartment, WizardScope,
  WizardInstrumentType, WizardScopeType,
} from '../../api/orders';

interface Props {
  open: boolean;
  onClose: () => void;
  orderType: string;
  title: string;
}

const TYPE_LABELS: Record<string, string> = { F: 'Flexible', R: 'Rigid', C: 'Camera', I: 'Instrument' };

const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '.03em', marginBottom: 2,
};
const fld: React.CSSProperties = {
  height: 28, border: '1px solid var(--neutral-200)', borderRadius: 4,
  padding: '0 8px', fontSize: 11, fontFamily: 'inherit', outline: 'none', width: '100%',
  color: '#374151', background: '#fff',
};

export const NewOrderWizard = ({ open, onClose, orderType, title }: Props) => {
  const navigate = useNavigate();

  // ── Navigation ──
  const [step, setStep] = useState(1);

  // ── Step 1 ──
  const [clients, setClients] = useState<WizardClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<WizardClient | null>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);

  // ── Step 2 ──
  const [departments, setDepartments] = useState<WizardDepartment[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<WizardDepartment | null>(null);
  const deptSearchRef = useRef<HTMLInputElement>(null);

  // ── Step 3: Scope ──
  const [scopes, setScopes] = useState<WizardScope[]>([]);
  const [scopeSearch, setScopeSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<WizardScope | null>(null);
  const scopeSearchRef = useRef<HTMLInputElement>(null);
  // New scope form
  const [instTypes, setInstTypes] = useState<WizardInstrumentType[]>([]);
  const [scopeTypes, setScopeTypes] = useState<WizardScopeType[]>([]);
  const [newInstType, setNewInstType] = useState('');
  const [newScopeTypeKey, setNewScopeTypeKey] = useState<number | null>(null);
  const [newScopeTypeName, setNewScopeTypeName] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // ── Step 4: Intake ──
  const [complaint, setComplaint] = useState('');
  const [po, setPo] = useState('');
  const [rack, setRack] = useState('');
  const [inclCase, setInclCase] = useState(false);
  const [inclETOCap, setInclETOCap] = useState(false);
  const [inclWPCap, setInclWPCap] = useState(false);

  const [creating, setCreating] = useState(false);

  // ── Init on open ──
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedClient(null);
    setSelectedDept(null);
    setSelectedScope(null);
    setClientSearch('');
    setDeptSearch('');
    setScopeSearch('');
    setComplaint('');
    setPo('');
    setRack('');
    setInclCase(false);
    setInclETOCap(false);
    setInclWPCap(false);
    setNewInstType('');
    setNewScopeTypeKey(null);
    setNewScopeTypeName('');
    setNewSerial('');
    setModelSearch('');
    getWizardClients().then(setClients).catch(() => setClients([]));
    setTimeout(() => clientSearchRef.current?.focus(), 100);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const goStep = useCallback((s: number) => {
    setStep(s);
    if (s === 1) setTimeout(() => clientSearchRef.current?.focus(), 50);
    if (s === 2) { setDeptSearch(''); setTimeout(() => deptSearchRef.current?.focus(), 50); }
    if (s === 3) { setScopeSearch(''); setTimeout(() => scopeSearchRef.current?.focus(), 50); }
  }, []);

  // ── Step handlers ──
  const handleSelectClient = useCallback(async (client: WizardClient) => {
    setSelectedClient(client);
    setSelectedDept(null);
    setSelectedScope(null);
    const depts = await getWizardDepartments(client.clientKey).catch(() => []);
    setDepartments(depts);
    goStep(2);
  }, [goStep]);

  const handleSelectDept = useCallback(async (dept: WizardDepartment) => {
    setSelectedDept(dept);
    setSelectedScope(null);
    const sc = await getWizardScopes(dept.departmentKey).catch(() => []);
    setScopes(sc);
    // Load instrument types for new scope form
    if (instTypes.length === 0) {
      getInstrumentTypes().then(setInstTypes).catch(() => {});
    }
    goStep(3);
  }, [goStep, instTypes.length]);

  const handleSelectScope = useCallback((scope: WizardScope) => {
    setSelectedScope(scope);
    // Set accessory defaults based on type
    const isFlex = scope.type === 'F';
    setInclCase(!isFlex);
    setInclETOCap(isFlex);
    setInclWPCap(isFlex);
    goStep(4);
  }, [goStep]);

  // Instrument type change → load scope types
  const handleInstTypeChange = useCallback(async (typeCode: string) => {
    setNewInstType(typeCode);
    setNewScopeTypeKey(null);
    setNewScopeTypeName('');
    setModelSearch('');
    if (!typeCode) { setScopeTypes([]); return; }
    const types = await getWizardScopeTypes(typeCode).catch(() => []);
    setScopeTypes(types);
  }, []);

  const handlePickModel = useCallback((key: number, name: string) => {
    setNewScopeTypeKey(key);
    setNewScopeTypeName(name);
    setModelSearch(name);
  }, []);

  const handleAddScope = useCallback(() => {
    if (!newInstType) { message.warning('Select instrument type'); return; }
    if (!newScopeTypeKey) { message.warning('Select a model'); return; }
    if (!newSerial.trim()) { message.warning('Enter serial number'); return; }
    // Create a local scope object (will be created server-side on submit)
    const localScope: WizardScope = {
      scopeKey: 0, // signals "create new" to the backend
      serialNumber: newSerial.trim(),
      model: newScopeTypeName,
      manufacturer: scopeTypes.find(t => t.scopeTypeKey === newScopeTypeKey)?.manufacturer ?? '',
      type: newInstType,
    };
    setSelectedScope(localScope);
    const isFlex = newInstType === 'F';
    setInclCase(!isFlex);
    setInclETOCap(isFlex);
    setInclWPCap(isFlex);
    message.success('Scope added');
    goStep(4);
  }, [newInstType, newScopeTypeKey, newScopeTypeName, newSerial, scopeTypes, goStep]);

  // ── Create order ──
  const handleCreate = useCallback(async () => {
    if (!selectedDept) return;
    if (!complaint.trim()) { message.error('Customer complaint is required'); return; }
    setCreating(true);
    try {
      const result = await createOrder({
        departmentKey: selectedDept.departmentKey,
        orderType,
        scopeKey: selectedScope && selectedScope.scopeKey > 0 ? selectedScope.scopeKey : undefined,
        serialNumber: selectedScope && selectedScope.scopeKey === 0 ? selectedScope.serialNumber : undefined,
        scopeTypeKey: selectedScope && selectedScope.scopeKey === 0 ? newScopeTypeKey : undefined,
        complaint: complaint.trim(),
        purchaseOrder: po.trim() || undefined,
        rackPosition: rack.trim() || undefined,
        includesCaseYN: inclCase ? 'Y' : 'N',
        includesETOCapYN: inclETOCap ? 'Y' : 'N',
        includesWaterProofCapYN: inclWPCap ? 'Y' : 'N',
      });
      onClose();
      message.success(`Work order ${result.workOrderNumber} created`);
      navigate(`/repairs/${result.repairKey}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg ? `Failed: ${msg}` : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  }, [selectedDept, selectedScope, orderType, complaint, po, rack, inclCase, inclETOCap, inclWPCap, newScopeTypeKey, onClose, navigate]);

  if (!open) return null;

  // ── Filters ──
  const lc = clientSearch.toLowerCase();
  const filteredClients = lc
    ? clients.filter(c => c.name.toLowerCase().includes(lc) || c.city.toLowerCase().includes(lc) || c.state.toLowerCase().includes(lc) || c.zip.includes(lc) || String(c.clientKey).includes(lc))
    : clients;

  const ld = deptSearch.toLowerCase();
  const filteredDepts = ld ? departments.filter(d => d.name.toLowerCase().includes(ld)) : departments;

  const ls = scopeSearch.toLowerCase();
  const filteredScopes = ls
    ? scopes.filter(s => s.serialNumber.toLowerCase().includes(ls) || s.model.toLowerCase().includes(ls) || s.manufacturer.toLowerCase().includes(ls))
    : scopes;

  const lm = modelSearch.toLowerCase();
  const filteredModels = lm ? scopeTypes.filter(t => t.description.toLowerCase().includes(lm) || t.manufacturer.toLowerCase().includes(lm)) : scopeTypes;

  const stepTabs = [
    { num: 1, label: 'Client' },
    { num: 2, label: 'Department' },
    { num: 3, label: 'Scope' },
    { num: 4, label: 'Intake' },
  ];

  // ── Shared card style ──
  const cardStyle: React.CSSProperties = {
    padding: '10px 12px', border: '1.5px solid var(--neutral-200)',
    borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s',
  };
  const onHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--primary)';
    e.currentTarget.style.background = 'var(--primary-light)';
  };
  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = 'var(--neutral-200)';
    e.currentTarget.style.background = '';
  };

  // ── Breadcrumb chip ──
  const Chip = ({ label, value, extra, onChangeStep }: { label: string; value: string; extra?: string; onChangeStep: number }) => (
    <div style={{
      background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
      borderRadius: 6, padding: '7px 12px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>{label}</span><br />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{value}</span>
        {extra && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>{extra}</span>}
      </div>
      <button onClick={() => goStep(onChangeStep)} style={{
        background: 'none', border: 'none', color: 'var(--primary)',
        fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
      }}>Change</button>
    </div>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,37,0.35)',
        zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: 'var(--card)', borderRadius: 10, width: 660, maxHeight: '85vh',
        overflow: 'hidden', boxShadow: '0 24px 72px rgba(0,0,37,0.28)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(120deg, var(--navy) 0%, var(--steel) 100%)',
          color: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WizardIcon type={orderType} />
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>{title}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
            color: 'var(--card)', width: 28, height: 28, borderRadius: 5,
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>x</button>
        </div>

        {/* Step tabs */}
        <div style={{
          display: 'flex', background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)', flexShrink: 0,
        }}>
          {stepTabs.map((t) => {
            const active = t.num === step;
            const past = t.num < step;
            return (
              <div key={t.num} style={{
                padding: '8px 16px', fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--navy)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--navy)' : '2px solid transparent',
                cursor: 'default', userSelect: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%', fontSize: 9,
                  background: (active || past) ? 'var(--navy)' : 'var(--neutral-200)',
                  color: 'var(--card)',
                }}>{t.num}</span>
                {t.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ════ Step 1: Client ════ */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 8 }}>
              <input ref={clientSearchRef} value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                placeholder="Search by name, city, state, zip, or ID..." style={{ ...fld, height: 32, flexShrink: 0 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, overflowY: 'auto', flex: 1 }}>
                {filteredClients.length === 0
                  ? <div style={{ gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>No clients found</div>
                  : filteredClients.map(c => (
                    <div key={c.clientKey} onClick={() => handleSelectClient(c)} style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        {c.city}{c.state ? `, ${c.state}` : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ════ Step 2: Department ════ */}
          {step === 2 && selectedClient && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 8 }}>
              <Chip label="Client" value={selectedClient.name} extra={`${selectedClient.city}${selectedClient.state ? `, ${selectedClient.state}` : ''}`} onChangeStep={1} />
              <input ref={deptSearchRef} value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
                placeholder="Search departments..." style={{ ...fld, height: 32, flexShrink: 0 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, overflowY: 'auto', flex: 1 }}>
                {filteredDepts.length === 0
                  ? <div style={{ gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>No departments found</div>
                  : filteredDepts.map(d => (
                    <div key={d.departmentKey} onClick={() => handleSelectDept(d)} style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{d.name}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ════ Step 3: Scope ════ */}
          {step === 3 && selectedClient && selectedDept && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 8 }}>
              <Chip label="Client / Department" value={`${selectedClient.name} / ${selectedDept.name}`} onChangeStep={2} />
              <input ref={scopeSearchRef} value={scopeSearch} onChange={e => setScopeSearch(e.target.value)}
                placeholder="Search by serial number or model..." style={{ ...fld, height: 32, flexShrink: 0 }} />

              {/* Existing scopes grid */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignContent: 'start' }}>
                {filteredScopes.length === 0 && !scopeSearch
                  ? <div style={{ gridColumn: '1/-1', padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>No scopes for this department. Use <b>Add New Scope</b> below.</div>
                  : filteredScopes.length === 0
                  ? <div style={{ gridColumn: '1/-1', padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>No scopes matching &quot;{scopeSearch}&quot;</div>
                  : filteredScopes.map(s => (
                    <div key={s.scopeKey} onClick={() => handleSelectScope(s)} style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>SN# {s.serialNumber || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        {s.model || '—'}{s.manufacturer ? ` · ${s.manufacturer}` : ''}{s.type ? ` · ${TYPE_LABELS[s.type] || s.type}` : ''}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add New Scope */}
              <div style={{
                border: '1px solid var(--neutral-200)', borderRadius: 6,
                background: 'var(--neutral-50)', padding: '10px 12px', flexShrink: 0,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14 }}>+</span> Add New Scope
                  <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400, marginLeft: 'auto' }}>Scope not in system yet</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '6px 10px' }}>
                  <div>
                    <div style={lbl}>Instrument Type *</div>
                    <select value={newInstType} onChange={e => handleInstTypeChange(e.target.value)} style={fld}>
                      <option value="">-- Select --</option>
                      {instTypes.map(t => <option key={t.typeCode} value={t.typeCode}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={lbl}>Search Model * {scopeTypes.length > 0 && `(${scopeTypes.length})`}</div>
                    <input value={modelSearch} onChange={e => { setModelSearch(e.target.value); setNewScopeTypeKey(null); setNewScopeTypeName(''); }}
                      placeholder={newInstType ? `Type to search ${scopeTypes.length} models...` : 'Select type first...'}
                      disabled={!newInstType} style={fld} />
                  </div>
                </div>
                {/* Model grid */}
                {newInstType && modelSearch && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--neutral-200)', borderRadius: 4, background: '#fff', marginTop: 6 }}>
                    {filteredModels.length === 0
                      ? <div style={{ padding: 8, fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>No models matching &quot;{modelSearch}&quot;</div>
                      : filteredModels.slice(0, 50).map(t => (
                        <div key={t.scopeTypeKey}
                          onClick={() => handlePickModel(t.scopeTypeKey, t.description)}
                          style={{
                            padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                            borderBottom: '1px solid var(--neutral-100)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: newScopeTypeKey === t.scopeTypeKey ? 'var(--primary-light)' : '',
                            fontWeight: newScopeTypeKey === t.scopeTypeKey ? 700 : 400,
                          }}
                          onMouseEnter={e => { if (newScopeTypeKey !== t.scopeTypeKey) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                          onMouseLeave={e => { if (newScopeTypeKey !== t.scopeTypeKey) e.currentTarget.style.background = ''; }}
                        >
                          <span>{t.description}</span>
                          {t.manufacturer && <span style={{ fontSize: 9, color: 'var(--muted)' }}>{t.manufacturer}</span>}
                        </div>
                      ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={lbl}>Serial Number *</div>
                    <input value={newSerial} onChange={e => setNewSerial(e.target.value)} placeholder="e.g. 2801442" style={fld} />
                  </div>
                  <button onClick={handleAddScope} style={{
                    height: 28, padding: '0 16px', background: 'var(--success)', color: '#fff',
                    border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>+ Add Scope</button>
                </div>
              </div>
            </div>
          )}

          {/* ════ Step 4: Intake ════ */}
          {step === 4 && selectedClient && selectedDept && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '14px 18px', gap: 10, overflowY: 'auto' }}>
              {/* Summary chips */}
              <div style={{
                background: 'rgba(var(--success-rgb), 0.08)', border: '1px solid rgba(var(--success-rgb), 0.25)',
                borderRadius: 6, padding: '8px 12px', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, flexShrink: 0,
              }}>
                <div><span style={{ fontWeight: 700, color: 'var(--success)' }}>Client:</span> {selectedClient.name}</div>
                <div><span style={{ fontWeight: 700, color: 'var(--success)' }}>Dept:</span> {selectedDept.name}</div>
                {selectedScope && <div><span style={{ fontWeight: 700, color: 'var(--success)' }}>Scope:</span> {selectedScope.model} / SN# {selectedScope.serialNumber}</div>}
              </div>

              {/* Complaint */}
              <div>
                <div style={lbl}>Customer Complaint *</div>
                <textarea value={complaint} onChange={e => setComplaint(e.target.value)} rows={3}
                  placeholder="What did the customer report? (e.g., Leaking at base, No image, Angulation stiff...)"
                  style={{ ...fld, height: 'auto', padding: '6px 8px', resize: 'vertical' }} />
              </div>

              {/* PO + Rack */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={lbl}>PO Number</div>
                  <input value={po} onChange={e => setPo(e.target.value)} placeholder="If provided" style={fld} />
                </div>
                <div>
                  <div style={lbl}>Rack Position</div>
                  <input value={rack} onChange={e => setRack(e.target.value)} placeholder="Auto-assigned if blank" style={fld} />
                </div>
              </div>

              {/* Accessories */}
              <div>
                <div style={lbl}>Accessories Received</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {[
                    { label: 'Carrying Case', checked: inclCase, set: setInclCase },
                    { label: 'ETO Cap', checked: inclETOCap, set: setInclETOCap },
                    { label: 'Water Res. Cap', checked: inclWPCap, set: setInclWPCap },
                  ].map(a => (
                    <label key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer' }}>
                      <input type="checkbox" checked={a.checked} onChange={e => a.set(e.target.checked)} />
                      {a.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  height: 38, background: 'var(--navy)', color: 'var(--card)', border: 'none',
                  borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
                  letterSpacing: 0.3, flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6, opacity: creating ? 0.7 : 1,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {creating ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WizardIcon = ({ type }: { type: string }) => {
  if (type === 'endocart') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /><line x1="12" y1="11" x2="12" y2="15" />
      </svg>
    );
  }
  if (type === 'repair' || type === 'instrument') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
};
```

- [ ] **Step 2: TypeScript check**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/shell/NewOrderWizard.tsx
git commit -m "feat: full 4-step wizard — scope selection, intake, WO prefix"
```

---

### Task 6: Push and verify deploy

- [ ] **Step 1: Push all changes**

```bash
git push origin main
```

- [ ] **Step 2: Watch both deploys**

```bash
gh run list --workflow deploy-server.yml --limit 1
gh run list --workflow deploy-client.yml --limit 1
```

Wait for both to show `completed success`.

- [ ] **Step 3: Smoke test the API**

Test scope lookup:
```bash
curl -s "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/orders/wizard/instrument-types" -H "Authorization: Bearer TOKEN"
```

Test scope types:
```bash
curl -s "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/orders/wizard/scope-types?instrumentType=F" -H "Authorization: Bearer TOKEN"
```

Expected: JSON arrays with data.

- [ ] **Step 4: End-to-end test in browser**

1. Navigate to Repairs → + New Repair
2. Pick a client → pick a department → should see scope grid (Step 3)
3. Pick an existing scope → should see intake form (Step 4)
4. Fill complaint, click Create Order
5. Should navigate to repair detail with proper NR/SR WO number
