using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/outsource-validation")]
[Authorize]
public class OutsourceValidationController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "r.bOutsourced = 1" };

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR s.sSerialNumber LIKE @search OR c.sClientName1 LIKE @search OR v.sVendName1 LIKE @search)");

        if (!string.IsNullOrWhiteSpace(dateFrom))
            where.Add("r.dtDateIn >= @dateFrom");

        if (!string.IsNullOrWhiteSpace(dateTo))
            where.Add("r.dtDateIn < DATEADD(day, 1, @dateTo)");

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblVendor v ON v.lVendorKey = r.lVendorKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(v.sVendName1, '') AS sVendName1,
                   r.dtDateIn, r.dtDateOut,
                   ISNULL(r.dblOutSourceCost, 0) AS dblOutSourceCost,
                   ISNULL(r.dblAmtRepair, 0) AS dblAmtRepair,
                   DATEDIFF(day, r.dtDateIn, ISNULL(r.dtDateOut, GETDATE())) AS DaysOut,
                   r.lRepairStatusID
            FROM tblRepair r
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblVendor v ON v.lVendorKey = r.lVendorKey
            {whereClause}
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.Parameters.AddWithValue("@search", string.IsNullOrWhiteSpace(search) ? (object)DBNull.Value : $"%{search}%");
        if (!string.IsNullOrWhiteSpace(dateFrom)) countCmd.Parameters.AddWithValue("@dateFrom", dateFrom);
        if (!string.IsNullOrWhiteSpace(dateTo)) countCmd.Parameters.AddWithValue("@dateTo", dateTo);
        // Only add @search if used in query
        if (string.IsNullOrWhiteSpace(search))
        {
            // Remove unused parameter
            countCmd.Parameters.Clear();
            if (!string.IsNullOrWhiteSpace(dateFrom)) countCmd.Parameters.AddWithValue("@dateFrom", dateFrom);
            if (!string.IsNullOrWhiteSpace(dateTo)) countCmd.Parameters.AddWithValue("@dateTo", dateTo);
        }
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(dateFrom)) dataCmd.Parameters.AddWithValue("@dateFrom", dateFrom);
        if (!string.IsNullOrWhiteSpace(dateTo)) dataCmd.Parameters.AddWithValue("@dateTo", dateTo);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        var items = new List<OutsourceListItem>();
        await using var reader = await dataCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var vendorCost = Convert.ToDouble(reader["dblOutSourceCost"]);
            var tsiCharge = Convert.ToDouble(reader["dblAmtRepair"]);
            var marginDollar = tsiCharge - vendorCost;
            var marginPct = tsiCharge > 0 ? (marginDollar / tsiCharge) * 100 : 0;
            var dateOut = reader["dtDateOut"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateOut"]);
            var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
            var daysOut = reader["DaysOut"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysOut"]);

            var status = dateOut != null ? "Returned" : "At Vendor";

            if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all" &&
                !string.Equals(status, statusFilter, StringComparison.OrdinalIgnoreCase))
                continue;

            items.Add(new OutsourceListItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                VendorName: reader["sVendName1"]?.ToString() ?? "",
                SentDate: dateIn?.ToString("MM/dd/yyyy"),
                DaysOut: daysOut,
                VendorCost: vendorCost,
                TsiCharge: tsiCharge,
                MarginDollar: marginDollar,
                MarginPct: Math.Round(marginPct, 1),
                Status: status
            ));
        }

        return Ok(new OutsourceListResponse(items, totalCount));
    }

    [HttpGet("vendors")]
    public async Task<IActionResult> GetVendors()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = "SELECT lVendorKey, ISNULL(sVendName1, '') AS sVendName1 FROM tblVendor WHERE sVendName1 IS NOT NULL ORDER BY sVendName1";
        await using var cmd = new SqlCommand(sql, conn);
        var list = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                vendorKey = Convert.ToInt32(reader["lVendorKey"]),
                name = reader["sVendName1"]?.ToString() ?? ""
            });
        }
        return Ok(list);
    }

    [HttpPut("{id}/send-to-vendor")]
    public async Task<IActionResult> SendToVendor(int id, [FromBody] SendToVendorRequest req)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepair
            SET bOutsourced = 1,
                lVendorKey = @vendorKey,
                dblOutSourceCost = @cost,
                sShipTrackingNumberVendor = @tracking
            WHERE lRepairKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@vendorKey", req.VendorKey);
        cmd.Parameters.AddWithValue("@cost", req.OutsourceCost);
        cmd.Parameters.AddWithValue("@tracking", (object?)req.TrackingNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rows > 0 });
    }

    [HttpPut("{id}/receive-back")]
    public async Task<IActionResult> ReceiveBack(int id, [FromBody] ReceiveBackRequest req)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepair
            SET dtDateOut = GETDATE(),
                sShipTrackingNumberVendorIn = @trackingReturn
            WHERE lRepairKey = @id AND bOutsourced = 1
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@trackingReturn", (object?)req.TrackingNumberReturn ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rows > 0 });
    }

    [HttpPut("{id}/validate")]
    public async Task<IActionResult> Validate(int id, [FromBody] ValidationChecklistRequest req)
    {
        // Validation status is tracked via lRepairStatusID convention:
        // We use a simple notes-based approach since there's no dedicated validation column
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Store validation note and update repair notes
        const string sql = """
            UPDATE tblRepair
            SET sRepairNotes = CASE
                WHEN sRepairNotes IS NULL THEN @note
                ELSE sRepairNotes + CHAR(13) + CHAR(10) + @note
                END
            WHERE lRepairKey = @id AND bOutsourced = 1
            """;

        var note = $"[VALIDATION {req.Status.ToUpper()} {DateTime.UtcNow:yyyy-MM-dd}] {req.Notes ?? ""}".Trim();
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@note", note);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rows > 0, status = req.Status });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(ISNULL(r.dblOutSourceCost, 0)) AS OutsourceSpend,
                AVG(CASE WHEN r.dblAmtRepair > 0
                    THEN ((r.dblAmtRepair - ISNULL(r.dblOutSourceCost, 0)) / r.dblAmtRepair) * 100
                    ELSE 0 END) AS AvgMarginPct,
                SUM(CASE WHEN (r.dblAmtRepair - ISNULL(r.dblOutSourceCost, 0)) < 0 THEN 1 ELSE 0 END) AS NegativeMargin,
                AVG(DATEDIFF(day, r.dtDateIn, ISNULL(r.dtDateOut, GETDATE()))) AS AvgDaysOut
            FROM tblRepair r
            WHERE r.bOutsourced = 1
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var total = Convert.ToInt32(reader["Total"]);
        var spend = reader["OutsourceSpend"] == DBNull.Value ? 0 : Convert.ToDouble(reader["OutsourceSpend"]);
        var avgMargin = reader["AvgMarginPct"] == DBNull.Value ? 0 : Math.Round(Convert.ToDouble(reader["AvgMarginPct"]), 1);
        var negMargin = reader["NegativeMargin"] == DBNull.Value ? 0 : Convert.ToInt32(reader["NegativeMargin"]);
        var avgDays = reader["AvgDaysOut"] == DBNull.Value ? 0 : Convert.ToInt32(reader["AvgDaysOut"]);
        await reader.CloseAsync();

        // Top vendor by spend
        const string vendorSql = """
            SELECT TOP 1 v.sVendName1, SUM(ISNULL(r.dblOutSourceCost, 0)) AS VendorSpend
            FROM tblRepair r
            LEFT JOIN tblVendor v ON v.lVendorKey = r.lVendorKey
            WHERE r.bOutsourced = 1 AND v.sVendName1 IS NOT NULL
            GROUP BY v.sVendName1
            ORDER BY VendorSpend DESC
            """;
        await using var vendorCmd = new SqlCommand(vendorSql, conn);
        var topVendor = "--";
        var topVendorSpend = 0.0;
        await using var vr = await vendorCmd.ExecuteReaderAsync();
        if (await vr.ReadAsync())
        {
            topVendor = vr["sVendName1"]?.ToString() ?? "--";
            topVendorSpend = Convert.ToDouble(vr["VendorSpend"]);
        }

        return Ok(new OutsourceStats(total, spend, avgMargin, negMargin, topVendor, topVendorSpend, avgDays));
    }
}
