using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(s.sSupplierName1 LIKE @search OR s.sShipCity LIKE @search OR s.sGPID LIKE @search OR s.sContactFirst LIKE @search OR s.sContactLast LIKE @search)");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblSupplier s {whereClause}";

        var dataSql = $"""
            SELECT s.lSupplierKey, ISNULL(s.sSupplierName1, '') AS sSupplierName1,
                   ISNULL(s.sShipCity, '') AS sShipCity, ISNULL(s.sShipState, '') AS sShipState,
                   ISNULL(s.sPhoneVoice, '') AS sPhoneVoice, ISNULL(s.sGPID, '') AS sGPID,
                   ISNULL(s.bActive, 0) AS bActive, ISNULL(s.bAcquisitionSupplier, 0) AS bAcquisitionSupplier
            FROM tblSupplier s
            {whereClause}
            ORDER BY s.sSupplierName1
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        var supplierKeys = new List<int>();
        var suppliers = new List<SupplierListItem>();
        await using (var reader = await dataCmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var key = Convert.ToInt32(reader["lSupplierKey"]);
                supplierKeys.Add(key);
                suppliers.Add(new SupplierListItem(
                    SupplierKey: key,
                    Name: reader["sSupplierName1"]?.ToString() ?? "",
                    City: reader["sShipCity"]?.ToString() ?? "",
                    State: reader["sShipState"]?.ToString() ?? "",
                    Phone: reader["sPhoneVoice"]?.ToString() ?? "",
                    GpId: reader["sGPID"]?.ToString() ?? "",
                    IsActive: Convert.ToBoolean(reader["bActive"]),
                    IsAcquisitionSupplier: Convert.ToBoolean(reader["bAcquisitionSupplier"]),
                    Roles: new List<string>()
                ));
            }
        }

        // Load roles for all returned suppliers
        if (supplierKeys.Count > 0)
        {
            var keyList = string.Join(",", supplierKeys);
            var rolesSql = $"""
                SELECT sr.lSupplierKey, rr.sSupplierRole
                FROM tblSupplierRoles sr
                JOIN tblSupplierRolesRef rr ON rr.lSupplierRoleKey = sr.lSupplierRoleKey
                WHERE sr.lSupplierKey IN ({keyList})
                """;
            await using var rolesCmd = new SqlCommand(rolesSql, conn);
            var rolesMap = new Dictionary<int, List<string>>();
            await using var rolesReader = await rolesCmd.ExecuteReaderAsync();
            while (await rolesReader.ReadAsync())
            {
                var sk = Convert.ToInt32(rolesReader["lSupplierKey"]);
                var role = rolesReader["sSupplierRole"]?.ToString() ?? "";
                if (!rolesMap.ContainsKey(sk)) rolesMap[sk] = new List<string>();
                rolesMap[sk].Add(role);
            }

            suppliers = suppliers.Select(s => s with
            {
                Roles = rolesMap.TryGetValue(s.SupplierKey, out var r) ? r : new List<string>()
            }).ToList();
        }

        return Ok(new SupplierListResponse(suppliers, totalCount));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT s.*, pt.sSupplierPOType
            FROM tblSupplier s
            LEFT JOIN tblSupplierPOTypes pt ON pt.lSupplierPOTypeKey = s.lSupplierPOTypeKey
            WHERE s.lSupplierKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Supplier not found." });

        var lastUpdate = reader["dtLastUpdate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtLastUpdate"]);

        var detail = new SupplierDetail(
            SupplierKey: Convert.ToInt32(reader["lSupplierKey"]),
            Name: reader["sSupplierName1"]?.ToString() ?? "",
            Name2: reader["sSupplierName2"]?.ToString(),
            ShipAddr1: reader["sShipAddr1"]?.ToString(),
            ShipAddr2: reader["sShipAddr2"]?.ToString(),
            ShipCity: reader["sShipCity"]?.ToString(),
            ShipState: reader["sShipState"]?.ToString(),
            ShipZip: reader["sShipZip"]?.ToString(),
            ShipCountry: reader["sShipCountry"]?.ToString(),
            BillAddr1: reader["sBillAddr1"]?.ToString(),
            BillAddr2: reader["sBillAddr2"]?.ToString(),
            BillCity: reader["sBillCity"]?.ToString(),
            BillState: reader["sBillState"]?.ToString(),
            BillZip: reader["sBillZip"]?.ToString(),
            BillCountry: reader["sBillCountry"]?.ToString(),
            MailAddr1: reader["sMailAddr1"]?.ToString(),
            MailAddr2: reader["sMailAddr2"]?.ToString(),
            MailCity: reader["sMailCity"]?.ToString(),
            MailState: reader["sMailState"]?.ToString(),
            MailZip: reader["sMailZip"]?.ToString(),
            MailCountry: reader["sMailCountry"]?.ToString(),
            ContactFirst: reader["sContactFirst"]?.ToString(),
            ContactLast: reader["sContactLast"]?.ToString(),
            Phone: reader["sPhoneVoice"]?.ToString(),
            Fax: reader["sPhoneFAX"]?.ToString(),
            Email: reader["sContactEMail"]?.ToString(),
            GpId: reader["sGPID"]?.ToString(),
            PeachTreeId: reader["sPeachTreeSupplierID"]?.ToString(),
            OrderMinimum: reader["dblOrderMinimum"] == DBNull.Value ? null : Convert.ToDouble(reader["dblOrderMinimum"]),
            IsActive: reader["bActive"] != DBNull.Value && Convert.ToBoolean(reader["bActive"]),
            IsAcquisitionSupplier: reader["bAcquisitionSupplier"] != DBNull.Value && Convert.ToBoolean(reader["bAcquisitionSupplier"]),
            ShowOnDashboard: reader["bShowOnDashboard"] != DBNull.Value && Convert.ToBoolean(reader["bShowOnDashboard"]),
            BlindPoForGp: reader["bBlindPOForGP"] != DBNull.Value && Convert.ToBoolean(reader["bBlindPOForGP"]),
            CreatePartNumbers: reader["bCreatePartNumbers"] != DBNull.Value && Convert.ToBoolean(reader["bCreatePartNumbers"]),
            PartNumberPrefix: reader["sPartNumberPrefix"]?.ToString(),
            ShowVendorSkuOnPo: reader["bShowVendorSKUOnPO"] != DBNull.Value && Convert.ToBoolean(reader["bShowVendorSKUOnPO"]),
            IncludePartNumberInPoDescription: reader["bIncludePartNumberInPODescription"] != DBNull.Value && Convert.ToBoolean(reader["bIncludePartNumberInPODescription"]),
            AdditionalPoDescription: reader["sAdditionalPODescription"]?.ToString(),
            AdditionalPoDescriptionCostPerUnit: reader["nAdditionalPODescriptionCostPerUnit"] == DBNull.Value ? null : Convert.ToDecimal(reader["nAdditionalPODescriptionCostPerUnit"]),
            UseVendorSku: reader["bUseVendorSKU"] != DBNull.Value && Convert.ToBoolean(reader["bUseVendorSKU"]),
            AllowDuplicatePartNumbers: reader["bAllowDuplicatePartNumbers"] != DBNull.Value && Convert.ToBoolean(reader["bAllowDuplicatePartNumbers"]),
            SupplierPoTypeKey: reader["lSupplierPOTypeKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lSupplierPOTypeKey"]),
            SupplierPoType: reader["sSupplierPOType"]?.ToString(),
            SupplierKeyLink: reader["lSupplierKeyLink"] == DBNull.Value ? null : Convert.ToInt32(reader["lSupplierKeyLink"]),
            BillEmail: reader["sBillEmail"]?.ToString(),
            BillEmailName: reader["sBillEmailName"]?.ToString(),
            BillEmail2: reader["sBillEmail2"]?.ToString(),
            BillType: reader["lBillType"] == DBNull.Value ? null : Convert.ToInt32(reader["lBillType"]),
            Comments: reader["mComments"]?.ToString(),
            LastUpdate: lastUpdate?.ToString("MM/dd/yyyy"),
            Roles: new List<string>(),
            RecentPos: new List<SupplierPo>()
        );
        await reader.CloseAsync();

        // Load roles
        const string rolesSql = """
            SELECT rr.sSupplierRole
            FROM tblSupplierRoles sr
            JOIN tblSupplierRolesRef rr ON rr.lSupplierRoleKey = sr.lSupplierRoleKey
            WHERE sr.lSupplierKey = @id
            """;
        await using var rolesCmd = new SqlCommand(rolesSql, conn);
        rolesCmd.Parameters.AddWithValue("@id", id);
        var roles = new List<string>();
        await using (var rr = await rolesCmd.ExecuteReaderAsync())
        {
            while (await rr.ReadAsync())
                roles.Add(rr["sSupplierRole"]?.ToString() ?? "");
        }

        // Load recent POs (top 50)
        const string poSql = """
            SELECT TOP 50 po.lSupplierPOKey, ISNULL(po.sSupplierPONumber, '') AS sSupplierPONumber,
                   po.dtDateOfPO, ISNULL(po.dblPOTotal, 0) AS dblPOTotal,
                   ISNULL(po.bCancelled, 0) AS bCancelled,
                   ISNULL(po.bGenerated, 0) AS bGenerated,
                   pt.sSupplierPOType
            FROM tblSupplierPO po
            LEFT JOIN tblSupplierPOTypes pt ON pt.lSupplierPOTypeKey = po.lSupplierPOTypeKey
            WHERE po.lSupplierKey = @id
            ORDER BY po.dtDateOfPO DESC
            """;
        await using var poCmd = new SqlCommand(poSql, conn);
        poCmd.Parameters.AddWithValue("@id", id);
        var pos = new List<SupplierPo>();
        await using (var pr = await poCmd.ExecuteReaderAsync())
        {
            while (await pr.ReadAsync())
            {
                var poDate = pr["dtDateOfPO"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(pr["dtDateOfPO"]);
                var cancelled = Convert.ToBoolean(pr["bCancelled"]);
                var generated = Convert.ToBoolean(pr["bGenerated"]);
                var status = cancelled ? "Cancelled" : generated ? "Generated" : "Open";
                pos.Add(new SupplierPo(
                    SupplierPoKey: Convert.ToInt32(pr["lSupplierPOKey"]),
                    PoNumber: pr["sSupplierPONumber"]?.ToString() ?? "",
                    Date: poDate?.ToString("MM/dd/yyyy"),
                    Amount: Convert.ToDouble(pr["dblPOTotal"]),
                    Status: status,
                    PoType: pr["sSupplierPOType"]?.ToString()
                ));
            }
        }

        return Ok(detail with { Roles = roles, RecentPos = pos });
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> PatchSupplier(int id, [FromBody] PatchSupplierRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var cmd = new SqlCommand();
        cmd.Connection = conn;

        if (body.Name is not null)        { sets.Add("sSupplierName1 = @name");  cmd.Parameters.AddWithValue("@name",  body.Name); }
        if (body.ShipAddr1 is not null)   { sets.Add("sShipAddr1 = @addr1");     cmd.Parameters.AddWithValue("@addr1", body.ShipAddr1); }
        if (body.ShipAddr2 is not null)   { sets.Add("sShipAddr2 = @addr2");     cmd.Parameters.AddWithValue("@addr2", body.ShipAddr2); }
        if (body.ShipCity is not null)    { sets.Add("sShipCity = @city");       cmd.Parameters.AddWithValue("@city",  body.ShipCity); }
        if (body.ShipState is not null)   { sets.Add("sShipState = @state");     cmd.Parameters.AddWithValue("@state", body.ShipState); }
        if (body.ShipZip is not null)     { sets.Add("sShipZip = @zip");         cmd.Parameters.AddWithValue("@zip",   body.ShipZip); }
        if (body.Phone is not null)       { sets.Add("sPhoneVoice = @phone");    cmd.Parameters.AddWithValue("@phone", body.Phone); }
        if (body.Fax is not null)         { sets.Add("sPhoneFAX = @fax");        cmd.Parameters.AddWithValue("@fax",   body.Fax); }
        if (body.Email is not null)       { sets.Add("sContactEMail = @email");  cmd.Parameters.AddWithValue("@email", body.Email); }
        if (body.ContactFirst is not null){ sets.Add("sContactFirst = @cfirst"); cmd.Parameters.AddWithValue("@cfirst",body.ContactFirst); }
        if (body.ContactLast is not null) { sets.Add("sContactLast = @clast");   cmd.Parameters.AddWithValue("@clast", body.ContactLast); }
        if (body.Comments is not null)    { sets.Add("mComments = @comments");   cmd.Parameters.AddWithValue("@comments", body.Comments); }

        if (sets.Count == 0) return NoContent();

        sets.Add("dtLastUpdate = GETDATE()");
        cmd.CommandText = $"UPDATE tblSupplier SET {string.Join(", ", sets)} WHERE lSupplierKey = @id";
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound(new { message = "Supplier not found." });

        return NoContent();
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN s.bActive = 1 THEN 1 ELSE 0 END) AS Active,
                SUM(CASE WHEN ISNULL(s.bActive, 0) = 0 THEN 1 ELSE 0 END) AS Inactive
            FROM tblSupplier s
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        var total = Convert.ToInt32(reader["Total"]);
        var active = Convert.ToInt32(reader["Active"]);
        var inactive = Convert.ToInt32(reader["Inactive"]);
        await reader.CloseAsync();

        // Role counts
        const string roleSql = """
            SELECT rr.sSupplierRole, COUNT(DISTINCT sr.lSupplierKey) AS Cnt
            FROM tblSupplierRoles sr
            JOIN tblSupplierRolesRef rr ON rr.lSupplierRoleKey = sr.lSupplierRoleKey
            GROUP BY rr.sSupplierRole
            """;
        await using var roleCmd = new SqlCommand(roleSql, conn);
        var roleCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        await using (var rr = await roleCmd.ExecuteReaderAsync())
        {
            while (await rr.ReadAsync())
                roleCounts[rr["sSupplierRole"]?.ToString() ?? ""] = Convert.ToInt32(rr["Cnt"]);
        }

        return Ok(new SupplierStats(
            Total: total,
            Active: active,
            Inactive: inactive,
            Parts: roleCounts.GetValueOrDefault("Parts", 0),
            Repair: roleCounts.GetValueOrDefault("Repair", 0),
            Acquisition: roleCounts.GetValueOrDefault("Acquisition", 0),
            Carts: roleCounts.GetValueOrDefault("Carts", 0)
        ));
    }

    [HttpGet("{id:int}/inventory")]
    public async Task<IActionResult> GetSupplierInventory(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ss.lSupplierSizesKey, ss.sSupplierPartNo,
                   ISNULL(ss.dblUnitCost, 0) AS dblUnitCost,
                   ISNULL(ss.bActive, 1) AS bActive,
                   ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
                   ISNULL(inv.sItemDescription, '') AS sItemDescription
            FROM tblSupplierSizes ss
                LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = ss.lInventorySizeKey
                LEFT JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
            WHERE ss.lSupplierKey = @id
            ORDER BY inv.sItemDescription, isz.sSizeDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<SupplierInventoryItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new SupplierInventoryItem(
                SupplierSizesKey: Convert.ToInt32(reader["lSupplierSizesKey"]),
                ItemDescription: reader["sItemDescription"]?.ToString() ?? "",
                SizeDescription: reader["sSizeDescription"]?.ToString() ?? "",
                SupplierPartNo: reader["sSupplierPartNo"]?.ToString() ?? "",
                UnitCost: Convert.ToDouble(reader["dblUnitCost"]),
                IsActive: Convert.ToBoolean(reader["bActive"])
            ));
        }

        return Ok(items);
    }

    [HttpGet("{id:int}/documents")]
    public async Task<IActionResult> GetSupplierDocuments(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT d.lDocumentKey, d.sDocumentName, d.sDocumentFileName,
                   d.dtDocumentDate,
                   ISNULL(dct.sDocumentCategoryType, '') AS sDocumentCategoryType
            FROM tblDocument d
                LEFT JOIN tblDocumentCategoryType dct
                    ON dct.lDocumentCategoryTypeKey = d.lDocumentCategoryTypeKey
            WHERE d.lOwnerKey = @id
            ORDER BY d.dtDocumentDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        var docs = new List<SupplierDocument>();
        while (await reader.ReadAsync())
        {
            var docDate = reader["dtDocumentDate"] == DBNull.Value
                ? null
                : Convert.ToDateTime(reader["dtDocumentDate"]).ToString("MM/dd/yyyy");

            docs.Add(new SupplierDocument(
                DocumentKey: Convert.ToInt32(reader["lDocumentKey"]),
                DocumentName: reader["sDocumentName"]?.ToString() ?? "",
                FileName: reader["sDocumentFileName"]?.ToString() ?? "",
                DocumentType: reader["sDocumentCategoryType"]?.ToString() ?? "",
                DocumentDate: docDate
            ));
        }

        return Ok(docs);
    }
}
