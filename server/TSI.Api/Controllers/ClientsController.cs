using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/clients")]
[Authorize]
public class ClientsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetClients(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(c.sClientName1 LIKE @search OR c.sMailCity LIKE @search OR c.sMailState LIKE @search OR c.sMailZip LIKE @search)");
        if (statusFilter == "active")
            where.Add("c.bActive = 1");
        else if (statusFilter == "inactive")
            where.Add("c.bActive = 0");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblClient c {whereClause}";

        var dataSql = $"""
            SELECT c.lClientKey, c.sClientName1, c.sMailCity, c.sMailState,
                   ISNULL(c.bActive, 0) AS bActive
            FROM tblClient c
            {whereClause}
            ORDER BY c.sClientName1
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var clients = new List<ClientListItem>();
        while (await reader.ReadAsync())
        {
            clients.Add(new ClientListItem(
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                Name: reader["sClientName1"]?.ToString() ?? "",
                City: reader["sMailCity"]?.ToString() ?? "",
                State: reader["sMailState"]?.ToString() ?? "",
                IsActive: Convert.ToBoolean(reader["bActive"])
            ));
        }

        return Ok(new ClientListResponse(clients, totalCount));
    }

    [HttpGet("{clientKey:int}")]
    public async Task<IActionResult> GetClient(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT c.lClientKey, c.sClientName1,
                   c.sMailAddr1, c.sMailAddr2,
                   c.sMailCity, c.sMailState, c.sMailZip,
                   c.sPhoneVoice, c.sPhoneFAX,
                   ISNULL(c.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblDepartment d WHERE d.lClientKey = c.lClientKey) AS DeptCount,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblDepartment d2 ON d2.lDepartmentKey = r.lDepartmentKey
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE d2.lClientKey = c.lClientKey
                      AND ISNULL(r.sRepairClosed, 'N') != 'Y') AS OpenRepairs
            FROM tblClient c
            WHERE c.lClientKey = @clientKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Client not found." });

        return Ok(new ClientDetail(
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            Name: reader["sClientName1"]?.ToString() ?? "",
            Address1: reader["sMailAddr1"]?.ToString() ?? "",
            Address2: reader["sMailAddr2"]?.ToString(),
            City: reader["sMailCity"]?.ToString() ?? "",
            State: reader["sMailState"]?.ToString() ?? "",
            Zip: reader["sMailZip"]?.ToString() ?? "",
            Phone: reader["sPhoneVoice"]?.ToString(),
            Fax: reader["sPhoneFAX"]?.ToString(),
            Email: null,
            ContactName: null,
            IsActive: Convert.ToBoolean(reader["bActive"]),
            DeptCount: Convert.ToInt32(reader["DeptCount"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"])
        ));
    }

    [HttpGet("{clientKey:int}/summary")]
    public async Task<IActionResult> GetClientSummary(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT c.sClientName1,
                   ISNULL(pc.sPricingDescription, '') AS sPricingDescription,
                   ISNULL(pt.sTermsDesc, '') AS sTermsDesc,
                   ISNULL(sr.sRepFirst + ' ' + sr.sRepLast, '') AS sSalesRepName,
                   ISNULL(c.bActive, 0) AS bActive
            FROM tblClient c
            LEFT JOIN tblPricingCategory pc ON c.lPricingCategoryKey = pc.lPricingCategoryKey
            LEFT JOIN tblPaymentTerms pt ON c.lPaymentTermsKey = pt.lPaymentTermsKey
            LEFT JOIN tblSalesRep sr ON c.lSalesRepKey = sr.lSalesRepKey
            WHERE c.lClientKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound();

        return Ok(new ClientSummary(
            Name: reader["sClientName1"]?.ToString() ?? "",
            PricingCategory: reader["sPricingDescription"] == DBNull.Value ? null : reader["sPricingDescription"]?.ToString(),
            ContractType: null,
            PaymentTerms: reader["sTermsDesc"] == DBNull.Value ? null : reader["sTermsDesc"]?.ToString(),
            SalesRep: reader["sSalesRepName"] == DBNull.Value ? null : reader["sSalesRepName"]?.ToString(),
            IsActive: Convert.ToBoolean(reader["bActive"])
        ));
    }

    [HttpGet("{clientKey:int}/contacts")]
    public async Task<IActionResult> GetClientContacts(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT con.lContactKey, con.sContactFirst, con.sContactLast,
                   con.sContactPhoneVoice, con.sContactPhoneFAX,
                   con.sContactEMail, ISNULL(con.bActive, 1) AS bActive
            FROM tblContacts con
                INNER JOIN tblContactTran ct ON ct.lContactKey = con.lContactKey
            WHERE ct.lClientKey = @clientKey
            ORDER BY con.sContactLast, con.sContactFirst
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var contacts = new List<ClientContact>();
        while (await reader.ReadAsync())
        {
            contacts.Add(new ClientContact(
                ContactKey: Convert.ToInt32(reader["lContactKey"]),
                FirstName: reader["sContactFirst"]?.ToString() ?? "",
                LastName: reader["sContactLast"]?.ToString() ?? "",
                Phone: reader["sContactPhoneVoice"]?.ToString(),
                Fax: reader["sContactPhoneFAX"]?.ToString(),
                Email: reader["sContactEMail"]?.ToString(),
                IsActive: Convert.ToBoolean(reader["bActive"])
            ));
        }

        return Ok(contacts);
    }

    [HttpGet("{clientKey:int}/departments")]
    public async Task<IActionResult> GetClientDepartments(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT d.lDepartmentKey, d.sDepartmentName,
                   ISNULL(sl.sServiceLocation, '') AS sServiceLocation,
                   ISNULL(d.bActive, 1) AS bActive
            FROM tblDepartment d
                LEFT JOIN tblServiceLocations sl ON sl.lServiceLocationKey = d.lServiceLocationKey
            WHERE d.lClientKey = @clientKey
            ORDER BY d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var departments = new List<ClientDepartment>();
        while (await reader.ReadAsync())
        {
            departments.Add(new ClientDepartment(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                Name: reader["sDepartmentName"]?.ToString() ?? "",
                ServiceLocation: reader["sServiceLocation"]?.ToString() ?? "",
                IsActive: Convert.ToBoolean(reader["bActive"])
            ));
        }

        return Ok(departments);
    }

    [HttpGet("{clientKey:int}/flags")]
    public async Task<IActionResult> GetClientFlags(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT f.lFlagKey, f.sFlag, f.bVisibleOnDI, f.bVisibleOnBlank,
                   ISNULL(ft.sFlagType, '') AS sFlagType
            FROM tblFlags f
                LEFT JOIN tblFlagTypes ft ON ft.lFlagTypeKey = f.lFlagTypeKey
            WHERE f.lOwnerKey = @clientKey
            ORDER BY ft.sFlagType, f.sFlag
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var flags = new List<ClientFlag>();
        while (await reader.ReadAsync())
        {
            flags.Add(new ClientFlag(
                FlagKey: Convert.ToInt32(reader["lFlagKey"]),
                FlagType: reader["sFlagType"]?.ToString() ?? "",
                Flag: reader["sFlag"]?.ToString() ?? "",
                VisibleOnDI: Convert.ToBoolean(reader["bVisibleOnDI"]),
                VisibleOnBlank: Convert.ToBoolean(reader["bVisibleOnBlank"])
            ));
        }

        return Ok(flags);
    }

    [HttpGet("{clientKey:int}/full")]
    public async Task<IActionResult> GetClientFull(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT c.lClientKey, c.sClientName1, ISNULL(c.bActive, 0) AS bActive,
                   c.sMailAddr1, c.sMailAddr2, c.sMailCity, c.sMailState, c.sMailZip,
                   c.sPhoneVoice, c.sPhoneFAX, c.sBillTo AS sBillingEmail,
                   pc.sPricingDescription, c.lPricingCategoryKey,
                   pt.sTermsDesc, c.lPaymentTermsKey,
                   ISNULL(sr.sRepFirst + ' ' + sr.sRepLast, '') AS SalesRep, c.lSalesRepKey,
                   c.sReferenceNum AS sContractNumber,
                   d.sDistName1 AS sDistributor, c.lDistributorKey,
                   ISNULL(c.bNationalAccount, 0) AS bIsGPO,
                   ISNULL(c.bCustomerVAOB10, 0) AS bIsNewCustomer,
                   c.dtClientSince, c.mComments,
                   (SELECT COUNT(*) FROM tblDepartment dep WHERE dep.lClientKey = c.lClientKey) AS DeptCount,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblDepartment d2 ON d2.lDepartmentKey = r.lDepartmentKey
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE d2.lClientKey = c.lClientKey
                      AND ISNULL(r.sRepairClosed, 'N') != 'Y') AS OpenRepairs,
                   c.sClientName2, c.sReferenceNum2, c.sReferenceNum3,
                   ISNULL(c.bBlindPS3, 0) AS bBlindPS3,
                   ISNULL(c.bRequisitionTotalsOnly, 0) AS bReqTotalsOnly,
                   ISNULL(c.bBlindTotalsOnFinal, 0) AS bBlindTotalsOnFinal,
                   ISNULL(c.bSkipTracking, 0) AS bSkipTracking,
                   ISNULL(c.sPORequired, '') AS sPORequired,
                   ISNULL(c.bNeverHold, 0) AS bNeverHold,
                   ISNULL(c.bSkipTracking, 0) AS bSkipTrackingDup,
                   ISNULL(c.bEmailNewRepairs, 0) AS bEmailNewRepairs,
                   ISNULL(c.bNationalAccount, 0) AS bNationalAccount,
                   c.dblDiscountPct, c.lCreditLimitKey,
                   c.sBillAddr1, c.sBillAddr2, c.sBillCity, c.sBillState, c.sBillZip, c.sBillCountry,
                   c.sShipAddr1, c.sShipAddr2, c.sShipCity, c.sShipState, c.sShipZip, c.sShipCountry
            FROM tblClient c
                LEFT JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = c.lPricingCategoryKey
                LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = c.lPaymentTermsKey
                LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = c.lSalesRepKey
                LEFT JOIN tblDistributor d ON d.lDistributorKey = c.lDistributorKey
            WHERE c.lClientKey = @clientKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Client not found." });

        return Ok(new ClientFull(
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            Name: reader["sClientName1"]?.ToString() ?? "",
            IsActive: Convert.ToBoolean(reader["bActive"]),
            Address1: reader["sMailAddr1"]?.ToString(),
            Address2: reader["sMailAddr2"]?.ToString(),
            City: reader["sMailCity"]?.ToString(),
            State: reader["sMailState"]?.ToString(),
            Zip: reader["sMailZip"]?.ToString(),
            Phone: reader["sPhoneVoice"]?.ToString(),
            Fax: reader["sPhoneFAX"]?.ToString(),
            BillingEmail: reader["sBillingEmail"]?.ToString(),
            PricingCategory: reader["sPricingDescription"]?.ToString(),
            PricingCategoryKey: reader["lPricingCategoryKey"] as int?,
            PaymentTerms: reader["sTermsDesc"]?.ToString(),
            PaymentTermsKey: reader["lPaymentTermsKey"] as int?,
            SalesRep: reader["SalesRep"]?.ToString(),
            SalesRepKey: reader["lSalesRepKey"] as int?,
            ContractNumber: reader["sContractNumber"]?.ToString(),
            Distributor: reader["sDistributor"]?.ToString(),
            DistributorKey: reader["lDistributorKey"] as int?,
            IsGPO: Convert.ToBoolean(reader["bIsGPO"]),
            IsNewCustomer: Convert.ToBoolean(reader["bIsNewCustomer"]),
            CustomerSince: reader["dtClientSince"] as DateTime?,
            Comments: reader["mComments"]?.ToString(),
            DeptCount: Convert.ToInt32(reader["DeptCount"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
            SecondaryName: reader["sClientName2"]?.ToString(),
            Reference1: reader["sReferenceNum2"]?.ToString(),
            Reference2: reader["sReferenceNum3"]?.ToString(),
            BlindPS3: Convert.ToBoolean(reader["bBlindPS3"]),
            ReqTotalsOnly: Convert.ToBoolean(reader["bReqTotalsOnly"]),
            BlindTotalsOnFinal: Convert.ToBoolean(reader["bBlindTotalsOnFinal"]),
            SkipMetrics: Convert.ToBoolean(reader["bSkipTracking"]),
            PoRequired: reader["sPORequired"]?.ToString() == "Y",
            NeverHold: Convert.ToBoolean(reader["bNeverHold"]),
            SkipTracking: Convert.ToBoolean(reader["bSkipTracking"]),
            EmailNewRepairs: Convert.ToBoolean(reader["bEmailNewRepairs"]),
            NationalAccount: Convert.ToBoolean(reader["bNationalAccount"]),
            DiscountPct: reader["dblDiscountPct"] as double?,
            CreditLimitKey: reader["lCreditLimitKey"] as int?,
            BillName1: null,
            BillAddr1: reader["sBillAddr1"]?.ToString(),
            BillAddr2: reader["sBillAddr2"]?.ToString(),
            BillCity: reader["sBillCity"]?.ToString(),
            BillState: reader["sBillState"]?.ToString(),
            BillZip: reader["sBillZip"]?.ToString(),
            BillCountry: reader["sBillCountry"]?.ToString(),
            BillContact: null,
            BillEmail: null,
            ShipName1: null,
            ShipAddr1: reader["sShipAddr1"]?.ToString(),
            ShipAddr2: reader["sShipAddr2"]?.ToString(),
            ShipCity: reader["sShipCity"]?.ToString(),
            ShipState: reader["sShipState"]?.ToString(),
            ShipZip: reader["sShipZip"]?.ToString(),
            ShipCountry: reader["sShipCountry"]?.ToString(),
            ShipEmail: null
        ));
    }

    [HttpGet("{clientKey:int}/kpis")]
    public async Task<IActionResult> GetClientKpis(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS TotalRepairs,
                SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' THEN 1 ELSE 0 END) AS OpenRepairs,
                ISNULL(AVG(CAST(DATEDIFF(DAY, r.dtDateIn, ISNULL(r.dtDateOut, GETDATE())) AS DECIMAL)), 0) AS AvgTat,
                ISNULL(SUM(r.dblAmtRepair), 0) AS TotalRevenue
            FROM tblRepair r
                JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
                JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE d.lClientKey = @clientKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new ClientKpis(
            TotalRepairs: Convert.ToInt32(reader["TotalRepairs"]),
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"]),
            AvgTat: Convert.ToDecimal(reader["AvgTat"]),
            TotalRevenue: Convert.ToDecimal(reader["TotalRevenue"])
        ));
    }

    [HttpPut("{clientKey:int}")]
    public async Task<IActionResult> UpdateClient(int clientKey, [FromBody] ClientUpdate update)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn };
        cmd.CommandTimeout = 30;

        if (update.Name != null) { sets.Add("sClientName1 = @name"); cmd.Parameters.AddWithValue("@name", update.Name); }
        if (update.Address1 != null) { sets.Add("sMailAddr1 = @addr1"); cmd.Parameters.AddWithValue("@addr1", update.Address1); }
        if (update.Address2 != null) { sets.Add("sMailAddr2 = @addr2"); cmd.Parameters.AddWithValue("@addr2", update.Address2); }
        if (update.City != null) { sets.Add("sMailCity = @city"); cmd.Parameters.AddWithValue("@city", update.City); }
        if (update.State != null) { sets.Add("sMailState = @state"); cmd.Parameters.AddWithValue("@state", update.State); }
        if (update.Zip != null) { sets.Add("sMailZip = @zip"); cmd.Parameters.AddWithValue("@zip", update.Zip); }
        if (update.Phone != null) { sets.Add("sPhoneVoice = @phone"); cmd.Parameters.AddWithValue("@phone", update.Phone); }
        if (update.Fax != null) { sets.Add("sPhoneFAX = @fax"); cmd.Parameters.AddWithValue("@fax", update.Fax); }
        if (update.BillingEmail != null) { sets.Add("sBillTo = @billingEmail"); cmd.Parameters.AddWithValue("@billingEmail", update.BillingEmail); }
        if (update.PricingCategoryKey != null) { sets.Add("lPricingCategoryKey = @pck"); cmd.Parameters.AddWithValue("@pck", update.PricingCategoryKey); }
        if (update.PaymentTermsKey != null) { sets.Add("lPaymentTermsKey = @ptk"); cmd.Parameters.AddWithValue("@ptk", update.PaymentTermsKey); }
        if (update.SalesRepKey != null) { sets.Add("lSalesRepKey = @srk"); cmd.Parameters.AddWithValue("@srk", update.SalesRepKey); }
        if (update.ContractNumber != null) { sets.Add("sReferenceNum = @contract"); cmd.Parameters.AddWithValue("@contract", update.ContractNumber); }
        if (update.DistributorKey != null) { sets.Add("lDistributorKey = @dk"); cmd.Parameters.AddWithValue("@dk", update.DistributorKey); }
        if (update.IsGPO != null) { sets.Add("bNationalAccount = @gpo"); cmd.Parameters.AddWithValue("@gpo", update.IsGPO); }
        if (update.Comments != null) { sets.Add("mComments = @comments"); cmd.Parameters.AddWithValue("@comments", update.Comments); }
        if (update.SecondaryName != null) { sets.Add("sClientName2 = @name2"); cmd.Parameters.AddWithValue("@name2", update.SecondaryName); }
        if (update.Reference1 != null) { sets.Add("sReferenceNum2 = @ref1"); cmd.Parameters.AddWithValue("@ref1", update.Reference1); }
        if (update.Reference2 != null) { sets.Add("sReferenceNum3 = @ref2"); cmd.Parameters.AddWithValue("@ref2", update.Reference2); }
        if (update.BlindPS3 != null) { sets.Add("bBlindPS3 = @blindps3"); cmd.Parameters.AddWithValue("@blindps3", update.BlindPS3); }
        if (update.ReqTotalsOnly != null) { sets.Add("bRequisitionTotalsOnly = @reqtotals"); cmd.Parameters.AddWithValue("@reqtotals", update.ReqTotalsOnly); }
        if (update.BlindTotalsOnFinal != null) { sets.Add("bBlindTotalsOnFinal = @blindfinal"); cmd.Parameters.AddWithValue("@blindfinal", update.BlindTotalsOnFinal); }
        if (update.SkipTracking != null) { sets.Add("bSkipTracking = @skiptracking"); cmd.Parameters.AddWithValue("@skiptracking", update.SkipTracking); }
        if (update.PoRequired != null) { sets.Add("sPORequired = @porequired"); cmd.Parameters.AddWithValue("@porequired", update.PoRequired == true ? "Y" : ""); }
        if (update.NeverHold != null) { sets.Add("bNeverHold = @neverhold"); cmd.Parameters.AddWithValue("@neverhold", update.NeverHold); }
        if (update.EmailNewRepairs != null) { sets.Add("bEmailNewRepairs = @emailrepairs"); cmd.Parameters.AddWithValue("@emailrepairs", update.EmailNewRepairs); }
        if (update.NationalAccount != null) { sets.Add("bNationalAccount = @national"); cmd.Parameters.AddWithValue("@national", update.NationalAccount); }
        if (update.DiscountPct != null) { sets.Add("dblDiscountPct = @discpct"); cmd.Parameters.AddWithValue("@discpct", update.DiscountPct); }
        if (update.CreditLimitKey != null) { sets.Add("lCreditLimitKey = @creditlimit"); cmd.Parameters.AddWithValue("@creditlimit", update.CreditLimitKey); }
        if (update.BillAddr1 != null) { sets.Add("sBillAddr1 = @billaddr1"); cmd.Parameters.AddWithValue("@billaddr1", update.BillAddr1); }
        if (update.BillAddr2 != null) { sets.Add("sBillAddr2 = @billaddr2"); cmd.Parameters.AddWithValue("@billaddr2", update.BillAddr2); }
        if (update.BillCity != null) { sets.Add("sBillCity = @billcity"); cmd.Parameters.AddWithValue("@billcity", update.BillCity); }
        if (update.BillState != null) { sets.Add("sBillState = @billstate"); cmd.Parameters.AddWithValue("@billstate", update.BillState); }
        if (update.BillZip != null) { sets.Add("sBillZip = @billzip"); cmd.Parameters.AddWithValue("@billzip", update.BillZip); }
        if (update.BillCountry != null) { sets.Add("sBillCountry = @billcountry"); cmd.Parameters.AddWithValue("@billcountry", update.BillCountry); }
        if (update.ShipAddr1 != null) { sets.Add("sShipAddr1 = @shipaddr1"); cmd.Parameters.AddWithValue("@shipaddr1", update.ShipAddr1); }
        if (update.ShipAddr2 != null) { sets.Add("sShipAddr2 = @shipaddr2"); cmd.Parameters.AddWithValue("@shipaddr2", update.ShipAddr2); }
        if (update.ShipCity != null) { sets.Add("sShipCity = @shipcity"); cmd.Parameters.AddWithValue("@shipcity", update.ShipCity); }
        if (update.ShipState != null) { sets.Add("sShipState = @shipstate"); cmd.Parameters.AddWithValue("@shipstate", update.ShipState); }
        if (update.ShipZip != null) { sets.Add("sShipZip = @shipzip"); cmd.Parameters.AddWithValue("@shipzip", update.ShipZip); }
        if (update.ShipCountry != null) { sets.Add("sShipCountry = @shipcountry"); cmd.Parameters.AddWithValue("@shipcountry", update.ShipCountry); }

        if (sets.Count == 0) return BadRequest(new { message = "No fields to update." });

        sets.Add("dtLastUpdate = GETDATE()");
        cmd.CommandText = $"UPDATE tblClient SET {string.Join(", ", sets)} WHERE lClientKey = @clientKey";
        cmd.Parameters.AddWithValue("@clientKey", clientKey);

        await using (cmd)
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound(new { message = "Client not found." });
        }

        return Ok(new { message = "Client updated." });
    }

    [HttpPost]
    public async Task<IActionResult> CreateClient([FromBody] ClientUpdate data)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblClient (sClientName1, sMailAddr1, sMailAddr2, sMailCity, sMailState, sMailZip,
                sPhoneVoice, sPhoneFAX, sBillTo, lPricingCategoryKey, lPaymentTermsKey, lSalesRepKey,
                sReferenceNum, lDistributorKey, bNationalAccount, bActive, dtCreateDate, dtLastUpdate)
            VALUES (@name, @addr1, @addr2, @city, @state, @zip,
                @phone, @fax, @billingEmail, @pck, @ptk, @srk,
                @contract, @dk, @gpo, 1, GETDATE(), GETDATE());
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@name", (object?)data.Name ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@addr1", (object?)data.Address1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@addr2", (object?)data.Address2 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@city", (object?)data.City ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@state", (object?)data.State ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@zip", (object?)data.Zip ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone", (object?)data.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fax", (object?)data.Fax ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billingEmail", (object?)data.BillingEmail ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@pck", (object?)data.PricingCategoryKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ptk", (object?)data.PaymentTermsKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@srk", (object?)data.SalesRepKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@contract", (object?)data.ContractNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@dk", (object?)data.DistributorKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@gpo", (object?)data.IsGPO ?? DBNull.Value);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { clientKey = newKey, message = "Client created." });
    }

    [HttpPut("{clientKey:int}/deactivate")]
    public async Task<IActionResult> DeactivateClient(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblClient SET bActive = 0, dtLastUpdate = GETDATE() WHERE lClientKey = @clientKey", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Client not found." });
        return Ok(new { message = "Client deactivated." });
    }

    [HttpDelete("{clientKey:int}")]
    public async Task<IActionResult> DeleteClient(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Check for linked repairs
        await using var checkCmd = new SqlCommand("""
            SELECT COUNT(*) FROM tblRepair r
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            WHERE d.lClientKey = @clientKey
            """, conn);
        checkCmd.CommandTimeout = 30;
        checkCmd.Parameters.AddWithValue("@clientKey", clientKey);
        var repairCount = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());

        if (repairCount > 0)
            return Conflict(new { message = $"Cannot delete client with {repairCount} linked repairs. Deactivate instead." });

        await using var cmd = new SqlCommand("DELETE FROM tblClient WHERE lClientKey = @clientKey", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Client not found." });
        return Ok(new { message = "Client deleted." });
    }

    [HttpPost("{clientKey:int}/contacts")]
    public async Task<IActionResult> AddContact(int clientKey, [FromBody] ContactCreate contact)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblContacts (sContactFirst, sContactLast, sContactPhoneVoice, sContactPhoneFAX, sContactEMail, bActive, dtCreateDate, dtLastUpdate)
            VALUES (@first, @last, @phone, @fax, @email, 1, GETDATE(), GETDATE());
            DECLARE @contactKey INT = SCOPE_IDENTITY();
            INSERT INTO tblContactTran (lContactKey, lClientKey, dtCreateDate, dtLastUpdate)
            VALUES (@contactKey, @clientKey, GETDATE(), GETDATE());
            SELECT @contactKey;
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@first", contact.FirstName);
        cmd.Parameters.AddWithValue("@last", contact.LastName);
        cmd.Parameters.AddWithValue("@phone", (object?)contact.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fax", (object?)contact.Fax ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@email", (object?)contact.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@clientKey", clientKey);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { contactKey = newKey, message = "Contact added." });
    }

    [HttpPut("{clientKey:int}/contacts/{contactKey:int}")]
    public async Task<IActionResult> UpdateContact(int clientKey, int contactKey, [FromBody] ContactCreate contact)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblContacts SET
                sContactFirst = @first, sContactLast = @last,
                sContactPhoneVoice = @phone, sContactPhoneFAX = @fax,
                sContactEMail = @email, dtLastUpdate = GETDATE()
            WHERE lContactKey = @contactKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@first", contact.FirstName);
        cmd.Parameters.AddWithValue("@last", contact.LastName);
        cmd.Parameters.AddWithValue("@phone", (object?)contact.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fax", (object?)contact.Fax ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@email", (object?)contact.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@contactKey", contactKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Contact not found." });
        return Ok(new { message = "Contact updated." });
    }

    [HttpPut("{clientKey:int}/contacts/{contactKey:int}/primary")]
    public async Task<IActionResult> SetPrimaryContact(int clientKey, int contactKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Unset previous primary for this client's contacts, then set new one
        const string sql = """
            UPDATE tblContacts SET bBillingContact = 0
            WHERE lContactKey IN (SELECT ct.lContactKey FROM tblContactTran ct WHERE ct.lClientKey = @clientKey);
            UPDATE tblContacts SET bBillingContact = 1 WHERE lContactKey = @contactKey;
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", clientKey);
        cmd.Parameters.AddWithValue("@contactKey", contactKey);
        await cmd.ExecuteNonQueryAsync();

        return Ok(new { message = "Primary contact set." });
    }

    [HttpDelete("{clientKey:int}/contacts/{contactKey:int}")]
    public async Task<IActionResult> DeleteContact(int clientKey, int contactKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Delete the link first, then the contact
        await using var cmd1 = new SqlCommand(
            "DELETE FROM tblContactTran WHERE lContactKey = @contactKey AND lClientKey = @clientKey", conn);
        cmd1.CommandTimeout = 30;
        cmd1.Parameters.AddWithValue("@contactKey", contactKey);
        cmd1.Parameters.AddWithValue("@clientKey", clientKey);
        await cmd1.ExecuteNonQueryAsync();

        await using var cmd2 = new SqlCommand(
            "DELETE FROM tblContacts WHERE lContactKey = @contactKey AND NOT EXISTS (SELECT 1 FROM tblContactTran WHERE lContactKey = @contactKey)", conn);
        cmd2.CommandTimeout = 30;
        cmd2.Parameters.AddWithValue("@contactKey", contactKey);
        await cmd2.ExecuteNonQueryAsync();

        return Ok(new { message = "Contact deleted." });
    }

    [HttpPost("{clientKey:int}/flags")]
    public async Task<IActionResult> AddFlag(int clientKey, [FromBody] FlagCreate flag)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblFlags (lFlagTypeKey, lOwnerKey, sFlag, bVisibleOnDI, bVisibleOnBlank)
            VALUES (@flagTypeKey, @ownerKey, @flag, @visibleDI, @visibleBlank);
            SELECT SCOPE_IDENTITY();
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@flagTypeKey", flag.FlagTypeKey);
        cmd.Parameters.AddWithValue("@ownerKey", clientKey);
        cmd.Parameters.AddWithValue("@flag", flag.Flag);
        cmd.Parameters.AddWithValue("@visibleDI", flag.VisibleOnDI);
        cmd.Parameters.AddWithValue("@visibleBlank", flag.VisibleOnBlank);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { flagKey = newKey, message = "Flag added." });
    }

    [HttpPut("{clientKey:int}/flags/{flagKey:int}")]
    public async Task<IActionResult> UpdateFlag(int clientKey, int flagKey, [FromBody] FlagCreate flag)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblFlags SET lFlagTypeKey = @flagTypeKey, sFlag = @flag,
                bVisibleOnDI = @visibleDI, bVisibleOnBlank = @visibleBlank
            WHERE lFlagKey = @flagKey AND lOwnerKey = @ownerKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@flagTypeKey", flag.FlagTypeKey);
        cmd.Parameters.AddWithValue("@flag", flag.Flag);
        cmd.Parameters.AddWithValue("@visibleDI", flag.VisibleOnDI);
        cmd.Parameters.AddWithValue("@visibleBlank", flag.VisibleOnBlank);
        cmd.Parameters.AddWithValue("@flagKey", flagKey);
        cmd.Parameters.AddWithValue("@ownerKey", clientKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Flag not found." });
        return Ok(new { message = "Flag updated." });
    }

    [HttpDelete("{clientKey:int}/flags/{flagKey:int}")]
    public async Task<IActionResult> DeleteFlag(int clientKey, int flagKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "DELETE FROM tblFlags WHERE lFlagKey = @flagKey AND lOwnerKey = @ownerKey", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@flagKey", flagKey);
        cmd.Parameters.AddWithValue("@ownerKey", clientKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Flag not found." });
        return Ok(new { message = "Flag deleted." });
    }

    [HttpGet("{clientKey:int}/repairs")]
    public async Task<IActionResult> GetClientRepairs(
        int clientKey,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string countSql = """
            SELECT COUNT(*) FROM tblRepair r
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            WHERE d.lClientKey = @clientKey
            """;

        const string dataSql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   rs.sRepairStatus, dep.sDepartmentName,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeName, s.sSerialNumber,
                   DATEDIFF(DAY, r.dtDateIn, ISNULL(r.dtDateOut, GETDATE())) AS Tat,
                   r.dblAmtRepair
            FROM tblRepair r
                JOIN tblDepartment dep ON dep.lDepartmentKey = r.lDepartmentKey
                JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
                LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            WHERE dep.lClientKey = @clientKey
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        countCmd.Parameters.AddWithValue("@clientKey", clientKey);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        dataCmd.Parameters.AddWithValue("@clientKey", clientKey);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var repairs = new List<ClientRepairItem>();
        while (await reader.ReadAsync())
        {
            repairs.Add(new ClientRepairItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                WorkOrderNumber: reader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: reader["dtDateIn"] as DateTime?,
                Status: reader["sRepairStatus"]?.ToString() ?? "",
                Department: reader["sDepartmentName"]?.ToString(),
                ScopeType: reader["sScopeTypeName"]?.ToString(),
                Serial: reader["sSerialNumber"]?.ToString(),
                Tat: reader["Tat"] as int?,
                Amount: reader["dblAmtRepair"] as decimal?
            ));
        }

        return Ok(new { items = repairs, totalCount, page, pageSize });
    }

    // ── Simple client list for dropdowns ──
    [HttpGet("simple")]
    public async Task<IActionResult> GetClientsSimple()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lClientKey, ISNULL(sClientName1,'') AS sClientName1
            FROM tblClient
            WHERE ISNULL(bActive,1) = 1
            ORDER BY sClientName1
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new { key = Convert.ToInt32(reader["lClientKey"]), name = reader["sClientName1"].ToString()! });
        return Ok(list);
    }

    // ── Create Client ──
    [HttpPost]
    public async Task<IActionResult> CreateClient([FromBody] CreateClientRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblClient
                (sClientName1, sMailAddr1, sMailAddr2, sMailCity, sMailState, sMailZip,
                 sPhoneVoice, sPhoneFAX, dtClientSince, dtCreateDate,
                 lPricingCategoryKey, lSalesRepKey, lPaymentTermsKey, sBillTo, lDistributorKey,
                 dblDiscountPct, sBillAddr1, sBillCity, sBillState, sBillZip,
                 sBillEmail, bBlindPS3, bRequisitionTotalsOnly, bBlindTotalsOnFinal,
                 sPORequired, bNeverHold, bSkipTracking, bEmailNewRepairs, bNationalAccount,
                 sClientName2, sReferenceNum, sReferenceNum2, sGPID, bActive)
            OUTPUT INSERTED.lClientKey
            VALUES
                (@name, @addr1, @unit, @city, @state, @zip,
                 @phone, @fax, @clientSince, GETDATE(),
                 @pricingCatKey, @salesRepKey, @paymentTermsKey, @billTo, @distributorKey,
                 @discountPct, @billAddr1, @billCity, @billState, @billZip,
                 @billEmail, @blindPS3, @reqTotalsOnly, @blindTotalsOnFinal,
                 @poRequired, @neverHold, @skipTracking, @emailNewRepairs, @nationalAccount,
                 @secondary, @ref1, @ref2, @gpid, 1)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@name",              body.Name);
        cmd.Parameters.AddWithValue("@unit",              (object?)body.UnitBuilding ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@addr1",             (object?)body.Address1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@city",              (object?)body.City ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@state",             (object?)body.State ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@zip",               (object?)body.Zip ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone",             (object?)body.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fax",               (object?)body.Fax ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@clientSince",       body.ClientSince.HasValue ? (object)body.ClientSince.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@pricingCatKey",     (object?)body.PricingCategoryKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@salesRepKey",       (object?)body.SalesRepKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@paymentTermsKey",   (object?)body.PaymentTermsKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billTo",            (object?)body.BillTo ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@distributorKey",    (object?)body.DistributorKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@discountPct",       body.DiscountPct.HasValue ? (object)body.DiscountPct.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@billAddr1",         (object?)body.BillAddr1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billCity",          (object?)body.BillCity ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billState",         (object?)body.BillState ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billZip",           (object?)body.BillZip ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billEmail",         (object?)body.BillEmail ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@blindPS3",          body.BlindPS3 ? 1 : 0);
        cmd.Parameters.AddWithValue("@reqTotalsOnly",     body.ReqTotalsOnly ? 1 : 0);
        cmd.Parameters.AddWithValue("@blindTotalsOnFinal",body.BlindTotalsOnFinal ? 1 : 0);
        cmd.Parameters.AddWithValue("@poRequired",        body.PORequired ? "Y" : "N");
        cmd.Parameters.AddWithValue("@neverHold",         body.NeverHold ? 1 : 0);
        cmd.Parameters.AddWithValue("@skipTracking",      body.SkipTracking ? 1 : 0);
        cmd.Parameters.AddWithValue("@emailNewRepairs",   body.EmailNewRepairs ? 1 : 0);
        cmd.Parameters.AddWithValue("@nationalAccount",   body.NationalAccount ? 1 : 0);
        cmd.Parameters.AddWithValue("@secondary",         (object?)body.SecondaryName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ref1",              (object?)body.Ref1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ref2",              (object?)body.Ref2 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@gpid",              (object?)body.GpId ?? DBNull.Value);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { clientKey = newKey });
    }

}
