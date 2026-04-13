# Product Sales — Split Order Invoicing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement partial fulfillment invoicing — processors mark items shipped/backordered, invoice shipped items, and the system auto-creates a child order for backorders.

**Architecture:** Backend-first. Add item status + parent key columns, build 3 new endpoints (bulk-status, invoice rewrite, related orders), then update the frontend drawer to wire real handlers replacing DevNotice wrappers.

**Tech Stack:** ASP.NET Core 8 (C# raw SqlClient), React 19 + TypeScript, Ant Design 5

**Spec:** `docs/superpowers/specs/2026-04-13-product-sale-invoicing-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/TSI.Api/Models/ProductSale.cs` | Modify | Add `ItemStatus` to line item record, add request/response records for bulk-status and invoice |
| `server/TSI.Api/Controllers/ProductSalesController.cs` | Modify | Add bulk-status endpoint, rewrite invoice endpoint, add related-orders endpoint, update detail/list queries |
| `client/src/pages/product-sale/types.ts` | Modify | Add `itemStatus`, `parentProductSaleKey`, `RelatedOrder` types |
| `client/src/api/product-sales.ts` | Modify | Add `bulkUpdateItemStatus`, update `invoiceOrder` response type, add `getRelatedOrders` |
| `client/src/pages/product-sale/ProductSaleDrawer.tsx` | Modify | Wire real handlers for Mark Shipped/Backordered, replace invoice DevNotice, add Related Orders section |
| `client/src/pages/product-sale/ProductSaleDrawer.css` | Modify | Add styles for related orders links |

---

### Task 1: Backend — Add `ItemStatus` to line item model + query

**Files:**
- Modify: `server/TSI.Api/Models/ProductSale.cs:100-111`
- Modify: `server/TSI.Api/Controllers/ProductSalesController.cs:206-242`

- [ ] **Step 1: Add `ItemStatus` to the `ProductSaleLineItem` record**

In `server/TSI.Api/Models/ProductSale.cs`, update the `ProductSaleLineItem` record to include the new field:

```csharp
public record ProductSaleLineItem(
    int ProductSaleInventoryKey,
    int? InventorySizeKey,
    string ItemDescription,
    string SizeDescription,
    string? SizeDescription2,
    string? SizeDescription3,
    int Quantity,
    decimal UnitCost,
    decimal TotalCost,
    string? LotNumber,
    string ItemStatus
);
```

- [ ] **Step 2: Update the line items query to include `sItemStatus`**

In `server/TSI.Api/Controllers/ProductSalesController.cs`, find the `linesSql` constant in the `GetDetail` method (around line 206). Update it to include `sItemStatus`:

```csharp
const string linesSql = """
    SELECT psi.lProductSaleInventoryKey, psi.lInventorySizeKey,
           ISNULL(i.sItemDescription, '') AS sItemDescription,
           ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
           isz.sSizeDescription2, isz.sSizeDescription3,
           ISNULL(psi.lQuantity, 0) AS lQuantity,
           ISNULL(psi.nUnitCost, 0) AS nUnitCost,
           ISNULL(psi.nTotalCost, 0) AS nTotalCost,
           psi.sLotNumber,
           ISNULL(psi.sItemStatus, 'Pending') AS sItemStatus
    FROM tblProductSalesInventory psi
    LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = psi.lInventorySizeKey
    LEFT JOIN tblInventory i ON i.lInventoryKey = isz.lInventoryKey
    WHERE psi.lProductSaleKey = @key
    ORDER BY psi.lProductSaleInventoryKey
    """;
```

- [ ] **Step 3: Update the line item mapping to read `sItemStatus`**

In the same method, update the `ProductSaleLineItem` constructor call (around line 230) to include the new field:

```csharp
lineItems.Add(new ProductSaleLineItem(
    ProductSaleInventoryKey: Convert.ToInt32(linesReader["lProductSaleInventoryKey"]),
    InventorySizeKey: linesReader["lInventorySizeKey"] == DBNull.Value ? null : Convert.ToInt32(linesReader["lInventorySizeKey"]),
    ItemDescription: linesReader["sItemDescription"]?.ToString() ?? "",
    SizeDescription: linesReader["sSizeDescription"]?.ToString() ?? "",
    SizeDescription2: linesReader["sSizeDescription2"]?.ToString(),
    SizeDescription3: linesReader["sSizeDescription3"]?.ToString(),
    Quantity: Convert.ToInt32(linesReader["lQuantity"]),
    UnitCost: Convert.ToDecimal(linesReader["nUnitCost"]),
    TotalCost: Convert.ToDecimal(linesReader["nTotalCost"]),
    LotNumber: linesReader["sLotNumber"]?.ToString(),
    ItemStatus: linesReader["sItemStatus"]?.ToString() ?? "Pending"
));
```

- [ ] **Step 4: Build and verify no compile errors**

```bash
cd server && dotnet build 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add server/TSI.Api/Models/ProductSale.cs server/TSI.Api/Controllers/ProductSalesController.cs
git commit -m "feat(api): add ItemStatus to product sale line item model and query"
```

---

### Task 2: Backend — Bulk item status endpoint

**Files:**
- Modify: `server/TSI.Api/Models/ProductSale.cs`
- Modify: `server/TSI.Api/Controllers/ProductSalesController.cs`

- [ ] **Step 1: Add the request model**

In `server/TSI.Api/Models/ProductSale.cs`, add after the `UpdateLineItemRequest` record:

```csharp
public record BulkItemStatusRequest(
    int[] ItemKeys,
    string Status
);
```

- [ ] **Step 2: Add the bulk status endpoint**

In `server/TSI.Api/Controllers/ProductSalesController.cs`, add after the `UpdateLineItem` method (after line 536):

```csharp
// ── POST /api/product-sales/{key}/items/bulk-status ─────────────────────

[HttpPost("{key:int}/items/bulk-status")]
public async Task<IActionResult> BulkUpdateItemStatus(int key, [FromBody] BulkItemStatusRequest body)
{
    var validStatuses = new[] { "Pending", "Shipped", "Backordered" };
    if (!validStatuses.Contains(body.Status))
        return BadRequest(new { message = $"Invalid status '{body.Status}'. Must be Pending, Shipped, or Backordered." });

    if (body.ItemKeys.Length == 0)
        return BadRequest(new { message = "No items specified." });

    await using var conn = CreateConnection();
    await conn.OpenAsync();

    // Build parameterized IN clause
    var paramNames = new List<string>();
    var cmd = new SqlCommand { Connection = conn, CommandTimeout = 30 };
    for (var i = 0; i < body.ItemKeys.Length; i++)
    {
        paramNames.Add($"@k{i}");
        cmd.Parameters.AddWithValue($"@k{i}", body.ItemKeys[i]);
    }
    cmd.Parameters.AddWithValue("@status", body.Status);
    cmd.Parameters.AddWithValue("@key", key);

    cmd.CommandText = $"""
        UPDATE tblProductSalesInventory
        SET sItemStatus = @status
        WHERE lProductSaleKey = @key
          AND lProductSaleInventoryKey IN ({string.Join(", ", paramNames)})
        """;

    var rows = await cmd.ExecuteNonQueryAsync();
    return Ok(new { updated = rows });
}
```

- [ ] **Step 3: Build and verify**

```bash
cd server && dotnet build 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Models/ProductSale.cs server/TSI.Api/Controllers/ProductSalesController.cs
git commit -m "feat(api): add bulk item status endpoint for product sales"
```

---

### Task 3: Backend — Add `ParentProductSaleKey` to detail + list queries

**Files:**
- Modify: `server/TSI.Api/Models/ProductSale.cs`
- Modify: `server/TSI.Api/Controllers/ProductSalesController.cs`

- [ ] **Step 1: Add `ParentProductSaleKey` to `ProductSaleDetail` record**

In `server/TSI.Api/Models/ProductSale.cs`, add `int? ParentProductSaleKey` and `string? ParentInvoiceNumber` to the `ProductSaleDetail` record — insert them after the `EstimatedShipDateTo` parameter and before `LineItems`:

```csharp
    // parent reference
    int? ParentProductSaleKey,
    string? ParentInvoiceNumber,
    // line items
    IEnumerable<ProductSaleLineItem> LineItems
```

- [ ] **Step 2: Update `ProductSaleListItem` to include `ParentProductSaleKey`**

Add `int? ParentProductSaleKey` to the end of the `ProductSaleListItem` record:

```csharp
public record ProductSaleListItem(
    int ProductSaleKey,
    string InvoiceNumber,
    string ClientName,
    string DepartmentName,
    string Status,
    string Source,
    string SalesRep,
    string? OrderDate,
    decimal Total,
    int ItemCount,
    int BackorderedCount,
    int? ParentProductSaleKey
);
```

- [ ] **Step 3: Update the detail SQL to include `lParentProductSaleKey` and parent invoice number**

In `ProductSalesController.cs`, update the `GetDetail` method's main SQL (around line 179) to join the parent for its invoice number:

```csharp
var sql = $"""
    SELECT ps.*,
           ISNULL(c.sClientName1, '') AS sClientName1,
           ISNULL(d.sDepartmentName, '') AS sDepartmentName,
           ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
           pl.sInventoryPricingList,
           parent.sInvoiceNumber AS ParentInvoiceNumber,
           {StatusCaseSql} AS Status
    FROM tblProductSales ps
    LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
    LEFT JOIN tblInventoryPricingLists pl ON pl.lInventoryPricingListKey = ps.lInventoryPricingListKey
    LEFT JOIN tblProductSales parent ON parent.lProductSaleKey = ps.lParentProductSaleKey
    WHERE ps.lProductSaleKey = @key
    """;
```

- [ ] **Step 4: Update `MapDetail` to read the new fields**

In the `MapDetail` method, add the two new fields before `LineItems`:

```csharp
    // parent reference
    ParentProductSaleKey: r["lParentProductSaleKey"] == DBNull.Value ? null : Convert.ToInt32(r["lParentProductSaleKey"]),
    ParentInvoiceNumber: r["ParentInvoiceNumber"]?.ToString(),
    LineItems: Array.Empty<ProductSaleLineItem>()
```

- [ ] **Step 5: Update the list SQL to include `lParentProductSaleKey`**

In the `GetList` method's `dataSql` (around line 73), add `ps.lParentProductSaleKey` to the SELECT:

```csharp
var dataSql = $"""
    SELECT ps.lProductSaleKey, ps.sInvoiceNumber,
           ISNULL(c.sClientName1, '') AS sClientName1,
           ISNULL(d.sDepartmentName, '') AS sDepartmentName,
           ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, '') AS SalesRep,
           ps.dtOrderDate,
           ISNULL(ps.nTotalAmount, 0) AS nTotalAmount,
           {StatusCaseSql} AS Status,
           ISNULL(ps.sPurchaseOrder, '') AS sPurchaseOrder,
           (SELECT COUNT(*) FROM tblProductSalesInventory psi WHERE psi.lProductSaleKey = ps.lProductSaleKey) AS ItemCount,
           ps.lParentProductSaleKey
    FROM tblProductSales ps
    LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
    {whereClause}
    ORDER BY ps.dtOrderDate DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    """;
```

- [ ] **Step 6: Update the list item mapping to read `lParentProductSaleKey`**

In the `GetList` method, update the `ProductSaleListItem` constructor (around line 109):

```csharp
items.Add(new ProductSaleListItem(
    ProductSaleKey: Convert.ToInt32(reader["lProductSaleKey"]),
    InvoiceNumber: reader["sInvoiceNumber"]?.ToString() ?? "",
    ClientName: reader["sClientName1"]?.ToString() ?? "",
    DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
    Status: reader["Status"]?.ToString() ?? "Draft",
    Source: reader["sPurchaseOrder"]?.ToString() ?? "",
    SalesRep: reader["SalesRep"]?.ToString()?.Trim() ?? "",
    OrderDate: (reader["dtOrderDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
    Total: Convert.ToDecimal(reader["nTotalAmount"]),
    ItemCount: Convert.ToInt32(reader["ItemCount"]),
    BackorderedCount: 0,
    ParentProductSaleKey: reader["lParentProductSaleKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lParentProductSaleKey"])
));
```

- [ ] **Step 7: Build and verify**

```bash
cd server && dotnet build 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 8: Commit**

```bash
git add server/TSI.Api/Models/ProductSale.cs server/TSI.Api/Controllers/ProductSalesController.cs
git commit -m "feat(api): add parentProductSaleKey to product sale detail and list"
```

---

### Task 4: Backend — Related orders endpoint

**Files:**
- Modify: `server/TSI.Api/Models/ProductSale.cs`
- Modify: `server/TSI.Api/Controllers/ProductSalesController.cs`

- [ ] **Step 1: Add response models**

In `server/TSI.Api/Models/ProductSale.cs`, add:

```csharp
public record RelatedOrderItem(
    int ProductSaleKey,
    string InvoiceNumber,
    string Status,
    int ItemCount
);

public record RelatedOrdersResponse(
    RelatedOrderItem? Parent,
    IEnumerable<RelatedOrderItem> Children
);
```

- [ ] **Step 2: Add the endpoint**

In `ProductSalesController.cs`, add after the `VoidOrder` method:

```csharp
// ── GET /api/product-sales/{key}/related ────────────────────────────────

[HttpGet("{key:int}/related")]
public async Task<IActionResult> GetRelatedOrders(int key)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    // Get this order's parent key
    await using var selfCmd = new SqlCommand(
        "SELECT lParentProductSaleKey FROM tblProductSales WHERE lProductSaleKey = @key", conn);
    selfCmd.CommandTimeout = 30;
    selfCmd.Parameters.AddWithValue("@key", key);
    var parentObj = await selfCmd.ExecuteScalarAsync();
    if (parentObj == null) return NotFound(new { message = "Order not found." });

    var parentKey = parentObj == DBNull.Value ? (int?)null : Convert.ToInt32(parentObj);

    // Get parent info if this is a child
    RelatedOrderItem? parent = null;
    if (parentKey.HasValue)
    {
        var parentSql = $"""
            SELECT ps.lProductSaleKey, ps.sInvoiceNumber,
                   {StatusCaseSql} AS Status,
                   (SELECT COUNT(*) FROM tblProductSalesInventory WHERE lProductSaleKey = ps.lProductSaleKey) AS ItemCount
            FROM tblProductSales ps
            WHERE ps.lProductSaleKey = @parentKey
            """;
        await using var pCmd = new SqlCommand(parentSql, conn);
        pCmd.CommandTimeout = 30;
        pCmd.Parameters.AddWithValue("@parentKey", parentKey.Value);
        await using var pReader = await pCmd.ExecuteReaderAsync();
        if (await pReader.ReadAsync())
        {
            parent = new RelatedOrderItem(
                ProductSaleKey: Convert.ToInt32(pReader["lProductSaleKey"]),
                InvoiceNumber: pReader["sInvoiceNumber"]?.ToString() ?? "",
                Status: pReader["Status"]?.ToString() ?? "Draft",
                ItemCount: Convert.ToInt32(pReader["ItemCount"])
            );
        }
    }

    // Get children of this order
    var childSql = $"""
        SELECT ps.lProductSaleKey, ps.sInvoiceNumber,
               {StatusCaseSql} AS Status,
               (SELECT COUNT(*) FROM tblProductSalesInventory WHERE lProductSaleKey = ps.lProductSaleKey) AS ItemCount
        FROM tblProductSales ps
        WHERE ps.lParentProductSaleKey = @key
        ORDER BY ps.lProductSaleKey
        """;
    await using var cCmd = new SqlCommand(childSql, conn);
    cCmd.CommandTimeout = 30;
    cCmd.Parameters.AddWithValue("@key", key);
    await using var cReader = await cCmd.ExecuteReaderAsync();

    var children = new List<RelatedOrderItem>();
    while (await cReader.ReadAsync())
    {
        children.Add(new RelatedOrderItem(
            ProductSaleKey: Convert.ToInt32(cReader["lProductSaleKey"]),
            InvoiceNumber: cReader["sInvoiceNumber"]?.ToString() ?? "",
            Status: cReader["Status"]?.ToString() ?? "Draft",
            ItemCount: Convert.ToInt32(cReader["ItemCount"])
        ));
    }

    return Ok(new RelatedOrdersResponse(parent, children));
}
```

- [ ] **Step 3: Build and verify**

```bash
cd server && dotnet build 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Models/ProductSale.cs server/TSI.Api/Controllers/ProductSalesController.cs
git commit -m "feat(api): add related orders endpoint for product sales"
```

---

### Task 5: Backend — Rewrite invoice endpoint with split order logic

**Files:**
- Modify: `server/TSI.Api/Models/ProductSale.cs`
- Modify: `server/TSI.Api/Controllers/ProductSalesController.cs`

- [ ] **Step 1: Add invoice response model**

In `server/TSI.Api/Models/ProductSale.cs`, add:

```csharp
public record InvoiceResponse(
    string InvoiceNumber,
    string InvoiceDate,
    int? ChildOrderKey,
    int ChildOrderItemCount
);
```

- [ ] **Step 2: Replace the invoice endpoint**

In `ProductSalesController.cs`, replace the existing `Invoice` method (around line 566-577) with the full split order implementation:

```csharp
[HttpPost("{key:int}/invoice")]
public async Task<IActionResult> Invoice(int key)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();

    try
    {
        // 1. Verify order is Approved and has shipped items
        var checkSql = $"""
            SELECT {StatusCaseSql} AS Status
            FROM tblProductSales ps
            WHERE ps.lProductSaleKey = @key
            """;
        await using var checkCmd = new SqlCommand(checkSql, conn, txn);
        checkCmd.CommandTimeout = 30;
        checkCmd.Parameters.AddWithValue("@key", key);
        var status = (await checkCmd.ExecuteScalarAsync())?.ToString();
        if (status != "Approved")
            return BadRequest(new { message = $"Order must be Approved to invoice. Current status: {status}" });

        // Check for shipped items
        await using var shippedCmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Shipped'", conn, txn);
        shippedCmd.CommandTimeout = 30;
        shippedCmd.Parameters.AddWithValue("@key", key);
        var shippedCount = Convert.ToInt32(await shippedCmd.ExecuteScalarAsync());
        if (shippedCount == 0)
            return BadRequest(new { message = "No items marked as Shipped. Mark items as Shipped before invoicing." });

        // 2. Generate invoice number from tblInvoiceNumbersDaily
        var today = DateTime.Today;
        var yearDay = today.ToString("yyMMdd");

        await using var numCmd = new SqlCommand("""
            MERGE tblInvoiceNumbersDaily AS target
            USING (SELECT @yearDay AS sYearDay, 'PS' AS sInvoiceType) AS source
            ON target.sYearDay = source.sYearDay AND target.sInvoiceType = source.sInvoiceType
            WHEN MATCHED THEN
                UPDATE SET lNextInvoiceNumber = target.lNextInvoiceNumber + 1
            WHEN NOT MATCHED THEN
                INSERT (sYearDay, sInvoiceType, lNextInvoiceNumber) VALUES (@yearDay, 'PS', 2)
            OUTPUT CASE WHEN $action = 'UPDATE' THEN INSERTED.lNextInvoiceNumber - 1 ELSE 1 END;
            """, conn, txn);
        numCmd.CommandTimeout = 30;
        numCmd.Parameters.AddWithValue("@yearDay", yearDay);
        var seqNum = Convert.ToInt32(await numCmd.ExecuteScalarAsync());
        var invoiceNumber = $"PS{yearDay}-{seqNum:D3}";

        // 3. Snapshot shipped items into tblProductSaleInvoiceDetail
        await using var snapCmd = new SqlCommand("""
            INSERT INTO tblProductSaleInvoiceDetail
                (lProductSalesKey, lProductSaleInventoryKey, lInventoryKey, lInventorySizeKey,
                 sItemDescription, sSizeDescription, sSizeDescription2, sSizeDescription3,
                 sSubDescription, lQty, nUnitCost, nTotalCost, sLotNumber)
            SELECT
                psi.lProductSaleKey, psi.lProductSaleInventoryKey,
                isz.lInventoryKey, psi.lInventorySizeKey,
                ISNULL(i.sItemDescription, ''), ISNULL(isz.sSizeDescription, ''),
                isz.sSizeDescription2, isz.sSizeDescription3,
                i.sSubDescription,
                psi.lQuantity, psi.nUnitCost, psi.nTotalCost, psi.sLotNumber
            FROM tblProductSalesInventory psi
            LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = psi.lInventorySizeKey
            LEFT JOIN tblInventory i ON i.lInventoryKey = isz.lInventoryKey
            WHERE psi.lProductSaleKey = @key AND psi.sItemStatus = 'Shipped'
            """, conn, txn);
        snapCmd.CommandTimeout = 30;
        snapCmd.Parameters.AddWithValue("@key", key);
        await snapCmd.ExecuteNonQueryAsync();

        // 4. Stamp the current order as invoiced
        await using var stampCmd = new SqlCommand("""
            UPDATE tblProductSales
            SET dtInvoiceDate = GETDATE(),
                sInvoiceNumber = @invoiceNumber,
                nQuoteAmount = ISNULL((SELECT SUM(nTotalCost) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Shipped'), 0),
                nTotalAmount = ISNULL((SELECT SUM(nTotalCost) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Shipped'), 0)
                             + ISNULL(nShippingAmount, 0)
                             + ISNULL(nTaxAmount, 0)
            WHERE lProductSaleKey = @key
            """, conn, txn);
        stampCmd.CommandTimeout = 30;
        stampCmd.Parameters.AddWithValue("@key", key);
        stampCmd.Parameters.AddWithValue("@invoiceNumber", invoiceNumber);
        await stampCmd.ExecuteNonQueryAsync();

        // 5. Check for backordered items
        await using var boCmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Backordered'", conn, txn);
        boCmd.CommandTimeout = 30;
        boCmd.Parameters.AddWithValue("@key", key);
        var boCount = Convert.ToInt32(await boCmd.ExecuteScalarAsync());

        int? childKey = null;
        var childItemCount = 0;

        if (boCount > 0)
        {
            // 5a. Create child order copying parent fields
            await using var childCmd = new SqlCommand("""
                INSERT INTO tblProductSales
                    (lClientKey, lDepartmentKey, lSalesRepKey, dtOrderDate, dtApprovalDate,
                     sPurchaseOrder, sNote, lInventoryPricingListKey,
                     lContactKey, sContactName, sContactEmailAddress, sClientPhoneNumber,
                     sShipName1, sShipName2, sAddressLine1, sAddressLine2, sCity, sState, sZipCode, sShipCountry,
                     sBillName1, sBillName2, sBillAddressLine1, sBillAddressLine2, sBillCity, sBillState, sBillZipCode, sBillCountry,
                     lBillType, sBillEmail, sBillEmailName,
                     nQuoteAmount, nShippingAmount, nTaxAmount, nTotalAmount,
                     lParentProductSaleKey, sInvoiceNumber)
                OUTPUT INSERTED.lProductSaleKey
                SELECT
                    lClientKey, lDepartmentKey, lSalesRepKey, GETDATE(), GETDATE(),
                    sPurchaseOrder, CONCAT('Split from order ', sInvoiceNumber, ' — backordered items'), lInventoryPricingListKey,
                    lContactKey, sContactName, sContactEmailAddress, sClientPhoneNumber,
                    sShipName1, sShipName2, sAddressLine1, sAddressLine2, sCity, sState, sZipCode, sShipCountry,
                    sBillName1, sBillName2, sBillAddressLine1, sBillAddressLine2, sBillCity, sBillState, sBillZipCode, sBillCountry,
                    lBillType, sBillEmail, sBillEmailName,
                    0, 0, 0, 0,
                    @key, ''
                FROM tblProductSales
                WHERE lProductSaleKey = @key
                """, conn, txn);
            childCmd.CommandTimeout = 30;
            childCmd.Parameters.AddWithValue("@key", key);
            childKey = Convert.ToInt32(await childCmd.ExecuteScalarAsync());

            // 5b. Copy backordered items to child with Pending status
            await using var copyCmd = new SqlCommand("""
                INSERT INTO tblProductSalesInventory
                    (lProductSaleKey, lInventorySizeKey, lQuantity, nUnitCost, nTotalCost, sLotNumber, sItemStatus)
                SELECT
                    @childKey, lInventorySizeKey, lQuantity, nUnitCost, nTotalCost, sLotNumber, 'Pending'
                FROM tblProductSalesInventory
                WHERE lProductSaleKey = @parentKey AND sItemStatus = 'Backordered'
                """, conn, txn);
            copyCmd.CommandTimeout = 30;
            copyCmd.Parameters.AddWithValue("@childKey", childKey.Value);
            copyCmd.Parameters.AddWithValue("@parentKey", key);
            childItemCount = await copyCmd.ExecuteNonQueryAsync();

            // 5c. Recalc child totals
            await RecalcTotals(conn, childKey.Value, txn);

            // 6. Remove backordered items from parent
            await using var delCmd = new SqlCommand(
                "DELETE FROM tblProductSalesInventory WHERE lProductSaleKey = @key AND sItemStatus = 'Backordered'", conn, txn);
            delCmd.CommandTimeout = 30;
            delCmd.Parameters.AddWithValue("@key", key);
            await delCmd.ExecuteNonQueryAsync();
        }

        await txn.CommitAsync();

        return Ok(new InvoiceResponse(
            InvoiceNumber: invoiceNumber,
            InvoiceDate: today.ToString("yyyy-MM-dd"),
            ChildOrderKey: childKey,
            ChildOrderItemCount: childItemCount
        ));
    }
    catch
    {
        await txn.RollbackAsync();
        throw;
    }
}
```

- [ ] **Step 3: Build and verify**

```bash
cd server && dotnet build 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Controllers/ProductSalesController.cs server/TSI.Api/Models/ProductSale.cs
git commit -m "feat(api): rewrite invoice endpoint with split order logic for partial fulfillment"
```

---

### Task 6: Frontend — Update types and API client

**Files:**
- Modify: `client/src/pages/product-sale/types.ts`
- Modify: `client/src/api/product-sales.ts`

- [ ] **Step 1: Add `itemStatus` to `ProductSaleLineItem`**

In `client/src/pages/product-sale/types.ts`, add `itemStatus` to the `ProductSaleLineItem` interface:

```typescript
export interface ProductSaleLineItem {
  productSaleInventoryKey: number;
  inventorySizeKey: number | null;
  itemDescription: string;
  sizeDescription: string;
  sizeDescription2: string | null;
  sizeDescription3: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber: string | null;
  itemStatus: string;
}
```

- [ ] **Step 2: Add `parentProductSaleKey` to `ProductSaleDetail` and `ProductSaleListItem`**

In the same file, add to `ProductSaleDetail` before `lineItems`:

```typescript
  // parent reference
  parentProductSaleKey: number | null;
  parentInvoiceNumber: string | null;
  // line items
  lineItems: ProductSaleLineItem[];
```

And add to `ProductSaleListItem`:

```typescript
export interface ProductSaleListItem {
  productSaleKey: number;
  invoiceNumber: string;
  clientName: string;
  departmentName: string;
  status: string;
  source: string;
  salesRep: string;
  orderDate: string | null;
  total: number;
  itemCount: number;
  backorderedCount: number;
  parentProductSaleKey: number | null;
}
```

- [ ] **Step 3: Add new types for related orders and invoice response**

Add at the bottom of `types.ts`:

```typescript
/* ── Related Orders ─────────────────────────────────────────────────────── */

export interface RelatedOrderItem {
  productSaleKey: number;
  invoiceNumber: string;
  status: string;
  itemCount: number;
}

export interface RelatedOrdersResponse {
  parent: RelatedOrderItem | null;
  children: RelatedOrderItem[];
}

/* ── Invoice Response ───────────────────────────────────────────────────── */

export interface InvoiceResponse {
  invoiceNumber: string;
  invoiceDate: string;
  childOrderKey: number | null;
  childOrderItemCount: number;
}
```

- [ ] **Step 4: Update the API client**

In `client/src/api/product-sales.ts`, update the import to include new types:

```typescript
import type {
  ProductSaleListResponse,
  ProductSaleDetail,
  ProductSaleStats,
  InventoryCategory,
  InventorySize,
  RelatedOrdersResponse,
  InvoiceResponse,
} from '../pages/product-sale/types';
```

Add the new API functions. Replace the existing `invoiceOrder` function and add two new ones:

```typescript
export const invoiceOrder = (key: number) =>
  apiClient
    .post<InvoiceResponse>(`/product-sales/${key}/invoice`)
    .then((r) => r.data);

export const bulkUpdateItemStatus = (
  key: number,
  body: { itemKeys: number[]; status: string },
) =>
  apiClient
    .post<{ updated: number }>(`/product-sales/${key}/items/bulk-status`, body)
    .then((r) => r.data);

export const getRelatedOrders = (key: number) =>
  apiClient
    .get<RelatedOrdersResponse>(`/product-sales/${key}/related`)
    .then((r) => r.data);
```

- [ ] **Step 5: Check for TypeScript errors**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors in `ProductSaleDrawer.tsx` only (because it reads `itemStatus` via cast — we'll fix in Task 7).

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/product-sale/types.ts client/src/api/product-sales.ts
git commit -m "feat(ui): update types and API client for split order invoicing"
```

---

### Task 7: Frontend — Wire real handlers in ProductSaleDrawer

**Files:**
- Modify: `client/src/pages/product-sale/ProductSaleDrawer.tsx`
- Modify: `client/src/pages/product-sale/ProductSaleDrawer.css`

- [ ] **Step 1: Update imports**

In `ProductSaleDrawer.tsx`, update the API imports to include the new functions:

```typescript
import {
  getProductSaleDetail,
  addLineItem,
  removeLineItem,
  updateLineItem,
  generateQuote,
  approveOrder,
  invoiceOrder,
  bulkUpdateItemStatus,
  getRelatedOrders,
  getInventoryCategories,
  getInventorySizes,
} from '../../api/product-sales';
```

Add the new type import:

```typescript
import type { ProductSaleDetail, ProductSaleLineItem, RelatedOrdersResponse } from './types';
```

- [ ] **Step 2: Add related orders state and loading**

After the `selectedItems` state declaration (around line 79), add:

```typescript
// Related orders
const [related, setRelated] = useState<RelatedOrdersResponse | null>(null);
```

In the `loadDetail` callback, add related orders loading after the detail loads:

```typescript
const loadDetail = useCallback(async (key: number) => {
  setLoading(true);
  try {
    const d = await getProductSaleDetail(key);
    setDetail(d);
    // Load related orders
    getRelatedOrders(key)
      .then(setRelated)
      .catch(() => setRelated(null));
  } catch {
    message.error('Failed to load product sale detail');
  } finally {
    setLoading(false);
  }
}, []);
```

- [ ] **Step 3: Add bulk status handler**

After the `handleQtyChange` function, add:

```typescript
const handleBulkStatus = async (newStatus: string) => {
  if (!productSaleKey || selectedItems.length === 0) return;
  try {
    await bulkUpdateItemStatus(productSaleKey, { itemKeys: selectedItems, status: newStatus });
    message.success(`${selectedItems.length} item(s) marked as ${newStatus}`);
    setSelectedItems([]);
    loadDetail(productSaleKey);
    onUpdated();
  } catch {
    message.error(`Failed to mark items as ${newStatus}`);
  }
};
```

- [ ] **Step 4: Update the `handleAdvance` function for the new invoice flow**

Replace the `handleAdvance` function with:

```typescript
const handleAdvance = async () => {
  if (!productSaleKey || !detail) return;
  setAdvancing(true);
  const s = detail.status.toLowerCase();
  try {
    if (s === 'draft') {
      await generateQuote(productSaleKey);
      message.success('Quote generated');
    } else if (s === 'quoted' || s === 'quote sent') {
      await approveOrder(productSaleKey);
      message.success('Order approved');
    } else if (s === 'approved') {
      const result = await invoiceOrder(productSaleKey);
      let msg = `Invoice ${result.invoiceNumber} created`;
      if (result.childOrderKey) {
        msg += `. ${result.childOrderItemCount} backordered item(s) moved to new order.`;
      }
      message.success(msg);
    }
    loadDetail(productSaleKey);
    onUpdated();
  } catch {
    message.error('Failed to advance status');
  } finally {
    setAdvancing(false);
  }
};
```

- [ ] **Step 5: Update the advance button label for Approved status**

Replace the `getAdvanceLabel` function:

```typescript
function getAdvanceLabel(status: string, hasShippedItems: boolean): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'draft') return 'Generate Quote →';
  if (s === 'quoted' || s === 'quote sent') return 'Mark Approved →';
  if (s === 'approved') return hasShippedItems ? 'Invoice Shipped Items →' : 'Create Invoice →';
  return 'Advance →';
}
```

- [ ] **Step 6: Replace the fulfillment bar — remove DevNotice wrappers and wire real handlers**

Find the fulfillment actions section (around line 352-375) and replace it:

```typescript
{/* Fulfillment actions */}
{selectedItems.length > 0 && detail.status.toLowerCase() === 'approved' && (
  <div className="ps-fulfill-bar">
    <span className="ps-fulfill-bar__count">{selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected</span>
    <button
      className="ps-fulfill-btn ps-fulfill-btn--ship"
      type="button"
      onClick={() => handleBulkStatus('Shipped')}
    >
      Mark Shipped
    </button>
    <button
      className="ps-fulfill-btn ps-fulfill-btn--backorder"
      type="button"
      onClick={() => handleBulkStatus('Backordered')}
    >
      Mark Backordered
    </button>
  </div>
)}
```

- [ ] **Step 7: Replace the invoice DevNotice with a real button**

Find the action buttons section (around line 416-451). Replace the entire `ps-actions` div:

```typescript
{/* Action buttons */}
<div className="ps-actions">
  <DevNotice
    title="Print Quote"
    requirement="Generate quote PDF from tblProductSaleQuote + tblProductSaleQuoteDetail snapshot data. Return PDF binary for download."
    sql={'POST /api/product-sales/:key/quote/print\n-- Reads from tblProductSaleQuote (header) + tblProductSaleQuoteDetail (line items)\n-- Returns application/pdf'}
  >
    <button
      className="ps-print-btn"
      disabled={!detail.quoteDate}
      type="button"
    >
      Print Quote
    </button>
  </DevNotice>
  {canAdvance(detail.status) && (
    <button
      className="ps-advance-btn"
      onClick={handleAdvance}
      disabled={advancing || (detail.status.toLowerCase() === 'approved' && !detail.lineItems.some(li => li.itemStatus === 'Shipped'))}
      type="button"
    >
      {advancing ? 'Processing...' : getAdvanceLabel(detail.status, detail.lineItems.some(li => li.itemStatus === 'Shipped'))}
    </button>
  )}
</div>
```

- [ ] **Step 8: Remove the old `itemStatus` cast**

In the line items table body, the existing code casts `li` to read `itemStatus` (line 293):

```typescript
const itemStatus = (li as ProductSaleLineItem & { itemStatus?: string }).itemStatus || 'Pending';
```

Replace with:

```typescript
const itemStatus = li.itemStatus || 'Pending';
```

- [ ] **Step 9: Add Related Orders section below the pipeline bar**

After the `PipelineBar` component (around line 268), add:

```typescript
{/* Related Orders */}
{related && (related.parent || related.children.length > 0) && (
  <div className="ps-related-orders">
    {related.parent && (
      <span className="ps-related-orders__link">
        Split from:{' '}
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            loadDetail(related.parent!.productSaleKey);
          }
          className="ps-related-orders__anchor"
        >
          {related.parent.invoiceNumber || `PS-${related.parent.productSaleKey}`}
        </a>
      </span>
    )}
    {related.children.length > 0 && (
      <span className="ps-related-orders__link">
        Related:{' '}
        {related.children.map((c, idx) => (
          <span key={c.productSaleKey}>
            {idx > 0 && ', '}
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                // Navigate to child order - re-use the drawer
                if (productSaleKey !== c.productSaleKey) {
                  loadDetail(c.productSaleKey);
                }
              }}
              className="ps-related-orders__anchor"
            >
              {c.invoiceNumber || `PS-${c.productSaleKey}`}
            </a>
            {' '}
            <StatusBadge status={c.status} />
          </span>
        ))}
      </span>
    )}
  </div>
)}
```

- [ ] **Step 10: Add CSS for related orders**

In `ProductSaleDrawer.css`, add:

```css
/* Related orders */
.ps-related-orders {
  padding: 6px 16px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}
.ps-related-orders__anchor {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}
.ps-related-orders__anchor:hover {
  text-decoration: underline;
}
```

- [ ] **Step 11: Check for TypeScript errors**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If there are unused import warnings (e.g., the old `invoiceOrder` type), remove them.

- [ ] **Step 12: Commit**

```bash
git add client/src/pages/product-sale/ProductSaleDrawer.tsx client/src/pages/product-sale/ProductSaleDrawer.css
git commit -m "feat(ui): wire split order invoicing — bulk status, invoice shipped items, related orders"
```

---

### Task 8: Push + smoke test

**Files:** None (deployment verification)

- [ ] **Step 1: Final TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 2: Final backend build**

```bash
cd server && dotnet build 2>&1 | tail -5
```

Expected: `Build succeeded.`

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

- [ ] **Step 4: Wait for deploy pipelines**

Check both deploy workflows complete:
```bash
gh run list --limit 4
```

- [ ] **Step 5: Smoke test backend**

Hit the product sales detail endpoint to verify `itemStatus` and `parentProductSaleKey` are returned:

```bash
curl -s "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/product-sales?page=1&pageSize=2" | python -m json.tool | head -30
```

Verify response includes `parentProductSaleKey` field on list items.

- [ ] **Step 6: Smoke test frontend**

Load `https://happy-plant-03638db0f.6.azurestaticapps.net`, navigate to Product Sales, click into an order, verify:
- Items tab shows Status column with Pending badges
- Selecting items shows Mark Shipped / Mark Backordered buttons (on Approved orders)
- No console errors

- [ ] **Step 7: Commit any fixes if needed**

If smoke tests reveal issues, fix and push again.
