using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/repairs")]
[Authorize]
public class RepairsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetRepairs(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(r.sWorkOrderNumber LIKE @search OR c.sClientName1 LIKE @search OR d.sDepartmentName LIKE @search OR st.sScopeTypeDesc LIKE @search OR s.sSerialNumber LIKE @search)");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all")
            where.Add("rs.sRepairStatus = @statusFilter");

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
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   r.lRepairStatusID,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
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
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") countCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") dataCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var repairs = new List<RepairListItem>();
        while (await reader.ReadAsync())
        {
            var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
            repairs.Add(new RepairListItem(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                Dept: reader["sDepartmentName"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Serial: reader["sSerialNumber"]?.ToString() ?? "",
                DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
                Status: reader["sRepairStatus"]?.ToString() ?? "",
                StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
                IsUrgent: Convert.ToBoolean(reader["bHotList"])
            ));
        }

        return Ok(new RepairListResponse(repairs, totalCount));
    }

    [HttpGet("{repairKey:int}")]
    public async Task<IActionResult> GetRepair(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   r.lRepairStatusID,
                   r.lTechnicianKey,
                   r.lDepartmentKey,
                   r.sComplaintDesc, r.dtAprRecvd, r.dtExpDelDate, r.dblAmtRepair,
                   r.dtShipDate, r.sShipTrackingNumber, r.sInvoiceNumber,
                   ISNULL(CAST(r.mComments AS nvarchar(max)), '') AS mComments,
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   c.lClientKey,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t.sTechName, '') AS sTechName,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Repair not found." });

        var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
        var dateApproved = reader["dtAprRecvd"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtAprRecvd"]);
        var estDel = reader["dtExpDelDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtExpDelDate"]);
        var shipDate = reader["dtShipDate"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtShipDate"]);

        return Ok(new RepairDetail(
            RepairKey: Convert.ToInt32(reader["lRepairKey"]),
            Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
            DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
            Client: reader["sClientName1"]?.ToString() ?? "",
            ClientKey: reader["lClientKey"]?.ToString() ?? "",
            Dept: reader["sDepartmentName"]?.ToString() ?? "",
            DeptKey: reader["lDepartmentKey"] == DBNull.Value ? 0 : Convert.ToInt32(reader["lDepartmentKey"]),
            ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
            Serial: reader["sSerialNumber"]?.ToString() ?? "",
            DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
            Status: reader["sRepairStatus"]?.ToString() ?? "",
            StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
            IsUrgent: Convert.ToBoolean(reader["bHotList"]),
            Tech: reader["sTechName"]?.ToString(),
            TechKey: reader["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnicianKey"]),
            Complaint: reader["sComplaintDesc"]?.ToString(),
            DateApproved: dateApproved?.ToString("MM/dd/yyyy"),
            EstDelivery: estDel?.ToString("MM/dd/yyyy"),
            AmountApproved: reader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblAmtRepair"]),
            ShipDate: shipDate?.ToString("MM/dd/yyyy"),
            TrackingNumber: reader["sShipTrackingNumber"]?.ToString(),
            InvoiceNumber: reader["sInvoiceNumber"]?.ToString(),
            Notes: reader["mComments"]?.ToString()
        ));
    }

    [HttpPatch("{repairKey:int}/notes")]
    public async Task<IActionResult> UpdateNotes(int repairKey, [FromBody] UpdateRepairNotesRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET mComments = @notes WHERE lRepairKey = @id", conn);
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@notes", (object?)body.Notes ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? Ok() : NotFound();
    }

    // ── Full Cockpit Detail ──
    [HttpGet("{repairKey:int}/full")]
    public async Task<IActionResult> GetRepairFull(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
                   ISNULL(r.bHotList, 0) AS bHotList,
                   r.lRepairStatusID,
                   r.lTechnicianKey, r.lTechnician2Key,
                   r.lDepartmentKey,
                   r.sComplaintDesc, r.dtAprRecvd, r.dtExpDelDate, r.dblAmtRepair,
                   r.dtShipDate, r.sShipTrackingNumber, r.sShipTrackingNumberIn,
                   r.sShipTrackingNumberFedEx, r.sShipWeight, r.sDeliveryServiceLevel,
                   r.sInvoiceNumber, r.sPurchaseOrder,
                   ISNULL(CAST(r.mComments AS nvarchar(max)), '') AS mComments,
                   r.sApprName, r.sContractNumber,
                   -- Billing
                   r.sBillName1, r.sBillAddr1, r.sBillAddr2,
                   r.sBillCity, r.sBillState, r.sBillZip, r.sBillEmail,
                   -- Shipping
                   r.sShipName1, r.sShipAddr1, r.sShipAddr2,
                   r.sShipCity, r.sShipState, r.sShipZip,
                   -- Loaner
                   ISNULL(r.bLoanerRequested, 0) AS bLoanerRequested,
                   r.sWasLoanerProduced, r.sLoanerRepair,
                   -- Accessories
                   r.sIncludesBoxYN, r.sIncludesCaseYN, r.sIncludesETOCapYN,
                   r.sIncludesCO2CapYN, r.sIncludesCameraYN, r.sIncludesHoodYN,
                   r.sIncludesLightPostAdapterYN, r.sIncludesSuctionValveYN,
                   r.sIncludesWaterProofCapYN, r.sIncludesAirWaterValveYN,
                   -- Workflow flags
                   ISNULL(r.bOutsourced, 0) AS bOutsourced,
                   ISNULL(r.bFirstRepair, 0) AS bFirstRepair,
                   r.sReworkReqd, r.sDisplayCustomerComplaint,
                   -- Joined names
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   st.sScopeTypeLongDesc,
                   ISNULL(mfr.sManufacturer, '') AS sManufacturer,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   c.lClientKey,
                   ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                   ISNULL(t1.sTechName, '') AS sTechName,
                   ISNULL(t2.sTechName, '') AS sTech2Name,
                   ISNULL(insp.sTechName, '') AS sInspectorName,
                   ISNULL(sr.sRepFirst + ' ' + sr.sRepLast, '') AS sSalesRepName,
                   ISNULL(pc.sPricingDescription, '') AS sPricingCategory,
                   ISNULL(pt.sTermsDesc, '') AS sPaymentTerms,
                   ISNULL(rr.sRepairReason, '') AS sRepairReason,
                   DATEDIFF(day, r.dtDateIn, GETDATE()) AS DaysIn,
                   -- Extended 4-tab fields
                   r.sRackPosition,
                   r.dtReqSent,
                   r.dblDiscountPct,
                   r.dblShippingClientIn,
                   r.bTrackingNumberRequired,
                   r.dtDeliveryDateGuaranteed,
                   r.dtCarrierDeliveryDateGuaranteed,
                   r.dtDeliveryDate,
                   r.dblOutSourceCost,
                   r.sDisplayItemDescription,
                   r.sDisplayItemAmount,
                   r.sBillTo,
                   r.sPS3,
                   (SELECT TOP 1 DATEDIFF(day, r2.dtDateIn, r.dtDateIn)
                    FROM tblRepair r2
                    WHERE r2.lScopeKey = r.lScopeKey
                      AND r2.lRepairKey < r.lRepairKey
                      AND r2.dtDateIn IS NOT NULL
                    ORDER BY r2.lRepairKey DESC) AS DaysLastIn
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblManufacturers mfr ON mfr.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN tblTechnicians t1 ON t1.lTechnicianKey = r.lTechnicianKey
            LEFT JOIN tblTechnicians t2 ON t2.lTechnicianKey = r.lTechnician2Key
            LEFT JOIN tblTechnicians insp ON insp.lTechnicianKey = r.lInspectorKey
            LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = r.lSalesRepKey
            LEFT JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = r.lPricingCategoryKey
            LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = r.lPaymentTermsKey
            LEFT JOIN tblRepairReasons rr ON rr.lRepairReasonKey = r.lRepairReasonKey
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Repair not found." });

        string? ReadStr(string col) => reader[col] == DBNull.Value ? null : reader[col]?.ToString();
        DateTime? ReadDate(string col) => reader[col] == DBNull.Value ? null : Convert.ToDateTime(reader[col]);
        bool YnToBool(string col) => reader[col]?.ToString()?.Equals("Y", StringComparison.OrdinalIgnoreCase) == true;

        return Ok(new RepairFull(
            RepairKey: Convert.ToInt32(reader["lRepairKey"]),
            Wo: ReadStr("sWorkOrderNumber") ?? "",
            Status: ReadStr("sRepairStatus") ?? "",
            StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
            IsUrgent: Convert.ToBoolean(reader["bHotList"]),
            Client: ReadStr("sClientName1") ?? "",
            ClientKey: reader["lClientKey"] == DBNull.Value ? 0 : Convert.ToInt32(reader["lClientKey"]),
            Dept: ReadStr("sDepartmentName") ?? "",
            DeptKey: reader["lDepartmentKey"] == DBNull.Value ? 0 : Convert.ToInt32(reader["lDepartmentKey"]),
            ScopeType: ReadStr("sScopeTypeDesc") ?? "",
            Serial: ReadStr("sSerialNumber") ?? "",
            ScopeModel: ReadStr("sScopeTypeLongDesc"),
            Manufacturer: ReadStr("sManufacturer"),
            DateIn: ReadDate("dtDateIn")?.ToString("MM/dd/yyyy") ?? "",
            DateApproved: ReadDate("dtAprRecvd")?.ToString("MM/dd/yyyy"),
            EstDelivery: ReadDate("dtExpDelDate")?.ToString("MM/dd/yyyy"),
            ShipDate: ReadDate("dtShipDate")?.ToString("MM/dd/yyyy"),
            DateOut: ReadDate("dtDateOut")?.ToString("MM/dd/yyyy"),
            DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
            Tech: ReadStr("sTechName"),
            TechKey: reader["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnicianKey"]),
            Tech2: ReadStr("sTech2Name"),
            Inspector: ReadStr("sInspectorName"),
            ApprovalName: ReadStr("sApprName"),
            SalesRep: ReadStr("sSalesRepName"),
            AmountApproved: reader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblAmtRepair"]),
            InvoiceNumber: ReadStr("sInvoiceNumber"),
            PurchaseOrder: ReadStr("sPurchaseOrder"),
            Complaint: ReadStr("sComplaintDesc"),
            Notes: ReadStr("mComments"),
            CustomerRef: ReadStr("sDisplayCustomerComplaint"),
            BillName: ReadStr("sBillName1"),
            BillAddr1: ReadStr("sBillAddr1"),
            BillAddr2: ReadStr("sBillAddr2"),
            BillCity: ReadStr("sBillCity"),
            BillState: ReadStr("sBillState"),
            BillZip: ReadStr("sBillZip"),
            BillEmail: ReadStr("sBillEmail"),
            ShipName: ReadStr("sShipName1"),
            ShipAddr1: ReadStr("sShipAddr1"),
            ShipAddr2: ReadStr("sShipAddr2"),
            ShipCity: ReadStr("sShipCity"),
            ShipState: ReadStr("sShipState"),
            ShipZip: ReadStr("sShipZip"),
            TrackingNumber: ReadStr("sShipTrackingNumber"),
            TrackingNumberIn: ReadStr("sShipTrackingNumberIn"),
            TrackingNumberFedEx: ReadStr("sShipTrackingNumberFedEx"),
            ShipWeight: ReadStr("sShipWeight"),
            DeliveryServiceLevel: ReadStr("sDeliveryServiceLevel"),
            LoanerRequested: Convert.ToBoolean(reader["bLoanerRequested"]),
            LoanerProvided: ReadStr("sWasLoanerProduced")?.Equals("Y", StringComparison.OrdinalIgnoreCase),
            LoanerRepair: ReadStr("sLoanerRepair"),
            IncludesBox: YnToBool("sIncludesBoxYN"),
            IncludesCase: YnToBool("sIncludesCaseYN"),
            IncludesETOCap: YnToBool("sIncludesETOCapYN"),
            IncludesCO2Cap: YnToBool("sIncludesCO2CapYN"),
            IncludesCamera: YnToBool("sIncludesCameraYN"),
            IncludesHood: YnToBool("sIncludesHoodYN"),
            IncludesLightPostAdapter: YnToBool("sIncludesLightPostAdapterYN"),
            IncludesSuctionValve: YnToBool("sIncludesSuctionValveYN"),
            IncludesWaterProofCap: YnToBool("sIncludesWaterProofCapYN"),
            IncludesAirWaterValve: YnToBool("sIncludesAirWaterValveYN"),
            Outsourced: Convert.ToBoolean(reader["bOutsourced"]),
            FirstRepair: Convert.ToBoolean(reader["bFirstRepair"]),
            ReworkRequired: ReadStr("sReworkReqd"),
            PricingCategory: ReadStr("sPricingCategory"),
            PaymentTerms: ReadStr("sPaymentTerms"),
            ContractNumber: ReadStr("sContractNumber"),
            RepairReason: ReadStr("sRepairReason"),
            Source: null, // no source column in tblRepair
            // Extended 4-tab fields
            RackPosition: ReadStr("sRackPosition"),
            ApprovalSentDate: ReadDate("dtReqSent")?.ToString("MM/dd/yyyy"),
            DiscountPct: reader["dblDiscountPct"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblDiscountPct"]),
            ShippingClientIn: reader["dblShippingClientIn"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblShippingClientIn"]),
            TrackingNumberRequired: reader["bTrackingNumberRequired"] == DBNull.Value ? null : Convert.ToBoolean(reader["bTrackingNumberRequired"]),
            GtdDeliveryDate: ReadDate("dtDeliveryDateGuaranteed")?.ToString("MM/dd/yyyy"),
            CarrierGtdDate: reader["dtCarrierDeliveryDateGuaranteed"] == DBNull.Value ? null : Convert.ToDateTime(reader["dtCarrierDeliveryDateGuaranteed"]).ToString("MM/dd/yyyy"),
            DeliveryDate: ReadDate("dtDeliveryDate")?.ToString("MM/dd/yyyy"),
            OutsourceCost: reader["dblOutSourceCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblOutSourceCost"]),
            DisplayItemDescription: ReadStr("sDisplayItemDescription"),
            DisplayItemAmount: ReadStr("sDisplayItemAmount"),
            BillTo: ReadStr("sBillTo"),
            PsLevel: ReadStr("sPS3"),
            DaysLastIn: reader["DaysLastIn"] == DBNull.Value ? null : Convert.ToInt32(reader["DaysLastIn"])
        ));
    }

    [HttpPut("{repairKey:int}/po")]
    public async Task<IActionResult> UpdatePO(int repairKey, [FromBody] string po)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "UPDATE tblRepair SET sPurchaseOrder = @po WHERE lRepairKey = @id", conn);
        cmd.Parameters.AddWithValue("@po", (object?)po ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@id", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    // ── Line Items (Workflow tab) ──
    [HttpGet("{repairKey:int}/lineitems")]
    public async Task<IActionResult> GetLineItems(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT rit.lRepairItemTranKey, ISNULL(rit.sApproved,'') AS sApproved,
                   ISNULL(ri.sProblemID,'') AS sProblemID,
                   ISNULL(ri.sItemDescription,'') AS sItemDescription,
                   ISNULL(rit.sProblemID,'') AS sCause,
                   ISNULL(rit.sFixType,'') AS sFixType,
                   ISNULL(rit.dblRepairPrice, 0) AS dblRepairPrice,
                   ISNULL(t.sTechName,'') AS sTechName,
                   ISNULL(rit.sComments,'') AS sComments
            FROM tblRepairItemTran rit
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = rit.lTechnicianKey
            WHERE rit.lRepairKey = @repairKey
            ORDER BY rit.lRepairItemTranKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<RepairLineItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairLineItem(
                TranKey: Convert.ToInt32(reader["lRepairItemTranKey"]),
                Approved: reader["sApproved"]?.ToString() ?? "",
                ItemCode: reader["sProblemID"]?.ToString() ?? "",
                Description: reader["sItemDescription"]?.ToString() ?? "",
                Cause: reader["sCause"]?.ToString() ?? "",
                FixType: reader["sFixType"]?.ToString() ?? "",
                Amount: reader["dblRepairPrice"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["dblRepairPrice"]),
                Tech: reader["sTechName"]?.ToString() ?? "",
                Comments: reader["sComments"]?.ToString() ?? ""
            ));
        }
        return Ok(items);
    }

    // ── Scope History ──
    [HttpGet("{repairKey:int}/scopehistory")]
    public async Task<IActionResult> GetScopeHistory(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // First get the scope key for this repair
        const string scopeSql = "SELECT lScopeKey FROM tblRepair WHERE lRepairKey = @repairKey";
        await using var scopeCmd = new SqlCommand(scopeSql, conn);
        scopeCmd.Parameters.AddWithValue("@repairKey", repairKey);
        var scopeKeyObj = await scopeCmd.ExecuteScalarAsync();
        if (scopeKeyObj == null || scopeKeyObj == DBNull.Value)
            return Ok(Array.Empty<RepairScopeHistory>());

        var scopeKey = Convert.ToInt32(scopeKeyObj);

        const string sql = """
            SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn,
                   ISNULL(rs.sRepairStatus,'') AS sRepairStatus,
                   ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
                   ISNULL(c.sClientName1,'') AS sClientName1,
                   DATEDIFF(day, r.dtDateIn, ISNULL(r.dtShipDate, GETDATE())) AS DaysIn,
                   r.dblAmtRepair
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE r.lScopeKey = @scopeKey
            ORDER BY r.dtDateIn DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@scopeKey", scopeKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var history = new List<RepairScopeHistory>();
        while (await reader.ReadAsync())
        {
            var dateIn = reader["dtDateIn"] == DBNull.Value ? null : (DateTime?)Convert.ToDateTime(reader["dtDateIn"]);
            history.Add(new RepairScopeHistory(
                RepairKey: Convert.ToInt32(reader["lRepairKey"]),
                Wo: reader["sWorkOrderNumber"]?.ToString() ?? "",
                DateIn: dateIn?.ToString("MM/dd/yyyy") ?? "",
                Status: reader["sRepairStatus"]?.ToString() ?? "",
                ScopeType: reader["sScopeTypeDesc"]?.ToString() ?? "",
                Client: reader["sClientName1"]?.ToString() ?? "",
                DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
                Amount: reader["dblAmtRepair"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblAmtRepair"])
            ));
        }
        return Ok(history);
    }

    // ── Status Workflow ──

    /// <summary>GET /api/repairs/statuses — all repair status options</summary>
    [HttpGet("statuses")]
    public async Task<IActionResult> GetStatuses()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT lRepairStatusID, sRepairStatus, lRepairStatusSortOrder
            FROM tblRepairStatuses
            WHERE ISNULL(bIsReadOnly, 0) = 0
            ORDER BY lRepairStatusSortOrder, sRepairStatus
            """;

        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        var statuses = new List<RepairStatusOption>();
        while (await reader.ReadAsync())
        {
            statuses.Add(new RepairStatusOption(
                StatusId: Convert.ToInt32(reader["lRepairStatusID"]),
                StatusName: reader["sRepairStatus"]?.ToString() ?? "",
                SortOrder: reader["lRepairStatusSortOrder"] == DBNull.Value ? null : Convert.ToInt32(reader["lRepairStatusSortOrder"])
            ));
        }
        return Ok(statuses);
    }

    /// <summary>PUT /api/repairs/{id}/status — update repair status</summary>
    [HttpPut("{repairKey:int}/status")]
    public async Task<IActionResult> UpdateStatus(int repairKey, [FromBody] UpdateRepairStatusRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Update the repair record
        await using var updateCmd = new SqlCommand(
            "UPDATE tblRepair SET lRepairStatusID = @statusId WHERE lRepairKey = @id", conn);
        updateCmd.Parameters.AddWithValue("@id", repairKey);
        updateCmd.Parameters.AddWithValue("@statusId", body.StatusId);
        var rows = await updateCmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();

        // Insert status log entry
        await using var logCmd = new SqlCommand("""
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, dtStatusChange)
            SELECT @repairKey, @statusId, rs.sRepairStatus, GETDATE()
            FROM tblRepairStatuses rs WHERE rs.lRepairStatusID = @statusId
            """, conn);
        logCmd.Parameters.AddWithValue("@repairKey", repairKey);
        logCmd.Parameters.AddWithValue("@statusId", body.StatusId);
        await logCmd.ExecuteNonQueryAsync();

        return Ok();
    }

    /// <summary>GET /api/repairs/{id}/status-history — status change log</summary>
    [HttpGet("{repairKey:int}/status-history")]
    public async Task<IActionResult> GetStatusHistory(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT sl.lRepairStatusLogID, ISNULL(sl.sRepairStatus, '') AS sRepairStatus,
                   sl.dtStatusChange
            FROM tblRepairStatusLog sl
            WHERE sl.lRepairKey = @repairKey
            ORDER BY sl.dtStatusChange DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var history = new List<RepairStatusLogEntry>();
        while (await reader.ReadAsync())
        {
            history.Add(new RepairStatusLogEntry(
                LogId: Convert.ToInt32(reader["lRepairStatusLogID"]),
                StatusName: reader["sRepairStatus"]?.ToString() ?? "",
                ChangedAt: reader["dtStatusChange"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["dtStatusChange"]),
                ChangedBy: null
            ));
        }
        return Ok(history);
    }

    // ── Inspections ──
    [HttpGet("{repairKey:int}/inspections")]
    public async Task<IActionResult> GetInspections(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT sInsScopeIsRepairableYN, sInsScopeIsUsableYN,
                   sAngInUp, sAngInDown, sAngInLeft, sAngInRight,
                   sAngOutUp, sAngOutDown, sAngOutLeft, sAngOutRight,
                   sBrokenFibersIn, sBrokenFibersOut, sInsFiberAngle, sInsFiberLightTrans,
                   sInsImagePF, sInsLeakPF, sInsFiberLightTransPF, sInsAngulationPF,
                   sInsFocalDistancePF, sInsImageCentrationPF, sInsFogPF,
                   sInsHotColdLeakPF, sInsSuctionPF, sInsForcepChannelPF,
                   sInsAirWaterPF, sInsAuxWaterPF,
                   sInsVisionPF, sInsInsertionTubePF, sInsUniversalCordPF,
                   sInsLightGuideConnectorPF, sInsDistalTipPF, sInsEyePiecePF,
                   sInsLightFibersPF, sInsAlcoholWipePF, sInsFinalPF
            FROM tblRepair WHERE lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound();

        string? R(string col) => reader[col] == DBNull.Value ? null : reader[col]?.ToString();

        return Ok(new RepairInspections(
            ScopeRepairable: R("sInsScopeIsRepairableYN"),
            ScopeUsable: R("sInsScopeIsUsableYN"),
            AngInUp: R("sAngInUp"), AngInDown: R("sAngInDown"),
            AngInLeft: R("sAngInLeft"), AngInRight: R("sAngInRight"),
            AngOutUp: R("sAngOutUp"), AngOutDown: R("sAngOutDown"),
            AngOutLeft: R("sAngOutLeft"), AngOutRight: R("sAngOutRight"),
            BrokenFibersIn: R("sBrokenFibersIn"), BrokenFibersOut: R("sBrokenFibersOut"),
            FiberAngle: R("sInsFiberAngle"), FiberLightTrans: R("sInsFiberLightTrans"),
            InsImagePF: R("sInsImagePF"), InsLeakPF: R("sInsLeakPF"),
            InsFiberLightTransPF: R("sInsFiberLightTransPF"), InsAngulationPF: R("sInsAngulationPF"),
            InsFocalDistancePF: R("sInsFocalDistancePF"), InsImageCentrationPF: R("sInsImageCentrationPF"),
            InsFogPF: R("sInsFogPF"), InsHotColdLeakPF: R("sInsHotColdLeakPF"),
            InsSuctionPF: R("sInsSuctionPF"), InsForcepChannelPF: R("sInsForcepChannelPF"),
            InsAirWaterPF: R("sInsAirWaterPF"), InsAuxWaterPF: R("sInsAuxWaterPF"),
            InsVisionPF: R("sInsVisionPF"), InsInsertionTubePF: R("sInsInsertionTubePF"),
            InsUniversalCordPF: R("sInsUniversalCordPF"),
            InsLightGuideConnectorPF: R("sInsLightGuideConnectorPF"),
            InsDistalTipPF: R("sInsDistalTipPF"), InsEyePiecePF: R("sInsEyePiecePF"),
            InsLightFibersPF: R("sInsLightFibersPF"), InsAlcoholWipePF: R("sInsAlcoholWipePF"),
            InsFinalPF: R("sInsFinalPF")
        ));
    }

    [HttpPut("{repairKey:int}/inspections")]
    public async Task<IActionResult> UpdateInspections(int repairKey, [FromBody] RepairInspections body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepair SET
                sInsScopeIsRepairableYN = @scopeRepairable, sInsScopeIsUsableYN = @scopeUsable,
                sAngInUp = @angInUp, sAngInDown = @angInDown, sAngInLeft = @angInLeft, sAngInRight = @angInRight,
                sAngOutUp = @angOutUp, sAngOutDown = @angOutDown, sAngOutLeft = @angOutLeft, sAngOutRight = @angOutRight,
                sBrokenFibersIn = @brokenFibersIn, sBrokenFibersOut = @brokenFibersOut,
                sInsFiberAngle = @fiberAngle, sInsFiberLightTrans = @fiberLightTrans,
                sInsImagePF = @insImagePF, sInsLeakPF = @insLeakPF,
                sInsFiberLightTransPF = @insFiberLightTransPF, sInsAngulationPF = @insAngulationPF,
                sInsFocalDistancePF = @insFocalDistancePF, sInsImageCentrationPF = @insImageCentrationPF,
                sInsFogPF = @insFogPF, sInsHotColdLeakPF = @insHotColdLeakPF,
                sInsSuctionPF = @insSuctionPF, sInsForcepChannelPF = @insForcepChannelPF,
                sInsAirWaterPF = @insAirWaterPF, sInsAuxWaterPF = @insAuxWaterPF,
                sInsVisionPF = @insVisionPF, sInsInsertionTubePF = @insInsertionTubePF,
                sInsUniversalCordPF = @insUniversalCordPF,
                sInsLightGuideConnectorPF = @insLightGuideConnectorPF,
                sInsDistalTipPF = @insDistalTipPF, sInsEyePiecePF = @insEyePiecePF,
                sInsLightFibersPF = @insLightFibersPF, sInsAlcoholWipePF = @insAlcoholWipePF,
                sInsFinalPF = @insFinalPF
            WHERE lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@scopeRepairable", (object?)body.ScopeRepairable ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@scopeUsable", (object?)body.ScopeUsable ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angInUp", (object?)body.AngInUp ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angInDown", (object?)body.AngInDown ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angInLeft", (object?)body.AngInLeft ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angInRight", (object?)body.AngInRight ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angOutUp", (object?)body.AngOutUp ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angOutDown", (object?)body.AngOutDown ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angOutLeft", (object?)body.AngOutLeft ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@angOutRight", (object?)body.AngOutRight ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@brokenFibersIn", (object?)body.BrokenFibersIn ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@brokenFibersOut", (object?)body.BrokenFibersOut ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fiberAngle", (object?)body.FiberAngle ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fiberLightTrans", (object?)body.FiberLightTrans ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insImagePF", (object?)body.InsImagePF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insLeakPF", (object?)body.InsLeakPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insFiberLightTransPF", (object?)body.InsFiberLightTransPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insAngulationPF", (object?)body.InsAngulationPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insFocalDistancePF", (object?)body.InsFocalDistancePF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insImageCentrationPF", (object?)body.InsImageCentrationPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insFogPF", (object?)body.InsFogPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insHotColdLeakPF", (object?)body.InsHotColdLeakPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insSuctionPF", (object?)body.InsSuctionPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insForcepChannelPF", (object?)body.InsForcepChannelPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insAirWaterPF", (object?)body.InsAirWaterPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insAuxWaterPF", (object?)body.InsAuxWaterPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insVisionPF", (object?)body.InsVisionPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insInsertionTubePF", (object?)body.InsInsertionTubePF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insUniversalCordPF", (object?)body.InsUniversalCordPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insLightGuideConnectorPF", (object?)body.InsLightGuideConnectorPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insDistalTipPF", (object?)body.InsDistalTipPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insEyePiecePF", (object?)body.InsEyePiecePF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insLightFibersPF", (object?)body.InsLightFibersPF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insAlcoholWipePF", (object?)body.InsAlcoholWipePF ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@insFinalPF", (object?)body.InsFinalPF ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    // ── Line Item CRUD ──
    [HttpPost("{repairKey:int}/lineitems")]
    public async Task<IActionResult> AddLineItem(int repairKey, [FromBody] LineItemUpdate body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblRepairItemTran (lRepairKey, sApproved, sProblemID, sFixType, dblRepairPrice, sComments)
            OUTPUT INSERTED.lRepairItemTranKey
            VALUES (@repairKey, @approved, @itemCode, @fixType, @amount, @comments)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@approved", (object?)body.Approved ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@itemCode", (object?)body.ItemCode ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fixType", (object?)body.FixType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@amount", (object?)body.Amount ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
        var newKey = await cmd.ExecuteScalarAsync();
        return Ok(new { tranKey = Convert.ToInt32(newKey) });
    }

    [HttpPut("{repairKey:int}/lineitems/{tranKey:int}")]
    public async Task<IActionResult> UpdateLineItem(int repairKey, int tranKey, [FromBody] LineItemUpdate body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepairItemTran SET
                sApproved = @approved, sProblemID = @itemCode,
                sFixType = @fixType, dblRepairPrice = @amount, sComments = @comments
            WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@tranKey", tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@approved", (object?)body.Approved ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@itemCode", (object?)body.ItemCode ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fixType", (object?)body.FixType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@amount", (object?)body.Amount ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    [HttpDelete("{repairKey:int}/lineitems/{tranKey:int}")]
    public async Task<IActionResult> DeleteLineItem(int repairKey, int tranKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand(
            "DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey", conn);
        cmd.Parameters.AddWithValue("@tranKey", tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    // ── Financials ──
    [HttpGet("{repairKey:int}/financials")]
    public async Task<IActionResult> GetFinancials(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ISNULL(r.dblAmtRepair, 0) AS SaleAmount,
                   ISNULL(r.dblAmtTax, 0) AS Tax,
                   ISNULL(r.dblAmtRepair, 0) + ISNULL(r.dblAmtTax, 0) AS InvoiceTotal,
                   ISNULL(r.dblAmtOutsource, 0) AS Outsource,
                   ISNULL(r.dblAmtShipping, 0) AS Shipping,
                   ISNULL(r.dblAmtLabor, 0) AS Labor,
                   ISNULL(r.dblAmtInventory, 0) AS [Inventory],
                   ISNULL(r.dblAmtGPO, 0) AS Gpo,
                   ISNULL(r.dblAmtCommission, 0) AS Commission
            FROM tblRepair r
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound();

        var sale = Convert.ToDecimal(reader["SaleAmount"]);
        var tax = Convert.ToDecimal(reader["Tax"]);
        var invoiceTotal = Convert.ToDecimal(reader["InvoiceTotal"]);
        var outsource = Convert.ToDecimal(reader["Outsource"]);
        var shipping = Convert.ToDecimal(reader["Shipping"]);
        var labor = Convert.ToDecimal(reader["Labor"]);
        var inventory = Convert.ToDecimal(reader["Inventory"]);
        var gpo = Convert.ToDecimal(reader["Gpo"]);
        var commission = Convert.ToDecimal(reader["Commission"]);
        var totalExp = outsource + shipping + labor + inventory + gpo + commission;
        var marginPct = invoiceTotal > 0 ? (invoiceTotal - totalExp) / invoiceTotal * 100 : 0;

        return Ok(new RepairFinancials(
            SaleAmount: sale,
            Tax: tax,
            InvoiceTotal: invoiceTotal,
            Outsource: outsource,
            Shipping: shipping,
            Labor: labor,
            Inventory: inventory,
            Gpo: gpo,
            Commission: commission,
            TotalExpenses: totalExp,
            MarginPct: Math.Round(marginPct, 1),
            ContractMargin: 0
        ));
    }
}
