using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(IConfiguration config) : ControllerBase
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
                SUM(CASE WHEN rs.sRepairStatus NOT IN ('Shipped','Cancelled') THEN 1 ELSE 0 END) AS OpenRepairs,
                SUM(CASE WHEN r.bHotList = 1 AND rs.sRepairStatus NOT IN ('Shipped','Cancelled') THEN 1 ELSE 0 END) AS UrgentRepairs,
                SUM(CASE WHEN rs.sRepairStatus = 'Pending QC' THEN 1 ELSE 0 END) AS PendingQC,
                SUM(CASE WHEN rs.sRepairStatus = 'Pending Ship' THEN 1 ELSE 0 END) AS PendingShip,
                SUM(CASE WHEN rs.sRepairStatus = 'Shipped' AND CAST(r.dtShipDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS CompletedToday,
                SUM(CASE WHEN CAST(r.dtDateIn AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS ReceivedToday
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Ok(new DashboardStats(0, 0, 0, 0, 0, 0));

        return Ok(new DashboardStats(
            OpenRepairs: reader["OpenRepairs"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OpenRepairs"]),
            UrgentRepairs: reader["UrgentRepairs"] == DBNull.Value ? 0 : Convert.ToInt32(reader["UrgentRepairs"]),
            PendingQC: reader["PendingQC"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PendingQC"]),
            PendingShip: reader["PendingShip"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PendingShip"]),
            CompletedToday: reader["CompletedToday"] == DBNull.Value ? 0 : Convert.ToInt32(reader["CompletedToday"]),
            ReceivedToday: reader["ReceivedToday"] == DBNull.Value ? 0 : Convert.ToInt32(reader["ReceivedToday"])
        ));
    }

    [HttpGet("repairs")]
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
            where.Add("""
                (r.sWorkOrderNumber LIKE @search
                 OR c.sClientName1 LIKE @search
                 OR d.sDepartmentName LIKE @search
                 OR st.sScopeTypeDesc LIKE @search
                 OR s.sSerialNumber LIKE @search
                 OR t.sTechName LIKE @search)
                """);
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
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.lRepairStatusID,
                   r.dtAprRecvd, r.dtExpDelDate, r.dblAmtRepair,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
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

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var repairs = new List<DashboardRepair>();

        while (await dataReader.ReadAsync())
        {
            var dateIn = dataReader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtDateIn"]);
            var dateApproved = dataReader["dtAprRecvd"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtAprRecvd"]);
            var estDel = dataReader["dtExpDelDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtExpDelDate"]);

            repairs.Add(new DashboardRepair(
                RepairKey: Convert.ToInt32(dataReader["lRepairKey"]),
                Wo: dataReader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                Client: dataReader["sClientName1"]?.ToString() ?? "",
                Dept: dataReader["sDepartmentName"]?.ToString() ?? "",
                ScopeType: dataReader["sScopeTypeDesc"]?.ToString() ?? "",
                Serial: dataReader["sSerialNumber"]?.ToString() ?? "",
                DaysIn: dataReader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(dataReader["DaysIn"]),
                Status: dataReader["sRepairStatus"]?.ToString() ?? "",
                StatusId: Convert.ToInt32(dataReader["lRepairStatusID"]),
                DateApproved: dateApproved?.ToString("MM/dd/yyyy"),
                EstDelivery: estDel?.ToString("MM/dd/yyyy"),
                AmountApproved: dataReader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(dataReader["dblAmtRepair"]),
                Tech: dataReader["sTechName"]?.ToString(),
                IsUrgent: Convert.ToBoolean(dataReader["bHotList"])
            ));
        }

        return Ok(new DashboardRepairsResponse(repairs, totalCount));
    }
}
