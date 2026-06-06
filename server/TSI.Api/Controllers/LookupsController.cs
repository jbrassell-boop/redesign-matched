using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/lookups")]
[Authorize]
public class LookupsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet("sales-reps")]
    public async Task<IActionResult> GetSalesReps()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lSalesRepKey, ISNULL(sRepFirst,'') AS sRepFirst, ISNULL(sRepLast,'') AS sRepLast
            FROM tblSalesRep
            WHERE sActiveFlag = 'Y'
            ORDER BY sRepLast, sRepFirst
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lSalesRepKey"]),
                name = $"{reader["sRepFirst"]} {reader["sRepLast"]}".Trim()
            });
        return Ok(list);
    }

    [HttpGet("pricing-categories")]
    public async Task<IActionResult> GetPricingCategories()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lPricingCategoryKey, ISNULL(sPricingDescription,'') AS sPricingDescription
            FROM tblPricingCategory
            WHERE ISNULL(bActive,1) = 1
            ORDER BY sPricingDescription
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lPricingCategoryKey"]),
                name = reader["sPricingDescription"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("payment-terms")]
    public async Task<IActionResult> GetPaymentTerms()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lPaymentTermsKey, ISNULL(sTermsDesc,'') AS sTermsDesc
            FROM tblPaymentTerms
            ORDER BY sTermsDesc
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lPaymentTermsKey"]),
                name = reader["sTermsDesc"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("carriers")]
    public async Task<IActionResult> GetCarriers()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lDeliveryMethodKey, ISNULL(sDeliveryDesc,'') AS sDeliveryDesc
            FROM tblDeliveryMethod
            ORDER BY sDeliveryDesc
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lDeliveryMethodKey"]),
                name = reader["sDeliveryDesc"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("repair-levels")]
    public async Task<IActionResult> GetRepairLevels()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lRepairLevelKey, ISNULL(sRepairLevel,'') AS sRepairLevel
            FROM tblRepairLevels
            ORDER BY sRepairLevel
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lRepairLevelKey"]),
                name = reader["sRepairLevel"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("repair-reasons")]
    public async Task<IActionResult> GetRepairReasons()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lRepairReasonKey, ISNULL(sRepairReason,'') AS sRepairReason
            FROM tblRepairReasons
            WHERE ISNULL(bActive,1) = 1
            ORDER BY sRepairReason
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lRepairReasonKey"]),
                name = reader["sRepairReason"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("scope-types")]
    public async Task<IActionResult> GetScopeTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lScopeTypeKey, ISNULL(sScopeTypeDesc,'') AS sScopeTypeDesc,
                   lManufacturerKey
            FROM tblScopeType
            WHERE ISNULL(bActive,1) = 1
            ORDER BY sScopeTypeDesc
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key             = Convert.ToInt32(reader["lScopeTypeKey"]),
                name            = reader["sScopeTypeDesc"].ToString()!,
                manufacturerKey = reader["lManufacturerKey"] == DBNull.Value
                                    ? (int?)null
                                    : Convert.ToInt32(reader["lManufacturerKey"])
            });
        return Ok(list);
    }

    [HttpGet("contract-types")]
    public async Task<IActionResult> GetContractTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lContractTypeKey, ISNULL(sContractType,'') AS sContractType
            FROM tblContractTypes
            WHERE Deleted_datetime IS NULL
            ORDER BY sContractType
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lContractTypeKey"]),
                name = reader["sContractType"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("invoice-frequencies")]
    public async Task<IActionResult> GetInvoiceFrequencies()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lInstallmentTypeID, ISNULL(sInstallmentType,'') AS sInstallmentType
            FROM tblContractInstallmentTypes
            WHERE Deleted_datetime IS NULL
            ORDER BY lInstallmentTypeID
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lInstallmentTypeID"]),
                name = reader["sInstallmentType"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("manufacturers")]
    public async Task<IActionResult> GetManufacturers()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lManufacturerKey, ISNULL(sManufacturer,'') AS sManufacturer
            FROM tblManufacturers
            ORDER BY sManufacturer
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lManufacturerKey"]),
                name = reader["sManufacturer"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("supplier-po-types")]
    public async Task<IActionResult> GetSupplierPoTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lSupplierPOTypeKey, ISNULL(sSupplierPOType,'') AS sSupplierPOType
            FROM tblSupplierPOTypes
            ORDER BY sSupplierPOType
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lSupplierPOTypeKey"]),
                name = reader["sSupplierPOType"].ToString()!
            });
        return Ok(list);
    }

    [HttpGet("scope-type-categories")]
    public async Task<IActionResult> GetScopeTypeCategories()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lScopeTypeCategoryKey, ISNULL(sScopeTypeCategory,'') AS sScopeTypeCategory
            FROM tblScopeTypeCategories
            ORDER BY sScopeTypeCategory
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lScopeTypeCategoryKey"]),
                name = reader["sScopeTypeCategory"].ToString()!
            });
        return Ok(list);
    }

    // Scope categories (tblScopeCategories) — distinct from the scope-TYPE catalog above.
    // Used as tblScopeType.lScopeCategoryKey, required when creating an Instrument ('I') model.
    [HttpGet("scope-categories")]
    public async Task<IActionResult> GetScopeCategories()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lScopeCategoryKey, ISNULL(sScopeCategory,'') AS sScopeCategory
            FROM tblScopeCategories
            WHERE ISNULL(bActive,1) = 1
            ORDER BY sScopeCategory
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
            list.Add(new {
                key  = Convert.ToInt32(reader["lScopeCategoryKey"]),
                name = reader["sScopeCategory"].ToString()!
            });
        return Ok(list);
    }
}
