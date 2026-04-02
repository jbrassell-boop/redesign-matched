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
            InvoiceNumber: reader["sInvoiceNumber"]?.ToString()
        ));
    }
}
