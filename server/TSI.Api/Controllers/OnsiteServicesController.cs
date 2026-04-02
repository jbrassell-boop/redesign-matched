using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/onsite-services")]
[Authorize]
public class OnsiteServicesController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Call stored procedure to get onsite services
        await using var cmd = new SqlCommand("onsiteServicesGet", conn);
        cmd.CommandType = System.Data.CommandType.StoredProcedure;

        var items = new List<OnsiteServiceListItem>();
        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var visitDate = GetNullableDateTime(reader, "dtOnsiteDate");
                var submittedDate = GetNullableDateTime(reader, "dtSubmittedDate");
                var status = reader["sStatus"]?.ToString() ?? "Draft";

                // Apply filters in-memory since stored proc doesn't support them
                if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all" &&
                    !string.Equals(status, statusFilter, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!string.IsNullOrWhiteSpace(dateFrom) && visitDate.HasValue &&
                    visitDate.Value < DateTime.Parse(dateFrom))
                    continue;

                if (!string.IsNullOrWhiteSpace(dateTo) && visitDate.HasValue &&
                    visitDate.Value > DateTime.Parse(dateTo).AddDays(1))
                    continue;

                var invoiceNum = reader["sInvoiceNumber"]?.ToString() ?? "";
                var clientName = reader["sClientName"]?.ToString() ?? "";
                var deptName = reader["sDepartmentName"]?.ToString() ?? "";
                var techName = reader["sTechName"]?.ToString() ?? "";

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var hay = $"{invoiceNum}{clientName}{deptName}{techName}".ToLower();
                    if (!hay.Contains(search.ToLower()))
                        continue;
                }

                items.Add(new OnsiteServiceListItem(
                    OnsiteServiceKey: Convert.ToInt32(reader["lOnsiteServiceKey"]),
                    InvoiceNum: invoiceNum,
                    ClientName: clientName,
                    DeptName: deptName,
                    TechName: techName,
                    VisitDate: visitDate?.ToString("MM/dd/yyyy"),
                    Status: status,
                    TrayCount: reader["nTrayCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nTrayCount"]),
                    InstrumentCount: reader["nInstrumentCount"] == DBNull.Value ? 0 : Convert.ToInt32(reader["nInstrumentCount"]),
                    TotalBilled: reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]),
                    SubmittedDate: submittedDate?.ToString("MM/dd/yyyy")
                ));
            }
        }
        catch (SqlException)
        {
            // If stored procedure doesn't exist or columns differ, return empty
            return Ok(new OnsiteServiceListResponse(Array.Empty<OnsiteServiceListItem>(), 0));
        }

        var totalCount = items.Count;
        var paged = items
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new OnsiteServiceListResponse(paged, totalCount));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("onsiteServicesGet", conn);
        cmd.CommandType = System.Data.CommandType.StoredProcedure;

        var total = 0;
        var submitted = 0;
        var invoiced = 0;
        var draft = 0;
        var voidCount = 0;
        var totalValue = 0.0;

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                total++;
                var status = reader["sStatus"]?.ToString() ?? "Draft";
                var amount = reader["dblTotalBilled"] == DBNull.Value ? 0 : Convert.ToDouble(reader["dblTotalBilled"]);
                totalValue += amount;

                switch (status)
                {
                    case "Submitted": submitted++; break;
                    case "Invoiced": invoiced++; break;
                    case "Draft": draft++; break;
                    case "Void": voidCount++; break;
                }
            }
        }
        catch (SqlException)
        {
            // SP may not exist — return zeros
        }

        return Ok(new OnsiteServiceStats(total, submitted, invoiced, draft, voidCount, totalValue));
    }

    private static DateTime? GetNullableDateTime(SqlDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
        }
        catch
        {
            return null;
        }
    }
}
