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
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs
            FROM tblDepartment d
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblServiceLocations sl ON sl.lServiceLocationKey = d.lServiceLocationKey
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
            OpenRepairs: Convert.ToInt32(reader["OpenRepairs"])
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
}
