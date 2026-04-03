using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/repair-items")]
[Authorize]
public class RepairItemsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN ISNULL(bActive, 0) = 1 THEN 1 ELSE 0 END) AS Active,
                SUM(CASE WHEN ISNULL(bActive, 0) = 0 THEN 1 ELSE 0 END) AS Inactive,
                SUM(CASE WHEN sRigidOrFlexible = 'F' THEN 1 ELSE 0 END) AS Flexible,
                SUM(CASE WHEN sRigidOrFlexible = 'R' THEN 1 ELSE 0 END) AS Rigid
            FROM tblRepairItem
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new RepairItemStats(
            Total: Convert.ToInt32(reader["Total"]),
            Active: Convert.ToInt32(reader["Active"]),
            Inactive: Convert.ToInt32(reader["Inactive"]),
            Flexible: Convert.ToInt32(reader["Flexible"]),
            Rigid: Convert.ToInt32(reader["Rigid"])
        ));
    }

    [HttpGet]
    public async Task<IActionResult> GetRepairItems(
        [FromQuery] string? search = null,
        [FromQuery] string? typeFilter = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 200)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(ri.sItemDescription LIKE @search OR ri.sTSICode LIKE @search OR ri.sProblemID LIKE @search OR ri.sProductID LIKE @search)");
        if (!string.IsNullOrWhiteSpace(typeFilter) && (typeFilter == "F" || typeFilter == "R"))
            where.Add("ri.sRigidOrFlexible = @typeFilter");
        if (statusFilter == "active")
            where.Add("ISNULL(ri.bActive, 0) = 1");
        else if (statusFilter == "inactive")
            where.Add("ISNULL(ri.bActive, 0) = 0");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblRepairItem ri {whereClause}";

        var dataSql = $"""
            SELECT ri.lRepairItemKey, ri.sItemDescription, ri.sProblemID, ri.sTSICode, ri.sProductID,
                   ri.sRigidOrFlexible, ri.sPartOrLabor, ISNULL(ri.bActive, 0) AS bActive,
                   ri.nTurnAroundTime
            FROM tblRepairItem ri
            {whereClause}
            ORDER BY ri.sItemDescription
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(typeFilter) && (typeFilter == "F" || typeFilter == "R")) countCmd.Parameters.AddWithValue("@typeFilter", typeFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(typeFilter) && (typeFilter == "F" || typeFilter == "R")) dataCmd.Parameters.AddWithValue("@typeFilter", typeFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<RepairItemListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairItemListItem(
                RepairItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
                ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
                ProblemId: reader["sProblemID"] == DBNull.Value ? null : reader["sProblemID"]?.ToString(),
                TsiCode: reader["sTSICode"] == DBNull.Value ? null : reader["sTSICode"]?.ToString(),
                ProductId: reader["sProductID"] == DBNull.Value ? null : reader["sProductID"]?.ToString(),
                RigidOrFlexible: reader["sRigidOrFlexible"] == DBNull.Value ? null : reader["sRigidOrFlexible"]?.ToString(),
                PartOrLabor: reader["sPartOrLabor"] == DBNull.Value ? null : reader["sPartOrLabor"]?.ToString(),
                IsActive: Convert.ToBoolean(reader["bActive"]),
                TurnaroundTime: reader["nTurnAroundTime"] == DBNull.Value ? null : Convert.ToInt32(reader["nTurnAroundTime"])
            ));
        }

        return Ok(new RepairItemListResponse(items, totalCount));
    }

    [HttpGet("{key:int}")]
    public async Task<IActionResult> GetRepairItem(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ri.lRepairItemKey, ri.sItemDescription, ri.sProblemID, ri.sTSICode, ri.sProductID,
                   ri.sRigidOrFlexible, ri.sPartOrLabor, ISNULL(ri.bActive, 0) AS bActive,
                   ri.nTurnAroundTime, ri.dblAvgCostMaterial, ri.dblAvgCostLabor,
                   ri.tMinutesTech1, ri.tMinutesTech2, ri.tMinutesTech3,
                   ri.tMinutesTech1SmallDimater, ri.tMinutesTech2SmallDimater, ri.tMinutesTech3SmallDimater,
                   ISNULL(ri.bOkayToSkip, 0) AS bOkayToSkip,
                   ISNULL(ri.bIsAdjustment, 0) AS bIsAdjustment,
                   ISNULL(ri.bSkipPickList, 0) AS bSkipPickList,
                   ISNULL(ri.bProfitItemPlus, 0) AS bProfitItemPlus,
                   ISNULL(ri.bProfitItemMinus, 0) AS bProfitItemMinus,
                   ISNULL(ri.bLocked, 0) AS bLocked,
                   ri.dtLastUpdate
            FROM tblRepairItem ri
            WHERE ri.lRepairItemKey = @key
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@key", key);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Repair item not found." });

        return Ok(new RepairItemDetail(
            RepairItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
            ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
            ProblemId: reader["sProblemID"] == DBNull.Value ? null : reader["sProblemID"]?.ToString(),
            TsiCode: reader["sTSICode"] == DBNull.Value ? null : reader["sTSICode"]?.ToString(),
            ProductId: reader["sProductID"] == DBNull.Value ? null : reader["sProductID"]?.ToString(),
            RigidOrFlexible: reader["sRigidOrFlexible"] == DBNull.Value ? null : reader["sRigidOrFlexible"]?.ToString(),
            PartOrLabor: reader["sPartOrLabor"] == DBNull.Value ? null : reader["sPartOrLabor"]?.ToString(),
            IsActive: Convert.ToBoolean(reader["bActive"]),
            TurnaroundTime: reader["nTurnAroundTime"] == DBNull.Value ? null : Convert.ToInt32(reader["nTurnAroundTime"]),
            AvgCostMaterial: reader["dblAvgCostMaterial"] == DBNull.Value ? null : Convert.ToDouble(reader["dblAvgCostMaterial"]),
            AvgCostLabor: reader["dblAvgCostLabor"] == DBNull.Value ? null : Convert.ToDouble(reader["dblAvgCostLabor"]),
            MinutesTech1: reader["tMinutesTech1"] == DBNull.Value ? null : Convert.ToInt32(reader["tMinutesTech1"]),
            MinutesTech2: reader["tMinutesTech2"] == DBNull.Value ? null : Convert.ToInt32(reader["tMinutesTech2"]),
            MinutesTech3: reader["tMinutesTech3"] == DBNull.Value ? null : Convert.ToInt32(reader["tMinutesTech3"]),
            MinutesTech1SmallDiameter: reader["tMinutesTech1SmallDimater"] == DBNull.Value ? null : Convert.ToInt32(reader["tMinutesTech1SmallDimater"]),
            MinutesTech2SmallDiameter: reader["tMinutesTech2SmallDimater"] == DBNull.Value ? null : Convert.ToInt32(reader["tMinutesTech2SmallDimater"]),
            MinutesTech3SmallDiameter: reader["tMinutesTech3SmallDimater"] == DBNull.Value ? null : Convert.ToInt32(reader["tMinutesTech3SmallDimater"]),
            OkayToSkip: Convert.ToBoolean(reader["bOkayToSkip"]),
            IsAdjustment: Convert.ToBoolean(reader["bIsAdjustment"]),
            SkipPickList: Convert.ToBoolean(reader["bSkipPickList"]),
            ProfitItemPlus: Convert.ToBoolean(reader["bProfitItemPlus"]),
            ProfitItemMinus: Convert.ToBoolean(reader["bProfitItemMinus"]),
            IsLocked: Convert.ToBoolean(reader["bLocked"]),
            LastUpdated: reader["dtLastUpdate"] == DBNull.Value ? null : (DateTime?)reader["dtLastUpdate"]
        ));
    }

    [HttpPost]
    public async Task<IActionResult> CreateRepairItem([FromBody] RepairItemCreate data)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblRepairItem (
                sItemDescription, sProblemID, sTSICode, sProductID,
                sRigidOrFlexible, sPartOrLabor, bActive, nTurnAroundTime,
                dtCreateDate, dtLastUpdate
            )
            VALUES (
                @description, @problemId, @tsiCode, @productId,
                @rigidOrFlexible, @partOrLabor, 1, @turnaround,
                GETDATE(), GETDATE()
            );
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@description", data.ItemDescription);
        cmd.Parameters.AddWithValue("@problemId", (object?)data.ProblemId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tsiCode", (object?)data.TsiCode ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@productId", (object?)data.ProductId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@rigidOrFlexible", data.RigidOrFlexible);
        cmd.Parameters.AddWithValue("@partOrLabor", data.PartOrLabor);
        cmd.Parameters.AddWithValue("@turnaround", (object?)data.TurnaroundTime ?? DBNull.Value);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { repairItemKey = newKey, message = "Repair item created." });
    }

    [HttpPut("{key:int}")]
    public async Task<IActionResult> UpdateRepairItem(int key, [FromBody] RepairItemUpdate update)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn };

        if (update.ItemDescription != null) { sets.Add("sItemDescription = @description"); cmd.Parameters.AddWithValue("@description", update.ItemDescription); }
        if (update.ProblemId != null) { sets.Add("sProblemID = @problemId"); cmd.Parameters.AddWithValue("@problemId", update.ProblemId); }
        if (update.TsiCode != null) { sets.Add("sTSICode = @tsiCode"); cmd.Parameters.AddWithValue("@tsiCode", update.TsiCode); }
        if (update.ProductId != null) { sets.Add("sProductID = @productId"); cmd.Parameters.AddWithValue("@productId", update.ProductId); }
        if (update.RigidOrFlexible != null) { sets.Add("sRigidOrFlexible = @rigidOrFlexible"); cmd.Parameters.AddWithValue("@rigidOrFlexible", update.RigidOrFlexible); }
        if (update.PartOrLabor != null) { sets.Add("sPartOrLabor = @partOrLabor"); cmd.Parameters.AddWithValue("@partOrLabor", update.PartOrLabor); }
        if (update.IsActive != null) { sets.Add("bActive = @isActive"); cmd.Parameters.AddWithValue("@isActive", update.IsActive); }
        if (update.TurnaroundTime != null) { sets.Add("nTurnAroundTime = @turnaround"); cmd.Parameters.AddWithValue("@turnaround", update.TurnaroundTime); }
        if (update.AvgCostMaterial != null) { sets.Add("dblAvgCostMaterial = @costMaterial"); cmd.Parameters.AddWithValue("@costMaterial", update.AvgCostMaterial); }
        if (update.AvgCostLabor != null) { sets.Add("dblAvgCostLabor = @costLabor"); cmd.Parameters.AddWithValue("@costLabor", update.AvgCostLabor); }
        if (update.MinutesTech1 != null) { sets.Add("tMinutesTech1 = @t1"); cmd.Parameters.AddWithValue("@t1", update.MinutesTech1); }
        if (update.MinutesTech2 != null) { sets.Add("tMinutesTech2 = @t2"); cmd.Parameters.AddWithValue("@t2", update.MinutesTech2); }
        if (update.MinutesTech3 != null) { sets.Add("tMinutesTech3 = @t3"); cmd.Parameters.AddWithValue("@t3", update.MinutesTech3); }
        if (update.MinutesTech1SmallDiameter != null) { sets.Add("tMinutesTech1SmallDimater = @t1sd"); cmd.Parameters.AddWithValue("@t1sd", update.MinutesTech1SmallDiameter); }
        if (update.MinutesTech2SmallDiameter != null) { sets.Add("tMinutesTech2SmallDimater = @t2sd"); cmd.Parameters.AddWithValue("@t2sd", update.MinutesTech2SmallDiameter); }
        if (update.MinutesTech3SmallDiameter != null) { sets.Add("tMinutesTech3SmallDimater = @t3sd"); cmd.Parameters.AddWithValue("@t3sd", update.MinutesTech3SmallDiameter); }
        if (update.OkayToSkip != null) { sets.Add("bOkayToSkip = @okayToSkip"); cmd.Parameters.AddWithValue("@okayToSkip", update.OkayToSkip); }
        if (update.IsAdjustment != null) { sets.Add("bIsAdjustment = @isAdjustment"); cmd.Parameters.AddWithValue("@isAdjustment", update.IsAdjustment); }
        if (update.SkipPickList != null) { sets.Add("bSkipPickList = @skipPickList"); cmd.Parameters.AddWithValue("@skipPickList", update.SkipPickList); }
        if (update.ProfitItemPlus != null) { sets.Add("bProfitItemPlus = @profitPlus"); cmd.Parameters.AddWithValue("@profitPlus", update.ProfitItemPlus); }
        if (update.ProfitItemMinus != null) { sets.Add("bProfitItemMinus = @profitMinus"); cmd.Parameters.AddWithValue("@profitMinus", update.ProfitItemMinus); }
        if (update.IsLocked != null) { sets.Add("bLocked = @isLocked"); cmd.Parameters.AddWithValue("@isLocked", update.IsLocked); }

        if (sets.Count == 0) return BadRequest(new { message = "No fields to update." });

        sets.Add("dtLastUpdate = GETDATE()");
        cmd.CommandText = $"UPDATE tblRepairItem SET {string.Join(", ", sets)} WHERE lRepairItemKey = @key";
        cmd.Parameters.AddWithValue("@key", key);

        await using (cmd)
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound(new { message = "Repair item not found." });
        }

        return Ok(new { message = "Repair item updated." });
    }

    [HttpDelete("{key:int}")]
    public async Task<IActionResult> DeleteRepairItem(int key)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Soft delete — set bActive = 0
        await using var cmd = new SqlCommand(
            "UPDATE tblRepairItem SET bActive = 0, dtLastUpdate = GETDATE() WHERE lRepairItemKey = @key", conn);
        cmd.Parameters.AddWithValue("@key", key);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Repair item not found." });
        return Ok(new { message = "Repair item deactivated." });
    }
}
