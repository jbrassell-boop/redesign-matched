using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' THEN 1 ELSE 0 END) AS OpenRepairs,
                SUM(CASE WHEN r.bHotList = 1 AND ISNULL(r.sRepairClosed, 'N') != 'Y' THEN 1 ELSE 0 END) AS UrgentRepairs,
                SUM(CASE WHEN rs.sRepairStatus = 'Pending QC' THEN 1 ELSE 0 END) AS PendingQC,
                SUM(CASE WHEN rs.sRepairStatus = 'Pending Ship' THEN 1 ELSE 0 END) AS PendingShip,
                SUM(CASE WHEN r.dtDateOut IS NOT NULL AND CAST(r.dtShipDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS CompletedToday,
                SUM(CASE WHEN CAST(r.dtDateIn AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS ReceivedToday
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return Ok(new DashboardStats(0, 0, 0, 0, 0, 0));

        var stats = new DashboardStats(
            OpenRepairs: reader["OpenRepairs"] == DBNull.Value ? 0 : Convert.ToInt32(reader["OpenRepairs"]),
            UrgentRepairs: reader["UrgentRepairs"] == DBNull.Value ? 0 : Convert.ToInt32(reader["UrgentRepairs"]),
            PendingQC: reader["PendingQC"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PendingQC"]),
            PendingShip: reader["PendingShip"] == DBNull.Value ? 0 : Convert.ToInt32(reader["PendingShip"]),
            CompletedToday: reader["CompletedToday"] == DBNull.Value ? 0 : Convert.ToInt32(reader["CompletedToday"]),
            ReceivedToday: reader["ReceivedToday"] == DBNull.Value ? 0 : Convert.ToInt32(reader["ReceivedToday"])
        );
        await reader.CloseAsync();

        // Contract expiration check
        await using var contractCmd = new SqlCommand(
            "SELECT COUNT(*) FROM tblContract WHERE dtDateTermination BETWEEN GETDATE() AND DATEADD(DAY, 90, GETDATE())", conn);
        contractCmd.CommandTimeout = 10;
        var expiringContracts = Convert.ToInt32(await contractCmd.ExecuteScalarAsync());

        return Ok(new {
            stats.OpenRepairs, stats.UrgentRepairs, stats.PendingQC, stats.PendingShip,
            stats.CompletedToday, stats.ReceivedToday,
            expiringContracts
        });
    }

    [HttpGet("repairs")]
    public async Task<IActionResult> GetRepairs(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null,
        [FromQuery] string type = "all",
        [FromQuery] string location = "all",
        [FromQuery] string groupBy = "none")
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "ISNULL(r.sRepairClosed, 'N') != 'Y'", "r.dtDateIn >= DATEADD(MONTH, -12, GETDATE())" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (r.sWorkOrderNumber LIKE @search
                 OR c.sClientName1 LIKE @search
                 OR d.sDepartmentName LIKE @search
                 OR st.sScopeTypeDesc LIKE @search
                 OR s.sSerialNumber LIKE @search
                 OR t.sTechName LIKE @search)
                """);
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all")
            where.Add("rs.sRepairStatus = @statusFilter");
        if (type != "all")
        {
            // Map frontend names to sRigidOrFlexible single-letter codes
            var typeCode = type switch {
                "Flexible" => "F", "Rigid" => "R", "Instrument" => "I",
                "Camera" => "C", "Carts" => "C", _ => type
            };
            where.Add("st.sRigidOrFlexible = @type");
        }
        if (location == "inhouse")
            where.Add("ISNULL(r.bOutsourced, 0) = 0 AND ISNULL(r.bHotList, 0) = 0");
        else if (location == "outsourced")
            where.Add("ISNULL(r.bOutsourced, 0) = 1");
        else if (location == "hotlist")
            where.Add("ISNULL(r.bHotList, 0) = 1");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            {whereClause}
            """;

        var orderBy = groupBy switch
        {
            "Client" => "c.sClientName1, r.dtDateIn DESC",
            "Status" => "rs.sRepairStatus, r.dtDateIn DESC",
            "Tech" => "t.sTechName, r.dtDateIn DESC",
            "ScopeType" => "st.sScopeTypeDesc, r.dtDateIn DESC",
            _ => "r.dtDateIn DESC"
        };

        var dataSql = $"""
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.lRepairStatusID,
                   r.dtAprRecvd, r.dtExpDelDate, r.dblAmtRepair,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            {whereClause}
            ORDER BY {orderBy}
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") countCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        if (type != "all") { var tc = type switch { "Flexible" => "F", "Rigid" => "R", "Instrument" => "I", "Camera" => "C", "Carts" => "C", _ => type }; countCmd.Parameters.AddWithValue("@type", tc); }

        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") dataCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        if (type != "all") { var tc2 = type switch { "Flexible" => "F", "Rigid" => "R", "Instrument" => "I", "Camera" => "C", "Carts" => "C", _ => type }; dataCmd.Parameters.AddWithValue("@type", tc2); }
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var repairs = new List<DashboardRepair>();

        while (await dataReader.ReadAsync())
        {
            var dateIn = dataReader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtDateIn"]);
            var dateApproved = dataReader["dtAprRecvd"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtAprRecvd"]);
            var estDel = dataReader["dtExpDelDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtExpDelDate"]);

            repairs.Add(new DashboardRepair(
                RepairKey: Convert.ToInt32(dataReader["lRepairKey"]),
                Wo: dataReader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                Client: dataReader["sClientName1"]?.ToString() ?? "",
                Dept: dataReader["sDepartmentName"]?.ToString() ?? "",
                ScopeType: dataReader["sScopeTypeDesc"]?.ToString() ?? "",
                Serial: dataReader["sSerialNumber"]?.ToString() ?? "",
                DaysIn: dataReader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(dataReader["DaysIn"]),
                Status: dataReader["sRepairStatus"]?.ToString() ?? "",
                StatusId: Convert.ToInt32(dataReader["lRepairStatusID"]),
                DateApproved: dateApproved?.ToString("MM/dd/yyyy"),
                EstDelivery: estDel?.ToString("MM/dd/yyyy"),
                AmountApproved: dataReader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(dataReader["dblAmtRepair"]),
                Tech: dataReader["sTechName"]?.ToString(),
                IsUrgent: Convert.ToBoolean(dataReader["bHotList"])
            ));
        }

        return Ok(new DashboardRepairsResponse(repairs, totalCount));
    }

    // ── Briefing ──
    [HttpGet("briefing")]
    public async Task<IActionResult> GetBriefing()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        var yesterday = DateTime.Today.AddDays(-1);
        await using var cmd = new SqlCommand(@"
            SELECT
                (SELECT COUNT(*) FROM tblRepair WHERE CAST(dtDateIn AS DATE) = @yesterday) AS Received,
                (SELECT COUNT(*) FROM tblRepair WHERE CAST(dtDateOut AS DATE) = @yesterday) AS Shipped,
                (SELECT COUNT(*) FROM tblRepair WHERE CAST(dtAprRecvd AS DATE) = @yesterday) AS Approved,
                (SELECT ISNULL(SUM(dblAmtRepair), 0) FROM tblRepair WHERE CAST(dtDateOut AS DATE) = @yesterday) AS Revenue,
                (SELECT ISNULL(AVG(CAST(DATEDIFF(DAY, dtDateIn, ISNULL(dtDateOut, GETDATE())) AS DECIMAL(10,1))), 0)
                 FROM tblRepair r JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
                 WHERE rs.sRepairStatus NOT IN ('Cancelled','Closed')) AS AvgTat,
                (SELECT COUNT(*) FROM tblRepair r JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
                 WHERE ISNULL(r.sRepairClosed, 'N') != 'Y'
                 AND DATEDIFF(DAY, dtDateIn, GETDATE()) > 14) AS Overdue
        ", conn);
        cmd.Parameters.AddWithValue("@yesterday", yesterday);
        await using var rdr = await cmd.ExecuteReaderAsync();
        await rdr.ReadAsync();
        return Ok(new BriefingStats(
            rdr.GetInt32(0), rdr.GetInt32(1), rdr.GetInt32(2),
            Convert.ToDecimal(rdr.GetValue(3)), Convert.ToDecimal(rdr.GetValue(4)), rdr.GetInt32(5)
        ));
    }

    // ── Tasks sub-tab ──
    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Stats query
        const string statsSql = """
            SELECT
                SUM(CASE WHEN ts.TaskStatus NOT IN ('Request Fulfilled','Closed Duplicate','Request Declined') THEN 1 ELSE 0 END) AS [Open],
                SUM(CASE WHEN ts.TaskStatus = 'Request Fulfilled' THEN 1 ELSE 0 END) AS Fulfilled,
                SUM(CASE WHEN t.bFromPortal = 1 THEN 1 ELSE 0 END) AS FromPortal
            FROM tblTasks t
            OUTER APPLY (
                SELECT TOP 1 h.lTaskStatusKey FROM tblTaskStatusHistory h
                WHERE h.lTaskKey = t.lTaskKey ORDER BY h.dtTaskStatusDate DESC
            ) lh
            LEFT JOIN tblTaskStatuses ts ON ts.TaskStatusKey = lh.lTaskStatusKey
            """;

        await using var statsCmd = new SqlCommand(statsSql, conn);
        await using var statsReader = await statsCmd.ExecuteReaderAsync();
        int openCount = 0, fulfilledCount = 0, portalCount = 0;
        if (await statsReader.ReadAsync())
        {
            openCount = statsReader["Open"] == DBNull.Value ? 0 : Convert.ToInt32(statsReader["Open"]);
            fulfilledCount = statsReader["Fulfilled"] == DBNull.Value ? 0 : Convert.ToInt32(statsReader["Fulfilled"]);
            portalCount = statsReader["FromPortal"] == DBNull.Value ? 0 : Convert.ToInt32(statsReader["FromPortal"]);
        }
        await statsReader.CloseAsync();

        // Top type
        const string topTypeSql = """
            SELECT TOP 1 ISNULL(tt.sTaskType, 'Unknown') AS TaskType, COUNT(*) AS Cnt
            FROM tblTasks t
            LEFT JOIN tblTaskTypes tt ON tt.lTaskTypeKey = t.lTaskTypeKey
            GROUP BY tt.sTaskType
            ORDER BY Cnt DESC
            """;
        await using var topCmd = new SqlCommand(topTypeSql, conn);
        await using var topReader = await topCmd.ExecuteReaderAsync();
        string topTypeLabel = "Top Type";
        int topTypeCount = 0;
        if (await topReader.ReadAsync())
        {
            topTypeLabel = topReader["TaskType"]?.ToString() ?? "Top Type";
            topTypeCount = Convert.ToInt32(topReader["Cnt"]);
        }
        await topReader.CloseAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (t.sTaskTitle LIKE @search
                 OR ISNULL(c.sClientName1,'') LIKE @search
                 OR ISNULL(d.sDepartmentName,'') LIKE @search
                 OR ISNULL(tt.sTaskType,'') LIKE @search)
                """);
        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblTasks t
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = t.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTaskTypes tt ON tt.lTaskTypeKey = t.lTaskTypeKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT t.lTaskKey, t.sTaskTitle, t.dtTaskDate, ISNULL(t.bFromPortal,0) AS bFromPortal,
                   ISNULL(c.sClientName1,'') AS sClientName1,
                   ISNULL(d.sDepartmentName,'') AS sDepartmentName,
                   ISNULL(tt.sTaskType,'') AS sTaskType,
                   ISNULL(tp.sTaskPriority,'Normal') AS sTaskPriority,
                   ISNULL(ts.TaskStatus,'Not Started') AS TaskStatus
            FROM tblTasks t
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = t.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTaskTypes tt ON tt.lTaskTypeKey = t.lTaskTypeKey
            LEFT JOIN tblTaskPriorities tp ON tp.lTaskPriorityKey = t.lTaskPriorityKey
            OUTER APPLY (
                SELECT TOP 1 h.lTaskStatusKey FROM tblTaskStatusHistory h
                WHERE h.lTaskKey = t.lTaskKey ORDER BY h.dtTaskStatusDate DESC
            ) lh
            LEFT JOIN tblTaskStatuses ts ON ts.TaskStatusKey = lh.lTaskStatusKey
            {whereClause}
            ORDER BY t.dtTaskDate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var tasks = new List<DashboardTask>();
        while (await dataReader.ReadAsync())
        {
            var dt = dataReader["dtTaskDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtTaskDate"]);
            tasks.Add(new DashboardTask(
                TaskKey: Convert.ToInt32(dataReader["lTaskKey"]),
                Title: dataReader["sTaskTitle"]?.ToString() ?? "",
                Client: dataReader["sClientName1"]?.ToString() ?? "",
                Dept: dataReader["sDepartmentName"]?.ToString() ?? "",
                TaskType: dataReader["sTaskType"]?.ToString() ?? "",
                Priority: dataReader["sTaskPriority"]?.ToString() ?? "Normal",
                Status: dataReader["TaskStatus"]?.ToString() ?? "Not Started",
                Date: dt?.ToString("MM/dd/yyyy") ?? "",
                FromPortal: Convert.ToBoolean(dataReader["bFromPortal"])
            ));
        }

        return Ok(new DashboardTasksResponse(tasks, totalCount,
            new DashboardTaskStats(openCount, fulfilledCount, portalCount, topTypeCount, topTypeLabel)));
    }

    // ── Emails sub-tab ──
    [HttpGet("emails")]
    public async Task<IActionResult> GetEmails(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (e.sFrom LIKE @search OR e.sTo LIKE @search
                 OR e.sSubject LIKE @search
                 OR ISNULL(et.sEmailType,'') LIKE @search)
                """);
        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblEmails e
            LEFT JOIN tblEmailTypes et ON et.lEmailTypeKey = e.lEmailTypeKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT e.lEmailKey, e.dtCreateDate, e.sFrom, e.sTo, e.sSubject,
                   e.bIgnore, e.dtSentDate,
                   ISNULL(et.sEmailType,'') AS sEmailType
            FROM tblEmails e
            LEFT JOIN tblEmailTypes et ON et.lEmailTypeKey = e.lEmailTypeKey
            {whereClause}
            ORDER BY e.dtCreateDate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var emails = new List<DashboardEmail>();
        int pending = 0, sent = 0;
        var typeSet = new HashSet<string>();

        while (await dataReader.ReadAsync())
        {
            var dtCreate = dataReader["dtCreateDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtCreateDate"]);
            var bIgnore = Convert.ToBoolean(dataReader["bIgnore"]);
            var dtSent = dataReader["dtSentDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtSentDate"]);
            var status = bIgnore ? "Ignored" : dtSent != null ? "Sent" : "Pending";
            var emailType = dataReader["sEmailType"]?.ToString() ?? "";
            if (!string.IsNullOrEmpty(emailType)) typeSet.Add(emailType);
            if (status == "Pending") pending++;
            if (status == "Sent") sent++;

            emails.Add(new DashboardEmail(
                EmailKey: Convert.ToInt32(dataReader["lEmailKey"]),
                Date: dtCreate?.ToString("MM/dd/yyyy") ?? "",
                EmailType: emailType,
                From: dataReader["sFrom"]?.ToString()?.Trim() ?? "",
                To: dataReader["sTo"]?.ToString()?.Trim() ?? "",
                Subject: dataReader["sSubject"]?.ToString()?.Trim() ?? "",
                Status: status
            ));
        }

        return Ok(new DashboardEmailsResponse(emails, totalCount,
            new DashboardEmailStats(totalCount, pending, sent, typeSet.Count)));
    }

    // ── Shipping sub-tab ──
    [HttpGet("shipping")]
    public async Task<IActionResult> GetShipping(
        [FromQuery] string? search = null,
        [FromQuery] string? segment = "ready",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (segment == "ready")
            where.Add("rs.sRepairStatus IN ('Complete','Pending Ship') AND r.sShipTrackingNumber IS NULL");
        else if (segment == "today")
            where.Add("r.sShipTrackingNumber IS NOT NULL AND CAST(r.dtShipDate AS DATE) = CAST(GETDATE() AS DATE)");
        // segment == "all" -> shipped items, no extra filter on date
        else if (segment == "all")
            where.Add("r.sShipTrackingNumber IS NOT NULL");

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (r.sWorkOrderNumber LIKE @search
                 OR ISNULL(s.sSerialNumber,'') LIKE @search
                 OR ISNULL(c.sClientName1,'') LIKE @search
                 OR ISNULL(r.sShipTrackingNumber,'') LIKE @search)
                """);

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtShipDate,
                   ISNULL(r.sShipTrackingNumber,'') AS sShipTrackingNumber,
                   ISNULL(r.dblAmtShipping, 0) AS dblAmtShipping,
                   ISNULL(rs.sRepairStatus,'') AS sRepairStatus,
                   ISNULL(s.sSerialNumber,'') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1,'') AS sClientName1,
                   ISNULL(d.sDepartmentName,'') AS sDepartmentName
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY r.dtDateIn DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var shipments = new List<DashboardShipment>();
        while (await dataReader.ReadAsync())
        {
            var dateIn = dataReader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtDateIn"]);
            var shipDate = dataReader["dtShipDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtShipDate"]);
            shipments.Add(new DashboardShipment(
                RepairKey: Convert.ToInt32(dataReader["lRepairKey"]),
                Wo: dataReader["sWorkOrderNumber"]?.ToString() ?? "",
                Client: dataReader["sClientName1"]?.ToString() ?? "",
                Dept: dataReader["sDepartmentName"]?.ToString() ?? "",
                ScopeType: dataReader["sScopeTypeDesc"]?.ToString() ?? "",
                Serial: dataReader["sSerialNumber"]?.ToString() ?? "",
                Status: dataReader["sRepairStatus"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                ShipDate: shipDate?.ToString("MM/dd/yyyy"),
                TrackingNumber: dataReader["sShipTrackingNumber"]?.ToString(),
                ShipCharge: dataReader["dblAmtShipping"] == DBNull.Value ? 0 : Convert.ToDecimal(dataReader["dblAmtShipping"])
            ));
        }
        await dataReader.CloseAsync();

        // Stats
        const string shipStatsSql = """
            SELECT
                SUM(CASE WHEN rs.sRepairStatus IN ('Complete','Pending Ship') AND r.sShipTrackingNumber IS NULL THEN 1 ELSE 0 END) AS ReadyToShip,
                SUM(CASE WHEN r.sShipTrackingNumber IS NOT NULL AND CAST(r.dtShipDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS ShippedToday,
                SUM(CASE WHEN r.sShipTrackingNumber IS NOT NULL THEN ISNULL(r.dblAmtShipping,0) ELSE 0 END) AS TotalCharges
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            """;
        await using var shipStatsCmd = new SqlCommand(shipStatsSql, conn);
        await using var shipStatsReader = await shipStatsCmd.ExecuteReaderAsync();
        int readyToShip = 0, shippedToday = 0; decimal totalCharges = 0;
        if (await shipStatsReader.ReadAsync())
        {
            readyToShip = shipStatsReader["ReadyToShip"] == DBNull.Value ? 0 : Convert.ToInt32(shipStatsReader["ReadyToShip"]);
            shippedToday = shipStatsReader["ShippedToday"] == DBNull.Value ? 0 : Convert.ToInt32(shipStatsReader["ShippedToday"]);
            totalCharges = shipStatsReader["TotalCharges"] == DBNull.Value ? 0 : Convert.ToDecimal(shipStatsReader["TotalCharges"]);
        }

        return Ok(new DashboardShippingResponse(shipments, totalCount,
            new DashboardShippingStats(readyToShip, shippedToday, totalCharges)));
    }

    // ── Invoices sub-tab ──
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] string? search = null,
        [FromQuery] string? segment = "ready",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (segment == "ready")
            where.Add("i.bInvoiceFinalized = 0");
        else if (segment == "invoiced")
            where.Add("i.bInvoiceFinalized = 1");

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (ISNULL(i.sInvoiceNumber,'') LIKE @search
                 OR ISNULL(c.sClientName1,'') LIKE @search)
                """);

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblInvoice i
            LEFT JOIN tblClient c ON c.lClientKey = i.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT i.lInvoiceKey, ISNULL(i.sInvoiceNumber,'') AS sInvoiceNumber,
                   ISNULL(i.dblInvoiceAmount,0) AS dblInvoiceAmount,
                   i.dtInvoiceDate, i.bInvoiceFinalized,
                   ISNULL(c.sClientName1,'') AS sClientName1
            FROM tblInvoice i
            LEFT JOIN tblClient c ON c.lClientKey = i.lClientKey
            {whereClause}
            ORDER BY i.dtInvoiceDate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var invoices = new List<DashboardInvoice>();
        while (await dataReader.ReadAsync())
        {
            var dt = dataReader["dtInvoiceDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(dataReader["dtInvoiceDate"]);
            var finalized = Convert.ToBoolean(dataReader["bInvoiceFinalized"]);
            invoices.Add(new DashboardInvoice(
                InvoiceKey: Convert.ToInt32(dataReader["lInvoiceKey"]),
                InvoiceNumber: dataReader["sInvoiceNumber"]?.ToString() ?? "",
                Wo: "",
                Client: dataReader["sClientName1"]?.ToString() ?? "",
                Dept: "",
                Amount: dataReader["dblInvoiceAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(dataReader["dblInvoiceAmount"]),
                Status: finalized ? "Finalized" : "Pending",
                Date: dt?.ToString("MM/dd/yyyy") ?? "",
                PaidDate: null
            ));
        }
        await dataReader.CloseAsync();

        // Stats
        const string invStatsSql = """
            SELECT
                SUM(CASE WHEN i.bInvoiceFinalized = 0 THEN 1 ELSE 0 END) AS ReadyToInvoice,
                SUM(CASE WHEN i.bInvoiceFinalized = 1 AND MONTH(i.dtInvoiceDate) = MONTH(GETDATE()) AND YEAR(i.dtInvoiceDate) = YEAR(GETDATE()) THEN 1 ELSE 0 END) AS InvoicedMonth,
                SUM(ISNULL(i.dblInvoiceAmount, 0)) AS TotalAmount,
                CASE WHEN COUNT(*) > 0 THEN SUM(ISNULL(i.dblInvoiceAmount,0)) / COUNT(*) ELSE 0 END AS AvgInvoice
            FROM tblInvoice i
            """;
        await using var invStatsCmd = new SqlCommand(invStatsSql, conn);
        await using var invStatsReader = await invStatsCmd.ExecuteReaderAsync();
        int readyToInvoice = 0, invoicedMonth = 0; decimal invTotal = 0, invAvg = 0;
        if (await invStatsReader.ReadAsync())
        {
            readyToInvoice = invStatsReader["ReadyToInvoice"] == DBNull.Value ? 0 : Convert.ToInt32(invStatsReader["ReadyToInvoice"]);
            invoicedMonth = invStatsReader["InvoicedMonth"] == DBNull.Value ? 0 : Convert.ToInt32(invStatsReader["InvoicedMonth"]);
            invTotal = invStatsReader["TotalAmount"] == DBNull.Value ? 0 : Convert.ToDecimal(invStatsReader["TotalAmount"]);
            invAvg = invStatsReader["AvgInvoice"] == DBNull.Value ? 0 : Convert.ToDecimal(invStatsReader["AvgInvoice"]);
        }

        return Ok(new DashboardInvoicesResponse(invoices, totalCount,
            new DashboardInvoiceStats(readyToInvoice, invoicedMonth, invTotal, invAvg)));
    }

    // ── Flags sub-tab ──
    [HttpGet("flags")]
    public async Task<IActionResult> GetFlags(
        [FromQuery] string? search = null,
        [FromQuery] string? flagType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("f.sFlag LIKE @search");
        if (!string.IsNullOrWhiteSpace(flagType) && flagType != "All")
            where.Add("ft.sFlagType = @flagType");
        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblFlags f
            LEFT JOIN tblFlagTypes ft ON ft.lFlagTypeKey = f.lFlagTypeKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT f.lFlagKey, f.sFlag, f.lOwnerKey,
                   ISNULL(ft.sFlagType,'') AS sFlagType
            FROM tblFlags f
            LEFT JOIN tblFlagTypes ft ON ft.lFlagTypeKey = f.lFlagTypeKey
            {whereClause}
            ORDER BY f.lFlagKey DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(flagType) && flagType != "All") countCmd.Parameters.AddWithValue("@flagType", flagType);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(flagType) && flagType != "All") dataCmd.Parameters.AddWithValue("@flagType", flagType);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var flags = new List<DashboardFlag>();
        while (await dataReader.ReadAsync())
        {
            flags.Add(new DashboardFlag(
                FlagKey: Convert.ToInt32(dataReader["lFlagKey"]),
                FlagText: dataReader["sFlag"]?.ToString() ?? "",
                FlagType: dataReader["sFlagType"]?.ToString() ?? "",
                OwnerName: "",
                OwnerKey: Convert.ToInt32(dataReader["lOwnerKey"])
            ));
        }
        await dataReader.CloseAsync();

        // Stats
        const string flagStatsSql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN ft.sFlagType = 'Client' THEN 1 ELSE 0 END) AS Client,
                SUM(CASE WHEN ft.sFlagType = 'Scope Type' THEN 1 ELSE 0 END) AS ScopeType,
                SUM(CASE WHEN ft.sFlagType = 'Scope' THEN 1 ELSE 0 END) AS Scope,
                SUM(CASE WHEN ft.sFlagType = 'Repair' THEN 1 ELSE 0 END) AS Repair
            FROM tblFlags f
            LEFT JOIN tblFlagTypes ft ON ft.lFlagTypeKey = f.lFlagTypeKey
            """;
        await using var flagStatsCmd = new SqlCommand(flagStatsSql, conn);
        await using var flagStatsReader = await flagStatsCmd.ExecuteReaderAsync();
        int fTotal = 0, fClient = 0, fScopeType = 0, fScope = 0, fRepair = 0;
        if (await flagStatsReader.ReadAsync())
        {
            fTotal = flagStatsReader["Total"] == DBNull.Value ? 0 : Convert.ToInt32(flagStatsReader["Total"]);
            fClient = flagStatsReader["Client"] == DBNull.Value ? 0 : Convert.ToInt32(flagStatsReader["Client"]);
            fScopeType = flagStatsReader["ScopeType"] == DBNull.Value ? 0 : Convert.ToInt32(flagStatsReader["ScopeType"]);
            fScope = flagStatsReader["Scope"] == DBNull.Value ? 0 : Convert.ToInt32(flagStatsReader["Scope"]);
            fRepair = flagStatsReader["Repair"] == DBNull.Value ? 0 : Convert.ToInt32(flagStatsReader["Repair"]);
        }

        return Ok(new DashboardFlagsResponse(flags, totalCount,
            new DashboardFlagStats(fTotal, fClient, fScopeType, fScope, fRepair)));
    }

    // ── Tech Bench sub-tab ──
    [HttpGet("techbench")]
    public async Task<IActionResult> GetTechBench(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string> { "ISNULL(r.sRepairClosed, 'N') != 'Y'" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("""
                (r.sWorkOrderNumber LIKE @search
                 OR ISNULL(s.sSerialNumber,'') LIKE @search
                 OR ISNULL(c.sClientName1,'') LIKE @search)
                """);
        if (!string.IsNullOrWhiteSpace(statusFilter))
            where.Add("rs.sRepairStatus = @statusFilter");
        var whereClause = "WHERE " + string.Join(" AND ", where);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblClient c ON c.lClientKey = (SELECT TOP 1 lClientKey FROM tblDepartment WHERE lDepartmentKey = r.lDepartmentKey)
            {whereClause}
            """;

        var dataSql = $"""
            SELECT r.lRepairKey, r.sWorkOrderNumber,
                   ISNULL(s.sSerialNumber,'') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1,'') AS sClientName1,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn,
                   ISNULL(rs.sRepairStatus,'') AS sRepairStatus,
                   ISNULL(t.sTechName,'') AS sTechName
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            {whereClause}
            ORDER BY DATEDIFF(day, r.dtDateIn, GETDATE()) DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter)) countCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter)) dataCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        var items = new List<DashboardTechBenchItem>();
        while (await dataReader.ReadAsync())
        {
            items.Add(new DashboardTechBenchItem(
                RepairKey: Convert.ToInt32(dataReader["lRepairKey"]),
                Wo: dataReader["sWorkOrderNumber"]?.ToString() ?? "",
                Serial: dataReader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: dataReader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: dataReader["sClientName1"]?.ToString() ?? "",
                DaysIn: dataReader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(dataReader["DaysIn"]),
                Status: dataReader["sRepairStatus"]?.ToString() ?? "",
                Tech: dataReader["sTechName"]?.ToString()
            ));
        }
        await dataReader.CloseAsync();

        // Stats
        const string tbStatsSql = """
            SELECT
                SUM(CASE WHEN r.lTechnicianKey IS NOT NULL AND ISNULL(r.sRepairClosed, 'N') != 'Y' THEN 1 ELSE 0 END) AS Assigned,
                SUM(CASE WHEN rs.sRepairStatus = 'In Repair' THEN 1 ELSE 0 END) AS InRepair,
                SUM(CASE WHEN rs.sRepairStatus IN ('On Hold','Parts Hold','Approval Hold') THEN 1 ELSE 0 END) AS OnHold,
                SUM(CASE WHEN rs.sRepairStatus IN ('Complete','Shipped') AND CAST(r.dtShipDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS CompletedToday
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            """;
        await using var tbStatsCmd = new SqlCommand(tbStatsSql, conn);
        await using var tbStatsReader = await tbStatsCmd.ExecuteReaderAsync();
        int tbAssigned = 0, tbInRepair = 0, tbOnHold = 0, tbCompleted = 0;
        if (await tbStatsReader.ReadAsync())
        {
            tbAssigned = tbStatsReader["Assigned"] == DBNull.Value ? 0 : Convert.ToInt32(tbStatsReader["Assigned"]);
            tbInRepair = tbStatsReader["InRepair"] == DBNull.Value ? 0 : Convert.ToInt32(tbStatsReader["InRepair"]);
            tbOnHold = tbStatsReader["OnHold"] == DBNull.Value ? 0 : Convert.ToInt32(tbStatsReader["OnHold"]);
            tbCompleted = tbStatsReader["CompletedToday"] == DBNull.Value ? 0 : Convert.ToInt32(tbStatsReader["CompletedToday"]);
        }

        return Ok(new DashboardTechBenchResponse(items, totalCount,
            new DashboardTechBenchStats(tbAssigned, tbInRepair, tbOnHold, tbCompleted)));
    }

    // ── Analytics sub-tab ──
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Stats
        const string aStatsSql = """
            SELECT
                SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' THEN 1 ELSE 0 END) AS InHouse,
                AVG(CASE WHEN r.dtDateOut IS NOT NULL THEN CAST(DATEDIFF(day, r.dtDateIn, r.dtShipDate) AS DECIMAL(10,1)) END) AS AvgTat,
                COUNT(CASE WHEN r.dtDateOut IS NOT NULL AND MONTH(r.dtShipDate) = MONTH(GETDATE()) AND YEAR(r.dtShipDate) = YEAR(GETDATE()) THEN 1 END) AS Throughput
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            """;
        await using var aStatsCmd = new SqlCommand(aStatsSql, conn);
        await using var aStatsReader = await aStatsCmd.ExecuteReaderAsync();
        int inHouse = 0, throughput = 0; decimal avgTat = 0;
        if (await aStatsReader.ReadAsync())
        {
            inHouse = aStatsReader["InHouse"] == DBNull.Value ? 0 : Convert.ToInt32(aStatsReader["InHouse"]);
            avgTat = aStatsReader["AvgTat"] == DBNull.Value ? 0 : Convert.ToDecimal(aStatsReader["AvgTat"]);
            throughput = aStatsReader["Throughput"] == DBNull.Value ? 0 : Convert.ToInt32(aStatsReader["Throughput"]);
        }
        await aStatsReader.CloseAsync();

        // Top scope types by volume
        const string metricsSql = """
            SELECT TOP 20
                   ISNULL(st.sScopeTypeDesc,'Unknown') AS ScopeType,
                   COUNT(*) AS RepairCount,
                   AVG(CASE WHEN r.dtDateOut IS NOT NULL THEN CAST(DATEDIFF(day, r.dtDateIn, r.dtShipDate) AS DECIMAL(10,1)) END) AS AvgTat,
                   SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' THEN 1 ELSE 0 END) AS InProgress,
                   SUM(CASE WHEN r.dtDateOut IS NOT NULL THEN 1 ELSE 0 END) AS Completed
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            GROUP BY st.sScopeTypeDesc
            ORDER BY COUNT(*) DESC
            """;
        await using var metricsCmd = new SqlCommand(metricsSql, conn);
        await using var metricsReader = await metricsCmd.ExecuteReaderAsync();
        var metrics = new List<DashboardAnalyticsMetric>();
        int rank = 0;
        while (await metricsReader.ReadAsync())
        {
            rank++;
            metrics.Add(new DashboardAnalyticsMetric(
                Rank: rank,
                ScopeType: metricsReader["ScopeType"]?.ToString() ?? "",
                RepairCount: Convert.ToInt32(metricsReader["RepairCount"]),
                AvgTat: metricsReader["AvgTat"] == DBNull.Value ? 0 : Convert.ToDecimal(metricsReader["AvgTat"]),
                InProgress: metricsReader["InProgress"] == DBNull.Value ? 0 : Convert.ToInt32(metricsReader["InProgress"]),
                Completed: metricsReader["Completed"] == DBNull.Value ? 0 : Convert.ToInt32(metricsReader["Completed"])
            ));
        }

        return Ok(new DashboardAnalyticsResponse(metrics,
            new DashboardAnalyticsStats(inHouse, avgTat, 0, throughput)));
    }

    // ── Executive KPI Dashboard ──
    [HttpGet("executive-kpi")]
    public async Task<IActionResult> GetExecutiveKpi()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            DECLARE @today DATE = CAST(GETDATE() AS DATE);
            DECLARE @monthStart DATE = DATEFROMPARTS(YEAR(@today), MONTH(@today), 1);
            DECLARE @lastMonthStart DATE = DATEADD(MONTH, -1, @monthStart);
            DECLARE @lastMonthEnd DATE = DATEADD(DAY, -1, @monthStart);
            DECLARE @weekStart DATE = DATEADD(DAY, -7, @today);

            SELECT
              SUM(CASE WHEN r.dtDateIn >= @weekStart THEN 1 ELSE 0 END) AS ReceivedThisWeek,
              SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @weekStart THEN 1 ELSE 0 END) AS ShippedThisWeek,
              SUM(CASE WHEN r.dtDateIn >= @monthStart THEN 1 ELSE 0 END) AS ReceivedThisMonth,
              SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @monthStart THEN 1 ELSE 0 END) AS ShippedThisMonth,
              ISNULL(AVG(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @monthStart
                THEN CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS DECIMAL(10,1)) END), 0) AS AvgTatThisMonth,
              ISNULL(AVG(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @lastMonthStart AND r.dtDateOut <= @lastMonthEnd
                THEN CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS DECIMAL(10,1)) END), 0) AS AvgTatLastMonth,
              SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' AND DATEDIFF(DAY, r.dtDateIn, GETDATE()) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) AS Backlog1to7,
              SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' AND DATEDIFF(DAY, r.dtDateIn, GETDATE()) BETWEEN 8 AND 14 THEN 1 ELSE 0 END) AS Backlog8to14,
              SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' AND DATEDIFF(DAY, r.dtDateIn, GETDATE()) BETWEEN 15 AND 30 THEN 1 ELSE 0 END) AS Backlog15to30,
              SUM(CASE WHEN ISNULL(r.sRepairClosed, 'N') != 'Y' AND DATEDIFF(DAY, r.dtDateIn, GETDATE()) > 30 THEN 1 ELSE 0 END) AS Backlog30Plus,
              ISNULL(SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @monthStart THEN r.dblAmtRepair ELSE 0 END), 0) AS RevenueThisMonth,
              ISNULL(SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @lastMonthStart AND r.dtDateOut <= @lastMonthEnd THEN r.dblAmtRepair ELSE 0 END), 0) AS RevenueLastMonth,
              0 AS WarrantyItemsMonth,
              0 AS TotalItemsMonth,
              SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @monthStart AND DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) <= 14 THEN 1 ELSE 0 END) AS OnTimeShipped,
              SUM(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateOut >= @monthStart THEN 1 ELSE 0 END) AS TotalShippedMonth
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE r.dtDateIn >= DATEADD(YEAR, -2, GETDATE())
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 60;
        await using var rdr = await cmd.ExecuteReaderAsync();
        if (!await rdr.ReadAsync()) return Ok(new { });

        return Ok(new {
            receivedThisWeek = rdr.GetInt32(0),
            shippedThisWeek = rdr.GetInt32(1),
            receivedThisMonth = rdr.GetInt32(2),
            shippedThisMonth = rdr.GetInt32(3),
            avgTatThisMonth = rdr.GetDecimal(4),
            avgTatLastMonth = rdr.GetDecimal(5),
            backlog1to7 = rdr.GetInt32(6),
            backlog8to14 = rdr.GetInt32(7),
            backlog15to30 = rdr.GetInt32(8),
            backlog30Plus = rdr.GetInt32(9),
            revenueThisMonth = rdr.GetDecimal(10),
            revenueLastMonth = rdr.GetDecimal(11),
            warrantyItemsMonth = rdr.GetInt32(12),
            totalItemsMonth = rdr.GetInt32(13),
            onTimeShipped = rdr.GetInt32(14),
            totalShippedMonth = rdr.GetInt32(15),
        });
    }

    // ── Client Report Card ──
    [HttpGet("/api/clients/{clientKey:int}/report-card")]
    public async Task<IActionResult> GetClientReportCard(int clientKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            DECLARE @monthStart DATE = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @yearStart DATE = DATEFROMPARTS(YEAR(GETDATE()), 1, 1);

            SELECT
              c.sClientName1 AS ClientName,
              -- Repairs completed (shipped) this year
              (SELECT COUNT(*) FROM tblRepair r
               JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck AND r.dtDateOut IS NOT NULL
               AND CAST(r.dtDateOut AS DATE) >= @yearStart) AS RepairsCompletedYTD,
              -- Average TAT
              (SELECT ISNULL(AVG(CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS DECIMAL(10,1))), 0)
               FROM tblRepair r
               JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck AND r.dtDateOut IS NOT NULL
               AND CAST(r.dtDateOut AS DATE) >= @yearStart) AS AvgTatYTD,
              -- On-time % (within 14 days)
              (SELECT COUNT(*) FROM tblRepair r
               JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck AND r.dtDateOut IS NOT NULL
               AND CAST(r.dtDateOut AS DATE) >= @yearStart
               AND DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) <= 14) AS OnTimeYTD,
              -- Total revenue YTD
              (SELECT ISNULL(SUM(r.dblAmtRepair), 0) FROM tblRepair r
               JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck AND r.dtDateOut IS NOT NULL
               AND CAST(r.dtDateOut AS DATE) >= @yearStart) AS RevenueYTD,
              -- Currently in-house
              (SELECT COUNT(*) FROM tblRepair r
               JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck AND ISNULL(r.sRepairClosed, 'N') != 'Y') AS InHouseNow,
              -- Warranty items YTD
              (SELECT COUNT(*) FROM tblRepairItemTran rit
               JOIN tblRepair r ON r.lRepairKey = rit.lRepairKey
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck AND rit.sFixType = 'W'
               AND CAST(r.dtDateIn AS DATE) >= @yearStart) AS WarrantyItemsYTD,
              -- Total items YTD
              (SELECT COUNT(*) FROM tblRepairItemTran rit
               JOIN tblRepair r ON r.lRepairKey = rit.lRepairKey
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck
               AND CAST(r.dtDateIn AS DATE) >= @yearStart) AS TotalItemsYTD,
              -- Departments served
              (SELECT COUNT(DISTINCT r.lDepartmentKey) FROM tblRepair r
               JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
               WHERE d.lClientKey = @ck
               AND CAST(r.dtDateIn AS DATE) >= @yearStart) AS DepartmentsServedYTD
            FROM tblClient c WHERE c.lClientKey = @ck
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@ck", clientKey);
        cmd.CommandTimeout = 30;
        await using var rdr = await cmd.ExecuteReaderAsync();
        if (!await rdr.ReadAsync()) return NotFound();

        var repairsCompleted = Convert.ToInt32(rdr["RepairsCompletedYTD"]);
        var onTime = Convert.ToInt32(rdr["OnTimeYTD"]);
        var totalItems = Convert.ToInt32(rdr["TotalItemsYTD"]);
        var warrantyItems = Convert.ToInt32(rdr["WarrantyItemsYTD"]);

        return Ok(new {
            clientName = rdr["ClientName"]?.ToString() ?? "",
            repairsCompletedYTD = repairsCompleted,
            avgTatYTD = Convert.ToDecimal(rdr["AvgTatYTD"]),
            onTimePctYTD = repairsCompleted > 0 ? Math.Round((decimal)onTime / repairsCompleted * 100, 1) : 0,
            revenueYTD = Convert.ToDecimal(rdr["RevenueYTD"]),
            inHouseNow = Convert.ToInt32(rdr["InHouseNow"]),
            warrantyPctYTD = totalItems > 0 ? Math.Round((decimal)warrantyItems / totalItems * 100, 1) : 0,
            departmentsServedYTD = Convert.ToInt32(rdr["DepartmentsServedYTD"]),
        });
    }
}
