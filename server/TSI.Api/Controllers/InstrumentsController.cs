using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/instruments")]
[Authorize]
public class InstrumentsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet("repairs")]
    public async Task<IActionResult> GetRepairs(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sTranNumber LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search)");
        if (!string.IsNullOrWhiteSpace(statusFilter))
            where.Add("rs.sRepairStatus = @statusFilter");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*) FROM tblRepair r
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, r.sTranNumber, c.sClientName1, d.sDepartmentName,
                   r.dtDateReceived, r.dtDateDue,
                   rs.sRepairStatus,
                   (SELECT COUNT(*) FROM tblRepairItemTran rit WHERE rit.lRepairKey = r.lRepairKey) AS ItemCount,
                   (SELECT ISNULL(SUM(rit2.dblRepairPrice), 0) FROM tblRepairItemTran rit2 WHERE rit2.lRepairKey = r.lRepairKey) AS TotalValue
            FROM tblRepair r
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            {whereClause}
            ORDER BY r.dtDateReceived DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter)) countCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter)) dataCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<InstrumentRepairListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new InstrumentRepairListItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                OrderNumber: reader["sTranNumber"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                DateReceived: (reader["dtDateReceived"] as DateTime?)?.ToString("yyyy-MM-dd"),
                DateDue: (reader["dtDateDue"] as DateTime?)?.ToString("yyyy-MM-dd"),
                Status: reader["sRepairStatus"]?.ToString() ?? "",
                ItemCount: Convert.ToInt32(reader["ItemCount"]),
                TotalValue: Convert.ToDouble(reader["TotalValue"])
            ));
        }

        return Ok(new InstrumentRepairListResponse(items, totalCount));
    }

    [HttpGet("repairs/{id:int}")]
    public async Task<IActionResult> GetRepairDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT r.lRepairKey, r.sTranNumber, c.sClientName1, d.sDepartmentName,
                   r.sPurchaseOrder, r.dtDateReceived, r.dtDateDue, r.dtDateCompleted,
                   rs.sRepairStatus,
                   t.sTechFirst, t.sTechLast,
                   r.mComments
            FROM tblRepair r
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            WHERE r.lRepairKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Repair not found." });

        var dateReceived = reader["dtDateReceived"] as DateTime?;
        var daysOpen = dateReceived.HasValue
            ? (int)Math.Round((DateTime.UtcNow - dateReceived.Value).TotalDays)
            : 0;

        var techFirst = reader["sTechFirst"]?.ToString() ?? "";
        var techLast = reader["sTechLast"]?.ToString() ?? "";
        var techName = $"{techFirst} {techLast}".Trim();

        var repairKey = Convert.ToInt32(reader["lRepairKey"]);
        var orderNumber = reader["sTranNumber"]?.ToString() ?? "";
        var clientName = reader["sClientName1"]?.ToString() ?? "";
        var deptName = reader["sDepartmentName"]?.ToString() ?? "";
        var po = reader["sPurchaseOrder"]?.ToString();
        var dateReceivedStr = dateReceived?.ToString("yyyy-MM-dd");
        var dateDueStr = (reader["dtDateDue"] as DateTime?)?.ToString("yyyy-MM-dd");
        var dateCompletedStr = (reader["dtDateCompleted"] as DateTime?)?.ToString("yyyy-MM-dd");
        var status = reader["sRepairStatus"]?.ToString() ?? "";
        var notes = reader["mComments"]?.ToString();

        await reader.CloseAsync();

        // Load line items
        const string itemsSql = """
            SELECT rit.lRepairItemTranKey, rit.lRepairItemKey,
                   ri.sItemDescription, rit.sApproved,
                   ISNULL(rit.dblRepairPrice, 0) AS dblRepairPrice,
                   rit.sComments, rit.sFixType, rit.sProblemID, rit.sInitials
            FROM tblRepairItemTran rit
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            WHERE rit.lRepairKey = @id
            ORDER BY rit.lRepairItemTranKey
            """;

        await using var itemsCmd = new SqlCommand(itemsSql, conn);
        itemsCmd.CommandTimeout = 30;
        itemsCmd.Parameters.AddWithValue("@id", id);
        await using var itemsReader = await itemsCmd.ExecuteReaderAsync();
        var lineItems = new List<InstrumentRepairItem>();
        while (await itemsReader.ReadAsync())
        {
            lineItems.Add(new InstrumentRepairItem(
                TranKey: Convert.ToInt32(itemsReader["lRepairItemTranKey"]),
                RepairItemKey: Convert.ToInt32(itemsReader["lRepairItemKey"]),
                ItemDescription: itemsReader["sItemDescription"]?.ToString() ?? "",
                Approved: itemsReader["sApproved"]?.ToString(),
                RepairPrice: Convert.ToDouble(itemsReader["dblRepairPrice"]),
                Comments: itemsReader["sComments"]?.ToString(),
                FixType: itemsReader["sFixType"]?.ToString(),
                ProblemId: itemsReader["sProblemID"]?.ToString(),
                Initials: itemsReader["sInitials"]?.ToString()
            ));
        }

        return Ok(new InstrumentRepairDetail(
            RepairKey: repairKey,
            OrderNumber: orderNumber,
            ClientName: clientName,
            DepartmentName: deptName,
            PurchaseOrder: po,
            DateReceived: dateReceivedStr,
            DateDue: dateDueStr,
            DateCompleted: dateCompletedStr,
            Status: status,
            DaysOpen: daysOpen,
            TechnicianName: string.IsNullOrWhiteSpace(techName) ? null : techName,
            Notes: notes,
            Items: lineItems
        ));
    }

    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog(
        [FromQuery] string? search = null,
        [FromQuery] string? typeFilter = null,
        [FromQuery] string? activeFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(ri.sItemDescription LIKE @search OR ri.sProductID LIKE @search OR ri.sTSICode LIKE @search)");
        if (!string.IsNullOrWhiteSpace(typeFilter))
            where.Add("ri.sRigidOrFlexible = @typeFilter");
        if (activeFilter == "active")
            where.Add("ri.bActive = 1");
        else if (activeFilter == "inactive")
            where.Add("ri.bActive = 0");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblRepairItem ri {whereClause}";

        var dataSql = $"""
            SELECT ri.lRepairItemKey, ri.sItemDescription, ri.sRigidOrFlexible,
                   ri.sPartOrLabor, ri.sProblemID, ri.sProductID,
                   ISNULL(ri.bActive, 0) AS bActive,
                   ISNULL(ri.dblAvgCostMaterial, 0) AS dblAvgCostMaterial,
                   ISNULL(ri.dblAvgCostLabor, 0) AS dblAvgCostLabor,
                   ri.sTSICode,
                   (SELECT COUNT(*) FROM tblRepairItemTran rit WHERE rit.lRepairItemKey = ri.lRepairItemKey) AS UsageCount
            FROM tblRepairItem ri
            {whereClause}
            ORDER BY ri.sItemDescription
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(typeFilter)) countCmd.Parameters.AddWithValue("@typeFilter", typeFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(typeFilter)) dataCmd.Parameters.AddWithValue("@typeFilter", typeFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<InstrumentCatalogItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new InstrumentCatalogItem(
                RepairItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
                ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
                RigidOrFlexible: reader["sRigidOrFlexible"]?.ToString(),
                PartOrLabor: reader["sPartOrLabor"]?.ToString(),
                ProblemId: reader["sProblemID"]?.ToString(),
                ProductId: reader["sProductID"]?.ToString(),
                IsActive: Convert.ToBoolean(reader["bActive"]),
                AvgCostMaterial: Convert.ToDouble(reader["dblAvgCostMaterial"]),
                AvgCostLabor: Convert.ToDouble(reader["dblAvgCostLabor"]),
                TSICode: reader["sTSICode"]?.ToString(),
                UsageCount: Convert.ToInt32(reader["UsageCount"])
            ));
        }

        return Ok(new InstrumentCatalogResponse(items, totalCount));
    }

    [HttpGet("catalog/{id:int}")]
    public async Task<IActionResult> GetCatalogDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ri.lRepairItemKey, ri.sItemDescription, ri.sRigidOrFlexible,
                   ri.sPartOrLabor, ri.sProblemID, ri.sProductID,
                   ri.sProductID_HPG, ri.sProductID_Premier,
                   ISNULL(ri.bActive, 0) AS bActive,
                   ISNULL(ri.dblAvgCostMaterial, 0) AS dblAvgCostMaterial,
                   ISNULL(ri.dblAvgCostLabor, 0) AS dblAvgCostLabor,
                   ISNULL(ri.nTurnAroundTime, 0) AS nTurnAroundTime,
                   ISNULL(ri.dblHoursTech1, 0) AS dblHoursTech1,
                   ISNULL(ri.dblHoursTech2, 0) AS dblHoursTech2,
                   ISNULL(ri.dblHoursTech3, 0) AS dblHoursTech3,
                   ISNULL(ri.sMajorRepair, 'N') AS sMajorRepair,
                   ri.sTSICode, ri.sDiameterType, ri.nUnitCost
            FROM tblRepairItem ri
            WHERE ri.lRepairItemKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Instrument not found." });

        return Ok(new InstrumentCatalogDetail(
            RepairItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
            ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
            RigidOrFlexible: reader["sRigidOrFlexible"]?.ToString(),
            PartOrLabor: reader["sPartOrLabor"]?.ToString(),
            ProblemId: reader["sProblemID"]?.ToString(),
            ProductId: reader["sProductID"]?.ToString(),
            ProductIdHPG: reader["sProductID_HPG"]?.ToString(),
            ProductIdPremier: reader["sProductID_Premier"]?.ToString(),
            IsActive: Convert.ToBoolean(reader["bActive"]),
            AvgCostMaterial: Convert.ToDouble(reader["dblAvgCostMaterial"]),
            AvgCostLabor: Convert.ToDouble(reader["dblAvgCostLabor"]),
            TurnAroundTime: Convert.ToInt32(reader["nTurnAroundTime"]),
            HoursTech1: Convert.ToDouble(reader["dblHoursTech1"]),
            HoursTech2: Convert.ToDouble(reader["dblHoursTech2"]),
            HoursTech3: Convert.ToDouble(reader["dblHoursTech3"]),
            IsMajorRepair: reader["sMajorRepair"]?.ToString() == "Y",
            TSICode: reader["sTSICode"]?.ToString(),
            DiameterType: reader["sDiameterType"]?.ToString(),
            UnitCost: reader["nUnitCost"] as decimal?
        ));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS AllOrders,
                SUM(CASE WHEN rs.sRepairStatus = 'Received' THEN 1 ELSE 0 END) AS Received,
                SUM(CASE WHEN rs.sRepairStatus = 'In Progress' THEN 1 ELSE 0 END) AS InProgress,
                SUM(CASE WHEN rs.sRepairStatus = 'Outsourced' THEN 1 ELSE 0 END) AS Outsourced,
                SUM(CASE WHEN rs.sRepairStatus = 'On Hold' THEN 1 ELSE 0 END) AS OnHold,
                SUM(CASE WHEN rs.sRepairStatus IN ('Complete','Completed') THEN 1 ELSE 0 END) AS Complete,
                SUM(CASE WHEN rs.sRepairStatus = 'Invoiced' THEN 1 ELSE 0 END) AS Invoiced
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var allOrders = Convert.ToInt32(reader["AllOrders"]);
        var received = Convert.ToInt32(reader["Received"]);
        var inProgress = Convert.ToInt32(reader["InProgress"]);
        var outsourced = Convert.ToInt32(reader["Outsourced"]);
        var onHold = Convert.ToInt32(reader["OnHold"]);
        var complete = Convert.ToInt32(reader["Complete"]);
        var invoiced = Convert.ToInt32(reader["Invoiced"]);

        await reader.CloseAsync();

        const string valueSql = "SELECT ISNULL(SUM(dblRepairPrice), 0) FROM tblRepairItemTran";
        await using var valueCmd = new SqlCommand(valueSql, conn);
        valueCmd.CommandTimeout = 30;
        var totalValue = Convert.ToDouble(await valueCmd.ExecuteScalarAsync());

        return Ok(new InstrumentRepairStats(
            AllOrders: allOrders,
            Received: received,
            InProgress: inProgress,
            Outsourced: outsourced,
            OnHold: onHold,
            Complete: complete,
            Invoiced: invoiced,
            TotalValue: totalValue
        ));
    }
}
