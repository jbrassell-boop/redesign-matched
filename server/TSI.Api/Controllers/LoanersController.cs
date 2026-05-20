using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/loaners")]
[Authorize]
public class LoanersController(
    IConfiguration config,
    IInvoiceNumberService invoiceNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // ── List (latest transaction per scope) ──────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null,
        [FromQuery] int? salesRepKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (st.sScopeTypeDesc LIKE @search
                 OR s.sSerialNumber LIKE @search
                 OR c.sClientName1 LIKE @search
                 OR d.sDepartmentName LIKE @search
                 OR lt.sTrackingNumber LIKE @search
                 OR lt.sPurchaseOrder LIKE @search
                 OR r.sWorkOrderNumber LIKE @search)
                """);

        if (salesRepKey.HasValue)
            where.Add("lt.lSalesRepKey = @salesRepKey");

        // Status filtering applied after derivation via outer WHERE on CTE
        var statusWhere = "";
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "All")
            statusWhere = "AND derived.Status = @statusFilter";

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        // CTE: get latest lLoanerTranKey per lScopeKey
        var sql = $"""
            ;WITH LatestTran AS (
                SELECT lScopeKey, MAX(lLoanerTranKey) AS MaxTranKey
                FROM tblLoanerTran
                WHERE lScopeKey IS NOT NULL
                GROUP BY lScopeKey
            ),
            derived AS (
                SELECT lt.lLoanerTranKey,
                       lt.lScopeKey,
                       ISNULL(st.sScopeTypeDesc, '') AS ScopeType,
                       ISNULL(s.sSerialNumber, '') AS Serial,
                       CASE
                           WHEN lt.lRepairKey IS NOT NULL AND r.sWorkOrderNumber IS NOT NULL AND lt.sDateIn IS NULL THEN 'Repair'
                           WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 21 THEN 'Overdue'
                           WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN 'Out'
                           ELSE 'Available'
                       END AS Status,
                       CASE
                           WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN ISNULL(c.sClientName1, '')
                           ELSE ''
                       END AS Client,
                       CASE
                           WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN ISNULL(d.sDepartmentName, '')
                           ELSE ''
                       END AS Dept,
                       CASE
                           WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN ISNULL(sr.sRepFirst + ' ' + sr.sRepLast, '')
                           ELSE ''
                       END AS Rep,
                       CASE
                           WHEN lt.sDateOut IS NOT NULL THEN
                               DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime),
                                   CASE WHEN lt.sDateIn IS NOT NULL THEN TRY_CAST(lt.sDateIn AS datetime) ELSE GETDATE() END)
                           ELSE 0
                       END AS DaysOut,
                       ISNULL(lt.sPurchaseOrder, '') AS Agreement,
                       ISNULL(lt.sTrackingNumber, '') AS TrackingNumber,
                       ISNULL(lt.sPurchaseOrder, '') AS PurchaseOrder,
                       ISNULL(stc.sScopeTypeCategory, '') AS Category,
                       CAST(0 AS BIT) AS RecallNeeded
                FROM LatestTran lat
                INNER JOIN tblLoanerTran lt ON lt.lLoanerTranKey = lat.MaxTranKey
                LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
                LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
                LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
                LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
                LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = lt.lSalesRepKey
                {whereClause}
            )
            SELECT *, COUNT(*) OVER() AS TotalCount
            FROM derived
            WHERE 1=1 {statusWhere}
            ORDER BY derived.lLoanerTranKey DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) cmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (salesRepKey.HasValue) cmd.Parameters.AddWithValue("@salesRepKey", salesRepKey.Value);
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "All")
            cmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        cmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        cmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<LoanerListItemDto>();
        var totalCount = 0;
        while (await reader.ReadAsync())
        {
            totalCount = Convert.ToInt32(reader["TotalCount"]);
            items.Add(new LoanerListItemDto(
                LoanerTranKey: Convert.ToInt32(reader["lLoanerTranKey"]),
                ScopeKey: reader["lScopeKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lScopeKey"]),
                ScopeType: reader["ScopeType"]?.ToString() ?? "",
                Serial: reader["Serial"]?.ToString() ?? "",
                Status: reader["Status"]?.ToString() ?? "",
                Client: reader["Client"]?.ToString() ?? "",
                Dept: reader["Dept"]?.ToString() ?? "",
                Rep: reader["Rep"]?.ToString() ?? "",
                DaysOut: reader["DaysOut"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysOut"]),
                Agreement: reader["Agreement"]?.ToString() ?? "",
                TrackingNumber: reader["TrackingNumber"]?.ToString() ?? "",
                PurchaseOrder: reader["PurchaseOrder"]?.ToString() ?? "",
                Category: reader["Category"]?.ToString() ?? "",
                RecallNeeded: Convert.ToBoolean(reader["RecallNeeded"])
            ));
        }

        return Ok(new LoanerListResponseDto(items, totalCount));
    }

    // ── Stats ────────────────────────────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Stats based on latest transaction per scope
        var sql = """
            ;WITH LatestTran AS (
                SELECT lScopeKey, MAX(lLoanerTranKey) AS MaxTranKey
                FROM tblLoanerTran
                WHERE lScopeKey IS NOT NULL
                GROUP BY lScopeKey
            )
            SELECT
                SUM(CASE
                    WHEN lt.sDateIn IS NOT NULL OR lt.sDateOut IS NULL THEN 1 ELSE 0
                END) AS Available,
                SUM(CASE
                    WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL
                         AND (lt.lRepairKey IS NULL OR r.sWorkOrderNumber IS NULL)
                         AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) <= 21 THEN 1 ELSE 0
                END) AS OutCount,
                SUM(CASE
                    WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL
                         AND (lt.lRepairKey IS NULL OR r.sWorkOrderNumber IS NULL)
                         AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 21 THEN 1 ELSE 0
                END) AS OverdueCount,
                SUM(CASE
                    WHEN lt.lRepairKey IS NOT NULL AND r.sWorkOrderNumber IS NOT NULL AND lt.sDateIn IS NULL THEN 1 ELSE 0
                END) AS RepairCount,
                (SELECT COUNT(*) FROM tblTaskLoaners) AS Requests
            FROM LatestTran lat
            INNER JOIN tblLoanerTran lt ON lt.lLoanerTranKey = lat.MaxTranKey
            LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new LoanerStatsDto(
            Available: reader["Available"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Available"]),
            Out: reader["OutCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OutCount"]),
            Overdue: reader["OverdueCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OverdueCount"]),
            Repair: reader["RepairCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["RepairCount"]),
            Requests: reader["Requests"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Requests"])
        ));
    }

    // ── Detail (by scopeKey) ─────────────────────────────────────────────────

    [HttpGet("{scopeKey:int}")]
    public async Task<IActionResult> GetDetail(int scopeKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT TOP 1
                lt.lLoanerTranKey,
                lt.lScopeKey,
                ISNULL(st.sScopeTypeDesc, '') AS ScopeType,
                ISNULL(s.sSerialNumber, '') AS Serial,
                CASE
                    WHEN lt.lRepairKey IS NOT NULL AND r.sWorkOrderNumber IS NOT NULL THEN 'Repair'
                    WHEN lt.sDateIn IS NOT NULL THEN 'Returned'
                    WHEN lt.sDateOut IS NOT NULL AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 21 THEN 'Overdue'
                    WHEN lt.sDateOut IS NOT NULL THEN 'Out'
                    ELSE 'Available'
                END AS Status,
                CASE
                    WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN ISNULL(c.sClientName1, '')
                    ELSE ''
                END AS Client,
                CASE
                    WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN ISNULL(d.sDepartmentName, '')
                    ELSE ''
                END AS Dept,
                CASE
                    WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN ISNULL(sr.sRepFirst + ' ' + sr.sRepLast, '')
                    ELSE ''
                END AS Rep,
                ISNULL(dm.sDeliveryDesc, '') AS DeliveryMethod,
                ISNULL(lt.sPurchaseOrder, '') AS PurchaseOrder,
                ISNULL(lt.sTrackingNumber, '') AS TrackingNumber,
                ISNULL(s.sLoanerRackPosition, '') AS RackPosition,
                ISNULL(lt.sDateOut, '') AS DateOut,
                ISNULL(lt.sDateIn, '') AS DateIn,
                ISNULL(cu.sUserFullName, '') AS CreatedBy,
                CASE WHEN lt.dtCreateDate IS NOT NULL THEN CONVERT(NVARCHAR, lt.dtCreateDate, 101) ELSE '' END AS CreatedDate,
                ISNULL(stc.sScopeTypeCategory, '') AS Category,
                ISNULL(s.bOnSiteLoaner, 0) AS OnSiteLoaner
            FROM tblLoanerTran lt
            LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = lt.lSalesRepKey
            LEFT JOIN tblDeliveryMethod dm ON dm.lDeliveryMethodKey = lt.lDeliveryMethodKey
            LEFT JOIN tblUsers cu ON cu.lUserKey = lt.lCreateUser
            WHERE lt.lScopeKey = @scopeKey
            ORDER BY lt.lLoanerTranKey DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@scopeKey", scopeKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound();

        return Ok(new LoanerDetailDto(
            LoanerTranKey: Convert.ToInt32(reader["lLoanerTranKey"]),
            ScopeKey: reader["lScopeKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lScopeKey"]),
            ScopeType: reader["ScopeType"]?.ToString() ?? "",
            Serial: reader["Serial"]?.ToString() ?? "",
            Status: reader["Status"]?.ToString() ?? "",
            Client: reader["Client"]?.ToString() ?? "",
            Dept: reader["Dept"]?.ToString() ?? "",
            Rep: reader["Rep"]?.ToString() ?? "",
            DeliveryMethod: reader["DeliveryMethod"]?.ToString() ?? "",
            PurchaseOrder: reader["PurchaseOrder"]?.ToString() ?? "",
            TrackingNumber: reader["TrackingNumber"]?.ToString() ?? "",
            RackPosition: reader["RackPosition"]?.ToString() ?? "",
            DateOut: reader["DateOut"]?.ToString() ?? "",
            DateIn: reader["DateIn"]?.ToString() ?? "",
            CreatedBy: reader["CreatedBy"]?.ToString() ?? "",
            CreatedDate: reader["CreatedDate"]?.ToString() ?? "",
            Category: reader["Category"]?.ToString() ?? "",
            OnSiteLoaner: Convert.ToBoolean(reader["OnSiteLoaner"])
        ));
    }

    // ── History (all transactions for a scope) ───────────────────────────────

    [HttpGet("{scopeKey:int}/history")]
    public async Task<IActionResult> GetHistory(int scopeKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT lt.lLoanerTranKey,
                   ISNULL(lt.sDateOut, '') AS DateOut,
                   ISNULL(lt.sDateIn, '') AS DateIn,
                   ISNULL(c.sClientName1, '') AS Client,
                   ISNULL(d.sDepartmentName, '') AS Dept,
                   CASE
                       WHEN lt.sDateOut IS NOT NULL THEN
                           DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime),
                               CASE WHEN lt.sDateIn IS NOT NULL THEN TRY_CAST(lt.sDateIn AS datetime) ELSE GETDATE() END)
                       ELSE 0
                   END AS DaysOut,
                   ISNULL(lt.sPurchaseOrder, '') AS Agreement
            FROM tblLoanerTran lt
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE lt.lScopeKey = @scopeKey
            ORDER BY lt.lLoanerTranKey DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@scopeKey", scopeKey);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<LoanerHistoryItemDto>();
        while (await reader.ReadAsync())
        {
            items.Add(new LoanerHistoryItemDto(
                LoanerTranKey: Convert.ToInt32(reader["lLoanerTranKey"]),
                DateOut: reader["DateOut"]?.ToString() ?? "",
                DateIn: reader["DateIn"]?.ToString() ?? "",
                Client: reader["Client"]?.ToString() ?? "",
                Dept: reader["Dept"]?.ToString() ?? "",
                DaysOut: reader["DaysOut"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysOut"]),
                Agreement: reader["Agreement"]?.ToString() ?? ""
            ));
        }

        return Ok(items);
    }

    // ── Category Availability ────────────────────────────────────────────────

    [HttpGet("category-availability")]
    public async Task<IActionResult> GetCategoryAvailability()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Available: scopes where latest loaner tran has sDateIn set (returned) or no tran exists
        // Out: scopes where latest loaner tran has sDateOut set but no sDateIn
        // Needed: active repairs with bLoanerRequested = 1 grouped by scope category
        var sql = """
            ;WITH LatestTran AS (
                SELECT lScopeKey, MAX(lLoanerTranKey) AS MaxTranKey
                FROM tblLoanerTran
                WHERE lScopeKey IS NOT NULL
                GROUP BY lScopeKey
            ),
            ScopeStatus AS (
                SELECT s.lScopeKey,
                       ISNULL(stc.sScopeTypeCategory, 'Unknown') AS Category,
                       CASE
                           WHEN lt.sDateIn IS NOT NULL OR lat.MaxTranKey IS NULL THEN 'Available'
                           WHEN lt.sDateOut IS NOT NULL AND lt.sDateIn IS NULL THEN 'Out'
                           ELSE 'Available'
                       END AS CurrentStatus
                FROM tblScope s
                INNER JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
                LEFT JOIN LatestTran lat ON lat.lScopeKey = s.lScopeKey
                LEFT JOIN tblLoanerTran lt ON lt.lLoanerTranKey = lat.MaxTranKey
                WHERE s.bOnSiteLoaner = 1 OR EXISTS (
                    SELECT 1 FROM tblLoanerTran lt2 WHERE lt2.lScopeKey = s.lScopeKey
                )
            ),
            Availability AS (
                SELECT Category,
                       SUM(CASE WHEN CurrentStatus = 'Available' THEN 1 ELSE 0 END) AS Available,
                       SUM(CASE WHEN CurrentStatus = 'Out' THEN 1 ELSE 0 END) AS OutCount
                FROM ScopeStatus
                GROUP BY Category
            ),
            Needed AS (
                SELECT ISNULL(stc.sScopeTypeCategory, 'Unknown') AS Category,
                       COUNT(*) AS Needed
                FROM tblRepair r
                INNER JOIN tblScope s ON s.lScopeKey = r.lScopeKey
                INNER JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
                WHERE r.bLoanerRequested = 1
                  AND r.dtDateOut IS NULL
                  AND r.dtDateIn IS NOT NULL
                  AND (r.sWasLoanerProduced IS NULL OR r.sWasLoanerProduced = '')
                GROUP BY stc.sScopeTypeCategory
            )
            SELECT ISNULL(a.Category, n.Category) AS Category,
                   ISNULL(a.Available, 0) AS Available,
                   ISNULL(a.OutCount, 0) AS OutCount,
                   ISNULL(n.Needed, 0) AS Needed
            FROM Availability a
            FULL OUTER JOIN Needed n ON a.Category = n.Category
            ORDER BY Category
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<CategoryAvailabilityDto>();
        while (await reader.ReadAsync())
        {
            items.Add(new CategoryAvailabilityDto(
                Category: reader["Category"]?.ToString() ?? "",
                Available: reader["Available"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Available"]),
                Out: reader["OutCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OutCount"]),
                Needed: reader["Needed"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Needed"])
            ));
        }

        return Ok(items);
    }

    // ── Available scopes for fulfillment ────────────────────────────────────
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable([FromQuery] int? scopeTypeKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var scopeTypeFilter = scopeTypeKey.HasValue ? "AND s.lScopeTypeKey = @scopeTypeKey" : "";

        var sql = $"""
            ;WITH LatestTran AS (
                SELECT lScopeKey, MAX(lLoanerTranKey) AS MaxTranKey
                FROM tblLoanerTran
                WHERE lScopeKey IS NOT NULL
                GROUP BY lScopeKey
            )
            SELECT s.lScopeKey,
                   ISNULL(s.sSerialNumber, '') AS Serial,
                   ISNULL(st.sScopeTypeDesc, '') AS ScopeType,
                   ISNULL(stc.sScopeTypeCategory, '') AS Category,
                   ISNULL(s.sLoanerRackPosition, '') AS RackPosition,
                   ISNULL(s.bOnSiteLoaner, 0) AS OnSiteLoaner
            FROM tblScope s
            INNER JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            LEFT JOIN LatestTran lat ON lat.lScopeKey = s.lScopeKey
            LEFT JOIN tblLoanerTran lt ON lt.lLoanerTranKey = lat.MaxTranKey
            WHERE (lat.MaxTranKey IS NULL OR lt.sDateIn IS NOT NULL OR lt.sDateOut IS NULL)
              AND EXISTS (
                  SELECT 1 FROM tblLoanerTran lt2 WHERE lt2.lScopeKey = s.lScopeKey
                  UNION ALL
                  SELECT 1 WHERE ISNULL(s.bOnSiteLoaner, 0) = 1
              )
              {scopeTypeFilter}
            ORDER BY st.sScopeTypeDesc, s.sSerialNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (scopeTypeKey.HasValue)
            cmd.Parameters.AddWithValue("@scopeTypeKey", scopeTypeKey.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                scopeKey = Convert.ToInt32(reader["lScopeKey"]),
                serial = reader["Serial"]?.ToString() ?? "",
                scopeType = reader["ScopeType"]?.ToString() ?? "",
                category = reader["Category"]?.ToString() ?? "",
                rackPosition = reader["RackPosition"]?.ToString() ?? "",
                onSiteLoaner = Convert.ToBoolean(reader["OnSiteLoaner"])
            });
        }

        return Ok(items);
    }

    // ── Check-Out ────────────────────────────────────────────────────────────

    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var dateOut = DateTime.Now.ToString("yyyyMMddHHmmss");

        var sql = """
            INSERT INTO tblLoanerTran
                (lScopeKey, lDepartmentKey, lDeliveryMethodKey, lSalesRepKey, sPurchaseOrder, sDateOut, dtCreateDate, lCreateUser)
            VALUES
                (@scopeKey, @deptKey, @deliveryKey, @repKey, @po, @dateOut, GETDATE(), 1);
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
        cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey);
        cmd.Parameters.AddWithValue("@deliveryKey", body.DeliveryMethodKey);
        cmd.Parameters.AddWithValue("@repKey", body.SalesRepKey);
        cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@dateOut", dateOut);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());

        // Update bOnSiteLoaner on the scope if requested
        if (body.OnSiteLoaner)
        {
            await using var cmd2 = new SqlCommand(
                "UPDATE tblScope SET bOnSiteLoaner = 1 WHERE lScopeKey = @scopeKey", conn);
            cmd2.CommandTimeout = 30;
            cmd2.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
            await cmd2.ExecuteNonQueryAsync();
        }

        return Ok(new { loanerTranKey = newKey });
    }

    // ── Book Out (task-driven fulfillment with inspection) ──────────────
    [HttpPost("book-out")]
    public async Task<IActionResult> BookOut([FromBody] BookOutRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var dateOut = DateTime.Now.ToString("yyyyMMddHHmmss");

        var sql = """
            INSERT INTO tblLoanerTran
                (lScopeKey, lDepartmentKey, lDeliveryMethodKey, lSalesRepKey,
                 sPurchaseOrder, sTrackingNumber, sDateOut, dtCreateDate, lCreateUser)
            VALUES
                (@scopeKey, @deptKey, @deliveryKey, @repKey,
                 @po, @tracking, @dateOut, GETDATE(), 1);
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
        cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey);
        cmd.Parameters.AddWithValue("@deliveryKey", body.DeliveryMethodKey);
        cmd.Parameters.AddWithValue("@repKey", body.SalesRepKey);
        cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tracking", (object?)body.TrackingNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@dateOut", dateOut);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());

        if (body.OnSiteLoaner)
        {
            await using var cmd2 = new SqlCommand(
                "UPDATE tblScope SET bOnSiteLoaner = 1 WHERE lScopeKey = @scopeKey", conn);
            cmd2.CommandTimeout = 30;
            cmd2.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
            await cmd2.ExecuteNonQueryAsync();
        }

        return Ok(new { loanerTranKey = newKey });
    }

    // ── Eval Fail (auto-create repair for failed inspection) ────────────
    [HttpPost("eval-fail")]
    public async Task<IActionResult> EvalFail([FromBody] EvalFailRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Step 1: Verify scope exists, also pull the dept's service-location key
        // so the loaner-tracking repair WO carries the right N/S/F prefix.
        int serviceLocationKey;
        await using (var scopeCmd = new SqlCommand(@"
            SELECT s.lScopeTypeKey,
                   ISNULL(d.lServiceLocationKey, 1) AS lServiceLocationKey
            FROM tblScope s
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            WHERE s.lScopeKey = @scopeKey", conn))
        {
            scopeCmd.CommandTimeout = 30;
            scopeCmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
            await using var scopeReader = await scopeCmd.ExecuteReaderAsync();
            if (!await scopeReader.ReadAsync())
                return NotFound("Scope not found");
            serviceLocationKey = scopeReader["lServiceLocationKey"] is null or DBNull
                ? 1 : Convert.ToInt32(scopeReader["lServiceLocationKey"]);
        }

        // Step 2: Generate next WO number via the canonical proc.
        // Type 'R' — the loaner-tracking row IS a repair (status drives the
        // loaner workflow downstream). Replaces racy MAX(...)+1 numeric WOs.
        var woNumber = await invoiceNumbers.NextAsync('R', serviceLocationKey, conn);

        // Step 3: Create repair (disable triggers — tblRepair has triggers).
        // Uses GetCurrentUserKey() so audit columns identify who's creating the
        // loaner, not the legacy hardcoded lCreateUser=1.
        var repairSql = """
            DISABLE TRIGGER ALL ON tblRepair;
            INSERT INTO tblRepair
                (lScopeKey, sWorkOrderNumber, bLoanerRequested, dtCreateDate, lCreateUser)
            VALUES
                (@scopeKey, @wo, 0, GETDATE(), @userKey);
            ENABLE TRIGGER ALL ON tblRepair;
            SELECT SCOPE_IDENTITY();
            """;

        await using var repairCmd = new SqlCommand(repairSql, conn);
        repairCmd.CommandTimeout = 30;
        repairCmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
        repairCmd.Parameters.AddWithValue("@wo", woNumber);
        repairCmd.Parameters.AddWithValue("@userKey", this.GetCurrentUserKey());
        var repairKey = Convert.ToInt32(await repairCmd.ExecuteScalarAsync());

        // Step 4: Create loaner tran linked to repair (scope goes to "Repair" status)
        var tranSql = """
            INSERT INTO tblLoanerTran
                (lScopeKey, lRepairKey, dtCreateDate, lCreateUser)
            VALUES
                (@scopeKey, @repairKey, GETDATE(), 1);
            SELECT SCOPE_IDENTITY();
            """;

        await using var tranCmd = new SqlCommand(tranSql, conn);
        tranCmd.CommandTimeout = 30;
        tranCmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
        tranCmd.Parameters.AddWithValue("@repairKey", repairKey);
        var tranKey = Convert.ToInt32(await tranCmd.ExecuteScalarAsync());

        return Ok(new { repairKey, loanerTranKey = tranKey, workOrder = woNumber });
    }

    // ── Check-In ─────────────────────────────────────────────────────────────

    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var dateIn = DateTime.Now.ToString("yyyyMMddHHmmss");

        var sql = """
            UPDATE tblLoanerTran
            SET sDateIn = @dateIn, dtLastUpdate = GETDATE()
            WHERE lLoanerTranKey = @tranKey AND sDateIn IS NULL
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@dateIn", dateIn);
        cmd.Parameters.AddWithValue("@tranKey", body.LoanerTranKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0)
            return NotFound("Transaction not found or already checked in");

        // Update rack position if provided
        if (!string.IsNullOrWhiteSpace(body.RackPosition))
        {
            // Get the scopeKey from the transaction
            await using var cmd2 = new SqlCommand(
                "SELECT lScopeKey FROM tblLoanerTran WHERE lLoanerTranKey = @tranKey", conn);
            cmd2.CommandTimeout = 30;
            cmd2.Parameters.AddWithValue("@tranKey", body.LoanerTranKey);
            var scopeKeyObj = await cmd2.ExecuteScalarAsync();
            if (scopeKeyObj != null && scopeKeyObj != DBNull.Value)
            {
                await using var cmd3 = new SqlCommand(
                    "UPDATE tblScope SET sLoanerRackPosition = @rack WHERE lScopeKey = @scopeKey", conn);
                cmd3.CommandTimeout = 30;
                cmd3.Parameters.AddWithValue("@rack", body.RackPosition);
                cmd3.Parameters.AddWithValue("@scopeKey", Convert.ToInt32(scopeKeyObj));
                await cmd3.ExecuteNonQueryAsync();
            }
        }

        // Update tracking number if provided
        if (!string.IsNullOrWhiteSpace(body.TrackingNumber))
        {
            await using var cmd4 = new SqlCommand(
                "UPDATE tblLoanerTran SET sTrackingNumber = @tracking WHERE lLoanerTranKey = @tranKey", conn);
            cmd4.CommandTimeout = 30;
            cmd4.Parameters.AddWithValue("@tracking", body.TrackingNumber);
            cmd4.Parameters.AddWithValue("@tranKey", body.LoanerTranKey);
            await cmd4.ExecuteNonQueryAsync();
        }

        return Ok();
    }

    // ── Legacy endpoints (kept for backward compat) ──────────────────────────

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "r.bLoanerRequested = 1" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR s.sSerialNumber LIKE @search OR c.sClientName1 LIKE @search)");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "All")
        {
            if (statusFilter == "Fulfilled")
                where.Add("r.sWasLoanerProduced = 'Yes'");
            else if (statusFilter == "Pending")
                where.Add("(r.sWasLoanerProduced IS NULL OR r.sWasLoanerProduced = '')");
            else if (statusFilter == "Declined")
                where.Add("r.sWasLoanerProduced = 'No'");
        }

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var sql = $"""
            SELECT TOP 200
                r.lRepairKey,
                ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                r.dtDateIn,
                ISNULL(r.sWasLoanerProduced, '') AS sWasLoanerProduced,
                CASE
                    WHEN r.sWasLoanerProduced = 'Yes' THEN 'Fulfilled'
                    WHEN r.sWasLoanerProduced = 'No' THEN 'Declined'
                    ELSE 'Pending'
                END AS sRequestStatus
            FROM tblRepair r
            LEFT JOIN tblScope s ON r.lScopeKey = s.lScopeKey
            LEFT JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
            LEFT JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY r.dtDateIn DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) cmd.Parameters.AddWithValue("@search", $"%{search}%");
        await using var reader = await cmd.ExecuteReaderAsync();

        var requests = new List<LoanerRequest>();
        while (await reader.ReadAsync())
        {
            requests.Add(new LoanerRequest(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrder: reader["sWorkOrderNumber"]?.ToString() ?? "",
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                Department: reader["sDepartmentName"]?.ToString() ?? "",
                DateRequested: reader["dtDateIn"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateIn"]),
                LoanerProduced: reader["sWasLoanerProduced"]?.ToString() ?? "",
                Status: reader["sRequestStatus"]?.ToString() ?? ""
            ));
        }

        return Ok(requests);
    }

    [HttpPatch("requests/{repairKey:int}/fulfill")]
    public async Task<IActionResult> FulfillRequest(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET sWasLoanerProduced = 'Yes' WHERE lRepairKey = @id AND bLoanerRequested = 1", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? Ok() : NotFound();
    }

    [HttpPatch("requests/{repairKey:int}/decline")]
    public async Task<IActionResult> DeclineRequest(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET sWasLoanerProduced = 'No' WHERE lRepairKey = @id AND bLoanerRequested = 1", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? Ok() : NotFound();
    }

    [HttpPost("requests/bulk")]
    public async Task<IActionResult> BulkUpdateRequests([FromBody] BulkLoanerRequestAction body)
    {
        if (body.RepairKeys.Count == 0)
            return BadRequest("No repair keys provided");
        if (body.Action != "fulfill" && body.Action != "decline")
            return BadRequest("Action must be 'fulfill' or 'decline'");

        var value = body.Action == "fulfill" ? "Yes" : "No";

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var paramList = new List<string>();
        await using var cmd = new SqlCommand();
        cmd.CommandTimeout = 30;
        cmd.Connection = conn;
        for (var i = 0; i < body.RepairKeys.Count; i++)
        {
            paramList.Add($"@k{i}");
            cmd.Parameters.AddWithValue($"@k{i}", body.RepairKeys[i]);
        }
        cmd.Parameters.AddWithValue("@val", value);
        cmd.CommandText = $"UPDATE tblRepair SET sWasLoanerProduced = @val WHERE bLoanerRequested = 1 AND lRepairKey IN ({string.Join(",", paramList)})";

        var rows = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rows });
    }

    [HttpGet("scope-needs")]
    public async Task<IActionResult> GetScopeNeeds()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                ISNULL(st.sScopeTypeDesc, 'Unknown') AS sScopeTypeDesc,
                ISNULL(d.sDepartmentName, 'Unknown') AS sDepartmentName,
                ISNULL(c.sClientName1, '') AS sClientName1,
                COUNT(*) AS RepairsInProgress,
                AVG(DATEDIFF(day, r.dtDateIn, GETDATE())) AS AvgTat
            FROM tblRepair r
            INNER JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            INNER JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE r.dtDateOut IS NULL
              AND r.dtDateIn IS NOT NULL
              AND r.bLoanerRequested = 1
            GROUP BY st.sScopeTypeDesc, d.sDepartmentName, c.sClientName1
            ORDER BY RepairsInProgress DESC, sScopeTypeDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<LoanerScopeNeedItem>();
        while (await reader.ReadAsync())
        {
            var avgTat = reader["AvgTat"] == DBNull.Value ? 0.0 : Convert.ToDouble(reader["AvgTat"]);
            var estimatedNeed = DateTime.Today.AddDays(avgTat).ToString("MM/dd/yyyy");

            items.Add(new LoanerScopeNeedItem(
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                DeptName: reader["sDepartmentName"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                RepairsInProgress: Convert.ToInt32(reader["RepairsInProgress"]),
                AvgTat: Math.Round(avgTat, 1),
                EstimatedNeedDate: estimatedNeed
            ));
        }

        return Ok(items);
    }
}
