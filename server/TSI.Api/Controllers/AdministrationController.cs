using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/administration")]
[Authorize]
public class AdministrationController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // ── Users ──
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = "WHERE 1=1";
        if (!string.IsNullOrWhiteSpace(search))
            where += " AND (u.sFirstName + ' ' + u.sLastName LIKE @search OR u.sEmailAddress LIKE @search)";

        var offset = (page - 1) * pageSize;

        await using var countCmd = new SqlCommand(
            $"SELECT COUNT(*) FROM tblUsers u {where}", conn);
        if (!string.IsNullOrWhiteSpace(search))
            countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = (int)(await countCmd.ExecuteScalarAsync())!;

        await using var cmd = new SqlCommand($@"
            SELECT u.lUserKey, u.sFirstName + ' ' + u.sLastName AS Name,
                   u.sEmailAddress, sg.sSecurityGroupName AS Role,
                   sl.sServiceLocationName AS Location,
                   u.dtLastLogin, u.bActive
            FROM tblUsers u
            LEFT JOIN tblUserSecurityGroup usg ON u.lUserKey = usg.lUserKey
            LEFT JOIN tblSecurityGroup sg ON usg.lSecurityGroupKey = sg.lSecurityGroupKey
            LEFT JOIN tblServiceLocations sl ON u.lServiceLocationKey = sl.lServiceLocationKey
            {where}
            ORDER BY u.sLastName, u.sFirstName
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY", conn);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");
        cmd.Parameters.AddWithValue("@offset", offset);
        cmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<AdminUserItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new AdminUserItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? "" : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                !reader.IsDBNull(6) && reader.GetBoolean(6)
            ));
        }

        return Ok(new AdminUserListResponse(items, totalCount, page, pageSize));
    }

    // ── Security Groups ──
    [HttpGet("security-groups")]
    public async Task<IActionResult> GetSecurityGroups()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT sg.lSecurityGroupKey, sg.sSecurityGroupName, sg.sDescription,
                   (SELECT COUNT(*) FROM tblUserSecurityGroup usg WHERE usg.lSecurityGroupKey = sg.lSecurityGroupKey) AS MemberCount,
                   sg.bActive
            FROM tblSecurityGroup sg
            ORDER BY sg.sSecurityGroupName", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<SecurityGroupItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new SecurityGroupItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetInt32(3),
                !reader.IsDBNull(4) && reader.GetBoolean(4)
            ));
        }

        return Ok(items);
    }

    // ── Delivery Methods ──
    [HttpGet("delivery-methods")]
    public async Task<IActionResult> GetDeliveryMethods()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT lDeliveryMethodKey, sDeliveryMethod, mCost, bDefault, bActive
            FROM tblDeliveryMethod
            ORDER BY sDeliveryMethod", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<DeliveryMethodItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new DeliveryMethodItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : (decimal?)reader.GetDouble(2),
                !reader.IsDBNull(3) && reader.GetBoolean(3),
                !reader.IsDBNull(4) && reader.GetBoolean(4)
            ));
        }

        return Ok(items);
    }

    // ── Payment Terms ──
    [HttpGet("payment-terms")]
    public async Task<IActionResult> GetPaymentTerms()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT lPaymentTermsKey, sPaymentTerms, sGPPaymentTerms, lDueDays,
                   sDueDateMode, bDefault
            FROM tblPaymentTerms
            ORDER BY sPaymentTerms", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<PaymentTermsItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new PaymentTermsItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : (int?)reader.GetInt32(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                !reader.IsDBNull(5) && reader.GetBoolean(5)
            ));
        }

        return Ok(items);
    }

    // ── Scope Categories ──
    [HttpGet("scope-categories")]
    public async Task<IActionResult> GetScopeCategories([FromQuery] string? type = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = "";
        if (!string.IsNullOrWhiteSpace(type))
            where = "WHERE sInstrumentType = @type";

        await using var cmd = new SqlCommand($@"
            SELECT lScopeTypeCategoryKey, sScopeTypeCategory, sInstrumentType, sSize, bActive
            FROM tblScopeTypeCategories
            {where}
            ORDER BY sScopeTypeCategory", conn);
        if (!string.IsNullOrWhiteSpace(type))
            cmd.Parameters.AddWithValue("@type", type);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<ScopeCategoryItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new ScopeCategoryItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                !reader.IsDBNull(4) && reader.GetBoolean(4)
            ));
        }

        return Ok(items);
    }

    // ── Distributors ──
    [HttpGet("distributors")]
    public async Task<IActionResult> GetDistributors([FromQuery] bool? active = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = "";
        if (active.HasValue)
            where = $"WHERE d.bActive = @active";

        await using var cmd = new SqlCommand($@"
            SELECT d.lDistributorKey, d.sDistributor, d.sContact, d.sPhone,
                   c.sCompany, d.sCity, d.sState, d.bActive
            FROM tblDistributor d
            LEFT JOIN tblCompany c ON d.lCompanyKey = c.lCompanyKey
            {where}
            ORDER BY d.sDistributor", conn);
        if (active.HasValue)
            cmd.Parameters.AddWithValue("@active", active.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<DistributorItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new DistributorItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                !reader.IsDBNull(7) && reader.GetBoolean(7)
            ));
        }

        return Ok(items);
    }

    // ── Companies ──
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT c.lCompanyKey, c.sCompany, c.sAbbreviation, c.sPhone, c.sCity, c.sState,
                   c.sPeachTreeCompanyID,
                   (SELECT COUNT(*) FROM tblDistributor d WHERE d.lCompanyKey = c.lCompanyKey) AS DistributorCount
            FROM tblCompany c
            ORDER BY c.sCompany", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<CompanyItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new CompanyItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetInt32(7)
            ));
        }

        return Ok(items);
    }

    // ── Repair Reasons ──
    [HttpGet("repair-reasons")]
    public async Task<IActionResult> GetRepairReasons()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT r.lRepairReasonKey, r.sRepairReason,
                   rc.sRepairReasonCategory, r.bActive
            FROM tblRepairReasons r
            LEFT JOIN tblRepairReasonCategories rc ON r.lRepairReasonCategoryKey = rc.lRepairReasonCategoryKey
            ORDER BY r.sRepairReason", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<RepairReasonItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairReasonItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                !reader.IsDBNull(3) && reader.GetBoolean(3)
            ));
        }

        return Ok(items);
    }

    // ── Repair Statuses ──
    [HttpGet("repair-statuses")]
    public async Task<IActionResult> GetRepairStatuses()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT lRepairStatusID, sRepairStatus, lRepairStatusSortOrder, bIsReadOnly
            FROM tblRepairStatuses
            ORDER BY lRepairStatusSortOrder", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<RepairStatusItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairStatusItem(
                reader.GetInt16(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? null : (int?)reader.GetByte(2),
                !reader.IsDBNull(3) && reader.GetBoolean(3)
            ));
        }

        return Ok(items);
    }

    // ── Holidays ──
    [HttpGet("holidays")]
    public async Task<IActionResult> GetHolidays()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT lHolidayKey, sHolidayName, dtHolidayDate, bRecurring, bActive
            FROM tblHolidays
            ORDER BY dtHolidayDate", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<HolidayItem>();
        while (await reader.ReadAsync())
        {
            var date = reader.IsDBNull(2) ? (DateTime?)null : reader.GetDateTime(2);
            items.Add(new HolidayItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                date,
                date?.DayOfWeek.ToString(),
                !reader.IsDBNull(3) && reader.GetBoolean(3),
                !reader.IsDBNull(4) && reader.GetBoolean(4)
            ));
        }

        return Ok(items);
    }

    // ── Sales Tax ──
    [HttpGet("sales-tax")]
    public async Task<IActionResult> GetSalesTax()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT lSalesTaxKey, sStateCode, sStateName, dblTaxRate, dtEffectiveDate, bTaxable
            FROM tblSalesTax
            ORDER BY sStateName", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<SalesTaxItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new SalesTaxItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? null : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : (decimal?)reader.GetDouble(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                !reader.IsDBNull(5) && reader.GetBoolean(5)
            ));
        }

        return Ok(items);
    }

    // ── Pricing Lists ──
    [HttpGet("pricing-lists")]
    public async Task<IActionResult> GetPricingLists()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT p.lPricingCategoryKey, p.sPricingCategory,
                   (SELECT COUNT(DISTINCT lClientKey) FROM tblPricingDetail pd WHERE pd.lPricingCategoryKey = p.lPricingCategoryKey) AS ClientCount,
                   (SELECT COUNT(*) FROM tblPricingDetail pd WHERE pd.lPricingCategoryKey = p.lPricingCategoryKey) AS ItemCount,
                   p.dtLastUpdated, p.bActive
            FROM tblPricingCategory p
            ORDER BY p.sPricingCategory", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<PricingListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new PricingListItem(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.GetInt32(2),
                reader.GetInt32(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                !reader.IsDBNull(5) && reader.GetBoolean(5)
            ));
        }

        return Ok(items);
    }

    // ── Stats ──
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(@"
            SELECT
                (SELECT COUNT(*) FROM tblUsers WHERE bActive = 1) AS ActiveUsers,
                (SELECT COUNT(*) FROM tblSecurityGroup WHERE bActive = 1) AS SecurityGroups,
                (SELECT COUNT(*) FROM tblPricingCategory WHERE bActive = 1) AS PricingLists,
                0 AS AuditEntries24h,
                (SELECT COUNT(*) FROM tblUsers WHERE bLocked = 1) AS LockedAccounts", conn);

        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new AdminStats(
            reader.GetInt32(0),
            reader.GetInt32(1),
            reader.GetInt32(2),
            reader.GetInt32(3),
            reader.GetInt32(4)
        ));
    }
}
