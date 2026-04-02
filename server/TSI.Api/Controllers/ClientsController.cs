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
            where.Add("(c.sClientName1 LIKE @search OR c.sMailCity LIKE @search OR c.sMailState LIKE @search)");
        if (statusFilter == "active")
            where.Add("c.bActive = 1");
        else if (statusFilter == "inactive")
            where.Add("c.bActive = 0");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblClient c {whereClause}";

        var dataSql = $"""
            SELECT c.lClientKey, c.sClientName1, c.sMailCity, c.sMailState,
                   ISNULL(c.bActive, 0) AS bActive,
                   (SELECT COUNT(*) FROM tblDepartment d WHERE d.lClientKey = c.lClientKey) AS DeptCount,
                   (SELECT COUNT(*) FROM tblRepair r
                    JOIN tblDepartment d2 ON d2.lDepartmentKey = r.lDepartmentKey
                    JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
                    WHERE d2.lClientKey = c.lClientKey
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs
            FROM tblClient c
            {whereClause}
            ORDER BY c.sClientName1
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
        var clients = new List<ClientListItem>();
        while (await reader.ReadAsync())
        {
            clients.Add(new ClientListItem(
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                Name: reader["sClientName1"]?.ToString() ?? "",
                City: reader["sMailCity"]?.ToString() ?? "",
                State: reader["sMailState"]?.ToString() ?? "",
                IsActive: Convert.ToBoolean(reader["bActive"]),
                DeptCount: Convert.ToInt32(reader["DeptCount"]),
                OpenRepairs: Convert.ToInt32(reader["OpenRepairs"])
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
                      AND rs.sRepairStatus NOT IN ('Shipped','Cancelled')) AS OpenRepairs
            FROM tblClient c
            WHERE c.lClientKey = @clientKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
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
}
