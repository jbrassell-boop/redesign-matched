using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/scope-models")]
[Authorize]
public class ScopeModelsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? typeFilter = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] int? manufacturerKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(st.sScopeTypeDesc LIKE @search OR m.sManufacturer LIKE @search OR stc.sScopeTypeCategory LIKE @search OR st.sTypeID LIKE @search)");
        if (!string.IsNullOrWhiteSpace(typeFilter))
            where.Add("st.sRigidOrFlexible = @typeFilter");
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            if (statusFilter == "active")
                where.Add("ISNULL(st.bActive, 1) = 1");
            else if (statusFilter == "inactive")
                where.Add("ISNULL(st.bActive, 1) = 0");
        }
        if (manufacturerKey.HasValue)
            where.Add("st.lManufacturerKey = @manufacturerKey");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*)
            FROM tblScopeType st
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT st.lScopeTypeKey, ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory,
                   ISNULL(st.bActive, 1) AS bActive,
                   ISNULL(st.sInsertTubeLength, '') AS sInsertTubeLength,
                   ISNULL(st.sInsertTubeDiameter, '') AS sInsertTubeDiameter,
                   ISNULL(st.sFieldOfView, '') AS sFieldOfView,
                   ISNULL(st.sDirectionOfView, '') AS sDirectionOfView,
                   ISNULL(st.sAngUp, '') AS sAngUp,
                   ISNULL(st.sAngDown, '') AS sAngDown,
                   ISNULL(st.sAngLeft, '') AS sAngLeft,
                   ISNULL(st.sAngRight, '') AS sAngRight
            FROM tblScopeType st
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            {whereClause}
            ORDER BY st.sScopeTypeDesc
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        AddParams(countCmd, search, typeFilter, statusFilter, manufacturerKey);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        AddParams(dataCmd, search, typeFilter, statusFilter, manufacturerKey);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<ScopeModelListItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new ScopeModelListItem(
                ScopeTypeKey: Convert.ToInt32(reader["lScopeTypeKey"]),
                Description: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Type: reader["sRigidOrFlexible"]?.ToString() ?? "",
                Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
                Category: reader["sScopeTypeCategory"]?.ToString() ?? "",
                Active: reader["bActive"] != DBNull.Value && Convert.ToBoolean(reader["bActive"]),
                InsertTubeLength: reader["sInsertTubeLength"]?.ToString() ?? "",
                InsertTubeDiameter: reader["sInsertTubeDiameter"]?.ToString() ?? "",
                FieldOfView: reader["sFieldOfView"]?.ToString() ?? "",
                DirectionOfView: reader["sDirectionOfView"]?.ToString() ?? "",
                AngUp: reader["sAngUp"]?.ToString() ?? "",
                AngDown: reader["sAngDown"]?.ToString() ?? "",
                AngLeft: reader["sAngLeft"]?.ToString() ?? "",
                AngRight: reader["sAngRight"]?.ToString() ?? ""
            ));
        }

        return Ok(new ScopeModelListResponse(items, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT st.lScopeTypeKey, ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(st.sScopeTypeLongDesc, '') AS sScopeTypeLongDesc,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
                   ISNULL(st.sTypeID, '') AS sTypeID,
                   ISNULL(m.sManufacturer, '') AS sManufacturer,
                   ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory,
                   ISNULL(st.bActive, 1) AS bActive,
                   ISNULL(st.sAngUp, '') AS sAngUp, ISNULL(st.sAngDown, '') AS sAngDown,
                   ISNULL(st.sAngLeft, '') AS sAngLeft, ISNULL(st.sAngRight, '') AS sAngRight,
                   ISNULL(st.sInsertTubeLength, '') AS sInsertTubeLength,
                   ISNULL(st.sInsertTubeDiameter, '') AS sInsertTubeDiameter,
                   ISNULL(st.sForcepChannelSize, '') AS sForcepChannelSize,
                   ISNULL(st.sFieldOfView, '') AS sFieldOfView,
                   ISNULL(st.sDirectionOfView, '') AS sDirectionOfView,
                   ISNULL(st.sDepthOfField, '') AS sDepthOfField,
                   ISNULL(st.sLengthSpec, '') AS sLengthSpec,
                   ISNULL(st.sTubeSystem, '') AS sTubeSystem,
                   ISNULL(st.sLensSystem, '') AS sLensSystem,
                   ISNULL(st.sDegree, '') AS sDegree,
                   ISNULL(st.sIDBand, '') AS sIDBand,
                   ISNULL(st.sEyeCupMount, '') AS sEyeCupMount,
                   st.nContractCost, st.mMaxCharge,
                   ISNULL(st.sGLAcct, '') AS sGLAcct,
                   ISNULL(st.sItemCode, '') AS sItemCode,
                   ISNULL(st.sInspReqd, '') AS sInspReqd,
                   ISNULL(st.bForceOnPortal, 0) AS bForceOnPortal,
                   ISNULL(st.bSkipPortal, 0) AS bSkipPortal,
                   ISNULL(st.bAutoclaveable, 0) AS bAutoclaveable,
                   ISNULL(st.bDrawing, 0) AS bDrawing,
                   ISNULL(st.sNotes, '') AS sNotes,
                   st.dtLastUpdate
            FROM tblScopeType st
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
            WHERE st.lScopeTypeKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound();

        var detail = new ScopeModelDetail(
            ScopeTypeKey: Convert.ToInt32(reader["lScopeTypeKey"]),
            Description: reader["sScopeTypeDesc"]?.ToString() ?? "",
            LongDescription: reader["sScopeTypeLongDesc"]?.ToString() ?? "",
            Type: reader["sRigidOrFlexible"]?.ToString() ?? "",
            TypeId: reader["sTypeID"]?.ToString() ?? "",
            Manufacturer: reader["sManufacturer"]?.ToString() ?? "",
            Category: reader["sScopeTypeCategory"]?.ToString() ?? "",
            Active: reader["bActive"] != DBNull.Value && Convert.ToBoolean(reader["bActive"]),
            AngUp: reader["sAngUp"]?.ToString() ?? "",
            AngDown: reader["sAngDown"]?.ToString() ?? "",
            AngLeft: reader["sAngLeft"]?.ToString() ?? "",
            AngRight: reader["sAngRight"]?.ToString() ?? "",
            InsertTubeLength: reader["sInsertTubeLength"]?.ToString() ?? "",
            InsertTubeDiameter: reader["sInsertTubeDiameter"]?.ToString() ?? "",
            ForcepChannelSize: reader["sForcepChannelSize"]?.ToString() ?? "",
            FieldOfView: reader["sFieldOfView"]?.ToString() ?? "",
            DirectionOfView: reader["sDirectionOfView"]?.ToString() ?? "",
            DepthOfField: reader["sDepthOfField"]?.ToString() ?? "",
            LengthSpec: reader["sLengthSpec"]?.ToString() ?? "",
            TubeSystem: reader["sTubeSystem"]?.ToString() ?? "",
            LensSystem: reader["sLensSystem"]?.ToString() ?? "",
            Degree: reader["sDegree"]?.ToString() ?? "",
            IDBand: reader["sIDBand"]?.ToString() ?? "",
            EyeCupMount: reader["sEyeCupMount"]?.ToString() ?? "",
            ContractCost: reader["nContractCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["nContractCost"]),
            MaxCharge: reader["mMaxCharge"] == DBNull.Value ? null : Convert.ToDecimal(reader["mMaxCharge"]),
            GLAccount: reader["sGLAcct"]?.ToString() ?? "",
            ItemCode: reader["sItemCode"]?.ToString() ?? "",
            InspRequired: reader["sInspReqd"]?.ToString() == "Y",
            ForceOnPortal: reader["bForceOnPortal"] != DBNull.Value && Convert.ToBoolean(reader["bForceOnPortal"]),
            SkipPortal: reader["bSkipPortal"] != DBNull.Value && Convert.ToBoolean(reader["bSkipPortal"]),
            Autoclaveable: reader["bAutoclaveable"] != DBNull.Value && Convert.ToBoolean(reader["bAutoclaveable"]),
            Drawing: reader["bDrawing"] != DBNull.Value && Convert.ToBoolean(reader["bDrawing"]),
            Notes: reader["sNotes"]?.ToString() ?? "",
            LastUpdated: reader["dtLastUpdate"] == DBNull.Value ? "" : Convert.ToDateTime(reader["dtLastUpdate"]).ToString("MM/dd/yyyy")
        );

        return Ok(detail);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN ISNULL(bActive, 1) = 1 THEN 1 ELSE 0 END) AS ActiveCount,
                SUM(CASE WHEN ISNULL(bActive, 1) = 0 THEN 1 ELSE 0 END) AS InactiveCount,
                SUM(CASE WHEN sRigidOrFlexible = 'F' THEN 1 ELSE 0 END) AS Flexible,
                SUM(CASE WHEN sRigidOrFlexible = 'R' THEN 1 ELSE 0 END) AS Rigid,
                SUM(CASE WHEN sRigidOrFlexible = 'C' THEN 1 ELSE 0 END) AS Camera
            FROM tblScopeType
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return Ok(new ScopeModelStats(
            Total: Convert.ToInt32(reader["Total"]),
            ActiveCount: Convert.ToInt32(reader["ActiveCount"]),
            InactiveCount: Convert.ToInt32(reader["InactiveCount"]),
            Flexible: Convert.ToInt32(reader["Flexible"]),
            Rigid: Convert.ToInt32(reader["Rigid"]),
            Camera: Convert.ToInt32(reader["Camera"])
        ));
    }

    [HttpGet("manufacturers")]
    public async Task<IActionResult> GetManufacturers()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = "SELECT lManufacturerKey, ISNULL(sManufacturer, '') AS sManufacturer FROM tblManufacturers ORDER BY sManufacturer";
        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var list = new List<object>();
        while (await reader.ReadAsync())
        {
            list.Add(new { key = Convert.ToInt32(reader["lManufacturerKey"]), name = reader["sManufacturer"]?.ToString() ?? "" });
        }
        return Ok(list);
    }

    [HttpGet("{id:int}/repair-items")]
    public async Task<IActionResult> GetRepairItems(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT stri.lScopeTypeRepairItemKey, stri.lRepairItemKey,
                   ISNULL(ri.sItemDescription, '') AS sItemDescription,
                   td3.lMinutes AS MinutesL3,
                   td2.lMinutes AS MinutesL2,
                   td1.lMinutes AS MinutesL1,
                   td3.lWarningMinutes AS WarningMinutes
            FROM tblScopeTypeRepairItems stri
            INNER JOIN tblRepairItem ri ON ri.lRepairItemKey = stri.lRepairItemKey
            LEFT JOIN tblScopeTypeRepairItemTechDetails td3
                ON td3.lScopeTypeRepairItemKey = stri.lScopeTypeRepairItemKey AND td3.lTechLevel = 3
            LEFT JOIN tblScopeTypeRepairItemTechDetails td2
                ON td2.lScopeTypeRepairItemKey = stri.lScopeTypeRepairItemKey AND td2.lTechLevel = 2
            LEFT JOIN tblScopeTypeRepairItemTechDetails td1
                ON td1.lScopeTypeRepairItemKey = stri.lScopeTypeRepairItemKey AND td1.lTechLevel = 1
            WHERE stri.lScopeTypeKey = @id
            ORDER BY ri.sItemDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<ScopeTypeRepairItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new ScopeTypeRepairItem(
                ScopeTypeRepairItemKey: Convert.ToInt32(reader["lScopeTypeRepairItemKey"]),
                RepairItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
                ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
                MinutesL3: reader["MinutesL3"] == DBNull.Value ? null : Convert.ToInt32(reader["MinutesL3"]),
                MinutesL2: reader["MinutesL2"] == DBNull.Value ? null : Convert.ToInt32(reader["MinutesL2"]),
                MinutesL1: reader["MinutesL1"] == DBNull.Value ? null : Convert.ToInt32(reader["MinutesL1"]),
                WarningMinutes: reader["WarningMinutes"] == DBNull.Value ? null : Convert.ToInt32(reader["WarningMinutes"])
            ));
        }
        return Ok(items);
    }

    [HttpGet("{id:int}/max-charges")]
    public async Task<IActionResult> GetMaxCharges(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sql = """
            SELECT mc.lDepartmentKey, ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(c.sCompanyName, '') AS sCompanyName, mc.nMaxCharge
            FROM tblScopeTypeDepartmentMaxCharges mc
            INNER JOIN tblDepartment d ON d.lDepartmentKey = mc.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE mc.lScopeTypeKey = @id
            ORDER BY c.sCompanyName, d.sDepartmentName
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<ScopeTypeDeptMaxCharge>();
        while (await reader.ReadAsync())
        {
            items.Add(new ScopeTypeDeptMaxCharge(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                ClientName: reader["sCompanyName"]?.ToString() ?? "",
                MaxCharge: reader["nMaxCharge"] == DBNull.Value ? null : Convert.ToDecimal(reader["nMaxCharge"])
            ));
        }
        return Ok(items);
    }

    private static void AddParams(SqlCommand cmd, string? search, string? typeFilter, string? statusFilter, int? manufacturerKey)
    {
        if (!string.IsNullOrWhiteSpace(search)) cmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(typeFilter)) cmd.Parameters.AddWithValue("@typeFilter", typeFilter);
        if (manufacturerKey.HasValue) cmd.Parameters.AddWithValue("@manufacturerKey", manufacturerKey.Value);
    }
}
