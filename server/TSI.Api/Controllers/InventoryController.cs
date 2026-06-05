using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController(IConfiguration config, ILotNumberService lotNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetInventory(
        [FromQuery] string? search = null,
        [FromQuery] string? activeFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 200)
    {
        // Mandatory location scope. Per-size qty / min / max moved off
        // tblInventorySize onto tblInventorySizeLocationInfo (one row per
        // (size, service-location)). The list-level levels are now rolled up
        // SUM across this location's size rows so a UC user sees UC on-hand
        // totals, not the legacy global tblInventory.nLevelCurrent column.
        // See CLAUDE.md rule #5.
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("i.sItemDescription LIKE @search");
        if (activeFilter == "active")
            where.Add("ISNULL(i.bActive, 0) = 1");
        else if (activeFilter == "inactive")
            where.Add("ISNULL(i.bActive, 0) = 0");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        // Count is unchanged — item count doesn't depend on location-rolled levels.
        var countSql = $"""
            SELECT COUNT(*)
            FROM tblInventory i
            {whereClause}
            """;

        // Data rolls up per-location levels from tblInventorySizeLocationInfo.
        // LEFT JOIN both tables so items with no sizes (or no location rows) still
        // surface, with zero levels — the user sees the item card but it shows 0
        // on-hand for their location. Sum across sizes is the natural list-level
        // total; the per-size detail remains available on the cockpit view.
        var dataSql = $"""
            SELECT i.lInventoryKey,
                   ISNULL(i.sItemDescription, '') AS sItemDescription,
                   ISNULL(i.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(SUM(li.nLevelCurrent), 0) AS nLevelCurrent,
                   ISNULL(SUM(li.nLevelMinimum), 0) AS nLevelMinimum,
                   ISNULL(SUM(li.nLevelMaximum), 0) AS nLevelMaximum,
                   ISNULL(i.bActive, 0) AS bActive,
                   COUNT(DISTINCT s.lInventorySizeKey) AS SizeCount,
                   CASE WHEN ISNULL(SUM(li.nLevelMinimum), 0) > 0
                         AND ISNULL(SUM(li.nLevelCurrent), 0) <= ISNULL(SUM(li.nLevelMinimum), 0)
                        THEN 1 ELSE 0 END AS IsLowStock
            FROM tblInventory i
            LEFT JOIN tblInventorySize s
                   ON s.lInventoryKey = i.lInventoryKey
                  AND s.Deleted_datetime IS NULL
            LEFT JOIN tblInventorySizeLocationInfo li
                   ON li.lInventorySizeKey = s.lInventorySizeKey
                  AND li.lServiceLocationKey = @locationKey
                  AND li.Deleted_datetime IS NULL
            {whereClause}
            GROUP BY i.lInventoryKey, i.sItemDescription, i.sRigidOrFlexible, i.bActive
            ORDER BY i.sItemDescription
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        dataCmd.Parameters.AddWithValue("@locationKey", locationKey);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<InventoryListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new InventoryListItem(
                InventoryKey: Convert.ToInt32(reader["lInventoryKey"]),
                Description: reader["sItemDescription"]?.ToString() ?? "",
                Category: reader["sRigidOrFlexible"]?.ToString() ?? "",
                CurrentLevel: Convert.ToInt32(reader["nLevelCurrent"]),
                MinLevel: Convert.ToInt32(reader["nLevelMinimum"]),
                MaxLevel: Convert.ToInt32(reader["nLevelMaximum"]),
                IsActive: Convert.ToBoolean(reader["bActive"]),
                SizeCount: Convert.ToInt32(reader["SizeCount"]),
                IsLowStock: Convert.ToBoolean(reader["IsLowStock"])
            ));
        }

        return Ok(new InventoryListResponse(items, totalCount));
    }

    [HttpGet("{inventoryKey:int}")]
    public async Task<IActionResult> GetInventoryItem(int inventoryKey)
    {
        // Inventory exists at multiple service locations simultaneously, so
        // the per-size detail (qty / cost / bin) is scoped to the user's
        // currently-active location from the banner. Throws if the
        // X-Service-Location header is missing — see ServiceLocationExtensions.
        // Matches the cloud canonical shape (Steve's f1797dd).
        var svcKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string itemSql = """
            SELECT i.lInventoryKey,
                   ISNULL(i.sItemDescription, '') AS sItemDescription,
                   ISNULL(i.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(i.nLevelCurrent, 0) AS nLevelCurrent,
                   ISNULL(i.nLevelMinimum, 0) AS nLevelMinimum,
                   ISNULL(i.nLevelMaximum, 0) AS nLevelMaximum,
                   ISNULL(i.bActive, 0) AS bActive,
                   ISNULL(i.bNoCountAdjustment, 0) AS bNoCountAdjustment,
                   ISNULL(i.bNotUsedByRepair, 0) AS bNotUsedByRepair,
                   ISNULL(i.bAlwaysReOrder, 0) AS bAlwaysReOrder,
                   ISNULL(i.bLargeDiameter, 0) AS bLargeDiameter,
                   ISNULL(i.bSkipPickList, 0) AS bSkipPickList,
                   i.dtLastUpdate, i.dtCreateDate,
                   CASE WHEN ISNULL(i.nLevelCurrent, 0) <= ISNULL(i.nLevelMinimum, 0) THEN 1 ELSE 0 END AS IsLowStock
            FROM tblInventory i
            WHERE i.lInventoryKey = @inventoryKey
            """;

        // Per-location qty/cost/bin lives on tblInventorySizeLocationInfo. LEFT JOIN
        // with the location filter on the join condition so sizes that have no row
        // for this location still render (zeros via ISNULL), rather than disappearing.
        // Quick patch ahead of Steve's eventual canonical shape — see memory note
        // inventory-port-back-from-steve.md.
        const string sizesSql = """
            SELECT s.lInventorySizeKey,
                   ISNULL(s.sSizeDescription, '') AS sSizeDescription,
                   ISNULL(li.nLevelCurrent, 0) AS nLevelCurrent,
                   ISNULL(li.nLevelMinimum, 0) AS nLevelMinimum,
                   ISNULL(li.nLevelMaximum, 0) AS nLevelMaximum,
                   ISNULL(li.dblUnitCost, 0) AS dblUnitCost,
                   li.sBinNumber AS sBinNumber,
                   CAST(1 AS bit) AS bActive
            FROM tblInventorySize s
            LEFT JOIN tblInventorySizeLocationInfo li
                ON li.lInventorySizeKey = s.lInventorySizeKey
               AND li.lServiceLocationKey = @locationKey
               AND li.Deleted_datetime IS NULL
            WHERE s.lInventoryKey = @inventoryKey
            ORDER BY s.sSizeDescription
            """;

        await using var itemCmd = new SqlCommand(itemSql, conn);
        itemCmd.CommandTimeout = 30;
        itemCmd.Parameters.AddWithValue("@inventoryKey", inventoryKey);
        await using var itemReader = await itemCmd.ExecuteReaderAsync();

        if (!await itemReader.ReadAsync())
            return NotFound(new { message = "Inventory item not found." });

        var invKey = Convert.ToInt32(itemReader["lInventoryKey"]);
        var description = itemReader["sItemDescription"]?.ToString() ?? "";
        var category = itemReader["sRigidOrFlexible"]?.ToString() ?? "";
        var currentLevel = Convert.ToInt32(itemReader["nLevelCurrent"]);
        var minLevel = Convert.ToInt32(itemReader["nLevelMinimum"]);
        var maxLevel = Convert.ToInt32(itemReader["nLevelMaximum"]);
        var isActive = Convert.ToBoolean(itemReader["bActive"]);
        var noCountAdj = Convert.ToBoolean(itemReader["bNoCountAdjustment"]);
        var notUsedByRepair = Convert.ToBoolean(itemReader["bNotUsedByRepair"]);
        var alwaysReOrder = Convert.ToBoolean(itemReader["bAlwaysReOrder"]);
        var largeDiameter = Convert.ToBoolean(itemReader["bLargeDiameter"]);
        var skipPickList = Convert.ToBoolean(itemReader["bSkipPickList"]);
        var lastUpdate = itemReader["dtLastUpdate"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(itemReader["dtLastUpdate"]);
        var createDate = itemReader["dtCreateDate"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(itemReader["dtCreateDate"]);
        var isLowStock = Convert.ToBoolean(itemReader["IsLowStock"]);

        await itemReader.CloseAsync();

        await using var sizesCmd = new SqlCommand(sizesSql, conn);
        sizesCmd.CommandTimeout = 30;
        sizesCmd.Parameters.AddWithValue("@inventoryKey", inventoryKey);
        sizesCmd.Parameters.AddWithValue("@locationKey", svcKey);
        await using var sizesReader = await sizesCmd.ExecuteReaderAsync();

        var sizes = new List<InventorySizeItem>();
        while (await sizesReader.ReadAsync())
        {
            sizes.Add(new InventorySizeItem(
                SizeKey: Convert.ToInt32(sizesReader["lInventorySizeKey"]),
                SizeDescription: sizesReader["sSizeDescription"]?.ToString() ?? "",
                CurrentLevel: Convert.ToInt32(sizesReader["nLevelCurrent"]),
                MinLevel: Convert.ToInt32(sizesReader["nLevelMinimum"]),
                MaxLevel: Convert.ToInt32(sizesReader["nLevelMaximum"]),
                UnitCost: Convert.ToDouble(sizesReader["dblUnitCost"]),
                BinNumber: sizesReader["sBinNumber"]?.ToString(),
                IsActive: Convert.ToBoolean(sizesReader["bActive"])
            ));
        }

        return Ok(new InventoryDetail(
            InventoryKey: invKey,
            Description: description,
            Category: category,
            CurrentLevel: currentLevel,
            MinLevel: minLevel,
            MaxLevel: maxLevel,
            IsActive: isActive,
            IsLowStock: isLowStock,
            NoCountAdjustment: noCountAdj,
            NotUsedByRepair: notUsedByRepair,
            AlwaysReOrder: alwaysReOrder,
            LargeDiameter: largeDiameter,
            SkipPickList: skipPickList,
            LastUpdate: lastUpdate,
            CreateDate: createDate,
            Sizes: sizes
        ));
    }

    [HttpGet("{inventoryKey:int}/purchase-orders")]
    public async Task<IActionResult> GetPurchaseOrders(int inventoryKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT po.lSupplierPOKey,
                   ISNULL(po.sSupplierPONumber, '') AS sSupplierPONumber,
                   ISNULL(s.sSupplierName1, '') AS sSupplierName1,
                   po.dtDateOfPO,
                   ISNULL(po.dblPOTotal, 0) AS dblPOTotal,
                   ISNULL(po.bCancelled, 0) AS bCancelled,
                   COUNT(pot.lSupplierPOTranKey) AS LineCount,
                   ISNULL(SUM(pot.nOrderQuantity), 0) AS OrderedQty,
                   ISNULL(SUM(pot.nReceivedQuantity), 0) AS ReceivedQty
            FROM tblSupplierPO po
            INNER JOIN tblSupplierPOTran pot ON pot.lSupplierPOKey = po.lSupplierPOKey
            INNER JOIN tblSupplierSizes ss ON ss.lSupplierSizesKey = pot.lSupplierSizesKey
            INNER JOIN tblInventorySize isz ON isz.lInventorySizeKey = ss.lInventorySizeKey
            LEFT JOIN tblSupplier s ON s.lSupplierKey = po.lSupplierKey
            WHERE isz.lInventoryKey = @inventoryKey
            GROUP BY po.lSupplierPOKey, po.sSupplierPONumber, s.sSupplierName1, po.dtDateOfPO, po.dblPOTotal, po.bCancelled
            ORDER BY po.dtDateOfPO DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@inventoryKey", inventoryKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<InventoryPurchaseOrder>();
        while (await reader.ReadAsync())
        {
            items.Add(new InventoryPurchaseOrder(
                SupplierPOKey: Convert.ToInt32(reader["lSupplierPOKey"]),
                PONumber: reader["sSupplierPONumber"]?.ToString() ?? "",
                SupplierName: reader["sSupplierName1"]?.ToString() ?? "",
                PODate: reader["dtDateOfPO"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateOfPO"]).ToString("MM/dd/yyyy"),
                POTotal: reader["dblPOTotal"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblPOTotal"]),
                Cancelled: reader["bCancelled"] != DBNull.Value && Convert.ToBoolean(reader["bCancelled"]),
                LineCount: Convert.ToInt32(reader["LineCount"]),
                OrderedQty: Convert.ToInt32(reader["OrderedQty"]),
                ReceivedQty: Convert.ToInt32(reader["ReceivedQty"])
            ));
        }
        return Ok(items);
    }

    [HttpGet("{inventoryKey:int}/suppliers")]
    public async Task<IActionResult> GetSuppliers(int inventoryKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT ss.lSupplierSizesKey, ss.lSupplierKey,
                   ISNULL(s.sSupplierName1, '') AS sSupplierName1,
                   ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                   ISNULL(ss.sSupplierPartNo, '') AS sSupplierPartNo,
                   ISNULL(ss.dblUnitCost, 0) AS dblUnitCost,
                   ISNULL(ss.nOrderMinimum, 0) AS nOrderMinimum,
                   ISNULL(ss.bActive, 0) AS bActive
            FROM tblSupplierSizes ss
            INNER JOIN tblInventorySize isz ON isz.lInventorySizeKey = ss.lInventorySizeKey
            LEFT JOIN tblSupplier s ON s.lSupplierKey = ss.lSupplierKey
            WHERE isz.lInventoryKey = @inventoryKey
            ORDER BY s.sSupplierName1, isz.sSizeDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@inventoryKey", inventoryKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<InventorySupplierItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new InventorySupplierItem(
                SupplierSizesKey: Convert.ToInt32(reader["lSupplierSizesKey"]),
                SupplierKey: Convert.ToInt32(reader["lSupplierKey"]),
                SupplierName: reader["sSupplierName1"]?.ToString() ?? "",
                SizeDescription: reader["sSizeDescription"]?.ToString() ?? "",
                PartNumber: reader["sSupplierPartNo"]?.ToString() ?? "",
                UnitCost: Convert.ToDouble(reader["dblUnitCost"]),
                OrderMinimum: Convert.ToInt32(reader["nOrderMinimum"]),
                IsActive: reader["bActive"] != DBNull.Value && Convert.ToBoolean(reader["bActive"])
            ));
        }
        return Ok(items);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        // Mandatory location scope. LowStockCount is per-location (items
        // below their UC min are different from items below their Nashville
        // min). Total/Active/Inactive remain org-level — those reflect
        // catalog membership, not per-location presence. See CLAUDE.md rule #5.
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Catalog-level counts from tblInventory.bActive.
        const string catalogSql = """
            SELECT
                COUNT(*) AS TotalCount,
                SUM(CASE WHEN ISNULL(bActive, 0) = 1 THEN 1 ELSE 0 END) AS ActiveCount,
                SUM(CASE WHEN ISNULL(bActive, 0) = 0 THEN 1 ELSE 0 END) AS InactiveCount
            FROM tblInventory
            """;

        await using var catalogCmd = new SqlCommand(catalogSql, conn);
        catalogCmd.CommandTimeout = 30;
        await using var catalogReader = await catalogCmd.ExecuteReaderAsync();
        await catalogReader.ReadAsync();
        var totalCount = Convert.ToInt32(catalogReader["TotalCount"]);
        var activeCount = Convert.ToInt32(catalogReader["ActiveCount"]);
        var inactiveCount = Convert.ToInt32(catalogReader["InactiveCount"]);
        await catalogReader.CloseAsync();

        // LowStock: per-location rollup from tblInventorySizeLocationInfo.
        // Item is low if SUM(currentLevel) <= SUM(minLevel) AND there's a
        // non-zero min set somewhere (items with no reorder threshold at
        // this location don't count as "low").
        const string lowStockSql = """
            SELECT COUNT(*) AS LowStockCount
            FROM tblInventory i
            JOIN tblInventorySize s ON s.lInventoryKey = i.lInventoryKey AND s.Deleted_datetime IS NULL
            LEFT JOIN tblInventorySizeLocationInfo li
                   ON li.lInventorySizeKey = s.lInventorySizeKey
                  AND li.lServiceLocationKey = @locationKey
                  AND li.Deleted_datetime IS NULL
            WHERE ISNULL(i.bActive, 0) = 1
            GROUP BY i.lInventoryKey
            HAVING ISNULL(SUM(li.nLevelMinimum), 0) > 0
               AND ISNULL(SUM(li.nLevelCurrent), 0) <= ISNULL(SUM(li.nLevelMinimum), 0)
            """;

        await using var lowCmd = new SqlCommand(lowStockSql, conn);
        lowCmd.CommandTimeout = 30;
        lowCmd.Parameters.AddWithValue("@locationKey", locationKey);
        var lowStockCount = 0;
        await using var lowReader = await lowCmd.ExecuteReaderAsync();
        while (await lowReader.ReadAsync()) lowStockCount++;

        return Ok(new InventoryStats(
            TotalCount: totalCount,
            ActiveCount: activeCount,
            InactiveCount: inactiveCount,
            LowStockCount: lowStockCount
        ));
    }

    // ── Receiving ─────────────────────────────────────────────────────────────

    [HttpGet("pending-receipt")]
    public async Task<IActionResult> GetPendingReceipt()
    {
        // Mandatory location scope. Pending receipt is a per-location concept:
        // "sizes below minimum AT MY LOCATION" — UC's reorder thresholds aren't
        // Nashville's, and a Nashville size below its min isn't UC's problem.
        // The per-size qty / min / max now live on tblInventorySizeLocationInfo;
        // the read here filters by the user's active location. See CLAUDE.md rule #5.
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Return inventory sizes at or below their per-location minimum
        // (candidates for receiving at this location). bActive is no longer on
        // either tblInventorySize or tblInventorySizeLocationInfo on the new
        // schema — soft-delete on the size IS the active filter, so the
        // Deleted_datetime predicates cover it.
        const string sql = """
            SELECT s.lInventorySizeKey, i.lInventoryKey,
                   ISNULL(i.sItemDescription, '') AS sItemDescription,
                   ISNULL(s.sSizeDescription, '') AS sSizeDescription,
                   ISNULL(li.nLevelCurrent, 0) AS nLevelCurrent,
                   ISNULL(li.nLevelMinimum, 0) AS nLevelMinimum,
                   ISNULL(li.nLevelMaximum, 0) AS nLevelMaximum,
                   li.sBinNumber
            FROM tblInventorySize s
            INNER JOIN tblInventory i ON i.lInventoryKey = s.lInventoryKey
            INNER JOIN tblInventorySizeLocationInfo li
                    ON li.lInventorySizeKey = s.lInventorySizeKey
                   AND li.lServiceLocationKey = @locationKey
                   AND li.Deleted_datetime IS NULL
            WHERE s.Deleted_datetime IS NULL
              AND ISNULL(li.nLevelCurrent, 0) <= ISNULL(li.nLevelMinimum, 0)
              AND ISNULL(li.nLevelMinimum, 0) > 0
            ORDER BY i.sItemDescription, s.sSizeDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@locationKey", locationKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<InventoryReceivingItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new InventoryReceivingItem(
                InventorySizeKey: Convert.ToInt32(reader["lInventorySizeKey"]),
                InventoryKey: Convert.ToInt32(reader["lInventoryKey"]),
                Description: reader["sItemDescription"]?.ToString() ?? "",
                SizeDescription: reader["sSizeDescription"]?.ToString() ?? "",
                CurrentLevel: Convert.ToInt32(reader["nLevelCurrent"]),
                MinLevel: Convert.ToInt32(reader["nLevelMinimum"]),
                MaxLevel: Convert.ToInt32(reader["nLevelMaximum"]),
                BinNumber: reader["sBinNumber"]?.ToString()
            ));
        }

        return Ok(items);
    }

    [HttpPost("receive")]
    public async Task<IActionResult> ReceiveInventory([FromBody] ReceiveInventoryRequest req)
    {
        if (req.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than zero." });

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Insert a tblInventoryTran record (positive quantity = receipt)
        const string tranSql = """
            INSERT INTO tblInventoryTran
                (lInventorySizeKey, nTranQuantity, dtTranDate, sLotNumber, sBinNumber,
                 sTranDescription, sPostedToCurrent, dtCreateDate)
            VALUES
                (@sizeKey, @qty, GETDATE(), @lotNumber, @binNumber,
                 @notes, 'Y', GETDATE());
            """;

        // Update current level on tblInventorySize
        const string updateSql = """
            UPDATE tblInventorySize
            SET nLevelCurrent = ISNULL(nLevelCurrent, 0) + @qty,
                sBinNumber = CASE WHEN @binNumber IS NOT NULL THEN @binNumber ELSE sBinNumber END,
                dtLastUpdate = GETDATE()
            WHERE lInventorySizeKey = @sizeKey
            """;

        // Wrap the tran INSERT and level UPDATE atomically so a crash between
        // the two statements cannot leave inventory counts out of sync
        await using var transaction = (SqlTransaction)await conn.BeginTransactionAsync();

        try
        {
            await using var tranCmd = new SqlCommand(tranSql, conn, transaction);
            tranCmd.CommandTimeout = 30;
            tranCmd.Parameters.AddWithValue("@sizeKey", req.InventorySizeKey);
            tranCmd.Parameters.AddWithValue("@qty", req.Quantity);
            tranCmd.Parameters.AddWithValue("@lotNumber", (object?)req.LotNumber ?? DBNull.Value);
            tranCmd.Parameters.AddWithValue("@binNumber", (object?)req.BinNumber ?? DBNull.Value);
            tranCmd.Parameters.AddWithValue("@notes", (object?)req.Notes ?? (object)"Stock Receipt");
            await tranCmd.ExecuteNonQueryAsync();

            await using var updateCmd = new SqlCommand(updateSql, conn, transaction);
            updateCmd.CommandTimeout = 30;
            updateCmd.Parameters.AddWithValue("@qty", req.Quantity);
            updateCmd.Parameters.AddWithValue("@binNumber", (object?)req.BinNumber ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("@sizeKey", req.InventorySizeKey);
            await updateCmd.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            return Ok(new { received = true });
        }
        catch (SqlException ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    // ── Receiving against a purchase order ──────────────────────────────────────

    /// <summary>
    /// GET /api/inventory/po-receipts — open PO lines awaiting receipt
    /// (ordered &gt; received, PO not cancelled), scoped to the active service
    /// location (plus legacy location-less POs). This is the receiving work
    /// queue that backs the "receive against PO" screen.
    /// </summary>
    [HttpGet("po-receipts")]
    public async Task<IActionResult> GetOpenPurchaseOrderReceipts()
    {
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT pot.lSupplierPOTranKey, pot.lSupplierPOKey,
                   ISNULL(po.sSupplierPONumber, '') AS sSupplierPONumber,
                   ISNULL(s.sSupplierName1, '') AS sSupplierName1,
                   ISNULL(inv.sItemDescription, '') AS sItemDescription,
                   ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                   isz.lInventorySizeKey,
                   ISNULL(pot.nOrderQuantity, 0) AS nOrderQuantity,
                   ISNULL(pot.nReceivedQuantity, 0) AS nReceivedQuantity,
                   ISNULL(pot.dblUnitCost, 0) AS dblUnitCost,
                   ISNULL(ss.nQtyPerUnit, 1) AS nQtyPerUnit,
                   po.dtDateOfPO
            FROM tblSupplierPOTran pot
            INNER JOIN tblSupplierPO po ON po.lSupplierPOKey = pot.lSupplierPOKey AND po.Deleted_datetime IS NULL
            INNER JOIN tblSupplierSizes ss ON ss.lSupplierSizesKey = pot.lSupplierSizesKey
            INNER JOIN tblInventorySize isz ON isz.lInventorySizeKey = ss.lInventorySizeKey
            INNER JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
            LEFT JOIN tblSupplier s ON s.lSupplierKey = po.lSupplierKey
            WHERE pot.Deleted_datetime IS NULL
              AND ISNULL(po.bCancelled, 0) = 0
              AND ISNULL(pot.nOrderQuantity, 0) > ISNULL(pot.nReceivedQuantity, 0)
              AND (po.lServiceLocationKey = @locationKey OR ISNULL(po.lServiceLocationKey, 0) = 0)
            ORDER BY po.dtDateOfPO DESC, po.sSupplierPONumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@locationKey", locationKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<PoReceiptLine>();
        while (await reader.ReadAsync())
        {
            var ordered = Convert.ToInt32(reader["nOrderQuantity"]);
            var received = Convert.ToInt32(reader["nReceivedQuantity"]);
            items.Add(new PoReceiptLine(
                SupplierPOTranKey: Convert.ToInt32(reader["lSupplierPOTranKey"]),
                SupplierPOKey: Convert.ToInt32(reader["lSupplierPOKey"]),
                PONumber: reader["sSupplierPONumber"]?.ToString() ?? "",
                SupplierName: reader["sSupplierName1"]?.ToString() ?? "",
                ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
                SizeDescription: reader["sSizeDescription"]?.ToString() ?? "",
                InventorySizeKey: Convert.ToInt32(reader["lInventorySizeKey"]),
                OrderedQuantity: ordered,
                ReceivedQuantity: received,
                RemainingQuantity: ordered - received,
                UnitCost: Convert.ToDouble(reader["dblUnitCost"]),
                QtyPerUnit: Convert.ToInt32(reader["nQtyPerUnit"]),
                PODate: reader["dtDateOfPO"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateOfPO"]).ToString("MM/dd/yyyy")
            ));
        }

        return Ok(items);
    }

    /// <summary>
    /// POST /api/inventory/po-receipts/receive — receive stock against one PO
    /// line. In a single transaction: allocate (or accept an override) lot
    /// number, write the receipt to tblInventoryTran (linked to the PO line and
    /// stamped with the location), bump the PO line's received-to-date, and bump
    /// on-hand at the PO's service location (tblInventorySizeLocationInfo —
    /// upserting the (size, location) row if this location hasn't stocked the
    /// size before). This is the legacy WSSupplierPOReceipt flow.
    /// </summary>
    [HttpPost("po-receipts/receive")]
    public async Task<IActionResult> ReceivePurchaseOrderLine([FromBody] ReceivePoLineRequest req)
    {
        if (req is null)
            return BadRequest(new { message = "Request body is required." });
        if (req.SupplierPOTranKey <= 0)
            return BadRequest(new { message = "SupplierPOTranKey is required." });
        if (req.QuantityReceived <= 0)
            return BadRequest(new { message = "QuantityReceived must be greater than zero." });

        var activeLocation = this.GetActiveServiceLocation();
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            // Lock + fetch the PO line and its context so a concurrent receipt of
            // the same line can't race the received-qty update.
            const string lineSql = """
                SELECT pot.lSupplierSizesKey,
                       ISNULL(pot.nReceivedQuantity, 0) AS nReceivedQuantity,
                       ss.lInventorySizeKey, ISNULL(ss.nQtyPerUnit, 1) AS nQtyPerUnit,
                       ISNULL(po.lServiceLocationKey, 0) AS lServiceLocationKey,
                       ISNULL(po.sSupplierPONumber, '') AS sSupplierPONumber,
                       ISNULL(po.bCancelled, 0) AS bCancelled
                FROM tblSupplierPOTran pot WITH (UPDLOCK, HOLDLOCK)
                INNER JOIN tblSupplierPO po ON po.lSupplierPOKey = pot.lSupplierPOKey
                INNER JOIN tblSupplierSizes ss ON ss.lSupplierSizesKey = pot.lSupplierSizesKey
                WHERE pot.lSupplierPOTranKey = @poTranKey AND pot.Deleted_datetime IS NULL
                """;

            int sizeKey, qtyPerUnit, receivedSoFar, poLocation;
            string poNumber;
            bool cancelled;
            await using (var lineCmd = new SqlCommand(lineSql, conn, txn))
            {
                lineCmd.Parameters.AddWithValue("@poTranKey", req.SupplierPOTranKey);
                await using var r = await lineCmd.ExecuteReaderAsync();
                if (!await r.ReadAsync())
                {
                    await txn.RollbackAsync();
                    return NotFound(new { message = $"PO line {req.SupplierPOTranKey} not found." });
                }
                sizeKey = Convert.ToInt32(r["lInventorySizeKey"]);
                qtyPerUnit = Convert.ToInt32(r["nQtyPerUnit"]);
                receivedSoFar = Convert.ToInt32(r["nReceivedQuantity"]);
                poLocation = Convert.ToInt32(r["lServiceLocationKey"]);
                poNumber = r["sSupplierPONumber"]?.ToString() ?? "";
                cancelled = Convert.ToBoolean(r["bCancelled"]);
            }

            if (cancelled)
            {
                await txn.RollbackAsync();
                return BadRequest(new { message = "Cannot receive against a cancelled PO." });
            }

            // Receipt belongs to the PO's location; fall back to the caller's
            // active banner location for legacy location-less POs.
            var locationKey = poLocation > 0 ? poLocation : activeLocation;

            // Lot number: caller override (used verbatim) or server-allocated.
            var autoAllocated = string.IsNullOrWhiteSpace(req.LotNumberOverride);
            var lotNumber = autoAllocated
                ? await lotNumbers.NextAsync(conn, txn, userKey)
                : req.LotNumberOverride!.Trim();

            var description = $"Received - PO# {poNumber}";
            if (description.Length > 40) description = description[..40];

            const string tranSql = """
                INSERT INTO tblInventoryTran
                    (lInventorySizeKey, lRepairKey, lSupplierPOTranKey, nTranQuantity,
                     dtTranDate, sLotNumber, sPostedToCurrent, sTranDescription,
                     dtExpDate, sBinNumber, sStorageLocation, lUserKey, nQtyPerUnit,
                     lServiceLocationKey, lSessionID, dtCreateDate,
                     Created_UserKey, Created_datetime)
                VALUES
                    (@size, 0, @poTranKey, @qty,
                     GETDATE(), @lot, 'Y', @desc,
                     @exp, @bin, @storage, @user, @qpu,
                     @loc, 0, GETDATE(),
                     @user, GETDATE());
                """;
            await using (var tranCmd = new SqlCommand(tranSql, conn, txn))
            {
                tranCmd.Parameters.AddWithValue("@size", sizeKey);
                tranCmd.Parameters.AddWithValue("@poTranKey", req.SupplierPOTranKey);
                tranCmd.Parameters.AddWithValue("@qty", req.QuantityReceived);
                tranCmd.Parameters.AddWithValue("@lot", lotNumber);
                tranCmd.Parameters.AddWithValue("@desc", description);
                tranCmd.Parameters.AddWithValue("@exp", (object?)req.ExpirationDate ?? DBNull.Value);
                tranCmd.Parameters.AddWithValue("@bin", (object?)req.BinNumber ?? DBNull.Value);
                tranCmd.Parameters.AddWithValue("@storage", (object?)req.StorageLocation ?? DBNull.Value);
                tranCmd.Parameters.AddWithValue("@user", userKey);
                tranCmd.Parameters.AddWithValue("@qpu", qtyPerUnit);
                tranCmd.Parameters.AddWithValue("@loc", locationKey);
                await tranCmd.ExecuteNonQueryAsync();
            }

            // The lot is now permanently on the ledger row, so release the
            // transient reservation the allocator took in tblLotNumberLock
            // (keeps that table from growing one row per receipt). Only
            // auto-allocated lots have a reservation.
            if (autoAllocated)
            {
                await using var unclaim = new SqlCommand(
                    "DELETE FROM tblLotNumberLock WHERE sLotNumber = @lot", conn, txn);
                unclaim.Parameters.AddWithValue("@lot", lotNumber);
                await unclaim.ExecuteNonQueryAsync();
            }

            // Bump received-to-date on the PO line.
            var receivedTotal = receivedSoFar + req.QuantityReceived;
            await using (var potCmd = new SqlCommand(
                "UPDATE tblSupplierPOTran SET nReceivedQuantity = @recv, Updated_UserKey = @user, Updated_datetime = GETDATE() WHERE lSupplierPOTranKey = @poTranKey", conn, txn))
            {
                potCmd.Parameters.AddWithValue("@recv", receivedTotal);
                potCmd.Parameters.AddWithValue("@user", userKey);
                potCmd.Parameters.AddWithValue("@poTranKey", req.SupplierPOTranKey);
                await potCmd.ExecuteNonQueryAsync();
            }

            // Bump on-hand at the PO's location. Per-location levels live on
            // tblInventorySizeLocationInfo (the table the inventory screens read);
            // upsert so a size first stocked at this location gets a row.
            // On-hand is counted in PIECES (Joe, 2026-06-05): received packs ×
            // nQtyPerUnit, matching how the legacy desktop counted. The ledger
            // row keeps the received pack count (nTranQuantity) and pack size
            // (nQtyPerUnit) separately, so packs and pieces are both recoverable.
            var pieces = req.QuantityReceived * qtyPerUnit;
            const string upsertSql = """
                SET NOCOUNT ON;
                UPDATE tblInventorySizeLocationInfo
                   SET nLevelCurrent = ISNULL(nLevelCurrent, 0) + @pieces,
                       sBinNumber = CASE WHEN @bin IS NOT NULL THEN @bin ELSE sBinNumber END,
                       Updated_UserKey = @user, Updated_datetime = GETDATE()
                 WHERE lInventorySizeKey = @size AND lServiceLocationKey = @loc AND Deleted_datetime IS NULL;
                IF @@ROWCOUNT = 0
                    INSERT INTO tblInventorySizeLocationInfo
                        (lInventorySizeKey, lServiceLocationKey, nLevelCurrent, nLevelMinimum, nLevelMaximum, sBinNumber, Created_UserKey, Created_datetime)
                    VALUES (@size, @loc, @pieces, 0, 0, @bin, @user, GETDATE());
                SELECT ISNULL(nLevelCurrent, 0) FROM tblInventorySizeLocationInfo
                 WHERE lInventorySizeKey = @size AND lServiceLocationKey = @loc AND Deleted_datetime IS NULL;
                """;
            int newLevel;
            await using (var lvlCmd = new SqlCommand(upsertSql, conn, txn))
            {
                lvlCmd.Parameters.AddWithValue("@pieces", pieces);
                lvlCmd.Parameters.AddWithValue("@bin", (object?)req.BinNumber ?? DBNull.Value);
                lvlCmd.Parameters.AddWithValue("@user", userKey);
                lvlCmd.Parameters.AddWithValue("@size", sizeKey);
                lvlCmd.Parameters.AddWithValue("@loc", locationKey);
                newLevel = Convert.ToInt32(await lvlCmd.ExecuteScalarAsync());
            }

            await txn.CommitAsync();
            return Ok(new ReceivePoLineResponse(lotNumber, receivedTotal, newLevel));
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
    }
}
