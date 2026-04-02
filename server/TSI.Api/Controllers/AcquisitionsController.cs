using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/acquisitions")]
[Authorize]
public class AcquisitionsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? tab = "inhouse")
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // In-House: scopes linked to acquisition PO trans that are NOT sold/consigned
        // Consigned: scopes that are consigned
        // Both come from tblScope -> tblAcquisitionSupplierPOTran -> tblAcquisitionSupplierPO
        var where = new List<string> { "s.lAcquisitionSupplierPOTranKey IS NOT NULL" };

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search OR po.sSupplierPONumber LIKE @search)");

        // Tab filter: use sScopeIsDead as a proxy for sold status
        if (tab == "sold")
            where.Clear(); // sold uses different query below

        var whereClause = "WHERE " + string.Join(" AND ", where);

        if (tab == "sold")
            return await GetSoldList(conn, search, page, pageSize);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblAcquisitionSupplierPO po ON po.lAcquisitionSupplierPOKey = pt.lAcquisitionSupplierPOKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT s.lScopeKey,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(po.sSupplierPONumber, '') AS sPONumber,
                   po.dtDateOfPO,
                   pt.dtDateReceived,
                   ISNULL(pt.nScopeCost, 0) AS nScopeCost
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblAcquisitionSupplierPO po ON po.lAcquisitionSupplierPOKey = pt.lAcquisitionSupplierPOKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY pt.dtDateReceived DESC
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
        var items = new List<AcquisitionListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new AcquisitionListItem(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Supplier: "",
                PONumber: reader["sPONumber"]?.ToString() ?? "",
                Dept: reader["sDepartmentName"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                DateAcquired: reader["dtDateReceived"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateReceived"]).ToString("MM/dd/yyyy"),
                PODate: reader["dtDateOfPO"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtDateOfPO"]).ToString("MM/dd/yyyy"),
                Condition: "",
                Cost: reader["nScopeCost"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["nScopeCost"])
            ));
        }

        return Ok(new AcquisitionListResponse(items, totalCount));
    }

    private async Task<IActionResult> GetSoldList(SqlConnection conn, string? search, int page, int pageSize)
    {
        // Sold scopes: scopes marked as dead (sScopeIsDead = 'Y') that had an acquisition PO
        var where = new List<string> { "s.sScopeIsDead = 'Y'", "s.lAcquisitionSupplierPOTranKey IS NOT NULL" };
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(s.sSerialNumber LIKE @search OR st.sScopeTypeDesc LIKE @search OR c.sClientName1 LIKE @search)");

        var whereClause = "WHERE " + string.Join(" AND ", where);

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT s.lScopeKey,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   s.dtLastUpdate,
                   ISNULL(pt.nScopeCost, 0) AS nScopeCost
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            {whereClause}
            ORDER BY s.dtLastUpdate DESC
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
        var items = new List<AcquisitionSoldItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new AcquisitionSoldItem(
                ScopeKey: Convert.ToInt32(reader["lScopeKey"]),
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                SaleDate: reader["dtLastUpdate"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtLastUpdate"]).ToString("MM/dd/yyyy"),
                SalePrice: reader["nScopeCost"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["nScopeCost"]),
                Buyer: ""
            ));
        }

        return Ok(new AcquisitionSoldResponse(items, totalCount));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN s.sScopeIsDead IS NULL OR s.sScopeIsDead <> 'Y' THEN 1 ELSE 0 END) AS InHouse,
                SUM(CASE WHEN s.sScopeIsDead = 'Y' THEN 1 ELSE 0 END) AS Sold,
                SUM(CASE WHEN s.sScopeIsDead IS NULL OR s.sScopeIsDead <> 'Y' THEN ISNULL(pt.nScopeCost, 0) ELSE 0 END) AS InHouseValue,
                SUM(CASE WHEN s.sScopeIsDead = 'Y' THEN ISNULL(pt.nScopeCost, 0) ELSE 0 END) AS SoldRevenue
            FROM tblScope s
            INNER JOIN tblAcquisitionSupplierPOTran pt ON pt.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var inHouse = Convert.ToInt32(reader["InHouse"]);
        var sold = Convert.ToInt32(reader["Sold"]);

        return Ok(new AcquisitionStats(
            InHouse: inHouse,
            Consigned: 0,
            Sold: sold,
            InHouseValue: reader["InHouseValue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["InHouseValue"]),
            SoldRevenue: reader["SoldRevenue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["SoldRevenue"])
        ));
    }
}
