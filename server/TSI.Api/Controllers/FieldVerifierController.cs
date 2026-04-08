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

    // POST /api/field-verifier/ai-search-columns
    [HttpPost("ai-search-columns")]
    public async Task<IActionResult> AiSearchColumns([FromBody] AiColumnSearchRequest request)
    {
        var apiKey = config["Anthropic:ApiKey"]
            ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey))
            return Ok(new { columns = new List<ColumnMatch>(), error = "Add 'Anthropic:ApiKey' to appsettings.Development.json to enable AI search." });

        try
        {
            await using var conn = CreateConnection();
            await conn.OpenAsync();

            // Fetch column names from DB
            SqlCommand colCmd;
            if (!string.IsNullOrWhiteSpace(request.Table))
            {
                colCmd = new SqlCommand(
                    "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table ORDER BY ORDINAL_POSITION",
                    conn);
                colCmd.Parameters.AddWithValue("@table", request.Table);
            }
            else
            {
                var keyTables = new[]
                {
                    "tblRepair", "tblClient", "tblDepartment", "tblContract",
                    "tblScopeType", "tblScope", "tblTechnicians", "tblInvoice",
                    "tblSiteServices", "tblProductSales", "tblSupplier", "tblInventory"
                };
                var inList = string.Join(",", keyTables.Select((_, i) => $"@t{i}"));
                colCmd = new SqlCommand(
                    $"SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ({inList}) ORDER BY TABLE_NAME, ORDINAL_POSITION",
                    conn);
                for (var i = 0; i < keyTables.Length; i++)
                    colCmd.Parameters.AddWithValue($"@t{i}", keyTables[i]);
            }

            colCmd.CommandTimeout = 10;
            await using var colReader = await colCmd.ExecuteReaderAsync();
            var allColumns = new List<(string Table, string Column)>();
            while (await colReader.ReadAsync())
                allColumns.Add((colReader.GetString(0), colReader.GetString(1)));
            await colReader.CloseAsync();

            if (allColumns.Count == 0)
                return Ok(new { columns = new List<ColumnMatch>(), error = "No columns found for this table." });

            // Build prompt — send up to 200 column names
            var colList = allColumns.Take(200).Select(c => $"{c.Table}.{c.Column}");
            var prompt = $"""
                You are mapping plain English descriptions to SQL column names in a medical device repair management database (WinScope).

                Available columns (table.column):
                {string.Join(", ", colList)}

                The user is looking for: "{request.Query}"

                Return a raw JSON array of up to 5 column names (table.column format) that best match, most relevant first.
                Only return the JSON array — no explanation, no markdown. Example: ["tblRepair.dtExpDelDate","tblRepair.dtShipDate"]
                """;

            // Call Claude
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("x-api-key", apiKey);
            http.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
            http.Timeout = TimeSpan.FromSeconds(20);

            var requestBody = JsonSerializer.Serialize(new
            {
                model = "claude-haiku-4-5-20251001",
                max_tokens = 256,
                messages = new[] { new { role = "user", content = prompt } }
            });

            var response = await http.PostAsync(
                "https://api.anthropic.com/v1/messages",
                new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json"));

            var responseText = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseText);
            var text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "[]";

            var jsonStart = text.IndexOf('[');
            var jsonEnd = text.LastIndexOf(']');
            if (jsonStart < 0 || jsonEnd < 0)
                return Ok(new { columns = new List<ColumnMatch>(), error = $"Unexpected AI response: {text[..Math.Min(text.Length, 100)]}" });

            var matched = JsonSerializer.Deserialize<List<string>>(text[jsonStart..(jsonEnd + 1)]) ?? [];

            // Fetch sample + data type for each matched column
            var results = new List<ColumnMatch>();
            foreach (var match in matched.Take(5))
            {
                var parts = match.Split('.');
                if (parts.Length != 2) continue;
                var (tbl, col) = (parts[0].Trim(), parts[1].Trim());
                if (!allColumns.Any(c => c.Table == tbl && c.Column == col)) continue;

                try
                {
                    await using var typeCmd = new SqlCommand(
                        "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=@t AND COLUMN_NAME=@c",
                        conn);
                    typeCmd.Parameters.AddWithValue("@t", tbl);
                    typeCmd.Parameters.AddWithValue("@c", col);
                    typeCmd.CommandTimeout = 5;
                    var dataType = (await typeCmd.ExecuteScalarAsync())?.ToString() ?? "";

                    await using var sampleCmd = new SqlCommand(
                        $"SELECT TOP 1 [{col}] FROM [{tbl}] WHERE [{col}] IS NOT NULL",
                        conn);
                    sampleCmd.CommandTimeout = 5;
                    var sample = await sampleCmd.ExecuteScalarAsync();
                    var sampleStr = sample == null || sample == DBNull.Value ? "(null)" : sample.ToString()!;
                    if (sampleStr.Length > 60) sampleStr = sampleStr[..60] + "…";

                    results.Add(new ColumnMatch(tbl, col, dataType, sampleStr));
                }
                catch
                {
                    results.Add(new ColumnMatch(tbl, col, "", "(error reading sample)"));
                }
            }

            return Ok(new { columns = results, error = "" });
        }
        catch (Exception ex)
        {
            return Ok(new { columns = new List<ColumnMatch>(), error = ex.Message });
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
