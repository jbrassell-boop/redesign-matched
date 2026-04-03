using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetDepartments(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        [FromQuery] int? clientKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(d.sDepartmentName LIKE @search OR c.sClientName1 LIKE @search)");
        if (clientKey.HasValue)
            where.Add("d.lClientKey = @clientKey");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT d.lDepartmentKey, d.sDepartmentName,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   d.lClientKey,
                   ISNULL(d.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE r.lDepartmentKey = d.lDepartmentKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs,
                   (SELECT COUNT(*) FROM tblScope s WHERE s.lDepartmentKey = d.lDepartmentKey) AS ScopeCount
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY c.sClientName1, d.sDepartmentName
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (clientKey.HasValue) countCmd.Parameters.AddWithValue("@clientKey", clientKey.Value);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (clientKey.HasValue) dataCmd.Parameters.AddWithValue("@clientKey", clientKey.Value);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var depts = new List<DepartmentListItem>();
        while (await reader.ReadAsync())
        {
            depts.Add(new DepartmentListItem(
                DeptKey: Convert.ToInt32(reader["lDepartmentKey"]),
                Name: reader["sDepartmentName"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                IsActive: Convert.ToBoolean(reader["bActive"]),
                OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
                ScopeCount: Convert.ToInt32(reader["ScopeCount"])
            ));
        }

        return Ok(new DepartmentListResponse(depts, totalCount));
    }

    [HttpGet("{deptKey:int}")]
    public async Task<IActionResult> GetDepartment(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT d.lDepartmentKey, d.sDepartmentName, d.lClientKey,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.bActive, 0) AS bActive,
                   d.sShipAddr1, d.sShipCity, d.sShipState, d.sShipZip,
                   d.sContactPhoneVoice,
                   LTRIM(RTRIM(ISNULL(d.sContactFirst,'') + ' ' + ISNULL(d.sContactLast,''))) AS ContactName,
                   d.sContactEMail,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE r.lDepartmentKey = d.lDepartmentKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs,
                   (SELECT COUNT(*) FROM tblScope s WHERE s.lDepartmentKey = d.lDepartmentKey) AS ScopeCount
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE d.lDepartmentKey = @deptKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Department not found." });

        return Ok(new DepartmentDetail(
            DeptKey: Convert.ToInt32(reader["lDepartmentKey"]),
            Name: reader["sDepartmentName"]?.ToString() ?? "",
            ClientName: reader["sClientName1"]?.ToString() ?? "",
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            IsActive: Convert.ToBoolean(reader["bActive"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
            ScopeCount: Convert.ToInt32(reader["ScopeCount"]),
            Address1: reader["sShipAddr1"]?.ToString(),
            City: reader["sShipCity"]?.ToString(),
            State: reader["sShipState"]?.ToString(),
            Zip: reader["sShipZip"]?.ToString(),
            Phone: reader["sContactPhoneVoice"]?.ToString(),
            ContactName: reader["ContactName"]?.ToString(),
            Email: reader["sContactEMail"]?.ToString()
        ));
    }

    [HttpGet("{deptKey:int}/full")]
    public async Task<IActionResult> GetDepartmentFull(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT d.lDepartmentKey, d.sDepartmentName, d.lClientKey,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.bActive, 0) AS bActive,
                   d.sShipAddr1, d.sShipCity, d.sShipState, d.sShipZip,
                   d.sContactFirst, d.sContactLast, d.sContactPhoneVoice, d.sContactEMail,
                   ISNULL(sl.sServiceLocation, '') AS sServiceLocation,
                   (SELECT COUNT(*) FROM tblScope s WHERE s.lDepartmentKey = d.lDepartmentKey) AS ScopeCount,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE r.lDepartmentKey = d.lDepartmentKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs,
                   ISNULL(d.bIncludeConsumptionReportWithReq, 0) AS bShowConsumptionOnReq,
                   ISNULL(d.bEnforceScopeTypeFiltering, 0) AS bEnforceScopeTypeFiltering,
                   ISNULL(d.bDisplayItemDescription, 0) AS bShowItemizedDescriptions,
                   ISNULL(d.bDisplayUAorNWT, 0) AS bShowUaOrNwt,
                   ISNULL(d.bTrackingNumberRequired, 0) AS bTrackingRequired,
                   ISNULL(d.bTaxExempt, 0) AS bTaxExempt,
                   ISNULL(d.bPaysByCreditCard, 0) AS bPaysByCreditCard,
                   ISNULL(d.bOnsiteService, 0) AS bOnsiteService,
                   d.lSalesRepKey,
                   ISNULL(sr.sRepFirst + ' ' + sr.sRepLast, '') AS SalesRep,
                   d.lPricingCategoryKey,
                   pc.sPricingDescription,
                   d.dblShippingAmt,
                   d.sBillName1, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, d.sBillEmail,
                   d.sMailAddr1, d.sMailAddr2, d.sMailCity, d.sMailState, d.sMailZip, d.sMailCountry,
                   d.sShipName1, d.sShipAddr2, d.sShipCountry
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblServiceLocations sl ON sl.lServiceLocationKey = d.lServiceLocationKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = d.lSalesRepKey
            LEFT JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = d.lPricingCategoryKey
            WHERE d.lDepartmentKey = @deptKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Department not found." });

        return Ok(new DepartmentFull(
            DeptKey: Convert.ToInt32(reader["lDepartmentKey"]),
            Name: reader["sDepartmentName"]?.ToString() ?? "",
            ClientName: reader["sClientName1"]?.ToString() ?? "",
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            IsActive: Convert.ToBoolean(reader["bActive"]),
            Address1: reader["sShipAddr1"]?.ToString(),
            City: reader["sShipCity"]?.ToString(),
            State: reader["sShipState"]?.ToString(),
            Zip: reader["sShipZip"]?.ToString(),
            Phone: reader["sContactPhoneVoice"]?.ToString(),
            ContactFirst: reader["sContactFirst"]?.ToString(),
            ContactLast: reader["sContactLast"]?.ToString(),
            ContactPhone: reader["sContactPhoneVoice"]?.ToString(),
            ContactEmail: reader["sContactEMail"]?.ToString(),
            ServiceLocation: reader["sServiceLocation"]?.ToString(),
            ScopeCount: Convert.ToInt32(reader["ScopeCount"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
            ShowConsumptionOnReq: Convert.ToBoolean(reader["bShowConsumptionOnReq"]),
            EnforceScopeTypeFiltering: Convert.ToBoolean(reader["bEnforceScopeTypeFiltering"]),
            ShowProductId: false,
            ShowUaOrNwt: Convert.ToBoolean(reader["bShowUaOrNwt"]),
            ShowItemizedDescriptions: Convert.ToBoolean(reader["bShowItemizedDescriptions"]),
            EmailNewRepairs: false,
            MemberBoa: false,
            TrackingRequired: Convert.ToBoolean(reader["bTrackingRequired"]),
            TaxExempt: Convert.ToBoolean(reader["bTaxExempt"]),
            PaysByCreditCard: Convert.ToBoolean(reader["bPaysByCreditCard"]),
            OnsiteService: Convert.ToBoolean(reader["bOnsiteService"]),
            SalesRepKey: reader["lSalesRepKey"] as int?,
            SalesRep: reader["SalesRep"]?.ToString(),
            PricingCategoryKey: reader["lPricingCategoryKey"] as int?,
            PricingCategory: reader["sPricingDescription"]?.ToString(),
            DiscountPct: reader["dblShippingAmt"] == DBNull.Value ? null : (double?)Convert.ToDouble(reader["dblShippingAmt"]),
            DefaultShipping: reader["dblShippingAmt"] == DBNull.Value ? null : (double?)Convert.ToDouble(reader["dblShippingAmt"]),
            BillName1: reader["sBillName1"]?.ToString(),
            BillAddr1: reader["sBillAddr1"]?.ToString(),
            BillAddr2: reader["sBillAddr2"]?.ToString(),
            BillCity: reader["sBillCity"]?.ToString(),
            BillState: reader["sBillState"]?.ToString(),
            BillZip: reader["sBillZip"]?.ToString(),
            BillEmail: reader["sBillEmail"]?.ToString(),
            MailAddr1: reader["sMailAddr1"]?.ToString(),
            MailAddr2: reader["sMailAddr2"]?.ToString(),
            MailCity: reader["sMailCity"]?.ToString(),
            MailState: reader["sMailState"]?.ToString(),
            MailZip: reader["sMailZip"]?.ToString(),
            MailCountry: reader["sMailCountry"]?.ToString(),
            ShipName1: reader["sShipName1"]?.ToString(),
            ShipAddr2: reader["sShipAddr2"]?.ToString(),
            ShipCountry: reader["sShipCountry"]?.ToString()
        ));
    }

    [HttpGet("{deptKey:int}/kpis")]
    public async Task<IActionResult> GetDepartmentKpis(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS TotalRepairs,
                SUM(CASE WHEN rs.sRepairStatus NOT IN ('Shipped','Cancelled') THEN 1 ELSE 0 END) AS OpenRepairs,
                ISNULL(AVG(
                    CASE WHEN r.dtShipDate IS NOT NULL AND r.dtDateIn IS NOT NULL
                         THEN CAST(DATEDIFF(day, r.dtDateIn, r.dtShipDate) AS DECIMAL(10,1))
                         ELSE NULL END
                ), 0) AS AvgTat,
                ISNULL(SUM(r.dblAmtRepair), 0) AS TotalRevenue
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE r.lDepartmentKey = @deptKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Ok(new DeptKpis(0, 0, 0, 0));

        return Ok(new DeptKpis(
            TotalRepairs: Convert.ToInt32(reader["TotalRepairs"]),
            OpenRepairs: reader["OpenRepairs"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OpenRepairs"]),
            AvgTat: reader["AvgTat"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["AvgTat"]),
            TotalRevenue: reader["TotalRevenue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["TotalRevenue"])
        ));
    }

    [HttpPut("{deptKey:int}")]
    public async Task<IActionResult> UpdateDepartment(int deptKey, [FromBody] DepartmentUpdate update)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn };

        if (update.Name != null) { sets.Add("sDepartmentName = @name"); cmd.Parameters.AddWithValue("@name", update.Name); }
        if (update.Address1 != null) { sets.Add("sShipAddr1 = @addr"); cmd.Parameters.AddWithValue("@addr", update.Address1); }
        if (update.City != null) { sets.Add("sShipCity = @city"); cmd.Parameters.AddWithValue("@city", update.City); }
        if (update.State != null) { sets.Add("sShipState = @state"); cmd.Parameters.AddWithValue("@state", update.State); }
        if (update.Zip != null) { sets.Add("sShipZip = @zip"); cmd.Parameters.AddWithValue("@zip", update.Zip); }
        // ContactPhone and Phone both map to sContactPhoneVoice — ContactPhone takes precedence
        var phoneValue = update.ContactPhone ?? update.Phone;
        if (phoneValue != null) { sets.Add("sContactPhoneVoice = @phone"); cmd.Parameters.AddWithValue("@phone", phoneValue); }
        if (update.ContactFirst != null) { sets.Add("sContactFirst = @cfirst"); cmd.Parameters.AddWithValue("@cfirst", update.ContactFirst); }
        if (update.ContactLast != null) { sets.Add("sContactLast = @clast"); cmd.Parameters.AddWithValue("@clast", update.ContactLast); }
        if (update.ContactEmail != null) { sets.Add("sContactEMail = @cemail"); cmd.Parameters.AddWithValue("@cemail", update.ContactEmail); }
        // Options
        if (update.ShowConsumptionOnReq != null) { sets.Add("bIncludeConsumptionReportWithReq = @showConsumption"); cmd.Parameters.AddWithValue("@showConsumption", update.ShowConsumptionOnReq); }
        if (update.EnforceScopeTypeFiltering != null) { sets.Add("bEnforceScopeTypeFiltering = @enforceScope"); cmd.Parameters.AddWithValue("@enforceScope", update.EnforceScopeTypeFiltering); }
        if (update.ShowItemizedDescriptions != null) { sets.Add("bDisplayItemDescription = @showItemized"); cmd.Parameters.AddWithValue("@showItemized", update.ShowItemizedDescriptions); }
        if (update.ShowUaOrNwt != null) { sets.Add("bDisplayUAorNWT = @showUa"); cmd.Parameters.AddWithValue("@showUa", update.ShowUaOrNwt); }
        if (update.TrackingRequired != null) { sets.Add("bTrackingNumberRequired = @tracking"); cmd.Parameters.AddWithValue("@tracking", update.TrackingRequired); }
        if (update.TaxExempt != null) { sets.Add("bTaxExempt = @taxexempt"); cmd.Parameters.AddWithValue("@taxexempt", update.TaxExempt); }
        if (update.PaysByCreditCard != null) { sets.Add("bPaysByCreditCard = @creditcard"); cmd.Parameters.AddWithValue("@creditcard", update.PaysByCreditCard); }
        if (update.OnsiteService != null) { sets.Add("bOnsiteService = @onsite"); cmd.Parameters.AddWithValue("@onsite", update.OnsiteService); }
        // Billing
        if (update.DiscountPct != null) { sets.Add("dblShippingAmt = @discpct"); cmd.Parameters.AddWithValue("@discpct", update.DiscountPct); }
        if (update.DefaultShipping != null) { sets.Add("dblShippingAmt = @defaultship"); cmd.Parameters.AddWithValue("@defaultship", update.DefaultShipping); }
        // Bill To
        if (update.BillName1 != null) { sets.Add("sBillName1 = @billname1"); cmd.Parameters.AddWithValue("@billname1", update.BillName1); }
        if (update.BillAddr1 != null) { sets.Add("sBillAddr1 = @billaddr1"); cmd.Parameters.AddWithValue("@billaddr1", update.BillAddr1); }
        if (update.BillAddr2 != null) { sets.Add("sBillAddr2 = @billaddr2"); cmd.Parameters.AddWithValue("@billaddr2", update.BillAddr2); }
        if (update.BillCity != null) { sets.Add("sBillCity = @billcity"); cmd.Parameters.AddWithValue("@billcity", update.BillCity); }
        if (update.BillState != null) { sets.Add("sBillState = @billstate"); cmd.Parameters.AddWithValue("@billstate", update.BillState); }
        if (update.BillZip != null) { sets.Add("sBillZip = @billzip"); cmd.Parameters.AddWithValue("@billzip", update.BillZip); }
        if (update.BillEmail != null) { sets.Add("sBillEmail = @billemail"); cmd.Parameters.AddWithValue("@billemail", update.BillEmail); }
        // Mailing
        if (update.MailAddr1 != null) { sets.Add("sMailAddr1 = @mailaddr1"); cmd.Parameters.AddWithValue("@mailaddr1", update.MailAddr1); }
        if (update.MailAddr2 != null) { sets.Add("sMailAddr2 = @mailaddr2"); cmd.Parameters.AddWithValue("@mailaddr2", update.MailAddr2); }
        if (update.MailCity != null) { sets.Add("sMailCity = @mailcity"); cmd.Parameters.AddWithValue("@mailcity", update.MailCity); }
        if (update.MailState != null) { sets.Add("sMailState = @mailstate"); cmd.Parameters.AddWithValue("@mailstate", update.MailState); }
        if (update.MailZip != null) { sets.Add("sMailZip = @mailzip"); cmd.Parameters.AddWithValue("@mailzip", update.MailZip); }
        if (update.MailCountry != null) { sets.Add("sMailCountry = @mailcountry"); cmd.Parameters.AddWithValue("@mailcountry", update.MailCountry); }
        // Ship To extras
        if (update.ShipName1 != null) { sets.Add("sShipName1 = @shipname1"); cmd.Parameters.AddWithValue("@shipname1", update.ShipName1); }
        if (update.ShipAddr2 != null) { sets.Add("sShipAddr2 = @shipaddr2"); cmd.Parameters.AddWithValue("@shipaddr2", update.ShipAddr2); }
        if (update.ShipCountry != null) { sets.Add("sShipCountry = @shipcountry"); cmd.Parameters.AddWithValue("@shipcountry", update.ShipCountry); }

        if (sets.Count == 0)
            return BadRequest(new { message = "No fields to update." });

        cmd.CommandText = $"UPDATE tblDepartment SET {string.Join(", ", sets)} WHERE lDepartmentKey = @deptKey";
        cmd.Parameters.AddWithValue("@deptKey", deptKey);

        await using (cmd)
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound(new { message = "Department not found." });
        }

        return Ok(new { message = "Updated." });
    }

    [HttpGet("{deptKey:int}/contacts")]
    public async Task<IActionResult> GetDepartmentContacts(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Department contacts come from the parent client's contacts via tblContactTran
        // First get the client key for this department
        await using var deptCmd = new SqlCommand("SELECT lClientKey FROM tblDepartment WHERE lDepartmentKey = @deptKey", conn);
        deptCmd.Parameters.AddWithValue("@deptKey", deptKey);
        var clientKeyObj = await deptCmd.ExecuteScalarAsync();
        if (clientKeyObj == null) return NotFound(new { message = "Department not found." });
        var clientKey = Convert.ToInt32(clientKeyObj);

        const string sql = """
            SELECT con.lContactKey, con.sContactFirst, con.sContactLast,
                   con.sContactPhoneVoice, con.sContactEMail,
                   ISNULL(con.bActive, 1) AS bActive
            FROM tblContacts con
                INNER JOIN tblContactTran ct ON ct.lContactKey = con.lContactKey
            WHERE ct.lClientKey = @clientKey
            ORDER BY con.sContactLast, con.sContactFirst
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var contacts = new List<DeptContact>();
        while (await reader.ReadAsync())
        {
            contacts.Add(new DeptContact(
                ContactKey: Convert.ToInt32(reader["lContactKey"]),
                FirstName: reader["sContactFirst"]?.ToString(),
                LastName: reader["sContactLast"]?.ToString(),
                Phone: reader["sContactPhoneVoice"]?.ToString(),
                Email: reader["sContactEMail"]?.ToString(),
                IsPrimary: false, // no primary flag in this schema
                IsActive: Convert.ToBoolean(reader["bActive"])
            ));
        }

        return Ok(contacts);
    }

    [HttpGet("{deptKey:int}/scopes/{scopeKey:int}")]
    public async Task<IActionResult> GetScopeDetail(int deptKey, int scopeKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT s.lScopeKey, s.sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory,
                   ISNULL(s.bActive, 1) AS bActive,
                   (SELECT COUNT(*) FROM tblRepair r WHERE r.lScopeKey = s.lScopeKey) AS RepairCount,
                   (SELECT TOP 1 CONVERT(VARCHAR(10), r.dtDateIn, 120)
                    FROM tblRepair r WHERE r.lScopeKey = s.lScopeKey
                    ORDER BY r.dtDateIn DESC) AS LastRepairDate
            FROM tblScope s
                LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
                LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            WHERE s.lScopeKey = @scopeKey AND s.lDepartmentKey = @deptKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@scopeKey", scopeKey);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Scope not found." });

        var rigidFlexible = reader["sRigidOrFlexible"]?.ToString() ?? "";
        var typeLabel = rigidFlexible switch
        {
            "F" => "Flexible",
            "R" => "Rigid",
            "C" => "Camera",
            _ => rigidFlexible
        };

        return Ok(new ScopeDetail(
            ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
            SerialNumber: reader["sSerialNumber"]?.ToString(),
            Model: reader["sScopeTypeDesc"]?.ToString(),
            Manufacturer: reader["sManufacturer"]?.ToString(),
            Type: typeLabel,
            Category: reader["sScopeTypeCategory"]?.ToString(),
            IsActive: Convert.ToBoolean(reader["bActive"]),
            LastRepairDate: reader["LastRepairDate"]?.ToString(),
            RepairCount: Convert.ToInt32(reader["RepairCount"])
        ));
    }

    [HttpGet("{deptKey:int}/repairs")]
    public async Task<IActionResult> GetDepartmentRepairs(
        int deptKey,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var countSql = "SELECT COUNT(*) FROM tblRepair WHERE lDepartmentKey = @deptKey";

        var dataSql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   CASE WHEN r.dtShipDate IS NOT NULL AND r.dtDateIn IS NOT NULL
                        THEN DATEDIFF(day, r.dtDateIn, r.dtShipDate)
                        ELSE DATEDIFF(day, r.dtDateIn, GETDATE()) END AS Tat,
                   r.dblAmtRepair
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            WHERE r.lDepartmentKey = @deptKey
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.Parameters.AddWithValue("@deptKey", deptKey);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.Parameters.AddWithValue("@deptKey", deptKey);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);
        await using var reader = await dataCmd.ExecuteReaderAsync();

        var repairs = new List<DepartmentRepairItem>();
        while (await reader.ReadAsync())
        {
            repairs.Add(new DepartmentRepairItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString(),
                DateIn: reader["dtDateIn"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateIn"]),
                Status: reader["sRepairStatus"]?.ToString(),
                ScopeType: reader["sScopeTypeDesc"]?.ToString(),
                SerialNumber: reader["sSerialNumber"]?.ToString(),
                Tat: reader["Tat"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Tat"]),
                Amount: reader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblAmtRepair"])
            ));
        }

        return Ok(new { items = repairs, totalCount, page, pageSize });
    }

    [HttpPut("{deptKey:int}/sub-groups")]
    public async Task<IActionResult> UpdateSubGroups(int deptKey, [FromBody] int[] subGroupKeys)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Delete existing assignments
        await using var delCmd = new SqlCommand("DELETE FROM tblDepartmentSubGroups WHERE lDepartmentKey = @deptKey", conn);
        delCmd.Parameters.AddWithValue("@deptKey", deptKey);
        await delCmd.ExecuteNonQueryAsync();

        // Insert new assignments
        foreach (var sgKey in subGroupKeys)
        {
            await using var insCmd = new SqlCommand(
                "INSERT INTO tblDepartmentSubGroups (lDepartmentKey, lSubGroupKey) VALUES (@deptKey, @sgKey)", conn);
            insCmd.Parameters.AddWithValue("@deptKey", deptKey);
            insCmd.Parameters.AddWithValue("@sgKey", sgKey);
            await insCmd.ExecuteNonQueryAsync();
        }

        return Ok(new { message = "Sub-groups updated." });
    }

    [HttpGet("{deptKey:int}/contacts/primary")]
    public async Task<IActionResult> GetPrimaryContact(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT sContactFirst, sContactLast, sContactEMail, sContactPhoneVoice
            FROM tblDepartment WHERE lDepartmentKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound();

        return Ok(new PrimaryContact(
            FirstName: reader["sContactFirst"] == DBNull.Value ? null : reader["sContactFirst"]?.ToString(),
            LastName: reader["sContactLast"] == DBNull.Value ? null : reader["sContactLast"]?.ToString(),
            Email: reader["sContactEMail"] == DBNull.Value ? null : reader["sContactEMail"]?.ToString(),
            Phone: reader["sContactPhoneVoice"] == DBNull.Value ? null : reader["sContactPhoneVoice"]?.ToString(),
            Title: null
        ));
    }

    [HttpGet("{deptKey:int}/sub-groups")]
    public async Task<IActionResult> GetDepartmentSubGroups(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT sg.llSubGroupKey, sg.sSubGroup
            FROM tblDepartmentSubGroups dsg
                INNER JOIN tblSubGroups sg ON sg.llSubGroupKey = dsg.lSubGroupKey
            WHERE dsg.lDepartmentKey = @deptKey
            ORDER BY sg.sSubGroup
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var subGroups = new List<DepartmentSubGroup>();
        while (await reader.ReadAsync())
        {
            subGroups.Add(new DepartmentSubGroup(
                SubGroupKey: Convert.ToInt32(reader["llSubGroupKey"]),
                Name: reader["sSubGroup"]?.ToString() ?? ""
            ));
        }

        return Ok(subGroups);
    }

    [HttpGet("{deptKey:int}/scopes")]
    public async Task<IActionResult> GetDepartmentScopes(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT s.lScopeKey, s.sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory
            FROM tblScope s
                LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
                LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            WHERE s.lDepartmentKey = @deptKey
            ORDER BY s.sSerialNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var scopes = new List<DepartmentScope>();
        while (await reader.ReadAsync())
        {
            var rigidFlexible = reader["sRigidOrFlexible"]?.ToString() ?? "";
            var typeLabel = rigidFlexible switch
            {
                "F" => "Flexible",
                "R" => "Rigid",
                "C" => "Camera",
                _ => rigidFlexible
            };

            scopes.Add(new DepartmentScope(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                SerialNumber: reader["sSerialNumber"]?.ToString() ?? "",
                Model: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
                Type: typeLabel,
                Category: reader["sScopeTypeCategory"]?.ToString() ?? ""
            ));
        }

        return Ok(scopes);
    }

    [HttpGet("{deptKey:int}/flags")]
    public async Task<IActionResult> GetDeptFlags(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT f.lFlagKey, f.sFlag, f.bVisibleOnDI, f.bVisibleOnBlank,
                   ISNULL(ft.sFlagType, '') AS sFlagType
            FROM tblFlags f
                LEFT JOIN tblFlagTypes ft ON ft.lFlagTypeKey = f.lFlagTypeKey
            WHERE f.lOwnerKey = @deptKey
            ORDER BY ft.sFlagType, f.sFlag
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var flags = new List<DeptFlag>();
        while (await reader.ReadAsync())
        {
            flags.Add(new DeptFlag(
                FlagKey: Convert.ToInt32(reader["lFlagKey"]),
                FlagType: reader["sFlagType"]?.ToString() ?? "",
                Flag: reader["sFlag"]?.ToString() ?? "",
                VisibleOnDI: Convert.ToBoolean(reader["bVisibleOnDI"]),
                VisibleOnBlank: Convert.ToBoolean(reader["bVisibleOnBlank"])
            ));
        }

        return Ok(flags);
    }

    [HttpPost("{deptKey:int}/flags")]
    public async Task<IActionResult> AddDeptFlag(int deptKey, [FromBody] FlagCreate flag)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblFlags (lFlagTypeKey, lOwnerKey, sFlag, bVisibleOnDI, bVisibleOnBlank)
            VALUES (@flagTypeKey, @ownerKey, @flag, @visibleDI, @visibleBlank);
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@flagTypeKey", flag.FlagTypeKey);
        cmd.Parameters.AddWithValue("@ownerKey", deptKey);
        cmd.Parameters.AddWithValue("@flag", flag.Flag);
        cmd.Parameters.AddWithValue("@visibleDI", flag.VisibleOnDI);
        cmd.Parameters.AddWithValue("@visibleBlank", flag.VisibleOnBlank);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { flagKey = newKey, message = "Flag added." });
    }

    [HttpPut("{deptKey:int}/flags/{flagKey:int}")]
    public async Task<IActionResult> UpdateDeptFlag(int deptKey, int flagKey, [FromBody] FlagCreate flag)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblFlags SET lFlagTypeKey = @flagTypeKey, sFlag = @flag,
                bVisibleOnDI = @visibleDI, bVisibleOnBlank = @visibleBlank
            WHERE lFlagKey = @flagKey AND lOwnerKey = @ownerKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@flagTypeKey", flag.FlagTypeKey);
        cmd.Parameters.AddWithValue("@flag", flag.Flag);
        cmd.Parameters.AddWithValue("@visibleDI", flag.VisibleOnDI);
        cmd.Parameters.AddWithValue("@visibleBlank", flag.VisibleOnBlank);
        cmd.Parameters.AddWithValue("@flagKey", flagKey);
        cmd.Parameters.AddWithValue("@ownerKey", deptKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Flag not found." });
        return Ok(new { message = "Flag updated." });
    }

    [HttpDelete("{deptKey:int}/flags/{flagKey:int}")]
    public async Task<IActionResult> DeleteDeptFlag(int deptKey, int flagKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "DELETE FROM tblFlags WHERE lFlagKey = @flagKey AND lOwnerKey = @ownerKey", conn);
        cmd.Parameters.AddWithValue("@flagKey", flagKey);
        cmd.Parameters.AddWithValue("@ownerKey", deptKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Flag not found." });
        return Ok(new { message = "Flag deleted." });
    }

    [HttpGet("{deptKey:int}/contracts")]
    public async Task<IActionResult> GetDeptContracts(int deptKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Use tblContractDepartments for department-specific contract association
        // Fall back to client-level contracts if none found
        const string sql = """
            SELECT c.lContractKey, ISNULL(c.sContractName1, '') AS sContractName1,
                   ISNULL(c.sContractNumber, '') AS sContractNumber,
                   ct.sContractType,
                   c.dtDateEffective, c.dtDateTermination,
                   c.dblAmtTotal
            FROM tblContractDepartments cd
                JOIN tblContract c ON c.lContractKey = cd.lContractKey
                LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = c.lContractTypeKey
            WHERE cd.lDepartmentKey = @deptKey
            ORDER BY c.dtDateEffective DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var contracts = new List<DeptContract>();
        while (await reader.ReadAsync())
        {
            var termDate = reader["dtDateTermination"] as DateTime?;
            var status = termDate == null ? "Active"
                : termDate < DateTime.Now ? "Expired"
                : termDate <= DateTime.Now.AddDays(90) ? "Expiring"
                : "Active";

            contracts.Add(new DeptContract(
                ContractKey: Convert.ToInt32(reader["lContractKey"]),
                ContractName: reader["sContractName1"]?.ToString() ?? "",
                ContractNumber: reader["sContractNumber"]?.ToString() ?? "",
                ContractType: reader["sContractType"]?.ToString(),
                DateEffective: reader["dtDateEffective"] as DateTime?,
                DateTermination: termDate,
                Status: status,
                AnnualValue: reader["dblAmtTotal"] == DBNull.Value ? null : (double?)Convert.ToDouble(reader["dblAmtTotal"])
            ));
        }

        return Ok(contracts);
    }
}
