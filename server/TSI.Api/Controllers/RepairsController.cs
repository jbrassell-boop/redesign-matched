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
                   ISNULL(stc2.sScopeTypeCategory, '') AS sScopeTypeCategory,
                   ISNULL(mfr.sManufacturer, '') AS sManufacturer,
                   CASE WHEN r.lContractKey IS NOT NULL AND r.lContractKey > 0 THEN 'Contracted' ELSE 'Non-Contract' END AS sCapFfs,
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
                   c.dblDiscountPct,
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
            LEFT JOIN tblScopeTypeCategories stc2 ON stc2.lScopeTypeCategoryKey = st.lScopeTypeCatKey
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
            ScopeType: ReadStr("sScopeTypeCategory") ?? ReadStr("sScopeTypeDesc") ?? "",
            Serial: ReadStr("sSerialNumber") ?? "",
            ScopeModel: ReadStr("sScopeTypeDesc"),
            CapFfs: ReadStr("sCapFfs"),
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
            CarrierGtdDate: ReadDate("dtCarrierDeliveryDateGuaranteed")?.ToString("MM/dd/yyyy"),
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

    [HttpPatch("{repairKey:int}/header")]
    public async Task<IActionResult> PatchRepairHeader(int repairKey, [FromBody] PatchRepairHeaderRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            UPDATE tblRepair SET
                sPurchaseOrder            = COALESCE(@po, sPurchaseOrder),
                sRackPosition             = COALESCE(@rack, sRackPosition),
                sComplaintDesc            = COALESCE(@complaint, sComplaintDesc),
                lRepairReasonKey          = COALESCE(
                    (SELECT TOP 1 lRepairReasonKey FROM tblRepairReasons WHERE sRepairReason = @reason),
                    lRepairReasonKey),
                sShipTrackingNumberIn     = COALESCE(@inboundTracking, sShipTrackingNumberIn),
                sDisplayCustomerComplaint = COALESCE(@displayCustomerComplaint, sDisplayCustomerComplaint),
                sDisplayItemDescription   = COALESCE(@displayItemDesc, sDisplayItemDescription),
                sDisplayItemAmount        = COALESCE(@displayItemAmt, sDisplayItemAmount),
                sBillTo                   = COALESCE(@billTo, sBillTo)
            WHERE lRepairKey = @id
            """, conn);
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@rack", (object?)body.RackLocation ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@complaint", (object?)body.Complaint ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@reason", (object?)body.RepairReason ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@inboundTracking", (object?)body.InboundTracking ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayCustomerComplaint", (object?)body.DisplayCustomerComplaint ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayItemDesc", (object?)body.DisplayItemizedDesc ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayItemAmt", (object?)body.DisplayItemizedAmounts ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billTo", (object?)body.BillToCustomer ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return NoContent();
    }

    // ── Line Items (Workflow tab) ──
    [HttpGet("{repairKey:int}/lineitems")]
    public async Task<IActionResult> GetLineItems(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT rit.lRepairItemTranKey,
                   ISNULL(rit.sApproved,'') AS sApproved,
                   ISNULL(ri.sProblemID,'') AS sProblemID,
                   ISNULL(ri.sItemDescription,'') AS sItemDescription,
                   ISNULL(rit.sProblemID,'') AS sCause,
                   ISNULL(rit.sFixType,'') AS sFixType,
                   ISNULL(rit.dblRepairPrice, 0) AS dblRepairPrice,
                   ISNULL(rit.dblRepairPriceBase, 0) AS dblRepairPriceBase,
                   ISNULL(t.sTechName,'') AS sTechName,
                   ISNULL(rit.sComments,'') AS sComments,
                   (SELECT COUNT(*) FROM tblAmendRepairComments a
                    WHERE a.lRepairKey = rit.lRepairKey) AS AmendmentCount
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
                BaseAmount: reader["dblRepairPriceBase"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["dblRepairPriceBase"]),
                Tech: reader["sTechName"]?.ToString() ?? "",
                Comments: reader["sComments"]?.ToString() ?? "",
                AmendmentCount: Convert.ToInt32(reader["AmendmentCount"])
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

    /// <summary>GET /api/repairs/technicians — list of active technicians</summary>
    [HttpGet("technicians")]
    public async Task<IActionResult> GetTechnicians()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        const string sql = """
            SELECT lTechnicianKey, sTechName
            FROM tblTechnicians
            WHERE ISNULL(bIsActive, 1) = 1
            ORDER BY sTechName
            """;
        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        var techs = new List<TechnicianOption>();
        while (await reader.ReadAsync())
        {
            techs.Add(new TechnicianOption(
                TechKey: Convert.ToInt32(reader["lTechnicianKey"]),
                TechName: reader["sTechName"]?.ToString() ?? ""
            ));
        }
        return Ok(techs);
    }

    /// <summary>PATCH /api/repairs/{id}/quick-edit — status + tech + notes</summary>
    [HttpPatch("{repairKey:int}/quick-edit")]
    public async Task<IActionResult> QuickEdit(int repairKey, [FromBody] QuickEditRepairRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var cmd = new SqlCommand("""
            UPDATE tblRepair SET
                lRepairStatusID   = COALESCE(@statusId, lRepairStatusID),
                lTechnicianKey    = CASE WHEN @techKey IS NULL THEN lTechnicianKey ELSE @techKey END,
                mComments         = COALESCE(@notes, mComments)
            WHERE lRepairKey = @id
            """, conn);
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@statusId", (object?)body.StatusId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@techKey", (object?)body.TechnicianKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", (object?)body.Notes ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();

        // Log status change if status was provided
        if (body.StatusId.HasValue)
        {
            await using var logCmd = new SqlCommand("""
                INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, dtStatusDate)
                SELECT @repairKey, @statusId, rs.sRepairStatus, GETDATE()
                FROM tblRepairStatuses rs WHERE rs.lRepairStatusID = @statusId
                """, conn);
            logCmd.Parameters.AddWithValue("@repairKey", repairKey);
            logCmd.Parameters.AddWithValue("@statusId", body.StatusId.Value);
            await logCmd.ExecuteNonQueryAsync();
        }

        return rows > 0 ? NoContent() : NotFound();
    }

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
                   sl.ChangeDate
            FROM tblRepairStatusLog sl
            WHERE sl.lRepairKey = @repairKey
            ORDER BY sl.ChangeDate DESC
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
                ChangedAt: reader["ChangeDate"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["ChangeDate"]),
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

    // ── Repair Item Catalog ──
    [HttpGet("items")]
    public async Task<IActionResult> GetRepairItemCatalog([FromQuery] int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ri.lRepairItemKey,
                   ISNULL(ri.sProblemID, '') AS sProblemID,
                   ISNULL(ri.sItemDescription, '') AS sItemDescription,
                   ISNULL(pd.dblRepairPrice, 0) AS dblDefaultPrice
            FROM tblRepairItem ri
            OUTER APPLY (
                SELECT c.lPricingCategoryKey
                FROM tblRepair r
                JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
                JOIN tblClient c ON c.lClientKey = d.lClientKey
                WHERE r.lRepairKey = @repairKey
            ) pricing
            LEFT JOIN tblPricingDetail pd ON pd.lRepairItemKey = ri.lRepairItemKey
                AND pd.lPricingCategoryKey = pricing.lPricingCategoryKey
            WHERE ISNULL(ri.bActive, 1) = 1
            ORDER BY ri.sItemDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<RepairCatalogItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairCatalogItem(
                ItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
                ItemCode: reader["sProblemID"].ToString()!,
                Description: reader["sItemDescription"].ToString()!,
                DefaultPrice: Convert.ToDecimal(reader["dblDefaultPrice"])
            ));
        }
        return Ok(items);
    }

    // ── Line Item CRUD ──
    [HttpPost("{repairKey:int}/lineitems")]
    public async Task<IActionResult> AddLineItem(int repairKey, [FromBody] LineItemUpdate body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Determine item key: prefer body.ItemKey, fall back to parsing body.ItemCode
        int? itemKey = body.ItemKey ?? (body.ItemCode != null && int.TryParse(body.ItemCode, out var ik) ? ik : null);

        // Warranty: charge $0, capture base price for reporting
        var chargedAmount = body.FixType?.ToUpper() == "W" ? 0m : (body.Amount ?? 0m);
        var baseAmount = body.BaseAmount ?? body.Amount ?? 0m;

        const string sql = """
            INSERT INTO tblRepairItemTran
                (lRepairKey, lRepairItemKey, sProblemID, sApproved, sFixType,
                 dblRepairPrice, dblRepairPriceBase, sComments, lTechnicianKey)
            OUTPUT INSERTED.lRepairItemTranKey
            VALUES
                (@repairKey, @itemKey, @cause, @approved, @fixType,
                 @amount, @baseAmount, @comments, @techKey)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@itemKey", (object?)itemKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@cause", (object?)body.Cause ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@approved", (object?)body.Approved ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fixType", (object?)body.FixType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@amount", chargedAmount);
        cmd.Parameters.AddWithValue("@baseAmount", baseAmount);
        cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@techKey", body.TechKey.HasValue ? (object)body.TechKey.Value : DBNull.Value);

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
                lRepairItemKey = @repairItemKey,
                sProblemID     = @cause,
                sApproved      = @approved,
                sFixType       = @fixType,
                dblRepairPrice = @amount,
                sComments      = @comments,
                lTechnicianKey = @techKey
            WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@tranKey", tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@repairItemKey", body.ItemCode != null && int.TryParse(body.ItemCode, out var ik) ? (object)ik : DBNull.Value);
        cmd.Parameters.AddWithValue("@cause", (object?)body.Cause ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@approved", (object?)body.Approved ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@fixType", (object?)body.FixType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@amount", (object?)body.Amount ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@techKey", body.TechKey.HasValue ? (object)body.TechKey.Value : DBNull.Value);
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

    [HttpPatch("{repairKey:int}/lineitems/{tranKey:int}/causecomments")]
    public async Task<IActionResult> PatchLineItemCauseComments(
        int repairKey, int tranKey, [FromBody] PatchCauseCommentsRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepairItemTran SET
                sProblemID = @cause,
                sComments  = @comments
            WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@cause", (object?)body.Cause ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tranKey", tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var patchRows = await cmd.ExecuteNonQueryAsync();
        return patchRows > 0 ? NoContent() : NotFound();
    }

    // ── Amendment Lookups ──
    [HttpGet("/api/amend-types")]
    public async Task<IActionResult> GetAmendTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = "SELECT lAmendRepairTypeKey, sAmendRepairType FROM tblAmendRepairTypes ORDER BY sAmendRepairType";
        await using var cmd = new SqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<AmendTypeItem>();
        while (await reader.ReadAsync())
            items.Add(new AmendTypeItem(
                TypeKey: Convert.ToInt32(reader["lAmendRepairTypeKey"]),
                TypeName: reader["sAmendRepairType"].ToString()!));
        return Ok(items);
    }

    [HttpGet("/api/amend-reasons")]
    public async Task<IActionResult> GetAmendReasons([FromQuery] int typeKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT lAmendRepairReasonKey, sAmendRepairReason
            FROM tblAmendRepairReasons
            WHERE lAmendRepairTypeKey = @typeKey
            ORDER BY sAmendRepairReason
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@typeKey", typeKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<AmendReasonItem>();
        while (await reader.ReadAsync())
            items.Add(new AmendReasonItem(
                ReasonKey: Convert.ToInt32(reader["lAmendRepairReasonKey"]),
                ReasonName: reader["sAmendRepairReason"].ToString()!));
        return Ok(items);
    }

    // ── Amendments ──
    [HttpGet("{repairKey:int}/amendments")]
    public async Task<IActionResult> GetAmendments(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT a.lAmendRepairCommentKey,
                   a.lAmendmentNumber,
                   CONVERT(varchar, a.dtAmendmentDate, 101) AS dtAmendmentDate,
                   at2.sAmendRepairType,
                   ar.sAmendRepairReason,
                   ISNULL(a.sAmendRepairComment, '') AS sAmendRepairComment
            FROM tblAmendRepairComments a
            JOIN tblAmendRepairTypes at2 ON at2.lAmendRepairTypeKey = a.lAmendRepairTypeKey
            JOIN tblAmendRepairReasons ar ON ar.lAmendRepairReasonKey = a.lAmendRepairReasonKey
            WHERE a.lRepairKey = @repairKey
            ORDER BY a.lAmendmentNumber DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<AmendmentItem>();
        while (await reader.ReadAsync())
            items.Add(new AmendmentItem(
                AmendKey: Convert.ToInt32(reader["lAmendRepairCommentKey"]),
                AmendmentNumber: Convert.ToInt32(reader["lAmendmentNumber"]),
                Date: reader["dtAmendmentDate"].ToString()!,
                AmendType: reader["sAmendRepairType"].ToString()!,
                AmendReason: reader["sAmendRepairReason"].ToString()!,
                Comment: reader["sAmendRepairComment"].ToString()!
            ));
        return Ok(items);
    }

    [HttpPost("{repairKey:int}/amendments")]
    public async Task<IActionResult> CreateAmendment(int repairKey, [FromBody] CreateAmendmentRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var tx = conn.BeginTransaction();
        try
        {
            // 1. Update the line item if new values provided
            if (body.NewFixType != null || body.NewAmount.HasValue)
            {
                var updateSql = new System.Text.StringBuilder(
                    "UPDATE tblRepairItemTran SET ");
                var parts = new List<string>();
                if (body.NewFixType != null) parts.Add("sFixType = @fixType");
                if (body.NewAmount.HasValue)
                {
                    parts.Add("dblRepairPrice = @amount");
                    parts.Add("dblRepairPriceBase = @baseAmount");
                }
                updateSql.Append(string.Join(", ", parts));
                updateSql.Append(" WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey");

                await using var updCmd = new SqlCommand(updateSql.ToString(), conn, tx);
                updCmd.Parameters.AddWithValue("@repairKey", repairKey);
                updCmd.Parameters.AddWithValue("@tranKey", body.TranKey);
                if (body.NewFixType != null) updCmd.Parameters.AddWithValue("@fixType", body.NewFixType);
                if (body.NewAmount.HasValue)
                {
                    var charged = body.NewFixType?.ToUpper() == "W" ? 0m : body.NewAmount.Value;
                    updCmd.Parameters.AddWithValue("@amount", charged);
                    updCmd.Parameters.AddWithValue("@baseAmount", body.NewAmount.Value);
                }
                await updCmd.ExecuteNonQueryAsync();
            }

            // 2. Get next amendment number
            await using var numCmd = new SqlCommand(
                "SELECT ISNULL(MAX(lAmendmentNumber), 0) + 1 FROM tblAmendRepairComments WHERE lRepairKey = @repairKey",
                conn, tx);
            numCmd.Parameters.AddWithValue("@repairKey", repairKey);
            var nextNum = Convert.ToInt32(await numCmd.ExecuteScalarAsync());

            // 3. Insert amendment record
            const string insertSql = """
                INSERT INTO tblAmendRepairComments
                    (lRepairKey, lAmendRepairTypeKey, lAmendRepairReasonKey,
                     sAmendRepairComment, lAmendmentNumber, dtAmendmentDate)
                VALUES
                    (@repairKey, @typeKey, @reasonKey,
                     @comment, @amendNum, GETDATE())
                """;

            await using var insCmd = new SqlCommand(insertSql, conn, tx);
            insCmd.Parameters.AddWithValue("@repairKey", repairKey);
            insCmd.Parameters.AddWithValue("@typeKey", body.AmendTypeKey);
            insCmd.Parameters.AddWithValue("@reasonKey", body.AmendReasonKey);
            insCmd.Parameters.AddWithValue("@comment", (object?)body.Comment ?? DBNull.Value);
            insCmd.Parameters.AddWithValue("@amendNum", nextNum);
            await insCmd.ExecuteNonQueryAsync();

            await tx.CommitAsync();
            return Ok(new { amendmentNumber = nextNum });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Bulk Line Item Approval ──
    [HttpPatch("{repairKey:int}/lineitems/bulk-approve")]
    public async Task<IActionResult> BulkApproveLineItems(int repairKey, [FromBody] BulkApproveRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = "UPDATE tblRepairItemTran SET sApproved = @approved WHERE lRepairKey = @repairKey";
        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@approved", body.Approved ?? "Y");
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return Ok(new { updated = rows });
    }

    // ── Update Techs ──
    [HttpPatch("{repairKey:int}/techs")]
    public async Task<IActionResult> UpdateTechs(int repairKey, [FromBody] UpdateTechsRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepair SET
                lTechnicianKey  = @techKey,
                lTechnician2Key = @tech2Key
            WHERE lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@techKey", body.TechKey);
        cmd.Parameters.AddWithValue("@tech2Key", body.Tech2Key.HasValue ? (object)body.Tech2Key.Value : DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    // ── Update Slips ──
    [HttpGet("{repairKey:int}/update-slips")]
    public async Task<IActionResult> GetUpdateSlips(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT us.lRepairUpdateSlipKey, us.dtUpdateRequestDate,
                   ISNULL(t1.sTechName,'') AS PrimaryTech,
                   ISNULL(t2.sTechName,'') AS SecondaryTech,
                   ISNULL(mr.sMainRepairUpdateSlipReason,'') AS Reason
            FROM tblRepairUpdateSlips us
            LEFT JOIN tblTechnicians t1 ON t1.lTechnicianKey = us.lResponsibleTech
            LEFT JOIN tblTechnicians t2 ON t2.lTechnicianKey = us.lResponsibleTech2
            LEFT JOIN tblMainRepairUpdateSlipReasons mr ON mr.lMainRepairUpdateSlipReasonKey = us.lMainRepairUpdateSlipReasonKey
            WHERE us.lRepairKey = @repairKey
            ORDER BY us.dtUpdateRequestDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new {
                slipKey = Convert.ToInt32(reader["lRepairUpdateSlipKey"]),
                date = Convert.ToDateTime(reader["dtUpdateRequestDate"]).ToString("MM/dd/yyyy"),
                primaryTech = reader["PrimaryTech"]?.ToString() ?? "",
                secondaryTech = reader["SecondaryTech"]?.ToString() ?? "",
                reason = reader["Reason"]?.ToString() ?? "",
            });
        }
        return Ok(items);
    }

    // ── Defect Tracking ──
    [HttpGet("{repairKey:int}/defect-tracking")]
    public async Task<IActionResult> GetDefectTracking(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT dt.lDefectTrackingItemKey,
                   ISNULL(di.sDefectTrackingItem,'') AS ItemName,
                   ISNULL(dt.sComment,'') AS Comment
            FROM tblRepairDefectTracking dt
            LEFT JOIN tblDefectTrackingItems di ON di.lDefectTrackingItemKey = dt.lDefectTrackingItemKey
            WHERE dt.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new {
                itemKey = Convert.ToInt32(reader["lDefectTrackingItemKey"]),
                item = reader["ItemName"]?.ToString() ?? "",
                comment = reader["Comment"]?.ToString() ?? "",
            });
        }
        return Ok(items);
    }

    // ── Repair Inventory Usage ──
    [HttpGet("{repairKey:int}/inventory-usage")]
    public async Task<IActionResult> GetRepairInventoryUsage(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ri.lRepairInventoryKey,
                   ISNULL(inv.sItemDescription,'') AS InventoryItem,
                   ISNULL(isz.sSizeDescription,'') AS SizeDesc,
                   ISNULL(ritem.sItemDescription,'') AS RepairItem
            FROM tblRepairInventory ri
            LEFT JOIN tblScopeTypeRepairItemInventoryItems strii ON strii.lScopeTypeRepairItemInventoryKey = ri.lScopeTypeRepairItemInventoryKey
            LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = strii.lInventorySizeKey
            LEFT JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
            LEFT JOIN tblRepairItemTran rit ON rit.lRepairItemTranKey = ri.lRepairItemTranKey
            LEFT JOIN tblRepairItem ritem ON ritem.lRepairItemKey = rit.lRepairItemKey
            WHERE rit.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new {
                key = Convert.ToInt32(reader["lRepairInventoryKey"]),
                inventoryItem = reader["InventoryItem"]?.ToString() ?? "",
                size = reader["SizeDesc"]?.ToString() ?? "",
                repairItem = reader["RepairItem"]?.ToString() ?? "",
            });
        }
        return Ok(items);
    }

    // ── Draft Invoice ──
    [HttpPost("{repairKey:int}/draft-invoice")]
    public async Task<IActionResult> CreateDraftInvoice(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Get repair details for the invoice
        const string sql = """
            INSERT INTO tblInvoice (lRepairKey, lClientKey, lDepartmentKey, lScopeKey,
                dtTranDate, dblTranAmount, sInvoiceStatus, bIsManual, bIsVoid, bFinalized)
            OUTPUT INSERTED.lInvoiceKey
            SELECT r.lRepairKey, d.lClientKey, r.lDepartmentKey, r.lScopeKey,
                GETDATE(), ISNULL(r.dblAmtRepair, 0), 'Draft', 0, 0, 0
            FROM tblRepair r
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var result = await cmd.ExecuteScalarAsync();
        if (result == null) return NotFound();
        return Ok(new { invoiceKey = Convert.ToInt32(result) });
    }

    // ── Repair Notes ──
    [HttpGet("{repairKey:int}/repair-notes")]
    public async Task<IActionResult> GetRepairNotes(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT n.lNoteKey, n.sNote, n.dtNoteDate,
                   ISNULL(u.sUserFullName, '') AS sUserFullName
            FROM tblNotes n
            LEFT JOIN tblUsers u ON u.lUserKey = n.lUserKey
            WHERE n.lOwnerKey = @repairKey
              AND n.lOwnerTypeKey = (SELECT TOP 1 lOwnerTypeKey FROM tblOwnerTypes WHERE sOwnerType = 'Repair')
            ORDER BY n.dtNoteDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var notes = new List<object>();
        while (await reader.ReadAsync())
        {
            notes.Add(new {
                noteKey = Convert.ToInt32(reader["lNoteKey"]),
                note = reader["sNote"]?.ToString() ?? "",
                date = Convert.ToDateTime(reader["dtNoteDate"]).ToString("MM/dd/yyyy h:mm tt"),
                user = reader["sUserFullName"]?.ToString() ?? "",
            });
        }
        return Ok(notes);
    }

    [HttpPost("{repairKey:int}/repair-notes")]
    public async Task<IActionResult> AddRepairNote(int repairKey, [FromBody] AddNoteRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblNotes (lOwnerKey, lOwnerTypeKey, sNote, dtNoteDate, lUserKey)
            VALUES (@repairKey,
                    (SELECT TOP 1 lOwnerTypeKey FROM tblOwnerTypes WHERE sOwnerType = 'Repair'),
                    @note, GETDATE(), 1)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@note", body.Note ?? "");
        await cmd.ExecuteNonQueryAsync();
        return Ok(new { success = true });
    }

    // ── Financials ──
    [HttpGet("{repairKey:int}/financials")]
    public async Task<IActionResult> GetFinancials(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ISNULL(r.dblAmtRepair, 0) AS SaleAmount,
                   ISNULL(r.nSalesTax, 0) AS Tax,
                   ISNULL(r.dblAmtRepair, 0) + ISNULL(r.nSalesTax, 0) AS InvoiceTotal,
                   ISNULL(r.dblOutSourceCost, 0) AS Outsource,
                   ISNULL(r.dblAmtShipping, 0) AS Shipping,
                   ISNULL(r.dblAmtCostLabor, 0) AS Labor,
                   ISNULL(r.nInventoryCost, 0) AS [Inventory],
                   0 AS Gpo,
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

    // ── Scope Lookup by Serial Number ──
    [HttpGet("scope-lookup")]
    public async Task<IActionResult> ScopeLookup([FromQuery] string? sn)
    {
        if (string.IsNullOrWhiteSpace(sn)) return BadRequest("sn is required");

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT TOP 1
                s.lScopeKey,
                s.sSerialNumber,
                s.lScopeTypeKey,
                ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                st.lManufacturerKey,
                ISNULL(m.sManufacturer, '') AS sManufacturer,
                s.lDepartmentKey,
                ISNULL(d.sDepartmentName, '') AS sDepartmentName,
                d.lClientKey,
                ISNULL(c.sClientName1, '') AS sClientName1
            FROM tblScope s
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE s.sSerialNumber = @sn
            ORDER BY s.lScopeKey DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@sn", sn.Trim());
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync()) return Ok(null);

        return Ok(new {
            scopeKey       = Convert.ToInt32(reader["lScopeKey"]),
            serialNumber   = reader["sSerialNumber"]?.ToString() ?? "",
            scopeTypeKey   = reader["lScopeTypeKey"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["lScopeTypeKey"]),
            scopeTypeDesc  = reader["sScopeTypeDesc"].ToString()!,
            manufacturerKey= reader["lManufacturerKey"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["lManufacturerKey"]),
            manufacturer   = reader["sManufacturer"].ToString()!,
            deptKey        = reader["lDepartmentKey"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["lDepartmentKey"]),
            deptName       = reader["sDepartmentName"].ToString()!,
            clientKey      = reader["lClientKey"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["lClientKey"]),
            clientName     = reader["sClientName1"].ToString()!
        });
    }

    // ── Create Repair ──
    [HttpPost]
    public async Task<IActionResult> CreateRepair([FromBody] CreateRepairRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        int scopeKey = body.ScopeKey ?? 0;

        // If no existing scope, create one
        if (scopeKey == 0 && body.DeptKey > 0)
        {
            const string scopeSql = """
                INSERT INTO tblScope (lScopeTypeKey, lDepartmentKey, sSerialNumber, dtCreateDate)
                OUTPUT INSERTED.lScopeKey
                VALUES (@scopeTypeKey, @deptKey, @sn, GETDATE())
                """;
            await using var scopeCmd = new SqlCommand(scopeSql, conn);
            scopeCmd.Parameters.AddWithValue("@scopeTypeKey", (object?)body.ScopeTypeKey ?? DBNull.Value);
            scopeCmd.Parameters.AddWithValue("@deptKey", body.DeptKey);
            scopeCmd.Parameters.AddWithValue("@sn", (object?)body.SerialNumber ?? DBNull.Value);
            scopeKey = Convert.ToInt32(await scopeCmd.ExecuteScalarAsync());
        }

        const string sql = """
            INSERT INTO tblRepair
                (lScopeKey, lDepartmentKey, lRepairStatusID, dtDateIn, dtCreateDate,
                 sPurchaseOrder, sComplaintDesc, lRepairReasonKey, lDeliveryMethodKey,
                 sShipTrackingNumberIn, sPickupWasRequired, lSalesRepKey,
                 lPricingCategoryKey, lPaymentTermsKey, sBillTo, lDistributorKey,
                 sBillEmail, lBillType, sDisplayCustomerComplaint,
                 sDisplayItemDescription, sDisplayItemAmount, sRackPosition)
            OUTPUT INSERTED.lRepairKey
            VALUES
                (@scopeKey, @deptKey, @statusId, @dateIn, GETDATE(),
                 @po, @complaint, @reasonKey, @carrierKey,
                 @inboundTracking, @pickupRequired, @salesRepKey,
                 @pricingCatKey, @paymentTermsKey, @billTo, @distributorKey,
                 @billEmail, @billType, @displayComplaint,
                 @displayItemDesc, @displayItemAmt, @rack)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@scopeKey",        scopeKey > 0 ? (object)scopeKey : DBNull.Value);
        cmd.Parameters.AddWithValue("@deptKey",         body.DeptKey > 0 ? (object)body.DeptKey : DBNull.Value);
        cmd.Parameters.AddWithValue("@statusId",        body.StatusId.HasValue ? (object)body.StatusId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@dateIn",          body.DateIn);
        cmd.Parameters.AddWithValue("@po",              (object?)body.PurchaseOrder ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@complaint",       (object?)body.Complaint ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@reasonKey",       (object?)body.ReasonKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@carrierKey",      (object?)body.CarrierKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@inboundTracking", (object?)body.InboundTracking ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@pickupRequired",  (object?)body.PickupRequired ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@salesRepKey",     (object?)body.SalesRepKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@pricingCatKey",   (object?)body.PricingCategoryKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@paymentTermsKey", (object?)body.PaymentTermsKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billTo",          (object?)body.BillTo ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@distributorKey",  (object?)body.DistributorKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billEmail",       (object?)body.BillEmail ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billType",        (object?)body.BillType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayComplaint",(object?)body.DisplayCustomerComplaint ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayItemDesc", (object?)body.DisplayItemDesc ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayItemAmt",  (object?)body.DisplayItemAmt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@rack",            (object?)body.RackPosition ?? DBNull.Value);

        var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());

        // Set work order number = the new repair key (matches legacy format)
        await using var woCmd = new SqlCommand(
            "UPDATE tblRepair SET sWorkOrderNumber = CAST(@k AS NVARCHAR) WHERE lRepairKey = @k", conn);
        woCmd.Parameters.AddWithValue("@k", newKey);
        await woCmd.ExecuteNonQueryAsync();

        return Ok(new { repairKey = newKey });
    }
}
