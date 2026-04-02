using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q = null)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { repairs = Array.Empty<object>(), clients = Array.Empty<object>(), departments = Array.Empty<object>(), contracts = Array.Empty<object>() });

        var searchTerm = $"%{q}%";
        const int limit = 5;

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Repairs
        var repairs = new List<object>();
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT TOP (@limit) r.lRepairKey, r.sWorkOrderNumber, r.sSerialNumber,
                       c.sClientName1
                FROM tblRepair r
                LEFT JOIN tblClient c ON c.lClientKey = r.lDistributorKey
                WHERE r.sWorkOrderNumber LIKE @q OR r.sSerialNumber LIKE @q
                ORDER BY r.lRepairKey DESC";
            cmd.Parameters.AddWithValue("@limit", limit);
            cmd.Parameters.AddWithValue("@q", searchTerm);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                repairs.Add(new
                {
                    key = rdr.GetInt32(0),
                    title = rdr.IsDBNull(1) ? "Repair" : rdr.GetString(1),
                    subtitle = (rdr.IsDBNull(3) ? "" : rdr.GetString(3))
                        + (rdr.IsDBNull(2) || string.IsNullOrEmpty(rdr.GetString(2)) ? "" : $" \u2022 SN: {rdr.GetString(2)}")
                });
            }
        }

        // Clients
        var clients = new List<object>();
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT TOP (@limit) lClientKey, sClientName1, sMailCity, sMailState
                FROM tblClient
                WHERE sClientName1 LIKE @q
                ORDER BY sClientName1";
            cmd.Parameters.AddWithValue("@limit", limit);
            cmd.Parameters.AddWithValue("@q", searchTerm);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                var city = rdr.IsDBNull(2) ? "" : rdr.GetString(2);
                var state = rdr.IsDBNull(3) ? "" : rdr.GetString(3);
                var loc = string.Join(", ", new[] { city, state }.Where(s => !string.IsNullOrEmpty(s)));
                clients.Add(new
                {
                    key = rdr.GetInt32(0),
                    title = rdr.IsDBNull(1) ? "Client" : rdr.GetString(1),
                    subtitle = loc
                });
            }
        }

        // Departments
        var departments = new List<object>();
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT TOP (@limit) d.lDepartmentKey, d.sDepartmentName, c.sClientName1
                FROM tblDepartment d
                LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                WHERE d.sDepartmentName LIKE @q
                ORDER BY d.sDepartmentName";
            cmd.Parameters.AddWithValue("@limit", limit);
            cmd.Parameters.AddWithValue("@q", searchTerm);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                departments.Add(new
                {
                    key = rdr.GetInt32(0),
                    title = rdr.IsDBNull(1) ? "Department" : rdr.GetString(1),
                    subtitle = rdr.IsDBNull(2) ? "" : rdr.GetString(2)
                });
            }
        }

        // Contracts
        var contracts = new List<object>();
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT TOP (@limit) lContractKey, sContractNumber, sContractName1
                FROM tblContract
                WHERE sContractNumber LIKE @q OR sContractName1 LIKE @q
                ORDER BY sContractName1";
            cmd.Parameters.AddWithValue("@limit", limit);
            cmd.Parameters.AddWithValue("@q", searchTerm);
            await using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                contracts.Add(new
                {
                    key = rdr.GetInt32(0),
                    title = rdr.IsDBNull(1) ? "Contract" : (string.IsNullOrEmpty(rdr.GetString(1)) ? (rdr.IsDBNull(2) ? "Contract" : rdr.GetString(2)) : rdr.GetString(1)),
                    subtitle = rdr.IsDBNull(2) ? "" : rdr.GetString(2)
                });
            }
        }

        return Ok(new { repairs, clients, departments, contracts });
    }
}
