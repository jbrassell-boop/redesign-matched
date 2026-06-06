using System.Data;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

/// <summary>
/// Pending Contracts = deal origination. A deal-in-progress is staged in five
/// dedicated tables (tblPendingContract, tblPendingContractScope,
/// tblPendingContractDepartments, tblPendingContractAffiliates,
/// tblPendingContractAgreementTemplates) separate from tblContract, then
/// converted into a real tblContract once it has serials + terms.
///
/// DB reality (verified against localhost WinscopeWeb): the 5 tables exist but
/// none of the legacy pendingContract* stored procedures shipped with the cloud
/// DB, so the header/scope/dept/affiliate CRUD below uses inline parameterized
/// SQL against the tables directly — the established convention here
/// (ContractsController, DepartmentsController).
/// The CONVERT engine is the exception: dbo.pendingContractConvert +
/// dbo.contractBillingScheduleCreate are ported verbatim from production
/// WinScopeNet by migration 002_pending_contract_convert.sql (which also seeds
/// tblContractTypes/tblContractInstallmentTypes), so POST /{key}/convert runs
/// the full pre-flight and then EXECs those two procs. See
/// docs/pending-contracts-deferred.md.
///
/// Audit columns (Created_*/Updated_*/Deleted_*) are populated from the JWT via
/// this.GetCurrentUserKey(); soft-deletes set Deleted_datetime (rows are filtered
/// by Deleted_datetime IS NULL everywhere).
/// </summary>
[ApiController]
[Route("api/pending-contracts")]
[Authorize]
public class PendingContractsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // ========================================================================
    // HEADER CRUD
    // ========================================================================

    [HttpGet]
    public async Task<IActionResult> GetPendingContracts(
        [FromQuery] string? search = null,
        [FromQuery] bool includeInactive = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 200)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "pc.Deleted_datetime IS NULL" };
        // Status: 'Pending' is live; 'Dead' (and anything not Pending) is inactive.
        if (!includeInactive)
            where.Add("ISNULL(pc.sStatus, 'Pending') = 'Pending'");
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(pc.sPendingContractName1 LIKE @search OR c.sClientName1 LIKE @search)");

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblPendingContract pc
            LEFT JOIN tblClient c ON c.lClientKey = pc.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT
                pc.lPendingContractKey,
                ISNULL(pc.lClientKey, 0) AS lClientKey,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(pc.sPendingContractName1, '') AS sPendingContractName1,
                ISNULL(pc.lContractTypeKey, 0) AS lContractTypeKey,
                ISNULL(ct.sContractType, '') AS sContractType,
                ISNULL(pc.sStatus, 'Pending') AS sStatus,
                pc.dtStatusDate,
                pc.dtCreationDate,
                ISNULL(pc.lSalesRepKey, 0) AS lSalesRepKey,
                LTRIM(RTRIM(ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, ''))) AS SalesRep,
                ISNULL(pc.lTermMonths, 0) AS lTermMonths,
                (SELECT COUNT(*) FROM tblPendingContractScope s
                 WHERE s.lPendingContractKey = pc.lPendingContractKey
                   AND s.Deleted_datetime IS NULL) AS ScopeCount
            FROM tblPendingContract pc
            LEFT JOIN tblClient c ON c.lClientKey = pc.lClientKey
            LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = pc.lContractTypeKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = pc.lSalesRepKey
            {whereClause}
            ORDER BY pc.dtCreationDate DESC, pc.lPendingContractKey DESC
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
        var items = new List<PendingContractListItem>();
        while (await reader.ReadAsync())
        {
            var status = reader["sStatus"].ToString() ?? "Pending";
            items.Add(new PendingContractListItem(
                PendingContractKey: Convert.ToInt32(reader["lPendingContractKey"]),
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                ClientName: reader["sClientName1"].ToString() ?? "",
                Name: reader["sPendingContractName1"].ToString() ?? "",
                ContractTypeKey: Convert.ToInt32(reader["lContractTypeKey"]),
                ContractType: reader["sContractType"].ToString() ?? "",
                Status: status,
                StatusDate: reader["dtStatusDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtStatusDate"]),
                CreationDate: reader["dtCreationDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtCreationDate"]),
                SalesRepKey: Convert.ToInt32(reader["lSalesRepKey"]),
                SalesRep: reader["SalesRep"].ToString() ?? "",
                TermMonths: Convert.ToInt32(reader["lTermMonths"]),
                ScopeCount: Convert.ToInt32(reader["ScopeCount"]),
                IsDead: !string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase)
            ));
        }

        return Ok(new PendingContractListResponse(items, totalCount));
    }

    [HttpGet("{pendingKey:int}")]
    public async Task<IActionResult> GetPendingContract(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                pc.lPendingContractKey,
                ISNULL(pc.lClientKey, 0) AS lClientKey,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(pc.sPendingContractName1, '') AS sPendingContractName1,
                ISNULL(pc.lContractTypeKey, 0) AS lContractTypeKey,
                ISNULL(ct.sContractType, '') AS sContractType,
                ISNULL(pc.sStatus, 'Pending') AS sStatus,
                pc.dtStatusDate,
                pc.dtCreationDate,
                ISNULL(pc.lSalesRepKey, 0) AS lSalesRepKey,
                LTRIM(RTRIM(ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, ''))) AS SalesRep,
                ISNULL(pc.lTermMonths, 0) AS lTermMonths,
                ISNULL(pc.lPendingContractAgreementTemplateKey, 0) AS lPendingContractAgreementTemplateKey,
                ISNULL(pc.sPendingContractBillName1, '') AS sPendingContractBillName1,
                ISNULL(pc.sPendingContractBillName2, '') AS sPendingContractBillName2,
                ISNULL(pc.sPendingContractAddr1, '') AS sPendingContractAddr1,
                ISNULL(pc.sPendingContractAddr2, '') AS sPendingContractAddr2,
                ISNULL(pc.sPendingContractCity, '') AS sPendingContractCity,
                ISNULL(pc.sPendingContractState, '') AS sPendingContractState,
                ISNULL(pc.sPendingContractZip, '') AS sPendingContractZip,
                ISNULL(pc.sPendingContractCountry, '') AS sPendingContractCountry,
                ISNULL(pc.sPendingContractPhoneNumber, '') AS sPendingContractPhoneNumber,
                ISNULL(pc.sPendingContractFaxNumber, '') AS sPendingContractFaxNumber,
                (SELECT COUNT(*) FROM tblPendingContractScope s
                 WHERE s.lPendingContractKey = pc.lPendingContractKey AND s.Deleted_datetime IS NULL) AS ScopeCount,
                (SELECT COUNT(*) FROM tblPendingContractDepartments d
                 WHERE d.lPendingContractKey = pc.lPendingContractKey AND d.Deleted_datetime IS NULL) AS DepartmentCount,
                (SELECT COUNT(*) FROM tblPendingContractAffiliates a
                 WHERE a.lPendingContractKey = pc.lPendingContractKey AND a.Deleted_datetime IS NULL) AS AffiliateCount
            FROM tblPendingContract pc
            LEFT JOIN tblClient c ON c.lClientKey = pc.lClientKey
            LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = pc.lContractTypeKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = pc.lSalesRepKey
            WHERE pc.lPendingContractKey = @pendingKey AND pc.Deleted_datetime IS NULL
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Pending contract not found." });

        return Ok(new PendingContractDetail(
            PendingContractKey: Convert.ToInt32(reader["lPendingContractKey"]),
            ClientKey: Convert.ToInt32(reader["lClientKey"]),
            ClientName: reader["sClientName1"].ToString() ?? "",
            Name: reader["sPendingContractName1"].ToString() ?? "",
            ContractTypeKey: Convert.ToInt32(reader["lContractTypeKey"]),
            ContractType: reader["sContractType"].ToString() ?? "",
            Status: reader["sStatus"].ToString() ?? "Pending",
            StatusDate: reader["dtStatusDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtStatusDate"]),
            CreationDate: reader["dtCreationDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtCreationDate"]),
            SalesRepKey: Convert.ToInt32(reader["lSalesRepKey"]),
            SalesRep: reader["SalesRep"].ToString() ?? "",
            TermMonths: Convert.ToInt32(reader["lTermMonths"]),
            AgreementTemplateKey: Convert.ToInt32(reader["lPendingContractAgreementTemplateKey"]),
            BillName1: reader["sPendingContractBillName1"].ToString() ?? "",
            BillName2: reader["sPendingContractBillName2"].ToString() ?? "",
            Address1: reader["sPendingContractAddr1"].ToString() ?? "",
            Address2: reader["sPendingContractAddr2"].ToString() ?? "",
            City: reader["sPendingContractCity"].ToString() ?? "",
            State: reader["sPendingContractState"].ToString() ?? "",
            Zip: reader["sPendingContractZip"].ToString() ?? "",
            Country: reader["sPendingContractCountry"].ToString() ?? "",
            Phone: reader["sPendingContractPhoneNumber"].ToString() ?? "",
            Fax: reader["sPendingContractFaxNumber"].ToString() ?? "",
            ScopeCount: Convert.ToInt32(reader["ScopeCount"]),
            DepartmentCount: Convert.ToInt32(reader["DepartmentCount"]),
            AffiliateCount: Convert.ToInt32(reader["AffiliateCount"])
        ));
    }

    [HttpPost]
    public async Task<IActionResult> CreatePendingContract([FromBody] CreatePendingContractRequest body)
    {
        if (body.ClientKey <= 0) return BadRequest(new { message = "A client is required." });
        if (body.ContractTypeKey <= 0) return BadRequest(new { message = "A contract type is required." });

        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Resolve client + contract-type display names so we can build the
        // auto-name exactly the way the legacy WinForms client did.
        string clientName, contractType;
        await using (var lookup = new SqlCommand("""
            SELECT
                (SELECT ISNULL(sClientName1,'') FROM tblClient WHERE lClientKey = @clientKey) AS ClientName,
                (SELECT ISNULL(sContractType,'') FROM tblContractTypes WHERE lContractTypeKey = @typeKey) AS ContractType
            """, conn))
        {
            lookup.CommandTimeout = 30;
            lookup.Parameters.AddWithValue("@clientKey", body.ClientKey);
            lookup.Parameters.AddWithValue("@typeKey", body.ContractTypeKey);
            await using var lr = await lookup.ExecuteReaderAsync();
            await lr.ReadAsync();
            clientName = lr["ClientName"]?.ToString() ?? "";
            contractType = lr["ContractType"]?.ToString() ?? "";
        }
        if (string.IsNullOrWhiteSpace(clientName))
            return BadRequest(new { message = "Client not found." });

        // Auto-name + dedup (ports frmPendingContractNew.UpdateContractName):
        //   "Pending Contract: {Client} - {Type} {MM/dd/yyyy}"
        //   if taken, try "Pending Contract #2: ..." through "#10".
        var name = (body.Name ?? "").Trim();
        if (string.IsNullOrEmpty(name))
        {
            var today = DateTime.Today.ToString("MM/dd/yyyy", CultureInfo.InvariantCulture);
            var baseName = $"Pending Contract: {clientName} - {contractType} {today}";
            if (!await NameExistsAsync(conn, baseName))
            {
                name = baseName;
            }
            else
            {
                name = "";
                for (var i = 2; i <= 10; i++)
                {
                    var candidate = $"Pending Contract #{i}: {clientName} - {contractType} {today}";
                    if (!await NameExistsAsync(conn, candidate)) { name = candidate; break; }
                }
                if (string.IsNullOrEmpty(name))
                    return Conflict(new { message = "Could not generate a unique pending-contract name. Provide one explicitly." });
            }
        }
        else if (await NameExistsAsync(conn, name))
        {
            return Conflict(new { message = "A pending contract with this name already exists." });
        }

        const string insertSql = """
            INSERT INTO tblPendingContract
                (lClientKey, lContractTypeKey, sPendingContractName1, lUserKey, sStatus,
                 dtStatusDate, dtCreationDate, Created_UserKey, Created_datetime)
            OUTPUT INSERTED.lPendingContractKey
            VALUES
                (@clientKey, @typeKey, @name, @userKey, 'Pending',
                 GETDATE(), GETDATE(), @userKey, GETDATE())
            """;

        await using var cmd = new SqlCommand(insertSql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@clientKey", body.ClientKey);
        cmd.Parameters.AddWithValue("@typeKey", body.ContractTypeKey);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@userKey", userKey);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { pendingContractKey = newKey, name });
    }

    private static async Task<bool> NameExistsAsync(SqlConnection conn, string name)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblPendingContract WHERE sPendingContractName1 = @name AND Deleted_datetime IS NULL", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@name", name);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

    [HttpPatch("{pendingKey:int}")]
    public async Task<IActionResult> PatchPendingContract(int pendingKey, [FromBody] PatchPendingContractRequest body)
    {
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn, CommandTimeout = 30 };

        if (body.Status is not null)
        {
            sets.Add("sStatus = @status");
            sets.Add("dtStatusDate = GETDATE()");
            cmd.Parameters.AddWithValue("@status", body.Status);
        }
        if (body.SalesRepKey.HasValue)        { sets.Add("lSalesRepKey = @salesRep");   cmd.Parameters.AddWithValue("@salesRep", body.SalesRepKey.Value); }
        if (body.ContractTypeKey.HasValue)    { sets.Add("lContractTypeKey = @typeKey"); cmd.Parameters.AddWithValue("@typeKey", body.ContractTypeKey.Value); }
        if (body.TermMonths.HasValue)         { sets.Add("lTermMonths = @term");         cmd.Parameters.AddWithValue("@term", body.TermMonths.Value); }
        if (body.AgreementTemplateKey.HasValue){ sets.Add("lPendingContractAgreementTemplateKey = @tmpl"); cmd.Parameters.AddWithValue("@tmpl", body.AgreementTemplateKey.Value); }
        if (body.Address1 is not null)        { sets.Add("sPendingContractAddr1 = @addr1");  cmd.Parameters.AddWithValue("@addr1", body.Address1); }
        if (body.Address2 is not null)        { sets.Add("sPendingContractAddr2 = @addr2");  cmd.Parameters.AddWithValue("@addr2", body.Address2); }
        if (body.City is not null)            { sets.Add("sPendingContractCity = @city");    cmd.Parameters.AddWithValue("@city", body.City); }
        if (body.State is not null)           { sets.Add("sPendingContractState = @state");  cmd.Parameters.AddWithValue("@state", body.State); }
        if (body.Zip is not null)             { sets.Add("sPendingContractZip = @zip");      cmd.Parameters.AddWithValue("@zip", body.Zip); }
        if (body.Country is not null)         { sets.Add("sPendingContractCountry = @country"); cmd.Parameters.AddWithValue("@country", body.Country); }
        if (body.Phone is not null)           { sets.Add("sPendingContractPhoneNumber = @phone"); cmd.Parameters.AddWithValue("@phone", body.Phone); }
        if (body.Fax is not null)             { sets.Add("sPendingContractFaxNumber = @fax");     cmd.Parameters.AddWithValue("@fax", body.Fax); }

        if (sets.Count == 0)
        {
            await cmd.DisposeAsync();
            return NoContent();
        }

        sets.Add("Updated_UserKey = @userKey");
        sets.Add("Updated_datetime = GETDATE()");
        cmd.Parameters.AddWithValue("@userKey", userKey);
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.CommandText = $"UPDATE tblPendingContract SET {string.Join(", ", sets)} WHERE lPendingContractKey = @pendingKey AND Deleted_datetime IS NULL";

        await using (cmd)
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound(new { message = "Pending contract not found." });
        }
        return NoContent();
    }

    [HttpDelete("{pendingKey:int}")]
    public async Task<IActionResult> DeletePendingContract(int pendingKey)
    {
        // Admin-gated. Legacy restricted deletes to 5 named users; in the cloud
        // we gate on the Admin role until a finer-grained claim exists
        // (see docs/pending-contracts-deferred.md, "Access gating").
        if (!User.IsInRole("Admin"))
            return Forbid();

        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Soft-delete: header + child rows in one transaction.
        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            var n = 0;
            await using (var cmd = new SqlCommand(
                "UPDATE tblPendingContract SET Deleted_datetime = GETDATE(), Deleted_UserKey = @userKey WHERE lPendingContractKey = @key AND Deleted_datetime IS NULL",
                conn, tx))
            {
                cmd.CommandTimeout = 30;
                cmd.Parameters.AddWithValue("@userKey", userKey);
                cmd.Parameters.AddWithValue("@key", pendingKey);
                n = await cmd.ExecuteNonQueryAsync();
            }

            if (n == 0)
            {
                await tx.RollbackAsync();
                return NotFound(new { message = "Pending contract not found." });
            }

            foreach (var table in new[] { "tblPendingContractScope", "tblPendingContractDepartments", "tblPendingContractAffiliates" })
            {
                await using var cmd = new SqlCommand(
                    $"UPDATE {table} SET Deleted_datetime = GETDATE(), Deleted_UserKey = @userKey WHERE lPendingContractKey = @key AND Deleted_datetime IS NULL",
                    conn, tx);
                cmd.CommandTimeout = 30;
                cmd.Parameters.AddWithValue("@userKey", userKey);
                cmd.Parameters.AddWithValue("@key", pendingKey);
                await cmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return NoContent();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ========================================================================
    // SCOPES SUB-RESOURCE
    // ========================================================================

    [HttpGet("{pendingKey:int}/scopes")]
    public async Task<IActionResult> GetScopes(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                pcs.lPendingContractScopeKey,
                ISNULL(pcs.lScopeKey, 0) AS lScopeKey,
                ISNULL(pcs.lScopeTypeKey, 0) AS lScopeTypeKey,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                ISNULL(pcs.lClientKey, 0) AS lClientKey,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(pcs.lDepartmentKey, 0) AS lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(pcs.lQuantity, 0) AS lQuantity,
                ISNULL(pcs.nUnitCost, 0) AS nUnitCost,
                ISNULL(pcs.nCost, 0) AS nCost
            FROM tblPendingContractScope pcs
            LEFT JOIN tblScope s ON s.lScopeKey = pcs.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey =
                CASE WHEN ISNULL(pcs.lScopeKey,0) > 0 THEN s.lScopeTypeKey ELSE pcs.lScopeTypeKey END
            LEFT JOIN tblClient c ON c.lClientKey = pcs.lClientKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = pcs.lDepartmentKey
            WHERE pcs.lPendingContractKey = @pendingKey AND pcs.Deleted_datetime IS NULL
            ORDER BY s.sSerialNumber, st.sScopeTypeDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var scopes = new List<PendingContractScopeItem>();
        while (await reader.ReadAsync())
        {
            scopes.Add(new PendingContractScopeItem(
                PendingContractScopeKey: Convert.ToInt32(reader["lPendingContractScopeKey"]),
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                ScopeTypeKey: Convert.ToInt32(reader["lScopeTypeKey"]),
                ScopeTypeDesc: reader["sScopeTypeDesc"].ToString() ?? "",
                SerialNumber: reader["sSerialNumber"].ToString() ?? "",
                RigidOrFlexible: reader["sRigidOrFlexible"].ToString() ?? "",
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                ClientName: reader["sClientName1"].ToString() ?? "",
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                Quantity: Convert.ToInt32(reader["lQuantity"]),
                UnitCost: Convert.ToDecimal(reader["nUnitCost"]),
                ContractCost: Convert.ToDecimal(reader["nCost"])
            ));
        }

        return Ok(scopes);
    }

    [HttpGet("{pendingKey:int}/scopes/available")]
    public async Task<IActionResult> GetAvailableScopes(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Scopes belonging to the pending contract's client (via department)
        // that are not already attached to this pending contract.
        const string sql = """
            SELECT
                s.lScopeKey,
                ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                ISNULL(s.lScopeTypeKey, 0) AS lScopeTypeKey,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                ISNULL(d.lClientKey, 0) AS lClientKey,
                ISNULL(c.sClientName1, '') AS sClientName1,
                ISNULL(s.lDepartmentKey, 0) AS lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName
            FROM tblPendingContract pc
            JOIN tblDepartment d ON d.lClientKey = pc.lClientKey
            JOIN tblScope s ON s.lDepartmentKey = d.lDepartmentKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE pc.lPendingContractKey = @pendingKey
              AND pc.Deleted_datetime IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM tblPendingContractScope pcs
                  WHERE pcs.lPendingContractKey = pc.lPendingContractKey
                    AND pcs.lScopeKey = s.lScopeKey
                    AND pcs.Deleted_datetime IS NULL)
            ORDER BY s.sSerialNumber
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 60;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var scopes = new List<AvailablePendingContractScope>();
        while (await reader.ReadAsync())
        {
            scopes.Add(new AvailablePendingContractScope(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                SerialNumber: reader["sSerialNumber"].ToString() ?? "",
                ScopeTypeKey: Convert.ToInt32(reader["lScopeTypeKey"]),
                ScopeTypeDesc: reader["sScopeTypeDesc"].ToString() ?? "",
                RigidOrFlexible: reader["sRigidOrFlexible"].ToString() ?? "",
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                ClientName: reader["sClientName1"].ToString() ?? "",
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? ""
            ));
        }

        return Ok(scopes);
    }

    [HttpPost("{pendingKey:int}/scopes")]
    public async Task<IActionResult> AddScope(int pendingKey, [FromBody] AddPendingContractScopeRequest body)
    {
        if (body.ScopeKey <= 0) return BadRequest(new { message = "A scope is required." });
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        if (!await PendingExistsAsync(conn, pendingKey))
            return NotFound(new { message = "Pending contract not found." });

        // Pull the scope's type/dept/client so the row carries denormalized keys
        // (mirrors how the legacy scopesInsert proc copied them).
        const string sql = """
            INSERT INTO tblPendingContractScope
                (lPendingContractKey, lScopeKey, lScopeTypeKey, lDepartmentKey, lClientKey,
                 lQuantity, nUnitCost, nCost, Created_UserKey, Created_datetime)
            OUTPUT INSERTED.lPendingContractScopeKey
            SELECT
                @pendingKey, s.lScopeKey, s.lScopeTypeKey, s.lDepartmentKey, d.lClientKey,
                1, 0, 0, @userKey, GETDATE()
            FROM tblScope s
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            WHERE s.lScopeKey = @scopeKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
        cmd.Parameters.AddWithValue("@userKey", userKey);

        var newKey = await cmd.ExecuteScalarAsync();
        if (newKey is null || newKey == DBNull.Value)
            return BadRequest(new { message = "Scope not found." });

        return Ok(new { pendingContractScopeKey = Convert.ToInt32(newKey) });
    }

    [HttpPost("{pendingKey:int}/scopes/models")]
    public async Task<IActionResult> AddScopeModel(int pendingKey, [FromBody] AddPendingContractScopeTypeRequest body)
    {
        if (body.ScopeTypeKey <= 0) return BadRequest(new { message = "A scope model is required." });
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        if (!await PendingExistsAsync(conn, pendingKey))
            return NotFound(new { message = "Pending contract not found." });

        // Model-only line: lScopeKey stays 0 until a serial is assigned later.
        const string sql = """
            INSERT INTO tblPendingContractScope
                (lPendingContractKey, lScopeKey, lScopeTypeKey, lDepartmentKey, lClientKey,
                 lQuantity, nUnitCost, nCost, Created_UserKey, Created_datetime)
            OUTPUT INSERTED.lPendingContractScopeKey
            VALUES
                (@pendingKey, 0, @scopeTypeKey, @deptKey, @clientKey,
                 @qty, @unitCost, @cost, @userKey, GETDATE())
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.Parameters.AddWithValue("@scopeTypeKey", body.ScopeTypeKey);
        cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey > 0 ? body.DepartmentKey : (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@clientKey", body.ClientKey > 0 ? body.ClientKey : (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@qty", body.Quantity > 0 ? body.Quantity : 1);
        cmd.Parameters.AddWithValue("@unitCost", body.UnitCost);
        cmd.Parameters.AddWithValue("@cost", body.UnitCost * (body.Quantity > 0 ? body.Quantity : 1));
        cmd.Parameters.AddWithValue("@userKey", userKey);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return Ok(new { pendingContractScopeKey = newKey });
    }

    [HttpPatch("{pendingKey:int}/scopes/{scopeRowKey:int}")]
    public async Task<IActionResult> PatchScope(int pendingKey, int scopeRowKey, [FromBody] PatchPendingContractScopeRequest body)
    {
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand { Connection = conn, CommandTimeout = 30 };

        if (body.ScopeTypeKey.HasValue) { sets.Add("lScopeTypeKey = @typeKey"); cmd.Parameters.AddWithValue("@typeKey", body.ScopeTypeKey.Value); }
        if (body.Quantity.HasValue)     { sets.Add("lQuantity = @qty");         cmd.Parameters.AddWithValue("@qty", body.Quantity.Value); }
        if (body.UnitCost.HasValue)     { sets.Add("nUnitCost = @unitCost");    cmd.Parameters.AddWithValue("@unitCost", body.UnitCost.Value); }
        if (body.Cost.HasValue)         { sets.Add("nCost = @cost");            cmd.Parameters.AddWithValue("@cost", body.Cost.Value); }

        // Assigning a serial promotes a model-only line: look up the scope key
        // for the given serial within the pending contract's client.
        if (!string.IsNullOrWhiteSpace(body.SerialNumber))
        {
            await using var lookup = new SqlCommand("""
                SELECT TOP 1 s.lScopeKey
                FROM tblPendingContract pc
                JOIN tblDepartment d ON d.lClientKey = pc.lClientKey
                JOIN tblScope s ON s.lDepartmentKey = d.lDepartmentKey
                WHERE pc.lPendingContractKey = @pendingKey
                  AND s.sSerialNumber = @serial
                ORDER BY s.lScopeKey
                """, conn);
            lookup.CommandTimeout = 30;
            lookup.Parameters.AddWithValue("@pendingKey", pendingKey);
            lookup.Parameters.AddWithValue("@serial", body.SerialNumber.Trim());
            var scopeKeyObj = await lookup.ExecuteScalarAsync();
            if (scopeKeyObj is null || scopeKeyObj == DBNull.Value)
            {
                await cmd.DisposeAsync();
                return BadRequest(new { message = $"No scope with serial '{body.SerialNumber.Trim()}' found for this client." });
            }
            sets.Add("lScopeKey = @scopeKey");
            cmd.Parameters.AddWithValue("@scopeKey", Convert.ToInt32(scopeKeyObj));
        }

        if (sets.Count == 0)
        {
            await cmd.DisposeAsync();
            return NoContent();
        }

        sets.Add("Updated_UserKey = @userKey");
        sets.Add("Updated_datetime = GETDATE()");
        cmd.Parameters.AddWithValue("@userKey", userKey);
        cmd.Parameters.AddWithValue("@rowKey", scopeRowKey);
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.CommandText = $"""
            UPDATE tblPendingContractScope SET {string.Join(", ", sets)}
            WHERE lPendingContractScopeKey = @rowKey AND lPendingContractKey = @pendingKey AND Deleted_datetime IS NULL
            """;

        await using (cmd)
        {
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0) return NotFound(new { message = "Scope line not found." });
        }
        return NoContent();
    }

    [HttpDelete("{pendingKey:int}/scopes/{scopeRowKey:int}")]
    public async Task<IActionResult> DeleteScope(int pendingKey, int scopeRowKey)
    {
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("""
            UPDATE tblPendingContractScope
            SET Deleted_datetime = GETDATE(), Deleted_UserKey = @userKey
            WHERE lPendingContractScopeKey = @rowKey AND lPendingContractKey = @pendingKey AND Deleted_datetime IS NULL
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@userKey", userKey);
        cmd.Parameters.AddWithValue("@rowKey", scopeRowKey);
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Scope line not found." });
        return NoContent();
    }

    // ========================================================================
    // DEPARTMENTS SUB-RESOURCE
    // ========================================================================

    [HttpGet("{pendingKey:int}/departments")]
    public async Task<IActionResult> GetDepartments(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                pcd.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(c.sClientName1, '') AS sClientName1
            FROM tblPendingContractDepartments pcd
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = pcd.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE pcd.lPendingContractKey = @pendingKey AND pcd.Deleted_datetime IS NULL
            ORDER BY d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<PendingContractDepartmentItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new PendingContractDepartmentItem(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                ClientName: reader["sClientName1"].ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    [HttpGet("{pendingKey:int}/departments/available")]
    public async Task<IActionResult> GetAvailableDepartments(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Departments under the pending contract's client not already linked.
        const string sql = """
            SELECT
                d.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(c.sClientName1, '') AS sClientName1
            FROM tblPendingContract pc
            JOIN tblDepartment d ON d.lClientKey = pc.lClientKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE pc.lPendingContractKey = @pendingKey
              AND pc.Deleted_datetime IS NULL
              AND ISNULL(d.bActive, 1) = 1
              AND NOT EXISTS (
                  SELECT 1 FROM tblPendingContractDepartments pcd
                  WHERE pcd.lPendingContractKey = pc.lPendingContractKey
                    AND pcd.lDepartmentKey = d.lDepartmentKey
                    AND pcd.Deleted_datetime IS NULL)
            ORDER BY d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<AvailableDepartment>();
        while (await reader.ReadAsync())
        {
            items.Add(new AvailableDepartment(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                ClientName: reader["sClientName1"].ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    [HttpPost("{pendingKey:int}/departments")]
    public async Task<IActionResult> AddDepartments(int pendingKey, [FromBody] AddPendingContractDepartmentsRequest body)
    {
        if (body.DepartmentKeys is null || body.DepartmentKeys.Length == 0)
            return BadRequest(new { message = "At least one department is required." });

        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        if (!await PendingExistsAsync(conn, pendingKey))
            return NotFound(new { message = "Pending contract not found." });

        // (lPendingContractKey, lDepartmentKey) is a composite PK, so a soft-deleted
        // row still occupies the slot — revive it instead of re-inserting. New keys
        // are inserted. Active duplicates are skipped.
        var added = 0;
        foreach (var deptKey in body.DepartmentKeys.Distinct())
        {
            await using var cmd = new SqlCommand("""
                IF EXISTS (SELECT 1 FROM tblPendingContractDepartments
                           WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey AND Deleted_datetime IS NOT NULL)
                    UPDATE tblPendingContractDepartments
                    SET Deleted_datetime = NULL, Deleted_UserKey = NULL, Updated_UserKey = @userKey, Updated_datetime = GETDATE()
                    WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey
                ELSE IF NOT EXISTS (SELECT 1 FROM tblPendingContractDepartments
                                    WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey)
                    INSERT INTO tblPendingContractDepartments
                        (lPendingContractKey, lDepartmentKey, Created_UserKey, Created_datetime)
                    VALUES (@pendingKey, @deptKey, @userKey, GETDATE())
                """, conn);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
            cmd.Parameters.AddWithValue("@deptKey", deptKey);
            cmd.Parameters.AddWithValue("@userKey", userKey);
            added += await cmd.ExecuteNonQueryAsync();
        }

        return Ok(new { added });
    }

    [HttpDelete("{pendingKey:int}/departments/{deptKey:int}")]
    public async Task<IActionResult> RemoveDepartment(int pendingKey, int deptKey)
    {
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("""
            UPDATE tblPendingContractDepartments
            SET Deleted_datetime = GETDATE(), Deleted_UserKey = @userKey
            WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey AND Deleted_datetime IS NULL
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@userKey", userKey);
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Department link not found." });
        return NoContent();
    }

    // ========================================================================
    // AFFILIATES SUB-RESOURCE
    // ========================================================================

    [HttpGet("{pendingKey:int}/affiliates")]
    public async Task<IActionResult> GetAffiliates(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                pca.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(c.sClientName1, '') AS sClientName1
            FROM tblPendingContractAffiliates pca
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = pca.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE pca.lPendingContractKey = @pendingKey AND pca.Deleted_datetime IS NULL
            ORDER BY c.sClientName1, d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<PendingContractAffiliateItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new PendingContractAffiliateItem(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                ClientName: reader["sClientName1"].ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    [HttpGet("{pendingKey:int}/affiliates/available")]
    public async Task<IActionResult> GetAvailableAffiliates(int pendingKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Affiliates are departments OUTSIDE the pending contract's own client
        // (a third-party facility sharing the agreement) not already linked.
        const string sql = """
            SELECT TOP 500
                d.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                ISNULL(c.sClientName1, '') AS sClientName1
            FROM tblPendingContract pc
            JOIN tblDepartment d ON d.lClientKey <> pc.lClientKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE pc.lPendingContractKey = @pendingKey
              AND pc.Deleted_datetime IS NULL
              AND ISNULL(d.bActive, 1) = 1
              AND NOT EXISTS (
                  SELECT 1 FROM tblPendingContractAffiliates pca
                  WHERE pca.lPendingContractKey = pc.lPendingContractKey
                    AND pca.lDepartmentKey = d.lDepartmentKey
                    AND pca.Deleted_datetime IS NULL)
            ORDER BY c.sClientName1, d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 60;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<AvailableDepartment>();
        while (await reader.ReadAsync())
        {
            items.Add(new AvailableDepartment(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"].ToString() ?? "",
                ClientName: reader["sClientName1"].ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    [HttpPost("{pendingKey:int}/affiliates")]
    public async Task<IActionResult> AddAffiliate(int pendingKey, [FromBody] AddPendingContractAffiliateRequest body)
    {
        if (body.DepartmentKey <= 0) return BadRequest(new { message = "A department is required." });
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        if (!await PendingExistsAsync(conn, pendingKey))
            return NotFound(new { message = "Pending contract not found." });

        // Composite PK (lPendingContractKey, lDepartmentKey): revive a soft-deleted
        // row instead of re-inserting; insert only when truly new.
        await using var cmd = new SqlCommand("""
            IF EXISTS (SELECT 1 FROM tblPendingContractAffiliates
                       WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey AND Deleted_datetime IS NOT NULL)
                UPDATE tblPendingContractAffiliates
                SET Deleted_datetime = NULL, Deleted_UserKey = NULL, Updated_UserKey = @userKey, Updated_datetime = GETDATE()
                WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey
            ELSE IF NOT EXISTS (SELECT 1 FROM tblPendingContractAffiliates
                                WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey)
                INSERT INTO tblPendingContractAffiliates
                    (lPendingContractKey, lDepartmentKey, Created_UserKey, Created_datetime)
                VALUES (@pendingKey, @deptKey, @userKey, GETDATE())
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey);
        cmd.Parameters.AddWithValue("@userKey", userKey);

        await cmd.ExecuteNonQueryAsync();
        return Ok(new { message = "Affiliate added." });
    }

    [HttpDelete("{pendingKey:int}/affiliates/{deptKey:int}")]
    public async Task<IActionResult> RemoveAffiliate(int pendingKey, int deptKey)
    {
        var userKey = this.GetCurrentUserKey();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("""
            UPDATE tblPendingContractAffiliates
            SET Deleted_datetime = GETDATE(), Deleted_UserKey = @userKey
            WHERE lPendingContractKey = @pendingKey AND lDepartmentKey = @deptKey AND Deleted_datetime IS NULL
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@userKey", userKey);
        cmd.Parameters.AddWithValue("@pendingKey", pendingKey);
        cmd.Parameters.AddWithValue("@deptKey", deptKey);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Affiliate link not found." });
        return NoContent();
    }

    // ========================================================================
    // AGREEMENT-TEMPLATE LOOKUP
    // ========================================================================

    [HttpGet("agreement-templates")]
    public async Task<IActionResult> GetAgreementTemplates()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT lPendingContractAgreementTemplateKey,
                   ISNULL(sPendingContractAgreementTemplate, '') AS sName,
                   ISNULL(sPendingContractAgreementTemplateFile, '') AS sFile
            FROM tblPendingContractAgreementTemplates
            WHERE Deleted_datetime IS NULL
            ORDER BY sPendingContractAgreementTemplate
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<PendingContractAgreementTemplate>();
        while (await reader.ReadAsync())
        {
            items.Add(new PendingContractAgreementTemplate(
                AgreementTemplateKey: Convert.ToInt32(reader["lPendingContractAgreementTemplateKey"]),
                Name: reader["sName"].ToString() ?? "",
                FileName: reader["sFile"].ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    // ========================================================================
    // CONVERT  ← pre-flight validation is real; the engine is BLOCKED.
    // ========================================================================

    [HttpPost("{pendingKey:int}/convert")]
    public async Task<IActionResult> ConvertToContract(int pendingKey, [FromBody] ConvertPendingContractRequest body)
    {
        // ---- Pre-flight validation (ports frmPendingContractConvert.btnSave_Click) ----
        var contractName = (body.ContractName ?? "").Trim();
        var poNumber = (body.ContractNumber ?? "").Trim();

        if (body.InstallmentTypeId <= 0)
            return BadRequest(new { message = "A valid invoice frequency is required." });
        if (body.ContractLength < 1)
            return BadRequest(new { message = "Contract length must be at least 1 month." });
        if (body.TerminationDate < body.EffectiveDate)
            return BadRequest(new { message = "Termination date cannot be before the effective date." });
        if (contractName.Length == 0)
            return BadRequest(new { message = "A contract name is required." });
        if (poNumber.Length == 0)
            return BadRequest(new { message = "A purchase order number is required." });
        if (poNumber.Length > 20)
            return BadRequest(new { message = "PO numbers cannot be more than 20 characters." });

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Pending contract must exist + be live (not Dead/converted).
        await using (var existsCmd = new SqlCommand(
            "SELECT ISNULL(sStatus,'Pending') FROM tblPendingContract WHERE lPendingContractKey = @key AND Deleted_datetime IS NULL", conn))
        {
            existsCmd.CommandTimeout = 30;
            existsCmd.Parameters.AddWithValue("@key", pendingKey);
            var statusObj = await existsCmd.ExecuteScalarAsync();
            if (statusObj is null || statusObj == DBNull.Value)
                return NotFound(new { message = "Pending contract not found." });
            if (!string.Equals(statusObj.ToString(), "Pending", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = "Only a pending (live) contract can be converted." });
        }

        // Contract name must be unique against real contracts (ports contractsGet check).
        await using (var dupCmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblContract WHERE sContractName1 = @name", conn))
        {
            dupCmd.CommandTimeout = 30;
            dupCmd.Parameters.AddWithValue("@name", contractName);
            if (Convert.ToInt32(await dupCmd.ExecuteScalarAsync()) > 0)
                return Conflict(new { message = "This contract name already exists and cannot be reused." });
        }

        // ALL scopes must carry a serial (lScopeKey != 0) before converting.
        int totalScopes, modelOnly;
        await using (var scopeCmd = new SqlCommand("""
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN ISNULL(lScopeKey, 0) = 0 THEN 1 ELSE 0 END) AS ModelOnly
            FROM tblPendingContractScope
            WHERE lPendingContractKey = @key AND Deleted_datetime IS NULL
            """, conn))
        {
            scopeCmd.CommandTimeout = 30;
            scopeCmd.Parameters.AddWithValue("@key", pendingKey);
            await using var sr = await scopeCmd.ExecuteReaderAsync();
            await sr.ReadAsync();
            totalScopes = Convert.ToInt32(sr["Total"]);
            modelOnly = sr["ModelOnly"] == DBNull.Value ? 0 : Convert.ToInt32(sr["ModelOnly"]);
        }
        if (totalScopes > 0 && modelOnly > 0)
            return BadRequest(new { message = $"{modelOnly} scope(s) have no serial number. Serial numbers are required before converting." });

        // ---- Convert engine (provisioned by migration 002_pending_contract_convert.sql) ----
        // Two legacy procs ported verbatim into WinscopeWeb:
        //   dbo.pendingContractConvert        — creates the tblContract row, migrates
        //       scopes/depts/affiliates, and flips the pending row to 'Converted'. It
        //       self-manages its own transaction and returns (lContractKey, ErrMsg);
        //       a non-empty ErrMsg means it caught an error and rolled back.
        //   dbo.contractBillingScheduleCreate — builds tblContractBillSchedule rows.
        var userKey = this.GetCurrentUserKey();

        int newContractKey;
        string convertError;
        await using (var convertCmd = new SqlCommand("dbo.pendingContractConvert", conn)
        {
            CommandType = CommandType.StoredProcedure,
            CommandTimeout = 60
        })
        {
            convertCmd.Parameters.AddWithValue("@plPendingContractKey", pendingKey);
            convertCmd.Parameters.AddWithValue("@psContractName", contractName);
            convertCmd.Parameters.AddWithValue("@pdtDateEffective", body.EffectiveDate.Date);
            convertCmd.Parameters.AddWithValue("@pdtDateTermination", body.TerminationDate.Date);
            convertCmd.Parameters.AddWithValue("@psContractNumber", poNumber);
            convertCmd.Parameters.AddWithValue("@plInstallmentTypeID", body.InstallmentTypeId);
            convertCmd.Parameters.AddWithValue("@plContractLength", body.ContractLength);
            convertCmd.Parameters.AddWithValue("@plUserKey", userKey);

            await using var cr = await convertCmd.ExecuteReaderAsync();
            if (await cr.ReadAsync())
            {
                newContractKey = cr["lContractKey"] == DBNull.Value ? 0 : Convert.ToInt32(cr["lContractKey"]);
                convertError = cr["ErrMsg"]?.ToString() ?? "";
            }
            else
            {
                newContractKey = 0;
                convertError = "Conversion returned no result.";
            }
        }

        if (!string.IsNullOrWhiteSpace(convertError) || newContractKey <= 0)
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = string.IsNullOrWhiteSpace(convertError)
                    ? "Conversion failed: the contract could not be created."
                    : $"Conversion failed: {convertError}"
            });

        // The contract is committed by the proc above, so a billing-schedule
        // failure is non-fatal and regenerable. The schedule proc has no internal
        // transaction, so wrap it in one for clean all-or-nothing schedule rows.
        var scheduleBuilt = true;
        string? scheduleWarning = null;
        try
        {
            await using var schedTx = (SqlTransaction)await conn.BeginTransactionAsync();
            try
            {
                await using var schedCmd = new SqlCommand("dbo.contractBillingScheduleCreate", conn, schedTx)
                {
                    CommandType = CommandType.StoredProcedure,
                    CommandTimeout = 60
                };
                schedCmd.Parameters.AddWithValue("@plContractKey", newContractKey);
                await schedCmd.ExecuteNonQueryAsync();

                // Last-installment reconciliation (standard billing/amortization practice):
                // contractBillingScheduleCreate repeats the rounded per-period rate on every
                // row, so when dblAmtTotal isn't evenly divisible the rows sum to a few cents
                // off. Put the rounding remainder on the FINAL bill row so the schedule sums
                // EXACTLY to dblAmtTotal. This is convert-scoped on purpose: here dblAmtInvoiced
                // was derived from dblAmtTotal, so reconciling to it is correct — we deliberately
                // do NOT do this inside the shared contractBillingScheduleCreate proc, where the
                // per-period rate is user-authoritative and not necessarily total/periods.
                await using (var reconcileCmd = new SqlCommand("""
                    DECLARE @total decimal(18,2) = (SELECT dblAmtTotal FROM tblContract WHERE lContractKey = @ck);
                    DECLARE @sum   decimal(18,2) = (SELECT SUM(nBillAmount) FROM tblContractBillSchedule WHERE lContractKey = @ck);
                    IF @total IS NOT NULL AND @sum IS NOT NULL AND @total <> @sum
                        UPDATE tblContractBillSchedule
                        SET nBillAmount = ISNULL(nBillAmount, 0) + (@total - @sum)
                        WHERE lContractInvoiceScheduleKey = (
                            SELECT TOP 1 lContractInvoiceScheduleKey
                            FROM tblContractBillSchedule
                            WHERE lContractKey = @ck
                            ORDER BY dtBillDate DESC, lContractInvoiceScheduleKey DESC);
                    """, conn, schedTx))
                {
                    reconcileCmd.CommandTimeout = 30;
                    reconcileCmd.Parameters.AddWithValue("@ck", newContractKey);
                    await reconcileCmd.ExecuteNonQueryAsync();
                }

                await schedTx.CommitAsync();
            }
            catch
            {
                await schedTx.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            scheduleBuilt = false;
            scheduleWarning = ex.Message;
        }

        return Ok(new
        {
            contractKey = newContractKey,
            scopeCount = totalScopes,
            scheduleBuilt,
            scheduleWarning,
            message = scheduleBuilt
                ? "Pending contract converted to contract."
                : "Contract created, but the billing schedule could not be built and can be regenerated."
        });
    }

    // ── helpers ──
    private static async Task<bool> PendingExistsAsync(SqlConnection conn, int pendingKey)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblPendingContract WHERE lPendingContractKey = @key AND Deleted_datetime IS NULL", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", pendingKey);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }
}
