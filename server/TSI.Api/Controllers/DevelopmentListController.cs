using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/development-list")]
[Authorize]
public class DevelopmentListController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int? statusId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = "WHERE 1=1";
        if (!string.IsNullOrWhiteSpace(search))
            where += " AND (t.ToDoTitle LIKE @search OR t.ToDoItem LIKE @search)";
        if (statusId.HasValue)
            where += " AND t.ToDoStatusID = @statusId";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblToDoList t
            {where}
            """;
        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search))
            countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (statusId.HasValue)
            countCmd.Parameters.AddWithValue("@statusId", statusId.Value);
        var totalCount = (int)(await countCmd.ExecuteScalarAsync())!;

        var offset = (page - 1) * pageSize;
        var sql = $"""
            SELECT t.ToDoID, t.ToDoTitle, t.ToDoItem, t.ToDoStatusID,
                   ISNULL(s.ToDoStatus, '') AS ToDoStatus,
                   ISNULL(u.sUserFullName, '') AS sUserFullName,
                   t.ToDoRequestDate, t.ToDoCompletionDate,
                   t.lRequestedDeliveryYear, t.lRequestedDeliveryQuarter,
                   t.ToDoSortOrder
            FROM tblToDoList t
            LEFT JOIN tblToDoStatuses s ON s.ToDoStatusID = t.ToDoStatusID
            LEFT JOIN tblUsers u ON u.lUserKey = t.UserKey
            {where}
            ORDER BY t.ToDoSortOrder ASC, t.ToDoID DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (statusId.HasValue)
            cmd.Parameters.AddWithValue("@statusId", statusId.Value);
        cmd.Parameters.AddWithValue("@offset", offset);
        cmd.Parameters.AddWithValue("@pageSize", pageSize);

        var items = new List<DevListItem>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var reqDate = reader["ToDoRequestDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["ToDoRequestDate"]);
            var compDate = reader["ToDoCompletionDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["ToDoCompletionDate"]);
            items.Add(new DevListItem(
                ToDoId: Convert.ToInt32(reader["ToDoID"]),
                Title: reader["ToDoTitle"]?.ToString() ?? "",
                Description: reader["ToDoItem"]?.ToString(),
                StatusId: Convert.ToInt32(reader["ToDoStatusID"]),
                Status: reader["ToDoStatus"]?.ToString() ?? "",
                Assignee: reader["sUserFullName"]?.ToString(),
                RequestDate: reqDate?.ToString("MM/dd/yyyy"),
                CompletionDate: compDate?.ToString("MM/dd/yyyy"),
                TargetYear: reader["lRequestedDeliveryYear"] == DBNull.Value ? null : Convert.ToInt32(reader["lRequestedDeliveryYear"]),
                TargetQuarter: reader["lRequestedDeliveryQuarter"] == DBNull.Value ? null : Convert.ToInt32(reader["lRequestedDeliveryQuarter"]),
                SortOrder: Convert.ToInt32(reader["ToDoSortOrder"])
            ));
        }

        return Ok(new DevListResponse(items, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT t.ToDoID, t.ToDoTitle, t.ToDoItem, t.ToDoStatusID,
                   ISNULL(s.ToDoStatus, '') AS ToDoStatus,
                   ISNULL(u.sUserFullName, '') AS sUserFullName,
                   t.ToDoRequestDate, t.ToDoCompletionDate,
                   t.lRequestedDeliveryYear, t.lRequestedDeliveryQuarter,
                   t.ToDoSortOrder
            FROM tblToDoList t
            LEFT JOIN tblToDoStatuses s ON s.ToDoStatusID = t.ToDoStatusID
            LEFT JOIN tblUsers u ON u.lUserKey = t.UserKey
            WHERE t.ToDoID = @id
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound();

        var reqDate = reader["ToDoRequestDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["ToDoRequestDate"]);
        var compDate = reader["ToDoCompletionDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["ToDoCompletionDate"]);
        var item = new DevListItem(
            ToDoId: Convert.ToInt32(reader["ToDoID"]),
            Title: reader["ToDoTitle"]?.ToString() ?? "",
            Description: reader["ToDoItem"]?.ToString(),
            StatusId: Convert.ToInt32(reader["ToDoStatusID"]),
            Status: reader["ToDoStatus"]?.ToString() ?? "",
            Assignee: reader["sUserFullName"]?.ToString(),
            RequestDate: reqDate?.ToString("MM/dd/yyyy"),
            CompletionDate: compDate?.ToString("MM/dd/yyyy"),
            TargetYear: reader["lRequestedDeliveryYear"] == DBNull.Value ? null : Convert.ToInt32(reader["lRequestedDeliveryYear"]),
            TargetQuarter: reader["lRequestedDeliveryQuarter"] == DBNull.Value ? null : Convert.ToInt32(reader["lRequestedDeliveryQuarter"]),
            SortOrder: Convert.ToInt32(reader["ToDoSortOrder"])
        );
        return Ok(item);
    }

    [HttpGet("statuses")]
    public async Task<IActionResult> GetStatuses()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ToDoStatusID, ToDoStatus
            FROM tblToDoStatuses
            ORDER BY ToDoStatusSortOrder ASC
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        var statuses = new List<DevListStatus>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            statuses.Add(new DevListStatus(
                StatusId: Convert.ToInt32(reader["ToDoStatusID"]),
                Status: reader["ToDoStatus"]?.ToString() ?? ""
            ));
        }
        return Ok(statuses);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN s.ToDoStatus LIKE '%Pending%' OR s.ToDoStatus LIKE '%Open%' THEN 1 ELSE 0 END) AS Pending,
                SUM(CASE WHEN s.ToDoStatus LIKE '%Progress%' THEN 1 ELSE 0 END) AS InProgress,
                SUM(CASE WHEN s.ToDoStatus LIKE '%Await%' OR s.ToDoStatus LIKE '%Clarif%' THEN 1 ELSE 0 END) AS Awaiting,
                SUM(CASE WHEN s.ToDoStatus LIKE '%Complete%' OR s.ToDoStatus LIKE '%Done%' THEN 1 ELSE 0 END) AS Completed,
                SUM(CASE WHEN s.ToDoStatus LIKE '%Review%' THEN 1 ELSE 0 END) AS Review
            FROM tblToDoList t
            LEFT JOIN tblToDoStatuses s ON s.ToDoStatusID = t.ToDoStatusID
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        var stats = new DevListStats(
            Total: reader["Total"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Total"]),
            Pending: reader["Pending"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Pending"]),
            InProgress: reader["InProgress"] == DBNull.Value ? 0 : Convert.ToInt32(reader["InProgress"]),
            Awaiting: reader["Awaiting"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Awaiting"]),
            Completed: reader["Completed"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Completed"]),
            Review: reader["Review"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Review"])
        );
        return Ok(stats);
    }
}
