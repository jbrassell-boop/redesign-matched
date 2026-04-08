using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/workspace")]
[Authorize]
public class WorkspaceController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetWorkspace()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var repairQueue = await GetRepairQueue(conn);
        var overdue = await GetOverdue(conn);
        var invoices = await GetInvoices(conn);
        var contracts = await GetContractsExpiring(conn);

        return Ok(new WorkspaceData(repairQueue, overdue, invoices, contracts));
    }

    private static async Task<RepairQueueWidget> GetRepairQueue(SqlConnection conn)
    {
        const string sql = """
            SELECT
                SUM(CASE WHEN rs.sRepairStatus LIKE '%Received%' OR rs.sRepairStatus LIKE '%Logged%' THEN 1 ELSE 0 END) AS Received,
                SUM(CASE WHEN rs.sRepairStatus LIKE '%Repair%' OR rs.sRepairStatus LIKE '%Progress%' THEN 1 ELSE 0 END) AS InRepair,
                SUM(CASE WHEN rs.sRepairStatus LIKE '%QC%' OR rs.sRepairStatus LIKE '%Hold%' OR rs.sRepairStatus LIKE '%Inspect%' THEN 1 ELSE 0 END) AS QcHold,
                SUM(CASE WHEN rs.sRepairStatus LIKE '%Ship%' OR rs.sRepairStatus LIKE '%Complete%' OR rs.sRepairStatus LIKE '%Ready%' THEN 1 ELSE 0 END) AS ShipReady,
                SUM(CASE WHEN DATEDIFF(day, r.dtDateIn, GETDATE()) > 7 THEN 1 ELSE 0 END) AS Overdue
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE r.dtDateOut IS NULL
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var received = reader["Received"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Received"]);
        var inRepair = reader["InRepair"] == DBNull.Value ? 0 : Convert.ToInt32(reader["InRepair"]);
        var qcHold = reader["QcHold"] == DBNull.Value ? 0 : Convert.ToInt32(reader["QcHold"]);
        var shipReady = reader["ShipReady"] == DBNull.Value ? 0 : Convert.ToInt32(reader["ShipReady"]);
        var overdue = reader["Overdue"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Overdue"]);
        await reader.CloseAsync();

        // Recent 5 open repairs
        const string recentSql = """
            SELECT TOP 5 r.sWorkOrderNumber,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            WHERE r.dtDateOut IS NULL
            ORDER BY r.dtDateIn DESC
            """;
        await using var recentCmd = new SqlCommand(recentSql, conn);
        recentCmd.CommandTimeout = 30;
        var items = new List<RepairQueueItem>();
        await using var rr = await recentCmd.ExecuteReaderAsync();
        while (await rr.ReadAsync())
        {
            items.Add(new RepairQueueItem(
                Wo: rr["sWorkOrderNumber"]?.ToString() ?? "",
                Client: rr["sClientName1"]?.ToString() ?? "",
                ScopeType: rr["sScopeTypeDesc"]?.ToString() ?? "",
                DaysIn: rr["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(rr["DaysIn"]),
                Status: rr["sRepairStatus"]?.ToString() ?? ""
            ));
        }

        return new RepairQueueWidget(received, inRepair, qcHold, shipReady, overdue, items);
    }

    private static async Task<OverdueWidget> GetOverdue(SqlConnection conn)
    {
        const string sql = """
            SELECT TOP 5 r.sWorkOrderNumber,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
            FROM tblRepair r
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE r.dtDateOut IS NULL
                  AND DATEDIFF(day, r.dtDateIn, GETDATE()) > 7
            ORDER BY r.dtDateIn ASC
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        var items = new List<OverdueItem>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            items.Add(new OverdueItem(
                Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
                Sla: 7
            ));
        }
        return new OverdueWidget(items);
    }

    private static async Task<InvoicesWidget> GetInvoices(SqlConnection conn)
    {
        const string sql = """
            SELECT
                ISNULL(SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dblAmtRepair > 0 THEN r.dblAmtRepair ELSE 0 END), 0) AS TotalOutstanding,
                ISNULL(SUM(CASE WHEN DATEDIFF(day, r.dtDateOut, GETDATE()) > 30 AND r.dblAmtRepair > 0 THEN r.dblAmtRepair ELSE 0 END), 0) AS PastDue30,
                ISNULL(SUM(CASE WHEN DATEDIFF(day, r.dtDateOut, GETDATE()) > 60 AND r.dblAmtRepair > 0 THEN r.dblAmtRepair ELSE 0 END), 0) AS PastDue60,
                ISNULL(SUM(CASE WHEN MONTH(r.dtDateOut) = MONTH(GETDATE()) AND YEAR(r.dtDateOut) = YEAR(GETDATE()) AND r.dblAmtRepair > 0 THEN r.dblAmtRepair ELSE 0 END), 0) AS InvoicedThisMonth
            FROM tblRepair r
            WHERE r.dtDateOut IS NOT NULL
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        var result = new InvoicesWidget(
            TotalOutstanding: Convert.ToDouble(reader["TotalOutstanding"]),
            PastDue30: Convert.ToDouble(reader["PastDue30"]),
            PastDue60: Convert.ToDouble(reader["PastDue60"]),
            InvoicedThisMonth: Convert.ToDouble(reader["InvoicedThisMonth"])
        );
        return result;
    }

    private static async Task<ContractsWidget> GetContractsExpiring(SqlConnection conn)
    {
        const string sql = """
            SELECT TOP 5 ISNULL(c.sClientName1, '') AS sClientName1,
                   con.dtDateTermination,
                   DATEDIFF(day, GETDATE(), con.dtDateTermination) AS DaysUntil
            FROM tblContract con
            LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
            WHERE con.dtDateTermination >= GETDATE()
                  AND con.dtDateTermination <= DATEADD(day, 60, GETDATE())
            ORDER BY con.dtDateTermination ASC
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        var items = new List<ContractExpiringItem>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var expDate = reader["dtDateTermination"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateTermination"]);
            items.Add(new ContractExpiringItem(
                Client: reader["sClientName1"]?.ToString() ?? "",
                ExpirationDate: expDate?.ToString("MM/dd/yyyy") ?? "",
                DaysUntil: reader["DaysUntil"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysUntil"])
            ));
        }
        return new ContractsWidget(items);
    }
}
