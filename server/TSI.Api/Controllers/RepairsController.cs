using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/repairs")]
[Authorize]
public class RepairsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetRepairs(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search OR st.sScopeTypeDesc LIKE @search OR s.sSerialNumber LIKE @search)");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all")
            where.Add("rs.sRepairStatus = @statusFilter");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   r.lRepairStatusID,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") countCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") dataCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var repairs = new List<RepairListItem>();
        while (await reader.ReadAsync())
        {
            var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
            repairs.Add(new RepairListItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                Dept: reader["sDepartmentName"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
                Status: reader["sRepairStatus"]?.ToString() ?? "",
                StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
                IsUrgent: Convert.ToBoolean(reader["bHotList"])
            ));
        }

        return Ok(new RepairListResponse(repairs, totalCount));
    }

    [HttpGet("{repairKey:int}")]
    public async Task<IActionResult> GetRepair(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   r.lRepairStatusID,
                   r.lTechnicianKey,
                   r.lDepartmentKey,
                   r.sComplaintDesc, r.dtAprRecvd, r.dtExpDelDate, r.dblAmtRepair,
                   r.dtShipDate, r.sShipTrackingNumber, r.sInvoiceNumber,
                   ISNULL(CAST(r.mComments AS nvarchar(max)), '') AS mComments,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   c.lClientKey,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Repair not found." });

        var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
        var dateApproved = reader["dtAprRecvd"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtAprRecvd"]);
        var estDel = reader["dtExpDelDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtExpDelDate"]);
        var shipDate = reader["dtShipDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtShipDate"]);

        return Ok(new RepairDetail(
            RepairKey: Convert.ToInt32(reader["lRepairKey"]),
            Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
            DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
            Client: reader["sClientName1"]?.ToString() ?? "",
            ClientKey: reader["lClientKey"]?.ToString() ?? "",
            Dept: reader["sDepartmentName"]?.ToString() ?? "",
            DeptKey: reader["lDepartmentKey"] == DBNull.Value ? 0 : Convert.ToInt32(reader["lDepartmentKey"]),
            ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
            Serial: reader["sSerialNumber"]?.ToString() ?? "",
            DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
            Status: reader["sRepairStatus"]?.ToString() ?? "",
            StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
            IsUrgent: Convert.ToBoolean(reader["bHotList"]),
            Tech: reader["sTechName"]?.ToString(),
            TechKey: reader["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnicianKey"]),
            Complaint: reader["sComplaintDesc"]?.ToString(),
            DateApproved: dateApproved?.ToString("MM/dd/yyyy"),
            EstDelivery: estDel?.ToString("MM/dd/yyyy"),
            AmountApproved: reader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblAmtRepair"]),
            ShipDate: shipDate?.ToString("MM/dd/yyyy"),
            TrackingNumber: reader["sShipTrackingNumber"]?.ToString(),
            InvoiceNumber: reader["sInvoiceNumber"]?.ToString(),
            Notes: reader["mComments"]?.ToString()
        ));
    }

    [HttpPatch("{repairKey:int}/notes")]
    public async Task<IActionResult> UpdateNotes(int repairKey, [FromBody] UpdateRepairNotesRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET mComments = @notes WHERE lRepairKey = @id", conn);
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@notes", (object?)body.Notes ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? Ok() : NotFound();
    }

    // ── Line Items (Workflow tab) ──
    [HttpGet("{repairKey:int}/lineitems")]
    public async Task<IActionResult> GetLineItems(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT rit.lRepairItemTranKey, ISNULL(rit.sApproved,'') AS sApproved,
                   ISNULL(ri.sProblemID,'') AS sProblemID,
                   ISNULL(ri.sItemDescription,'') AS sItemDescription,
                   ISNULL(rit.sProblemID,'') AS sCause,
                   ISNULL(rit.sFixType,'') AS sFixType,
                   ISNULL(rit.dblRepairPrice, 0) AS dblRepairPrice,
                   ISNULL(t.sTechName,'') AS sTechName,
                   ISNULL(rit.sComments,'') AS sComments
            FROM tblRepairItemTran rit
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = rit.lTechnicianKey
            WHERE rit.lRepairKey = @repairKey
            ORDER BY rit.lRepairItemTranKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<RepairLineItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairLineItem(
                TranKey: Convert.ToInt32(reader["lRepairItemTranKey"]),
                Approved: reader["sApproved"]?.ToString() ?? "",
                ItemCode: reader["sProblemID"]?.ToString() ?? "",
                Description: reader["sItemDescription"]?.ToString() ?? "",
                Cause: reader["sCause"]?.ToString() ?? "",
                FixType: reader["sFixType"]?.ToString() ?? "",
                Amount: reader["dblRepairPrice"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["dblRepairPrice"]),
                Tech: reader["sTechName"]?.ToString() ?? "",
                Comments: reader["sComments"]?.ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    // ── Scope History ──
    [HttpGet("{repairKey:int}/scopehistory")]
    public async Task<IActionResult> GetScopeHistory(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // First get the scope key for this repair
        const string scopeSql = "SELECT lScopeKey FROM tblRepair WHERE lRepairKey = @repairKey";
        await using var scopeCmd = new SqlCommand(scopeSql, conn);
        scopeCmd.Parameters.AddWithValue("@repairKey", repairKey);
        var scopeKeyObj = await scopeCmd.ExecuteScalarAsync();
        if (scopeKeyObj == null || scopeKeyObj == DBNull.Value)
            return Ok(Array.Empty<RepairScopeHistory>());

        var scopeKey = Convert.ToInt32(scopeKeyObj);

        const string sql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(rs.sRepairStatus,'') AS sRepairStatus,
                   ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1,'') AS sClientName1,
                   DATEDIFF(day, r.dtDateIn, ISNULL(r.dtShipDate, GETDATE())) AS DaysIn,
                   r.dblAmtRepair
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE r.lScopeKey = @scopeKey
            ORDER BY r.dtDateIn DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@scopeKey", scopeKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var history = new List<RepairScopeHistory>();
        while (await reader.ReadAsync())
        {
            var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
            history.Add(new RepairScopeHistory(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                Status: reader["sRepairStatus"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
                Amount: reader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblAmtRepair"])
            ));
        }
        return Ok(history);
    }

    // ── Status Workflow ──

    /// <summary>GET /api/repairs/statuses — all repair status options</summary>
    [HttpGet("statuses")]
    public async Task<IActionResult> GetStatuses()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT lRepairStatusID, sRepairStatus, lRepairStatusSortOrder
            FROM tblRepairStatuses
            WHERE ISNULL(bIsReadOnly, 0) = 0
            ORDER BY lRepairStatusSortOrder, sRepairStatus
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        var statuses = new List<RepairStatusOption>();
        while (await reader.ReadAsync())
        {
            statuses.Add(new RepairStatusOption(
                StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
                StatusName: reader["sRepairStatus"]?.ToString() ?? "",
                SortOrder: reader["lRepairStatusSortOrder"] == DBNull.Value ? null : Convert.ToInt32(reader["lRepairStatusSortOrder"])
            ));
        }
        return Ok(statuses);
    }

    /// <summary>PUT /api/repairs/{id}/status — update repair status</summary>
    [HttpPut("{repairKey:int}/status")]
    public async Task<IActionResult> UpdateStatus(int repairKey, [FromBody] UpdateRepairStatusRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Update the repair record
        await using var updateCmd = new SqlCommand(
            "UPDATE tblRepair SET lRepairStatusID = @statusId WHERE lRepairKey = @id", conn);
        updateCmd.Parameters.AddWithValue("@id", repairKey);
        updateCmd.Parameters.AddWithValue("@statusId", body.StatusId);
        var rows = await updateCmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();

        // Insert status log entry
        await using var logCmd = new SqlCommand("""
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, dtStatusChange)
            SELECT @repairKey, @statusId, rs.sRepairStatus, GETDATE()
            FROM tblRepairStatuses rs WHERE rs.lRepairStatusID = @statusId
            """, conn);
        logCmd.Parameters.AddWithValue("@repairKey", repairKey);
        logCmd.Parameters.AddWithValue("@statusId", body.StatusId);
        await logCmd.ExecuteNonQueryAsync();

        return Ok();
    }

    /// <summary>GET /api/repairs/{id}/status-history — status change log</summary>
    [HttpGet("{repairKey:int}/status-history")]
    public async Task<IActionResult> GetStatusHistory(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT sl.lRepairStatusLogID, ISNULL(sl.sRepairStatus, '') AS sRepairStatus,
                   sl.dtStatusChange
            FROM tblRepairStatusLog sl
            WHERE sl.lRepairKey = @repairKey
            ORDER BY sl.dtStatusChange DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var history = new List<RepairStatusLogEntry>();
        while (await reader.ReadAsync())
        {
            history.Add(new RepairStatusLogEntry(
                LogId: Convert.ToInt32(reader["lRepairStatusLogID"]),
                StatusName: reader["sRepairStatus"]?.ToString() ?? "",
                ChangedAt: reader["dtStatusChange"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["dtStatusChange"]),
                ChangedBy: null
            ));
        }
        return Ok(history);
    }

    // ── Financials ──
    [HttpGet("{repairKey:int}/financials")]
    public async Task<IActionResult> GetFinancials(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ISNULL(r.dblAmtRepair, 0) AS SaleAmount,
                   ISNULL(r.dblAmtTax, 0) AS Tax,
                   ISNULL(r.dblAmtRepair, 0) + ISNULL(r.dblAmtTax, 0) AS InvoiceTotal,
                   ISNULL(r.dblAmtOutsource, 0) AS Outsource,
                   ISNULL(r.dblAmtShipping, 0) AS Shipping,
                   ISNULL(r.dblAmtLabor, 0) AS Labor,
                   ISNULL(r.dblAmtInventory, 0) AS [Inventory],
                   ISNULL(r.dblAmtGPO, 0) AS Gpo,
                   ISNULL(r.dblAmtCommission, 0) AS Commission
            FROM tblRepair r
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound();

        var sale = Convert.ToDecimal(reader["SaleAmount"]);
        var tax = Convert.ToDecimal(reader["Tax"]);
        var invoiceTotal = Convert.ToDecimal(reader["InvoiceTotal"]);
        var outsource = Convert.ToDecimal(reader["Outsource"]);
        var shipping = Convert.ToDecimal(reader["Shipping"]);
        var labor = Convert.ToDecimal(reader["Labor"]);
        var inventory = Convert.ToDecimal(reader["Inventory"]);
        var gpo = Convert.ToDecimal(reader["Gpo"]);
        var commission = Convert.ToDecimal(reader["Commission"]);
        var totalExp = outsource + shipping + labor + inventory + gpo + commission;
        var marginPct = invoiceTotal > 0 ? (invoiceTotal - totalExp) / invoiceTotal * 100 : 0;

        return Ok(new RepairFinancials(
            SaleAmount: sale,
            Tax: tax,
            InvoiceTotal: invoiceTotal,
            Outsource: outsource,
            Shipping: shipping,
            Labor: labor,
            Inventory: inventory,
            Gpo: gpo,
            Commission: commission,
            TotalExpenses: totalExp,
            MarginPct: Math.Round(marginPct, 1),
            ContractMargin: 0
        ));
    }
}
