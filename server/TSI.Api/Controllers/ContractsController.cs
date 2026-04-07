using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/contracts")]
[Authorize]
public class ContractsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    private static string ComputeStatus(DateTime? termination)
    {
        if (termination == null) return "Active";
        var now = DateTime.Now;
        if (termination < now) return "Expired";
        if (termination <= now.AddDays(90)) return "Expiring";
        return "Active";
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN dtDateTermination >= GETDATE() AND dtDateTermination <= DATEADD(day, 90, GETDATE()) THEN 1 ELSE 0 END) AS Expiring,
                SUM(CASE WHEN dtDateTermination < GETDATE() THEN 1 ELSE 0 END) AS Expired,
                SUM(CASE WHEN dtDateTermination IS NULL OR dtDateTermination > DATEADD(day, 90, GETDATE()) THEN 1 ELSE 0 END) AS Active,
                ISNULL(SUM(ISNULL(dblAmtTotal, 0)), 0) AS TotalACV
            FROM tblContract
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Ok(new ContractStats(0, 0, 0, 0, 0));

        return Ok(new ContractStats(
            Total: Convert.ToInt32(reader["Total"]),
            Active: Convert.ToInt32(reader["Active"]),
            Expiring: Convert.ToInt32(reader["Expiring"]),
            Expired: Convert.ToInt32(reader["Expired"]),
            TotalACV: Convert.ToDouble(reader["TotalACV"])
        ));
    }

    [HttpGet]
    public async Task<IActionResult> GetContracts(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 200,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(c.sContractName1 LIKE @search OR c.sContractNumber LIKE @search OR c.sContractID LIKE @search)");

        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all")
        {
            where.Add(statusFilter.ToLower() switch
            {
                "active" => "c.dtDateTermination > DATEADD(day, 90, GETDATE())",
                "expiring" => "c.dtDateTermination BETWEEN GETDATE() AND DATEADD(day, 90, GETDATE())",
                "expired" => "c.dtDateTermination < GETDATE()",
                _ => "1=1"
            });
        }

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblContract c {whereClause}";

        var dataSql = $"""
            SELECT
                c.lContractKey, c.lClientKey,
                ISNULL(c.sContractName1, '') AS sContractName1,
                ISNULL(c.sContractNumber, '') AS sContractNumber,
                ISNULL(c.sContractID, '') AS sContractID,
                c.dtDateEffective, c.dtDateTermination,
                ISNULL(c.dblAmtTotal, 0) AS dblAmtTotal,
                ISNULL(c.dblAmtInvoiced, 0) AS dblAmtInvoiced,
                ISNULL(c.nCountAll, 0) AS nCountAll,
                ISNULL(c.lContractTypeKey, 0) AS lContractTypeKey
            FROM tblContract c
            {whereClause}
            ORDER BY c.sContractName1
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
        var contracts = new List<ContractListItem>();
        while (await reader.ReadAsync())
        {
            var termination = reader["dtDateTermination"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["dtDateTermination"]);
            contracts.Add(new ContractListItem(
                ContractKey: Convert.ToInt32(reader["lContractKey"]),
                ClientKey: reader["lClientKey"] == DBNull.Value ? 0 : Convert.ToInt32(reader["lClientKey"]),
                Name: reader["sContractName1"].ToString() ?? "",
                ContractNumber: reader["sContractNumber"].ToString() ?? "",
                ContractId: reader["sContractID"].ToString() ?? "",
                EffectiveDate: reader["dtDateEffective"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateEffective"]),
                TerminationDate: termination,
                TotalAmount: Convert.ToDouble(reader["dblAmtTotal"]),
                AmtInvoiced: Convert.ToDouble(reader["dblAmtInvoiced"]),
                ScopeCount: Convert.ToInt32(reader["nCountAll"]),
                Status: ComputeStatus(termination),
                ContractType: Convert.ToInt32(reader["lContractTypeKey"])
            ));
        }

        return Ok(new ContractListResponse(contracts, totalCount));
    }

    [HttpGet("{contractKey:int}")]
    public async Task<IActionResult> GetContract(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                c.lContractKey, c.lClientKey,
                ISNULL(c.sContractName1, '') AS sContractName1,
                ISNULL(c.sContractNumber, '') AS sContractNumber,
                ISNULL(c.sContractID, '') AS sContractID,
                c.dtDateEffective, c.dtDateTermination,
                ISNULL(c.lContractLengthInMonths, 0) AS lContractLengthInMonths,
                ISNULL(c.dblAmtTotal, 0) AS dblAmtTotal,
                ISNULL(c.dblAmtInvoiced, 0) AS dblAmtInvoiced,
                ISNULL(c.nInstallmentsTotal, 0) AS nInstallmentsTotal,
                ISNULL(c.nInstallmentsInvoiced, 0) AS nInstallmentsInvoiced,
                ISNULL(c.lContractTypeKey, 0) AS lContractTypeKey,
                ISNULL(c.bServicePlan, 0) AS bServicePlan,
                ISNULL(c.bSharedRisk, 0) AS bSharedRisk,
                ISNULL(c.bTaxExempt, 0) AS bTaxExempt,
                ISNULL(c.sContractBillName1, '') AS sContractBillName1,
                ISNULL(c.sContractAddr1, '') AS sContractAddr1,
                ISNULL(c.sContractCity, '') AS sContractCity,
                ISNULL(c.sContractState, '') AS sContractState,
                ISNULL(c.sContractZip, '') AS sContractZip,
                ISNULL(c.sContractPhoneVoice, '') AS sContractPhoneVoice,
                ISNULL(c.sBillEmail, '') AS sBillEmail,
                ISNULL(CAST(c.mComments AS nvarchar(max)), '') AS mComments,
                ISNULL(c.nCountFlexible, 0) AS nCountFlexible,
                ISNULL(c.nCountRigid, 0) AS nCountRigid,
                ISNULL(c.nCountCamera, 0) AS nCountCamera,
                ISNULL(c.nCountInstrument, 0) AS nCountInstrument,
                ISNULL(c.nCountAll, 0) AS nCountAll,
                c.dtLastUpdate, c.dtCreateDate
            FROM tblContract c
            WHERE c.lContractKey = @contractKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Contract not found." });

        var termination = reader["dtDateTermination"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["dtDateTermination"]);

        return Ok(new ContractDetail(
            ContractKey: Convert.ToInt32(reader["lContractKey"]),
            ClientKey: reader["lClientKey"] == DBNull.Value ? 0 : Convert.ToInt32(reader["lClientKey"]),
            Name: reader["sContractName1"].ToString() ?? "",
            ContractNumber: reader["sContractNumber"].ToString() ?? "",
            ContractId: reader["sContractID"].ToString() ?? "",
            EffectiveDate: reader["dtDateEffective"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateEffective"]),
            TerminationDate: termination,
            LengthInMonths: Convert.ToInt32(reader["lContractLengthInMonths"]),
            TotalAmount: Convert.ToDouble(reader["dblAmtTotal"]),
            AmtInvoiced: Convert.ToDouble(reader["dblAmtInvoiced"]),
            InstallmentsTotal: Convert.ToInt32(reader["nInstallmentsTotal"]),
            InstallmentsInvoiced: Convert.ToInt32(reader["nInstallmentsInvoiced"]),
            ContractType: Convert.ToInt32(reader["lContractTypeKey"]),
            ServicePlan: Convert.ToBoolean(reader["bServicePlan"]),
            SharedRisk: Convert.ToBoolean(reader["bSharedRisk"]),
            TaxExempt: Convert.ToBoolean(reader["bTaxExempt"]),
            BillName: reader["sContractBillName1"].ToString() ?? "",
            BillAddress: reader["sContractAddr1"].ToString() ?? "",
            BillCity: reader["sContractCity"].ToString() ?? "",
            BillState: reader["sContractState"].ToString() ?? "",
            BillZip: reader["sContractZip"].ToString() ?? "",
            Phone: reader["sContractPhoneVoice"].ToString() ?? "",
            BillEmail: reader["sBillEmail"].ToString() ?? "",
            Comments: reader["mComments"].ToString() ?? "",
            CountFlexible: Convert.ToInt32(reader["nCountFlexible"]),
            CountRigid: Convert.ToInt32(reader["nCountRigid"]),
            CountCamera: Convert.ToInt32(reader["nCountCamera"]),
            CountInstrument: Convert.ToInt32(reader["nCountInstrument"]),
            CountAll: Convert.ToInt32(reader["nCountAll"]),
            Status: ComputeStatus(termination),
            LastUpdate: reader["dtLastUpdate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtLastUpdate"]),
            CreateDate: reader["dtCreateDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtCreateDate"])
        ));
    }

    [HttpPatch("{contractKey:int}")]
    public async Task<IActionResult> PatchContract(int contractKey, [FromBody] PatchContractRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand();
        cmd.CommandTimeout = 30;
        cmd.Connection = conn;

        if (body.Name is not null)           { sets.Add("sContractName1 = @name");      cmd.Parameters.AddWithValue("@name",       body.Name); }
        if (body.ContractNumber is not null) { sets.Add("sContractNumber = @cnum");      cmd.Parameters.AddWithValue("@cnum",       body.ContractNumber); }
        if (body.ContractId is not null)     { sets.Add("sContractID = @cid");           cmd.Parameters.AddWithValue("@cid",        body.ContractId); }
        if (body.EffectiveDate.HasValue)     { sets.Add("dtDateEffective = @eff");       cmd.Parameters.AddWithValue("@eff",        body.EffectiveDate.Value); }
        if (body.TerminationDate.HasValue)   { sets.Add("dtDateTermination = @term");    cmd.Parameters.AddWithValue("@term",       body.TerminationDate.Value); }
        if (body.LengthInMonths.HasValue)    { sets.Add("lContractLengthInMonths = @len"); cmd.Parameters.AddWithValue("@len",     body.LengthInMonths.Value); }
        if (body.TotalAmount.HasValue)       { sets.Add("dblAmtTotal = @total");         cmd.Parameters.AddWithValue("@total",      body.TotalAmount.Value); }
        if (body.Comments is not null)       { sets.Add("mComments = @comments");        cmd.Parameters.AddWithValue("@comments",   body.Comments); }

        if (sets.Count == 0) return NoContent();

        sets.Add("dtLastUpdate = GETDATE()");
        cmd.CommandText = $"UPDATE tblContract SET {string.Join(", ", sets)} WHERE lContractKey = @contractKey";
        cmd.Parameters.AddWithValue("@contractKey", contractKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Contract not found." });

        return NoContent();
    }

    [HttpGet("{contractKey:int}/departments")]
    public async Task<IActionResult> GetDepartments(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                cd.lContractDepartmentKey,
                cd.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                cd.dtContractDepartmentEffectiveDate,
                cd.dtContractDepartmentEndDate,
                ISNULL(cd.bNonBillable, 0) AS bNonBillable,
                ISNULL(cd.sPONumber, '') AS sPONumber
            FROM tblContractDepartments cd
            LEFT JOIN tblDepartment d ON cd.lDepartmentKey = d.lDepartmentKey
            WHERE cd.lContractKey = @contractKey
            ORDER BY d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<ContractDepartment>();
        while (await reader.ReadAsync())
        {
            items.Add(new ContractDepartment(
                ContractDepartmentKey: Convert.ToInt32(reader["lContractDepartmentKey"]),
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                EffectiveDate: reader["dtContractDepartmentEffectiveDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtContractDepartmentEffectiveDate"]),
                EndDate: reader["dtContractDepartmentEndDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtContractDepartmentEndDate"]),
                NonBillable: Convert.ToBoolean(reader["bNonBillable"]),
                PoNumber: reader["sPONumber"].ToString()
            ));
        }

        return Ok(items);
    }

    [HttpGet("{contractKey:int}/amendments")]
    public async Task<IActionResult> GetAmendments(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                a.lContractAmendmentKey,
                a.dtContractAmendmentDate,
                ISNULL(s.sContractAmendmentStatus, 'Unknown') AS sContractAmendmentStatus,
                ISNULL(a.nPreviousContractTotal, 0) AS nPreviousContractTotal,
                ISNULL(a.nNewContractTotal, 0) AS nNewContractTotal,
                ISNULL(a.nPreviousInvoiceAmount, 0) AS nPreviousInvoiceAmount,
                ISNULL(a.nNewInvoiceAmount, 0) AS nNewInvoiceAmount,
                ISNULL(a.lRemainingMonths, 0) AS lRemainingMonths
            FROM tblContractAmendments a
            LEFT JOIN tblContractAmendmentStatuses s ON a.lContractAmendmentStatusKey = s.lContractAmendmentStatusKey
            WHERE a.lContractKey = @contractKey
            ORDER BY a.dtContractAmendmentDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<ContractAmendment>();
        while (await reader.ReadAsync())
        {
            items.Add(new ContractAmendment(
                AmendmentKey: Convert.ToInt32(reader["lContractAmendmentKey"]),
                AmendmentDate: reader["dtContractAmendmentDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtContractAmendmentDate"]),
                Status: reader["sContractAmendmentStatus"].ToString() ?? "",
                PreviousTotal: Convert.ToDecimal(reader["nPreviousContractTotal"]),
                NewTotal: Convert.ToDecimal(reader["nNewContractTotal"]),
                PreviousInvoiceAmount: Convert.ToDecimal(reader["nPreviousInvoiceAmount"]),
                NewInvoiceAmount: Convert.ToDecimal(reader["nNewInvoiceAmount"]),
                RemainingMonths: Convert.ToInt32(reader["lRemainingMonths"])
            ));
        }

        return Ok(items);
    }

    [HttpPost("{contractKey:int}/amendments")]
    public async Task<IActionResult> CreateAmendment(int contractKey, [FromBody] CreateContractAmendmentRequest request)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblContractAmendments
                (lContractKey, dtContractAmendmentDate, nPreviousContractTotal, nNewContractTotal,
                 nPreviousInvoiceAmount, nNewInvoiceAmount, lContractAmendmentStatusKey, lRemainingMonths)
            OUTPUT INSERTED.lContractAmendmentKey
            VALUES
                (@contractKey, @amendmentDate, @previousTotal, @newTotal,
                 @previousInvoice, @newInvoice, 1, @remainingMonths)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        cmd.Parameters.AddWithValue("@amendmentDate", request.AmendmentDate ?? DateTime.Today);
        cmd.Parameters.AddWithValue("@previousTotal", request.PreviousTotal);
        cmd.Parameters.AddWithValue("@newTotal", request.NewTotal);
        cmd.Parameters.AddWithValue("@previousInvoice", request.PreviousInvoiceAmount);
        cmd.Parameters.AddWithValue("@newInvoice", request.NewInvoiceAmount);
        cmd.Parameters.AddWithValue("@remainingMonths", request.RemainingMonths);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { amendmentKey = newKey });
    }

    [HttpGet("{contractKey:int}/affiliates")]
    public async Task<IActionResult> GetAffiliates(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                a.lAffiliateKey,
                a.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(cl.sClientName1, '') AS sClientName1,
                a.dtAffiliateStartDate,
                a.dtAffiliateEndDate
            FROM tblContractAffiliates a
            LEFT JOIN tblDepartment d ON a.lDepartmentKey = d.lDepartmentKey
            LEFT JOIN tblClient cl ON d.lClientKey = cl.lClientKey
            WHERE a.lContractKey = @contractKey
            ORDER BY d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<ContractAffiliate>();
        while (await reader.ReadAsync())
        {
            items.Add(new ContractAffiliate(
                AffiliateKey: Convert.ToInt32(reader["lAffiliateKey"]),
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                ClientName: reader["sClientName1"].ToString() ?? "",
                StartDate: reader["dtAffiliateStartDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtAffiliateStartDate"]),
                EndDate: reader["dtAffiliateEndDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtAffiliateEndDate"])
            ));
        }

        return Ok(items);
    }

    [HttpGet("{contractKey:int}/scopes")]
    public async Task<IActionResult> GetScopes(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                cs.lContractScopeKey,
                cs.lScopeKey,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(m.sManufacturer, '') AS sManufacturer,
                ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                cs.dtScopeAdded,
                cs.dtScopeRemoved,
                ISNULL(cs.nCost, 0) AS nCost
            FROM tblContractScope cs
            INNER JOIN tblScope s ON cs.lScopeKey = s.lScopeKey
            LEFT JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
            LEFT JOIN tblManufacturers m ON st.lManufacturerKey = m.lManufacturerKey
            WHERE cs.lContractKey = @contractKey AND cs.dtScopeRemoved IS NULL
            ORDER BY s.sSerialNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var scopes = new List<ContractScope>();
        while (await reader.ReadAsync())
        {
            scopes.Add(new ContractScope(
                ContractScopeKey: Convert.ToInt32(reader["lContractScopeKey"]),
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                SerialNumber: reader["sSerialNumber"].ToString() ?? "",
                Model: reader["sScopeTypeDesc"].ToString() ?? "",
                Manufacturer: reader["sManufacturer"].ToString() ?? "",
                RigidOrFlexible: reader["sRigidOrFlexible"].ToString() ?? "",
                ScopeAdded: reader["dtScopeAdded"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtScopeAdded"]),
                ScopeRemoved: reader["dtScopeRemoved"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtScopeRemoved"]),
                Cost: reader["nCost"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["nCost"])
            ));
        }

        return Ok(scopes);
    }

    [HttpGet("{contractKey:int}/repairs")]
    public async Task<IActionResult> GetRepairs(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                r.lRepairKey,
                ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(rl.sRepairLevel, '') AS sRepairLevel,
                r.dtDateIn,
                ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                ISNULL(r.dblNetTotal, 0) AS dblNetTotal,
                ISNULL(t.sLastName, '') AS sTechName
            FROM tblRepair r
            INNER JOIN tblScope s ON r.lScopeKey = s.lScopeKey
            LEFT JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
            LEFT JOIN tblRepairStatuses rs ON r.lRepairStatusKey = rs.lRepairStatusKey
            LEFT JOIN tblRepairLevels rl ON r.lRepairLevelKey = rl.lRepairLevelKey
            LEFT JOIN tblTechnicians t ON r.lTechnicianKey = t.lTechnicianKey
            WHERE r.lContractKey = @contractKey
            ORDER BY r.dtDateIn DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var repairs = new List<ContractRepair>();
        while (await reader.ReadAsync())
        {
            repairs.Add(new ContractRepair(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                Wo: reader["sWorkOrderNumber"].ToString() ?? "",
                SerialNumber: reader["sSerialNumber"].ToString() ?? "",
                Model: reader["sScopeTypeDesc"].ToString() ?? "",
                RepairType: reader["sRepairLevel"].ToString() ?? "",
                DateIn: reader["dtDateIn"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateIn"]),
                Status: reader["sRepairStatus"].ToString() ?? "",
                Cost: reader["dblNetTotal"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["dblNetTotal"]),
                Tech: reader["sTechName"].ToString() ?? ""
            ));
        }

        return Ok(repairs);
    }

    [HttpGet("{contractKey:int}/invoices")]
    public async Task<IActionResult> GetInvoices(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                ci.lInstallmentKey,
                ISNULL(ci.sInvoiceNumber, '') AS sInvoiceNumber,
                ci.dtDateCreate,
                ci.dtDateDue,
                ISNULL(ci.dblAmount, 0) AS dblAmount,
                ISNULL(ci.sInvoiced, 'N') AS sInvoiced
            FROM tblContractInstallment ci
            WHERE ci.lContractKey = @contractKey
            ORDER BY ci.dtDateDue DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var invoices = new List<ContractInvoice>();
        while (await reader.ReadAsync())
        {
            var invoiced = reader["sInvoiced"].ToString();
            invoices.Add(new ContractInvoice(
                InstallmentKey: Convert.ToInt32(reader["lInstallmentKey"]),
                InvoiceNumber: reader["sInvoiceNumber"].ToString() ?? "",
                DateCreated: reader["dtDateCreate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateCreate"]),
                DateDue: reader["dtDateDue"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDateDue"]),
                Amount: Convert.ToDouble(reader["dblAmount"]),
                Status: invoiced == "Y" ? "Invoiced" : "Pending"
            ));
        }

        return Ok(invoices);
    }

    [HttpGet("{contractKey:int}/notes")]
    public async Task<IActionResult> GetNotes(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                n.lNoteKey,
                n.dtNoteDate,
                ISNULL(e.sFirstName + ' ' + e.sLastName, 'System') AS sAuthor,
                n.sNote
            FROM tblNotes n
            LEFT JOIN tblEmployee e ON n.lUserKey = e.lEmployeeKey
            WHERE n.lOwnerKey = @contractKey
            ORDER BY n.dtNoteDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var notes = new List<ContractNote>();
        while (await reader.ReadAsync())
        {
            notes.Add(new ContractNote(
                NoteKey: Convert.ToInt32(reader["lNoteKey"]),
                NoteDate: reader["dtNoteDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtNoteDate"]),
                Author: reader["sAuthor"].ToString() ?? "System",
                Note: reader["sNote"].ToString() ?? ""
            ));
        }

        return Ok(notes);
    }

    [HttpGet("{contractKey:int}/documents")]
    public async Task<IActionResult> GetDocuments(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                d.lDocumentKey,
                d.sDocumentName,
                ISNULL(d.sDocumentFileName, '') AS sDocumentFileName,
                d.dtDocumentDate,
                ISNULL(dct.sDocumentCategoryType, '') AS sDocumentCategoryType
            FROM tblDocument d
            LEFT JOIN tblDocumentCategoryType dct ON d.lDocumentCategoryTypeKey = dct.lDocumentCategoryTypeKey
            WHERE d.lOwnerKey = @contractKey
            ORDER BY d.dtDocumentDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var docs = new List<ContractDocument>();
        while (await reader.ReadAsync())
        {
            docs.Add(new ContractDocument(
                DocumentKey: Convert.ToInt32(reader["lDocumentKey"]),
                DocumentName: reader["sDocumentName"].ToString() ?? "",
                FileName: reader["sDocumentFileName"].ToString() ?? "",
                DocumentDate: reader["dtDocumentDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtDocumentDate"]),
                CategoryType: reader["sDocumentCategoryType"].ToString() ?? ""
            ));
        }

        return Ok(docs);
    }

    [HttpGet("{contractKey:int}/health")]
    public async Task<IActionResult> GetHealth(int contractKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                ISNULL(rc.nRevenue, 0) AS nRevenue,
                ISNULL(rc.nConsumption, 0) AS nConsumption,
                ISNULL(rc.nPercentValueConsumedConsumption, 0) AS nPercentConsumed,
                ISNULL(rc.nPercentTimeElapsed, 0) AS nPercentTimeElapsed
            FROM tblContractReportCard rc
            WHERE rc.lContractKey = @contractKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@contractKey", contractKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Ok(new ContractHealth(0, 0, 0, 0, 0, "N/A"));

        var revenue = Convert.ToDecimal(reader["nRevenue"]);
        var consumption = Convert.ToDecimal(reader["nConsumption"]);
        var percentConsumed = Convert.ToDecimal(reader["nPercentConsumed"]);
        var percentTime = Convert.ToDecimal(reader["nPercentTimeElapsed"]);

        var margin = revenue > 0 ? Math.Round((revenue - consumption) / revenue * 100, 1) : 0;
        var grade = margin >= 70 ? "Healthy" : margin >= 40 ? "At Risk" : "Critical";

        return Ok(new ContractHealth(
            Revenue: revenue,
            Consumption: consumption,
            PercentConsumed: percentConsumed,
            PercentTimeElapsed: percentTime,
            Margin: margin,
            Grade: grade
        ));
    }
}
