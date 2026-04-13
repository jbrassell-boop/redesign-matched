using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/delivery-methods")]
[Authorize]
public class DeliveryMethodsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT lDeliveryMethodKey, ISNULL(sDeliveryDesc, '') AS Description
            FROM tblDeliveryMethod
            ORDER BY sDeliveryDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                key = Convert.ToInt32(reader["lDeliveryMethodKey"]),
                description = reader["Description"]?.ToString() ?? ""
            });
        }

        return Ok(items);
    }
}
