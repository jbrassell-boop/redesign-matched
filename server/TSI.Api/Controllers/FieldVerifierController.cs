using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Text.Json;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/field-verifier")]
[AllowAnonymous]
public class FieldVerifierController(IConfiguration config) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private string RegistryPath => config["FieldRegistryPath"]
        ?? throw new InvalidOperationException("FieldRegistryPath not configured in appsettings.Development.json");

    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    // GET /api/field-verifier/registry
    [HttpGet("registry")]
    public IActionResult GetRegistry()
    {
        var screens = new List<FieldRegistryScreen>();
        var screenOrder = new[]
        {
            "dashboard", "clients", "departments", "repairs",
            "inventory", "contracts", "onsite-services",
            "product-sale", "financial", "suppliers", "scope-model"
        };

        foreach (var name in screenOrder)
        {
            var path = Path.Combine(RegistryPath, $"{name}.json");
            if (!System.IO.File.Exists(path)) continue;

            var json = System.IO.File.ReadAllText(path);
            var screen = JsonSerializer.Deserialize<FieldRegistryScreen>(json, JsonOpts);
            if (screen != null) screens.Add(screen);
        }

        return Ok(screens);
    }

    // POST /api/field-verifier/live-value
    [HttpPost("live-value")]
    public async Task<IActionResult> GetLiveValue([FromBody] LiveValueRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SqlQuery))
            return Ok(new LiveValueResponse("", "No SQL query provided"));

        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(request.SqlQuery, conn);
            cmd.CommandTimeout = 15;
            var result = await cmd.ExecuteScalarAsync();
            var value = result == null || result == DBNull.Value ? "(null)" : result.ToString()!;
            return Ok(new LiveValueResponse(value, ""));
        }
        catch (Exception ex)
        {
            return Ok(new LiveValueResponse("", ex.Message));
        }
    }

    // POST /api/field-verifier/search-columns
    [HttpPost("search-columns")]
    public async Task<IActionResult> SearchColumns([FromBody] ColumnSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SearchTerm))
            return Ok(new List<ColumnMatch>());

        // Split search term into keywords and build LIKE conditions
        var keywords = request.SearchTerm
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(k => k.Trim())
            .Where(k => k.Length > 1)
            .ToList();

        if (keywords.Count == 0) return Ok(new List<ColumnMatch>());

        var likeConditions = keywords.Select((_, i) => $"COLUMN_NAME LIKE @kw{i}").ToList();
        var whereClause = $"({string.Join(" OR ", likeConditions)})";
        if (!string.IsNullOrWhiteSpace(request.Table))
            whereClause += " AND TABLE_NAME = @table";
        else
            whereClause += " AND TABLE_NAME LIKE 'tbl%'";

        var columnSql = $"""
            SELECT TOP 30 TABLE_NAME, COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE {whereClause}
            ORDER BY TABLE_NAME, COLUMN_NAME
            """;

        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(columnSql, conn);
            cmd.CommandTimeout = 15;
            for (var i = 0; i < keywords.Count; i++)
                cmd.Parameters.AddWithValue($"@kw{i}", $"%{keywords[i]}%");
            if (!string.IsNullOrWhiteSpace(request.Table))
                cmd.Parameters.AddWithValue("@table", request.Table);

            await using var reader = await cmd.ExecuteReaderAsync();
            var columns = new List<(string Table, string Column, string Type)>();
            while (await reader.ReadAsync())
                columns.Add((reader.GetString(0), reader.GetString(1), reader.GetString(2)));
            await reader.CloseAsync();

            // Fetch sample value for each column
            var results = new List<ColumnMatch>();
            foreach (var (table, column, type) in columns)
            {
                try
                {
                    await using var sampleCmd = new SqlCommand(
                        $"SELECT TOP 1 [{column}] FROM [{table}] WHERE [{column}] IS NOT NULL",
                        conn);
                    sampleCmd.CommandTimeout = 5;
                    var sample = await sampleCmd.ExecuteScalarAsync();
                    var sampleStr = sample == null || sample == DBNull.Value ? "(null)" : sample.ToString()!;
                    if (sampleStr.Length > 60) sampleStr = sampleStr[..60] + "…";
                    results.Add(new ColumnMatch(table, column, type, sampleStr));
                }
                catch
                {
                    results.Add(new ColumnMatch(table, column, type, "(error reading sample)"));
                }
            }

            return Ok(results);
        }
        catch (Exception ex)
        {
            return Ok(new List<ColumnMatch> { new("", "", "", $"Error: {ex.Message}") });
        }
    }

    // POST /api/field-verifier/preview-rows
    [HttpPost("preview-rows")]
    public async Task<IActionResult> GetPreviewRows([FromBody] LiveValueRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SqlQuery))
            return Ok(new PreviewRowsResponse([], [], "No SQL query provided"));

        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(request.SqlQuery, conn);
            cmd.CommandTimeout = 15;
            await using var reader = await cmd.ExecuteReaderAsync();

            var colCount = Math.Min(reader.FieldCount, 15);
            var columns = Enumerable.Range(0, colCount)
                .Select(i => reader.GetName(i))
                .ToList();
            if (reader.FieldCount > 15) columns.Add($"… +{reader.FieldCount - 15} more");

            var rows = new List<List<string>>();
            while (await reader.ReadAsync() && rows.Count < 5)
            {
                var vals = Enumerable.Range(0, colCount)
                    .Select(i => reader.IsDBNull(i) ? "(null)" : reader.GetValue(i)?.ToString() ?? "(null)")
                    .ToList();
                if (reader.FieldCount > 15) vals.Add("…");
                rows.Add(vals);
            }

            return Ok(new PreviewRowsResponse(columns, rows, ""));
        }
        catch (Exception ex)
        {
            return Ok(new PreviewRowsResponse([], [], ex.Message));
        }
    }

    // PUT /api/field-verifier/field
    [HttpPut("field")]
    public IActionResult UpdateField([FromBody] FieldUpdateRequest request)
    {
        var path = Path.Combine(RegistryPath, $"{request.ScreenFile}.json");
        if (!System.IO.File.Exists(path))
            return NotFound($"Registry file not found: {request.ScreenFile}.json");

        var json = System.IO.File.ReadAllText(path);
        var screen = JsonSerializer.Deserialize<FieldRegistryScreen>(json, JsonOpts);
        if (screen == null) return BadRequest("Could not parse registry file");

        var field = screen.Fields.FirstOrDefault(f => f.Id == request.FieldId);
        if (field == null) return NotFound($"Field not found: {request.FieldId}");

        var updatedField = field with
        {
            Status = request.Status,
            SqlQuery = request.SqlQuery,
            SqlTable = request.SqlTable,
            ApiEndpoint = request.ApiEndpoint,
            ResponseProperty = request.ResponseProperty,
            Notes = request.Notes,
            VerifiedAt = DateTime.UtcNow.ToString("o"),
            VerifiedBy = request.VerifiedBy
        };

        var updatedFields = screen.Fields
            .Select(f => f.Id == request.FieldId ? updatedField : f)
            .ToList();

        var updatedScreen = screen with
        {
            LastUpdated = DateTime.UtcNow.ToString("o"),
            Fields = updatedFields
        };

        var updatedJson = JsonSerializer.Serialize(updatedScreen, JsonOpts);
        System.IO.File.WriteAllText(path, updatedJson);

        return Ok(updatedField);
    }
}
