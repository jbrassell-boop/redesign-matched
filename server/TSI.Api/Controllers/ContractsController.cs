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
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
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
}
