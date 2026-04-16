using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/onsite-services")]
[Authorize]
public class OnsiteServicesController(IConfiguration config) : ControllerBase
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

        const string sql = """
            SELECT ss.lSiteServiceKey AS lOnsiteServiceKey,
                   ISNULL(ss.sWorkOrderNumber, '') AS sInvoiceNumber,
                   ISNULL(c.sClientName1, '') AS sClientName,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   ss.dtOnsiteDate,
                   ss.dtDateSubmitted AS dtSubmittedDate,
                   CASE WHEN ss.dtVoidDate IS NOT NULL THEN 'Voided'
                        WHEN ss.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
                        WHEN ss.dtDateSubmitted IS NOT NULL THEN 'Submitted'
                        ELSE 'Draft' END AS sStatus,
                   ISNULL(ss.lTrayCount, 0) AS nTrayCount,
                   ISNULL(ss.lTotalInstruments, 0) AS nInstrumentCount,
                   ISNULL(ss.nInvoiceAmount, 0) AS dblTotalBilled
            FROM tblSiteServices ss
            LEFT JOIN tblClient c ON c.lClientKey = ss.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ss.lDepartmentKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ss.lTechnicianKey
            ORDER BY ss.dtOnsiteDate DESC
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;

        var items = new List<OnsiteServiceListItem>();
        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var visitDate = GetNullableDateTime(reader, "dtOnsiteDate");
                var submittedDate = GetNullableDateTime(reader, "dtSubmittedDate");
                var status = reader["sStatus"]?.ToString() ?? "Draft";

                // Apply filters in-memory since stored proc doesn't support them
                if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all" &&
                    !string.Equals(status, statusFilter, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!string.IsNullOrWhiteSpace(dateFrom) && visitDate.HasValue &&
                    DateTime.TryParse(dateFrom, out var from) &&
                    visitDate.Value < from)
                    continue;

                if (!string.IsNullOrWhiteSpace(dateTo) && visitDate.HasValue &&
                    DateTime.TryParse(dateTo, out var to) &&
                    visitDate.Value > to.AddDays(1))
                    continue;

                var invoiceNum = reader["sInvoiceNumber"]?.ToString() ?? "";
                var clientName = reader["sClientName"]?.ToString() ?? "";
                var deptName = reader["sDepartmentName"]?.ToString() ?? "";
                var techName = reader["sTechName"]?.ToString() ?? "";

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var hay = $"{invoiceNum}{clientName}{deptName}{techName}".ToLower();
                    if (!hay.Contains(search.ToLower()))
                        continue;
                }

                items.Add(new OnsiteServiceListItem(
                    OnsiteServiceKey: Convert.ToInt32(reader["lOnsiteServiceKey"]),
                    InvoiceNum: invoiceNum,
                    ClientName: clientName,
                    DeptName: deptName,
                    TechName: techName,
                    VisitDate: visitDate?.ToString("MM/dd/yyyy"),
                    Status: status,
                    TrayCount: reader["nTrayCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nTrayCount"]),
                    InstrumentCount: reader["nInstrumentCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nInstrumentCount"]),
                    TotalBilled: reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]),
                    SubmittedDate: submittedDate?.ToString("MM/dd/yyyy")
                ));
            }
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }

        var totalCount = items.Count;
        var paged = items
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new OnsiteServiceListResponse(paged, totalCount));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT CASE WHEN ss.dtVoidDate IS NOT NULL THEN 'Voided'
                        WHEN ss.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
                        WHEN ss.dtDateSubmitted IS NOT NULL THEN 'Submitted'
                        ELSE 'Draft' END AS sStatus,
                   ISNULL(ss.nInvoiceAmount, 0) AS dblTotalBilled
            FROM tblSiteServices ss
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;

        var total = 0;
        var submitted = 0;
        var invoiced = 0;
        var draft = 0;
        var voidCount = 0;
        var totalValue = 0.0;

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                total++;
                var status = reader["sStatus"]?.ToString() ?? "Draft";
                var amount = reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]);
                totalValue += amount;

                switch (status)
                {
                    case "Submitted": submitted++; break;
                    case "Invoiced": invoiced++; break;
                    case "Draft": draft++; break;
                    case "Void": voidCount++; break;
                }
            }
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }

        return Ok(new OnsiteServiceStats(total, submitted, invoiced, draft, voidCount, totalValue));
    }

    [HttpGet("technicians")]
    public async Task<IActionResult> GetTechnicians()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = "SELECT lTechnicianKey, sTechName FROM tblTechnicians WHERE bIsActive = 1 ORDER BY sTechName";
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        var list = new List<object>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                technicianKey = Convert.ToInt32(reader["lTechnicianKey"]),
                name = reader["sTechName"]?.ToString() ?? ""
            });
        }
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVisit([FromBody] CreateOnsiteVisitRequest req)
    {
        if (!DateTime.TryParse(req.VisitDate, out var visitDate))
            return BadRequest(new { error = "VisitDate is missing or not a valid date." });

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Derive lSalesRepKey from department; tblSiteServices requires it NOT NULL.
        int salesRepKey = 0;
        await using (var lookupCmd = new SqlCommand(
            "SELECT ISNULL(lSalesRepKey, 0) FROM tblDepartment WHERE lDepartmentKey = @deptKey", conn))
        {
            lookupCmd.Parameters.AddWithValue("@deptKey", req.DepartmentKey);
            var result = await lookupCmd.ExecuteScalarAsync();
            if (result is not null and not DBNull) salesRepKey = Convert.ToInt32(result);
        }

        await using var transaction = (SqlTransaction)await conn.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        // Generate sWorkOrderNumber using WinScope convention: {prefix}V{YY}{dayOfYear:D3}{seq:D3}
        // e.g. North + Van + 2026 + Feb 27 (day 58) + 1st that day = "NV26058001"
        var prefix = "N"; // Default to North service location
        try
        {
            await using var locCmd = new SqlCommand(
                "SELECT TOP 1 sTransNumberPrefix FROM tblServiceLocations WHERE bUsed = 1 ORDER BY lServiceLocationKey",
                conn, transaction);
            var locResult = await locCmd.ExecuteScalarAsync();
            if (locResult is string s && !string.IsNullOrWhiteSpace(s)) prefix = s.Trim();
        }
        catch { /* fall back to default prefix */ }

        var yy = (visitDate.Year % 100).ToString("D2");
        var doy = visitDate.DayOfYear.ToString("D3");
        var woPattern = $"{prefix}V{yy}{doy}";

        int nextSeq = 1;
        await using (var seqCmd = new SqlCommand(
            $"SELECT ISNULL(MAX(CAST(RIGHT(sWorkOrderNumber, 3) AS INT)), 0) + 1 FROM tblSiteServices WITH (UPDLOCK, HOLDLOCK) WHERE sWorkOrderNumber LIKE @pattern",
            conn, transaction))
        {
            seqCmd.CommandTimeout = 30;
            seqCmd.Parameters.AddWithValue("@pattern", woPattern + "%");
            var seqResult = await seqCmd.ExecuteScalarAsync();
            if (seqResult is not null and not DBNull) nextSeq = Convert.ToInt32(seqResult);
        }

        var workOrderNumber = $"{woPattern}{nextSeq:D3}";

        // Notes field combines optional free-text Notes + PriceClass tag (no sPriceClass column on tblSiteServices).
        var combinedNotes = req.Notes ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(req.PriceClass))
            combinedNotes = string.IsNullOrWhiteSpace(combinedNotes)
                ? $"Price class: {req.PriceClass}"
                : $"{combinedNotes}\nPrice class: {req.PriceClass}";

        const string sql = """
            INSERT INTO tblSiteServices
                (sWorkOrderNumber, lClientKey, lDepartmentKey, lTechnicianKey,
                 lSalesRepKey, lVanServicePricingListKey, lServiceLocationKey,
                 dtOnsiteDate, sAddressLine1, sPurchaseOrder, sTruckNumber, sNotes, lTrayCount)
            VALUES
                (@wo, @clientKey, @deptKey, @techKey,
                 @salesRepKey, 1, 1,
                 @visitDate, @location, @po, @truckNum, @notes, 0);
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn, transaction);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@wo", workOrderNumber);
        cmd.Parameters.AddWithValue("@clientKey", req.ClientKey);
        cmd.Parameters.AddWithValue("@deptKey", req.DepartmentKey);
        cmd.Parameters.AddWithValue("@techKey", req.TechnicianKey);
        cmd.Parameters.AddWithValue("@salesRepKey", salesRepKey);
        cmd.Parameters.AddWithValue("@visitDate", visitDate);
        cmd.Parameters.AddWithValue("@location", (object?)req.Location ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@po", (object?)req.Po ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@truckNum", (object?)req.TruckNum ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(combinedNotes) ? DBNull.Value : combinedNotes);

        try
        {
            var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            await transaction.CommitAsync();
            return Ok(new { onsiteServiceKey = newKey, invoiceNum = workOrderNumber });
        }
        catch (SqlException ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOnsiteStatusRequest req)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // tblSiteServices has no sStatus column — status is derived from dtVoidDate/dtDateSubmitted/dtInvoiceDate.
        // Progression: Draft → Submitted → Invoiced, with Void as a terminal state.
        // Each transition sets its target date and clears any later/lateral date to keep the derived status coherent.
        var status = (req.Status ?? string.Empty).Trim();
        var sets = new List<string>();
        switch (status.ToLowerInvariant())
        {
            case "submitted":
                sets.Add("dtDateSubmitted = GETDATE()");
                sets.Add("dtInvoiceDate = NULL");
                sets.Add("dtVoidDate = NULL");
                break;
            case "invoiced":
                sets.Add("dtInvoiceDate = GETDATE()");
                sets.Add("dtVoidDate = NULL");
                break;
            case "void":
            case "voided":
                sets.Add("dtVoidDate = GETDATE()");
                break;
            case "draft":
                sets.Add("dtDateSubmitted = NULL");
                sets.Add("dtInvoiceDate = NULL");
                sets.Add("dtVoidDate = NULL");
                break;
            default:
                return BadRequest(new { error = $"Unknown status '{req.Status}'. Allowed: Submitted, Invoiced, Void, Draft." });
        }

        if (!string.IsNullOrWhiteSpace(req.Notes))
            sets.Add("sNotes = @notes");

        var sql = $"UPDATE tblSiteServices SET {string.Join(", ", sets)} WHERE lSiteServiceKey = @id";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        if (!string.IsNullOrWhiteSpace(req.Notes))
            cmd.Parameters.AddWithValue("@notes", req.Notes);

        try
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            return Ok(new { updated = rows > 0 });
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ss.lSiteServiceKey, ss.sWorkOrderNumber, ss.dtOnsiteDate,
                   ISNULL(c.sClientName1, '') AS sClientName,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   ISNULL(ss.sPurchaseOrder, '') AS sPurchaseOrder,
                   ISNULL(ss.sTruckNumber, '') AS sTruckNumber,
                   ISNULL(ss.sNotes, '') AS sNotes,
                   ISNULL(ss.lTrayCount, 0) AS lTrayCount,
                   ISNULL(ss.lTotalInstruments, 0) AS lTotalInstruments,
                   ISNULL(ss.nInvoiceAmount, 0) AS nInvoiceAmount,
                   ss.dtInvoiceDate,
                   CASE
                       WHEN ss.dtVoidDate IS NOT NULL THEN 'Void'
                       WHEN ss.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
                       WHEN ss.dtDateSubmitted IS NOT NULL THEN 'Submitted'
                       ELSE 'Draft'
                   END AS sStatus
            FROM tblSiteServices ss
            LEFT JOIN tblClient c ON c.lClientKey = ss.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = ss.lDepartmentKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = ss.lTechnicianKey
            WHERE ss.lSiteServiceKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Visit not found." });

        var visitDate = reader["dtOnsiteDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtOnsiteDate"]).ToString("MM/dd/yyyy");
        var submittedDate = reader["dtInvoiceDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtInvoiceDate"]).ToString("MM/dd/yyyy");

        return Ok(new OnsiteServiceDetail(
            OnsiteServiceKey: Convert.ToInt32(reader["lSiteServiceKey"]),
            InvoiceNum: reader["sWorkOrderNumber"]?.ToString() ?? "",
            ClientName: reader["sClientName"]?.ToString() ?? "",
            DeptName: reader["sDepartmentName"]?.ToString() ?? "",
            TechName: reader["sTechName"]?.ToString() ?? "",
            VisitDate: visitDate,
            Status: reader["sStatus"]?.ToString() ?? "Draft",
            TrayCount: Convert.ToInt32(reader["lTrayCount"]),
            InstrumentCount: Convert.ToInt32(reader["lTotalInstruments"]),
            TotalBilled: reader["nInvoiceAmount"] == DBNull.Value ? 0 : Convert.ToDouble(reader["nInvoiceAmount"]),
            SubmittedDate: submittedDate,
            PurchaseOrder: reader["sPurchaseOrder"]?.ToString(),
            TruckNumber: reader["sTruckNumber"]?.ToString(),
            Notes: reader["sNotes"]?.ToString()
        ));
    }

    [HttpGet("{id:int}/invoice")]
    public async Task<IActionResult> GetInvoice(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
              ss.lSiteServiceKey,
              ss.sWorkOrderNumber,
              ss.dtOnsiteDate,
              ISNULL(ss.sTruckNumber, '')    AS sTruckNumber,
              ISNULL(ss.sPurchaseOrder, '')  AS sPurchaseOrder,
              ISNULL(ss.lTrayCount, 0)       AS lTrayCount,
              ISNULL(ss.lTotalInstruments, 0) AS lTotalInstruments,
              ISNULL(ss.nInvoiceAmount, 0)   AS nInvoiceAmount,
              ISNULL(ss.nTaxAmount, 0)       AS nTaxAmount,
              ISNULL(ss.sBillName1, '')      AS sBillName1,
              ISNULL(ss.sBillName2, '')      AS sBillName2,
              ISNULL(ss.sBillEmail, '')      AS sBillEmail,
              ISNULL(c.sClientName1, '')     AS sClientName1,
              ISNULL(d.sDepartmentName, '')  AS sDepartmentName,
              ISNULL(t.sTechName, '')        AS sTechName,
              ISNULL(pt.sTermsDesc, '')      AS sTermsDesc
            FROM tblSiteServices ss
            LEFT JOIN tblClient       c  ON c.lClientKey       = ss.lClientKey
            LEFT JOIN tblDepartment   d  ON d.lDepartmentKey   = ss.lDepartmentKey
            LEFT JOIN tblTechnicians  t  ON t.lTechnicianKey   = ss.lTechnicianKey
            LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = d.lPaymentTermsKey
            WHERE ss.lSiteServiceKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Visit not found." });

        var visitDate = reader["dtOnsiteDate"] == DBNull.Value
            ? null
            : Convert.ToDateTime(reader["dtOnsiteDate"]).ToString("MM/dd/yyyy");

        return Ok(new OnsiteServiceInvoiceData(
            OnsiteServiceKey: Convert.ToInt32(reader["lSiteServiceKey"]),
            InvoiceNum: reader["sWorkOrderNumber"]?.ToString() ?? "",
            VisitDate: visitDate,
            TruckNumber: reader["sTruckNumber"]?.ToString(),
            PurchaseOrder: reader["sPurchaseOrder"]?.ToString(),
            TrayCount: Convert.ToInt32(reader["lTrayCount"]),
            InstrumentCount: Convert.ToInt32(reader["lTotalInstruments"]),
            InvoiceAmount: reader["nInvoiceAmount"] == DBNull.Value ? 0 : Convert.ToDouble(reader["nInvoiceAmount"]),
            TaxAmount: reader["nTaxAmount"] == DBNull.Value ? 0 : Convert.ToDouble(reader["nTaxAmount"]),
            BillName1: reader["sBillName1"]?.ToString() ?? "",
            BillName2: reader["sBillName2"]?.ToString(),
            BillEmail: reader["sBillEmail"]?.ToString() ?? "",
            ClientName: reader["sClientName1"]?.ToString() ?? "",
            DeptName: reader["sDepartmentName"]?.ToString() ?? "",
            TechName: reader["sTechName"]?.ToString() ?? "",
            TermsDesc: reader["sTermsDesc"]?.ToString() ?? ""
        ));
    }

    [HttpGet("{id:int}/trays")]
    public async Task<IActionResult> GetTrays(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT t.lSiteServiceTrayKey,
                   ISNULL(t.lTrayNumber, 0) AS lTrayNumber,
                   ISNULL(t.sTrayName, '') AS sTrayName,
                   ISNULL(t.lInstrumentsCount, 0) AS lInstrumentsCount,
                   ISNULL(t.lRepairedCount, 0) AS lRepairedCount,
                   ISNULL(t.lSentToTSICount, 0) AS lSentToTSICount,
                   ISNULL(t.lBeyondEconomicalRepairCount, 0) AS lBeyondEconomicalRepairCount,
                   ISNULL(t.lReplacedCount, 0) AS lReplacedCount
            FROM tblSiteServiceTrays t
            WHERE t.lSiteServiceKey = @id
            ORDER BY t.lTrayNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        var trays = new List<OnsiteServiceTray>();
        while (await reader.ReadAsync())
        {
            trays.Add(new OnsiteServiceTray(
                TrayKey: Convert.ToInt32(reader["lSiteServiceTrayKey"]),
                TrayNumber: Convert.ToInt32(reader["lTrayNumber"]),
                TrayName: reader["sTrayName"]?.ToString() ?? "",
                InstrumentsCount: Convert.ToInt32(reader["lInstrumentsCount"]),
                RepairedCount: Convert.ToInt32(reader["lRepairedCount"]),
                SentToTsiCount: Convert.ToInt32(reader["lSentToTSICount"]),
                BeyondEconomicalRepairCount: Convert.ToInt32(reader["lBeyondEconomicalRepairCount"]),
                ReplacedCount: Convert.ToInt32(reader["lReplacedCount"])
            ));
        }

        return Ok(trays);
    }

    [HttpPatch("{id:int}/submit")]
    public async Task<IActionResult> SubmitForInvoicing(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Try tblSiteServices first, fall back to tblOnsiteService
        try
        {
            await using var cmd = new SqlCommand(
                "UPDATE tblSiteServices SET dtDateSubmitted = GETDATE() WHERE lSiteServiceKey = @id AND dtDateSubmitted IS NULL",
                conn);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@id", id);
            var rows = await cmd.ExecuteNonQueryAsync();
            return Ok(new { submitted = rows > 0 });
        }
        catch (SqlException ex)
        {
            return StatusCode(500, new { error = "Database error", detail = ex.Message });
        }
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
        }
        catch
        {
            return null;
        }
    }
}
