using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController(IConfiguration config) : ControllerBase
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

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblInventory i
            {whereClause}
            """;

        var dataSql = $"""
            SELECT i.lInventoryKey,
                   ISNULL(i.sItemDescription, '') AS sItemDescription,
                   ISNULL(i.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(i.nLevelCurrent, 0) AS nLevelCurrent,
                   ISNULL(i.nLevelMinimum, 0) AS nLevelMinimum,
                   ISNULL(i.nLevelMaximum, 0) AS nLevelMaximum,
                   ISNULL(i.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblInventorySize s WHERE s.lInventoryKey = i.lInventoryKey) AS SizeCount,
                   CASE WHEN ISNULL(i.nLevelCurrent, 0) <= ISNULL(i.nLevelMinimum, 0) THEN 1 ELSE 0 END AS IsLowStock
            FROM tblInventory i
            {whereClause}
            ORDER BY i.sItemDescription
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
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
                   i.dtLastUpdate, i.dtCreateDate,
                   CASE WHEN ISNULL(i.nLevelCurrent, 0) <= ISNULL(i.nLevelMinimum, 0) THEN 1 ELSE 0 END AS IsLowStock
            FROM tblInventory i
            WHERE i.lInventoryKey = @inventoryKey
            """;

        const string sizesSql = """
            SELECT s.lInventorySizeKey,
                   ISNULL(s.sSizeDescription, '') AS sSizeDescription,
                   ISNULL(s.nLevelCurrent, 0) AS nLevelCurrent,
                   ISNULL(s.nLevelMinimum, 0) AS nLevelMinimum,
                   ISNULL(s.nLevelMaximum, 0) AS nLevelMaximum,
                   ISNULL(s.dblUnitCost, 0) AS dblUnitCost,
                   s.sBinNumber,
                   ISNULL(s.bActive, 0) AS bActive
            FROM tblInventorySize s
            WHERE s.lInventoryKey = @inventoryKey
            ORDER BY s.sSizeDescription
            """;

        await using var itemCmd = new SqlCommand(itemSql, conn);
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
        var lastUpdate = itemReader["dtLastUpdate"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(itemReader["dtLastUpdate"]);
        var createDate = itemReader["dtCreateDate"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(itemReader["dtCreateDate"]);
        var isLowStock = Convert.ToBoolean(itemReader["IsLowStock"]);

        await itemReader.CloseAsync();

        await using var sizesCmd = new SqlCommand(sizesSql, conn);
        sizesCmd.Parameters.AddWithValue("@inventoryKey", inventoryKey);
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
            LastUpdate: lastUpdate,
            CreateDate: createDate,
            Sizes: sizes
        ));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS TotalCount,
                SUM(CASE WHEN ISNULL(bActive, 0) = 1 THEN 1 ELSE 0 END) AS ActiveCount,
                SUM(CASE WHEN ISNULL(bActive, 0) = 0 THEN 1 ELSE 0 END) AS InactiveCount,
                SUM(CASE WHEN ISNULL(bActive, 0) = 1
                          AND ISNULL(nLevelCurrent, 0) <= ISNULL(nLevelMinimum, 0)
                          THEN 1 ELSE 0 END) AS LowStockCount
            FROM tblInventory
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new InventoryStats(
            TotalCount: Convert.ToInt32(reader["TotalCount"]),
            ActiveCount: Convert.ToInt32(reader["ActiveCount"]),
            InactiveCount: Convert.ToInt32(reader["InactiveCount"]),
            LowStockCount: Convert.ToInt32(reader["LowStockCount"])
        ));
    }
}
