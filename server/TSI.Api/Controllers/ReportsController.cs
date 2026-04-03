using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Text;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // ── Repair Volume by Period ──
    [HttpGet("repair-volume")]
    public async Task<IActionResult> RepairVolume(
        [FromQuery] string period = "month",
        [FromQuery] int months = 12)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var groupBy = period == "quarter"
            ? "CONCAT('Q', DATEPART(QUARTER, r.dtDateIn), ' ', YEAR(r.dtDateIn))"
            : "FORMAT(r.dtDateIn, 'yyyy-MM')";

        var sql = $@"
            SELECT {groupBy} AS Period,
                   COUNT(*) AS TotalRepairs,
                   SUM(CASE WHEN rs.sRepairStatus = 'Shipped' THEN 1 ELSE 0 END) AS Shipped,
                   SUM(CASE WHEN rs.sRepairStatus NOT IN ('Shipped','Cancelled') THEN 1 ELSE 0 END) AS InProgress,
                   ISNULL(SUM(r.dblAmtRepair), 0) AS Revenue
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE r.dtDateIn >= DATEADD(MONTH, -@months, GETDATE())
            GROUP BY {groupBy}
            ORDER BY MIN(r.dtDateIn)";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("Period,Total Repairs,Shipped,In Progress,Revenue\n");
        while (await reader.ReadAsync())
        {
            csv.AppendLine($"{reader["Period"]},{reader["TotalRepairs"]},{reader["Shipped"]},{reader["InProgress"]},{Convert.ToDecimal(reader["Revenue"]):F2}");
        }
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"repair-volume-{DateTime.Now:yyyyMMdd}.csv");
    }

    // ── TAT Analysis ──
    [HttpGet("tat-analysis")]
    public async Task<IActionResult> TatAnalysis([FromQuery] int months = 6)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT FORMAT(r.dtDateOut, 'yyyy-MM') AS Period,
                   ISNULL(st.sScopeTypeDesc, 'Unknown') AS ScopeType,
                   COUNT(*) AS RepairCount,
                   AVG(CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS DECIMAL(10,1))) AS AvgTAT,
                   MIN(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut)) AS MinTAT,
                   MAX(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut)) AS MaxTAT,
                   SUM(CASE WHEN DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) <= 14 THEN 1 ELSE 0 END) AS OnTime
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            WHERE rs.sRepairStatus = 'Shipped'
              AND r.dtDateOut >= DATEADD(MONTH, -@months, GETDATE())
            GROUP BY FORMAT(r.dtDateOut, 'yyyy-MM'), st.sScopeTypeDesc
            ORDER BY MIN(r.dtDateOut), st.sScopeTypeDesc";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("Period,Scope Type,Repair Count,Avg TAT (days),Min TAT,Max TAT,On Time (<=14d)\n");
        while (await reader.ReadAsync())
        {
            csv.AppendLine($"{reader["Period"]},{Esc(reader["ScopeType"])},{reader["RepairCount"]},{Convert.ToDecimal(reader["AvgTAT"]):F1},{reader["MinTAT"]},{reader["MaxTAT"]},{reader["OnTime"]}");
        }
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"tat-analysis-{DateTime.Now:yyyyMMdd}.csv");
    }

    // ── Revenue by Client ──
    [HttpGet("revenue-client")]
    public async Task<IActionResult> RevenueByClient([FromQuery] int months = 12)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT c.sClientName1 AS Client,
                   COUNT(*) AS RepairCount,
                   ISNULL(SUM(r.dblAmtRepair), 0) AS TotalRevenue,
                   ISNULL(AVG(r.dblAmtRepair), 0) AS AvgRepairValue,
                   AVG(CAST(DATEDIFF(DAY, r.dtDateIn, ISNULL(r.dtDateOut, GETDATE())) AS DECIMAL(10,1))) AS AvgTAT
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE rs.sRepairStatus = 'Shipped'
              AND r.dtDateOut >= DATEADD(MONTH, -@months, GETDATE())
            GROUP BY c.sClientName1
            ORDER BY SUM(r.dblAmtRepair) DESC";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("Client,Repair Count,Total Revenue,Avg Repair Value,Avg TAT (days)\n");
        while (await reader.ReadAsync())
        {
            csv.AppendLine($"{Esc(reader["Client"])},{reader["RepairCount"]},{Convert.ToDecimal(reader["TotalRevenue"]):F2},{Convert.ToDecimal(reader["AvgRepairValue"]):F2},{Convert.ToDecimal(reader["AvgTAT"]):F1}");
        }
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"revenue-by-client-{DateTime.Now:yyyyMMdd}.csv");
    }

    // ── Client Report Card (PDF-ready data) ──
    [HttpGet("client-scorecard")]
    public async Task<IActionResult> ClientScorecard([FromQuery] int months = 12)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT c.sClientName1 AS Client,
                   COUNT(*) AS Repairs,
                   ISNULL(SUM(r.dblAmtRepair), 0) AS Revenue,
                   AVG(CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS DECIMAL(10,1))) AS AvgTAT,
                   SUM(CASE WHEN DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) <= 14 THEN 1 ELSE 0 END) AS OnTime,
                   COUNT(DISTINCT r.lDepartmentKey) AS Departments,
                   SUM(CASE WHEN rit.sFixType = 'W' THEN 1 ELSE 0 END) AS WarrantyItems,
                   COUNT(rit.lRepairItemTranKey) AS TotalItems
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairItemTran rit ON rit.lRepairKey = r.lRepairKey
            WHERE rs.sRepairStatus = 'Shipped'
              AND r.dtDateOut >= DATEADD(MONTH, -@months, GETDATE())
            GROUP BY c.sClientName1
            ORDER BY SUM(r.dblAmtRepair) DESC";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("Client,Repairs Completed,Revenue,Avg TAT (days),On-Time Count,On-Time %,Departments,Warranty %\n");
        while (await reader.ReadAsync())
        {
            var repairs = Convert.ToInt32(reader["Repairs"]);
            var onTime = Convert.ToInt32(reader["OnTime"]);
            var totalItems = Convert.ToInt32(reader["TotalItems"]);
            var warrantyItems = Convert.ToInt32(reader["WarrantyItems"]);
            var onTimePct = repairs > 0 ? Math.Round((decimal)onTime / repairs * 100, 1) : 0;
            var warrantyPct = totalItems > 0 ? Math.Round((decimal)warrantyItems / totalItems * 100, 1) : 0;
            csv.AppendLine($"{Esc(reader["Client"])},{repairs},{Convert.ToDecimal(reader["Revenue"]):F2},{Convert.ToDecimal(reader["AvgTAT"]):F1},{onTime},{onTimePct}%,{reader["Departments"]},{warrantyPct}%");
        }
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"client-scorecard-{DateTime.Now:yyyyMMdd}.csv");
    }

    // ── Technician Productivity ──
    [HttpGet("tech-productivity")]
    public async Task<IActionResult> TechProductivity([FromQuery] int months = 3)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT ISNULL(t.sTechName, 'Unassigned') AS Tech,
                   COUNT(*) AS RepairsCompleted,
                   ISNULL(SUM(r.dblAmtRepair), 0) AS Revenue,
                   AVG(CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS DECIMAL(10,1))) AS AvgTAT,
                   SUM(CASE WHEN DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) <= 14 THEN 1 ELSE 0 END) AS OnTime
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            WHERE rs.sRepairStatus = 'Shipped'
              AND r.dtDateOut >= DATEADD(MONTH, -@months, GETDATE())
            GROUP BY t.sTechName
            ORDER BY COUNT(*) DESC";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("Technician,Repairs Completed,Revenue,Avg TAT (days),On-Time Count\n");
        while (await reader.ReadAsync())
            csv.AppendLine($"{Esc(reader["Tech"])},{reader["RepairsCompleted"]},{Convert.ToDecimal(reader["Revenue"]):F2},{Convert.ToDecimal(reader["AvgTAT"]):F1},{reader["OnTime"]}");
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"tech-productivity-{DateTime.Now:yyyyMMdd}.csv");
    }

    // ── Warranty Claims ──
    [HttpGet("warranty-claims")]
    public async Task<IActionResult> WarrantyClaims([FromQuery] int months = 12)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT c.sClientName1 AS Client,
                   ISNULL(ri.sItemDescription, 'Unknown') AS RepairItem,
                   COUNT(*) AS WarrantyCount,
                   ISNULL(SUM(rit.dblRepairPriceBase), 0) AS ListValue
            FROM tblRepairItemTran rit
            JOIN tblRepair r ON r.lRepairKey = rit.lRepairKey
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            WHERE rit.sFixType = 'W'
              AND r.dtDateIn >= DATEADD(MONTH, -@months, GETDATE())
            GROUP BY c.sClientName1, ri.sItemDescription
            ORDER BY COUNT(*) DESC";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("Client,Repair Item,Warranty Count,List Value\n");
        while (await reader.ReadAsync())
            csv.AppendLine($"{Esc(reader["Client"])},{Esc(reader["RepairItem"])},{reader["WarrantyCount"]},{Convert.ToDecimal(reader["ListValue"]):F2}");
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"warranty-claims-{DateTime.Now:yyyyMMdd}.csv");
    }

    // ── Scope Repair List ──
    [HttpGet("scope-repair-list")]
    public async Task<IActionResult> ScopeRepairList([FromQuery] int months = 6)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT r.sWorkOrderNumber AS WO,
                   CONVERT(varchar, r.dtDateIn, 101) AS DateIn,
                   CONVERT(varchar, r.dtDateOut, 101) AS DateOut,
                   rs.sRepairStatus AS Status,
                   ISNULL(c.sClientName1, '') AS Client,
                   ISNULL(dep.sDepartmentName, '') AS Dept,
                   ISNULL(st.sScopeTypeDesc, '') AS ScopeType,
                   ISNULL(s.sSerialNumber, '') AS Serial,
                   ISNULL(t.sTechName, '') AS Tech,
                   DATEDIFF(DAY, r.dtDateIn, ISNULL(r.dtDateOut, GETDATE())) AS TAT,
                   ISNULL(r.dblAmtRepair, 0) AS Amount
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment dep ON dep.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = dep.lClientKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            WHERE r.dtDateIn >= DATEADD(MONTH, -@months, GETDATE())
            ORDER BY r.dtDateIn DESC";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@months", months);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var csv = new StringBuilder("WO,Date In,Date Out,Status,Client,Dept,Scope Type,Serial,Tech,TAT (days),Amount\n");
        while (await reader.ReadAsync())
            csv.AppendLine($"{reader["WO"]},{reader["DateIn"]},{reader["DateOut"]},{Esc(reader["Status"])},{Esc(reader["Client"])},{Esc(reader["Dept"])},{Esc(reader["ScopeType"])},{reader["Serial"]},{Esc(reader["Tech"])},{reader["TAT"]},{Convert.ToDecimal(reader["Amount"]):F2}");
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"scope-repair-list-{DateTime.Now:yyyyMMdd}.csv");
    }

    private static string Esc(object? val) =>
        $"\"{val?.ToString()?.Replace("\"", "\"\"") ?? ""}\"";
}
