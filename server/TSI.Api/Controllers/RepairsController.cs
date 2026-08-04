using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/repairs")]
[Authorize]
public class RepairsController(IConfiguration config, IInvoiceNumberService invoiceNumbers) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    /// <summary>
    /// Shared read-only guard for the repair MUTATION endpoints, adapted from the
    /// cloud repo's <c>CheckRepairEditableAsync</c>. A repair whose invoice is
    /// FINALIZED is read-only: the invoice snapshot is settled and further
    /// line/approval/tech edits would silently drive the billed figures out of
    /// sync with the record that was already issued.
    ///
    /// Unlike cloud, being CLOSED does not lock — see <see cref="RepairLock"/>
    /// for why (legacy's closed checkbox blocks nothing, and 99.5% of repairs
    /// carry the flag).
    ///
    /// Returns a 404 when the repair is missing, a 409 when it is locked, or
    /// null when the caller may proceed.
    ///
    /// The caller's transaction is REQUIRED and the ordering is deliberate: the
    /// guard read takes UPDLOCK, HOLDLOCK on the repair row and holds it to the
    /// end of that transaction, so the finalized/closed check and the mutation
    /// that follows commit as ONE unit. Without it a concurrent finalize could
    /// slip between the check and the write.
    /// </summary>
    private async Task<IActionResult?> CheckRepairEditableAsync(SqlConnection conn, int repairKey, SqlTransaction tx)
    {
        await using var cmd = new SqlCommand("""
            SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM tblInvoice i
                                          WHERE i.lRepairKey = r.lRepairKey
                                            AND i.bFinalized = 1)
                        THEN 1 ELSE 0 END AS bit) AS Finalized
            FROM tblRepair r WITH (UPDLOCK, HOLDLOCK)
            WHERE r.lRepairKey = @repairKey
            """, conn, tx);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return NotFound(new { message = $"Repair {repairKey} not found." });
        if (RepairLock.IsReadOnly(Convert.ToBoolean(reader["Finalized"])))
            return Conflict(new { message = "This repair's invoice is finalized and cannot be edited." });
        return null;
    }

    /// <summary>Does this repair exist at all? Used to tell a 404 from a 409.</summary>
    private static async Task<bool> RepairExistsAsync(SqlConnection conn, int repairKey)
    {
        await using var cmd = new SqlCommand(
            "SELECT 1 FROM tblRepair WHERE lRepairKey = @repairKey", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        return await cmd.ExecuteScalarAsync() != null;
    }

    [HttpGet]
    public async Task<IActionResult> GetRepairs(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? statusFilter = null)
    {
        // Mandatory location scope — throws if X-Service-Location header missing.
        // Replaces the optional ?svcKey query param + WO-prefix LIKE workaround.
        // See CLAUDE.md rule #5.
        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        // Scope repairs only (Flex/Rigid/Camera) — instruments go to /instruments
        where.Add("ISNULL(st.sRigidOrFlexible, '') IN ('R','F','C')");
        where.Add("r.lServiceLocationKey = @locationKey");
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
        countCmd.CommandTimeout = 30;
        countCmd.Parameters.AddWithValue("@locationKey", locationKey);
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(statusFilter) && statusFilter != "all") countCmd.Parameters.AddWithValue("@statusFilter", statusFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        dataCmd.Parameters.AddWithValue("@locationKey", locationKey);
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
                   ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory,
                   ISNULL(c.sClientName1, '') AS sClientName1,
                   c.lClientKey,
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
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
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
            ScopeType: reader["sScopeTypeCategory"]?.ToString() is { Length: > 0 } cat ? cat : reader["sScopeTypeDesc"]?.ToString() ?? "",
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
        cmd.CommandTimeout = 30;
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
                   -- Closed flag: DISPLAY ONLY (legacy's checkbox locks nothing).
                   -- The edit lock is the finalized invoice below, read from the
                   -- SAME tblInvoice row the invoice card reports on, so the
                   -- banner the user sees and the server-side gate agree.
                   ISNULL(r.sRepairClosed, 'N') AS sRepairClosed,
                   r.sReworkReqd, r.sDisplayCustomerComplaint,
                   -- Joined names
                   ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
                   ISNULL(s.sSerialNumber, '') AS sSerialNumber,
                   ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
                   ISNULL(stc2.sScopeTypeCategory, '') AS sScopeTypeCategory,
                   ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
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
                   -- Command-strip metrics (legacy WSRepairOpen parity):
                   -- Lead Time runs from date-in with no approval dependency;
                   -- TAT starts only when the customer approval is received.
                   dbo.fn_DateDiffWeekDays(r.dtDateIn, ISNULL(r.dtDateOut, GETDATE())) AS LeadTimeDays,
                   CASE WHEN r.dtAprRecvd IS NOT NULL
                        THEN dbo.fn_DateDiffWeekDays(r.dtAprRecvd, ISNULL(r.dtDateOut, GETDATE())) END AS TatDays,
                   lvl.sRepairLevel,
                   lvl.lDeliveryFromDateInDays AS LevelDeliveryDays,
                   CASE WHEN r.dtDateIn IS NOT NULL AND lvl.lDeliveryFromDateInDays IS NOT NULL
                        THEN dbo.fnDateAddBusinessDays(CONVERT(date, r.dtDateIn), lvl.lDeliveryFromDateInDays) END AS LevelDueDate,
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
                   r.lSalesRepKey,
                   r.lPricingCategoryKey,
                   r.lPaymentTermsKey,
                   r.lDistributorKey,
                   NULL AS sRequisition,
                   (SELECT TOP 1 DATEDIFF(day, r2.dtDateIn, r.dtDateIn)
                    FROM tblRepair r2
                    WHERE r2.lScopeKey = r.lScopeKey
                      AND r2.lRepairKey < r.lRepairKey
                      AND r2.dtDateIn IS NOT NULL
                    ORDER BY r2.lRepairKey DESC) AS DaysLastIn,
                   ISNULL(dist.sDistName1, '') AS sDistributor,
                   ISNULL(pkg.sPackageType, '') AS sPackageType,
                   -- Invoice for this repair (1:1 — one tblInvoice row per repair).
                   -- sTranNumber is populated at creation, not deferred to finalization.
                   inv.lInvoiceKey AS latestInvoiceKey,
                   CASE WHEN ISNULL(inv.bFinalized, 0) = 1 THEN 'Finalized' ELSE 'Draft' END AS latestInvoiceStatus,
                   inv.sTranNumber AS latestInvoiceNumber,
                   -- EXISTS over ALL of this repair's invoice rows, matching
                   -- CheckRepairEditableAsync's predicate character for
                   -- character. Reading ISNULL(inv.bFinalized,0) off the joined
                   -- row instead would disagree with the server gate on the 38
                   -- repairs that carry more than one invoice row (4 of them
                   -- mixing finalized with draft) — the banner would say
                   -- editable while every write 409'd.
                   CAST(CASE WHEN EXISTS (SELECT 1 FROM tblInvoice i2
                                          WHERE i2.lRepairKey = r.lRepairKey
                                            AND i2.bFinalized = 1)
                        THEN 1 ELSE 0 END AS bit) AS bInvoiceFinalized
            FROM tblRepair r
            LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblInvoice inv ON inv.lRepairKey = r.lRepairKey
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
            LEFT JOIN tblDistributor dist ON dist.lDistributorKey = r.lDistributorKey
            LEFT JOIN tblPackageTypes pkg ON pkg.lPackageTypeKey = r.lPackageTypeKey
            -- Repair level = highest item level on the WO (legacy dbo.repairGetLevel,
            -- where tblRepairItem.sMajorRepair doubled as the level key).
            LEFT JOIN tblRepairLevels lvl ON lvl.lRepairLevelKey = (
                SELECT MAX(ri2.lRepairLevelKey)
                FROM tblRepairItemTran rit2
                JOIN tblRepairItem ri2 ON ri2.lRepairItemKey = rit2.lRepairItemKey
                WHERE rit2.lRepairKey = r.lRepairKey)
            WHERE r.lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
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
            RigidOrFlexible: ReadStr("sRigidOrFlexible"),
            DateIn: ReadDate("dtDateIn")?.ToString("MM/dd/yyyy") ?? "",
            DateApproved: ReadDate("dtAprRecvd")?.ToString("MM/dd/yyyy"),
            EstDelivery: ReadDate("dtExpDelDate")?.ToString("MM/dd/yyyy"),
            ShipDate: ReadDate("dtShipDate")?.ToString("MM/dd/yyyy"),
            DateOut: ReadDate("dtDateOut")?.ToString("MM/dd/yyyy"),
            DaysIn: reader["DaysIn"] == DBNull.Value ? 0 : Convert.ToInt32(reader["DaysIn"]),
            Tech: ReadStr("sTechName"),
            TechKey: reader["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnicianKey"]),
            Tech2: ReadStr("sTech2Name"),
            Tech2Key: reader["lTechnician2Key"] == DBNull.Value ? null : Convert.ToInt32(reader["lTechnician2Key"]),
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
            DaysLastIn: reader["DaysLastIn"] == DBNull.Value ? null : Convert.ToInt32(reader["DaysLastIn"]),
            SalesRepKey: reader["lSalesRepKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lSalesRepKey"]),
            PricingCategoryKey: reader["lPricingCategoryKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lPricingCategoryKey"]),
            PaymentTermsKey: reader["lPaymentTermsKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lPaymentTermsKey"]),
            DistributorKey: reader["lDistributorKey"] == DBNull.Value ? null : Convert.ToInt32(reader["lDistributorKey"]),
            Requisition: ReadStr("sRequisition"),
            Distributor: ReadStr("sDistributor"),
            PackageType: ReadStr("sPackageType"),
            LatestInvoiceKey: reader["latestInvoiceKey"] == DBNull.Value ? null : Convert.ToInt32(reader["latestInvoiceKey"]),
            LatestInvoiceStatus: ReadStr("latestInvoiceStatus"),
            LatestInvoiceNumber: ReadStr("latestInvoiceNumber"),
            RepairLevel: ReadStr("sRepairLevel"),
            LevelDeliveryDays: reader["LevelDeliveryDays"] == DBNull.Value ? null : Convert.ToInt32(reader["LevelDeliveryDays"]),
            LevelDueDate: ReadDate("LevelDueDate")?.ToString("MM/dd/yyyy"),
            LeadTimeDays: reader["LeadTimeDays"] == DBNull.Value ? null : Convert.ToInt32(reader["LeadTimeDays"]),
            TatDays: reader["TatDays"] == DBNull.Value ? null : Convert.ToInt32(reader["TatDays"]),
            // RepairClosed is display-only — it does NOT feed IsReadOnly.
            RepairClosed: string.Equals(ReadStr("sRepairClosed")?.Trim(), "Y", StringComparison.OrdinalIgnoreCase),
            IsReadOnly: RepairLock.IsReadOnly(
                reader["bInvoiceFinalized"] != DBNull.Value && Convert.ToBoolean(reader["bInvoiceFinalized"]))
        ));
    }

    [HttpPut("{repairKey:int}/po")]
    public async Task<IActionResult> UpdatePO(int repairKey, [FromBody] string po)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // The PO is part of the settled invoice snapshot, so a finalized/closed
        // repair is read-only here. Guard + write share one transaction so the
        // guard's UPDLOCK is still held when the UPDATE lands.
        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            {
                await tx.RollbackAsync();
                return locked;
            }

            await using var cmd = new SqlCommand(
                "UPDATE tblRepair SET sPurchaseOrder = @po WHERE lRepairKey = @id", conn, tx);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@po", (object?)po ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@id", repairKey);
            var rows = await cmd.ExecuteNonQueryAsync();
            if (rows == 0)
            {
                await tx.RollbackAsync();
                return NotFound();
            }
            await tx.CommitAsync();
            return NoContent();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // Mirrors legacy dbo.rackPositionValidate: a rack slot may be held by at
    // most one OPEN repair at a time. Returns the conflicting WO number, or
    // null when the position is free. (Legacy also checked the other-region
    // server for S-prefix WOs; this build runs against a single database.)
    //
    // Scoped to the active service location so this pre-check agrees with what
    // the PATCH invariant actually enforces (which only blocks a same-location
    // holder). Without this filter the pre-check false-flags a slot that is
    // free at this location just because a DIFFERENT location holds the same
    // rack string — a rack is a physical shelf, unique per warehouse.
    [HttpGet("{repairKey:int}/rack-check")]
    public async Task<IActionResult> CheckRackPosition(int repairKey, [FromQuery] string? position)
    {
        var pos = position?.Trim();
        if (string.IsNullOrEmpty(pos) || pos.Equals("N/A", StringComparison.OrdinalIgnoreCase))
            return Ok(new { inUseBy = (string?)null });

        var locationKey = this.GetActiveServiceLocation();

        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            SELECT TOP 1 r.sWorkOrderNumber
            FROM tblRepair r
            WHERE r.lRepairKey <> @id
              AND ISNULL(r.sRepairClosed, 'N') <> 'Y'
              AND ISNULL(r.sRackPosition, '') = @pos
              AND r.sRackPosition <> 'N/A'
              AND ISNULL(r.lServiceLocationKey, 0) = @loc
            ORDER BY r.lRepairKey DESC
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@pos", pos);
        cmd.Parameters.AddWithValue("@loc", locationKey);
        var wo = await cmd.ExecuteScalarAsync();
        return Ok(new { inUseBy = wo == null || wo == DBNull.Value ? null : wo.ToString() });
    }

    [HttpPatch("{repairKey:int}/header")]
    public async Task<IActionResult> PatchRepairHeader(int repairKey, [FromBody] PatchRepairHeaderRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Guard + the whole header edit run in ONE transaction: the guard takes
        // the repair row's UPDLOCK and holds it to commit, so a concurrent
        // invoice finalize serializes on the repair row instead of finalizing
        // between the editable check and the write. `await using` means every
        // early return below rolls back — only the success path commits.
        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            return locked;

        await using var cmd = new SqlCommand("""
            UPDATE tblRepair SET
                bHotList                  = COALESCE(@isUrgent, bHotList),
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
                sBillTo                   = COALESCE(@billTo, sBillTo),
                lSalesRepKey              = COALESCE(@salesRepKey, lSalesRepKey),
                lPricingCategoryKey       = COALESCE(@pricingCategoryKey, lPricingCategoryKey),
                lPaymentTermsKey          = COALESCE(@paymentTermsKey, lPaymentTermsKey),
                sPS3                      = COALESCE(@psLevel, sPS3),
                lDistributorKey           = COALESCE(@distributorKey, lDistributorKey),
                dblShippingClientIn       = COALESCE(@shippingCostIn, dblShippingClientIn),
                sShipName1                = COALESCE(@shipName, sShipName1),
                sShipAddr1                = COALESCE(@shipAddr1, sShipAddr1),
                sShipAddr2                = COALESCE(@shipAddr2, sShipAddr2),
                sShipCity                 = COALESCE(@shipCity, sShipCity),
                sShipState                = COALESCE(@shipState, sShipState),
                sShipZip                  = COALESCE(@shipZip, sShipZip),
                sBillName1                = COALESCE(@billName, sBillName1),
                sBillAddr1                = COALESCE(@billAddr1, sBillAddr1),
                sBillAddr2                = COALESCE(@billAddr2, sBillAddr2),
                sBillCity                 = COALESCE(@billCity, sBillCity),
                sBillState                = COALESCE(@billState, sBillState),
                sBillZip                  = COALESCE(@billZip, sBillZip)
            WHERE lRepairKey = @id
              -- Server-side rack invariant (legacy rackPositionValidate): refuse
              -- to take a rack slot another OPEN repair at the same service
              -- location already holds. UPDLOCK+HOLDLOCK serializes concurrent
              -- rack writes so both can't pass the NOT EXISTS simultaneously.
              AND (@rack IS NULL OR @rack = N'N/A' OR NOT EXISTS (
                    SELECT 1 FROM tblRepair r2 WITH (UPDLOCK, HOLDLOCK)
                    WHERE r2.lRepairKey <> tblRepair.lRepairKey
                      AND ISNULL(r2.sRepairClosed, 'N') <> 'Y'
                      AND ISNULL(r2.sRackPosition, '') = @rack
                      AND r2.sRackPosition <> 'N/A'
                      AND ISNULL(r2.lServiceLocationKey, 0) = ISNULL(tblRepair.lServiceLocationKey, 0)))
            """, conn, tx);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@isUrgent", body.IsUrgent.HasValue ? (object)body.IsUrgent.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@rack", (object?)body.RackLocation ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@complaint", (object?)body.Complaint ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@reason", (object?)body.RepairReason ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@inboundTracking", (object?)body.InboundTracking ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayCustomerComplaint",
            body.DisplayCustomerComplaint == null ? DBNull.Value
            : (object)(body.DisplayCustomerComplaint.Equals("true", StringComparison.OrdinalIgnoreCase) ? "Y"
                     : body.DisplayCustomerComplaint.Equals("false", StringComparison.OrdinalIgnoreCase) ? "N"
                     : body.DisplayCustomerComplaint));
        cmd.Parameters.AddWithValue("@displayItemDesc", (object?)body.DisplayItemizedDesc ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@displayItemAmt", (object?)body.DisplayItemizedAmounts ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billTo", (object?)body.BillToCustomer ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@salesRepKey", (object?)body.SalesRepKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@pricingCategoryKey", (object?)body.PricingCategoryKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@paymentTermsKey", (object?)body.PaymentTermsKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@psLevel", (object?)body.PsLevel ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@distributorKey", (object?)body.DistributorKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shippingCostIn", (object?)body.ShippingCostIn ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shipName", (object?)body.ShipName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shipAddr1", (object?)body.ShipAddr1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shipAddr2", (object?)body.ShipAddr2 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shipCity", (object?)body.ShipCity ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shipState", (object?)body.ShipState ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@shipZip", (object?)body.ShipZip ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billName", (object?)body.BillName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billAddr1", (object?)body.BillAddr1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billAddr2", (object?)body.BillAddr2 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billCity", (object?)body.BillCity ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billState", (object?)body.BillState ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@billZip", (object?)body.BillZip ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0)
        {
            // The only guard predicate is the rack invariant — name the WO
            // holding the slot so the caller can act on it.
            var rackPos = body.RackLocation?.Trim();
            if (!string.IsNullOrEmpty(rackPos) && !rackPos.Equals("N/A", StringComparison.OrdinalIgnoreCase))
            {
                await using var rackCmd = new SqlCommand("""
                    SELECT TOP 1 r2.sWorkOrderNumber
                    FROM tblRepair r2
                    WHERE r2.lRepairKey <> @id
                      AND ISNULL(r2.sRepairClosed, 'N') <> 'Y'
                      AND ISNULL(r2.sRackPosition, '') = @pos
                      AND r2.sRackPosition <> 'N/A'
                      AND EXISTS (SELECT 1 FROM tblRepair r
                                  WHERE r.lRepairKey = @id
                                    AND ISNULL(r.lServiceLocationKey, 0) = ISNULL(r2.lServiceLocationKey, 0))
                    ORDER BY r2.lRepairKey DESC
                    """, conn, tx);
                rackCmd.CommandTimeout = 30;
                rackCmd.Parameters.AddWithValue("@id", repairKey);
                rackCmd.Parameters.AddWithValue("@pos", body.RackLocation!);
                var holder = await rackCmd.ExecuteScalarAsync();
                if (holder != null && holder != DBNull.Value)
                    return Conflict(new { message = $"Rack position is in use by W.O. #{holder}." });
            }
            return NotFound();
        }

        // dblDiscountPct lives on tblClient (legacy and converted schema both —
        // there is no repair-level discount column). The cockpit reads it via
        // the department→client join, so the edit lands there: client-wide.
        //
        // WARNING — this write is CLIENT-WIDE by design: it changes the discount
        // for EVERY department and repair under this client's account, not just
        // this WO. That is correct: the read path (the c.dblDiscountPct the
        // cockpit displays) comes from tblClient too, so write and read stay
        // symmetric. Do NOT "fix" this to a per-repair UPDATE on tblRepair —
        // tblRepair has no discount column and the value would silently vanish.
        if (body.DiscountPct.HasValue)
        {
            await using var discCmd = new SqlCommand("""
                UPDATE c SET c.dblDiscountPct = @discountPct
                FROM tblClient c
                JOIN tblDepartment d ON d.lClientKey = c.lClientKey
                JOIN tblRepair r ON r.lDepartmentKey = d.lDepartmentKey
                WHERE r.lRepairKey = @id
                """, conn, tx);
            discCmd.CommandTimeout = 30;
            discCmd.Parameters.AddWithValue("@id", repairKey);
            discCmd.Parameters.AddWithValue("@discountPct", body.DiscountPct.Value);
            await discCmd.ExecuteNonQueryAsync();
        }
        await tx.CommitAsync();
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
                   -- AmendmentCount is per-repair (not per-line-item) by design:
                   -- tblAmendRepairComments has no lRepairItemTranKey column.
                   (SELECT COUNT(*) FROM tblAmendRepairComments a
                    WHERE a.lRepairKey = rit.lRepairKey) AS AmendmentCount
            FROM tblRepairItemTran rit
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            LEFT JOIN tblTechnicians t ON t.lTechnicianKey = rit.lTechnicianKey
            WHERE rit.lRepairKey = @repairKey
            ORDER BY rit.lRepairItemTranKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
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
        scopeCmd.CommandTimeout = 30;
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
        cmd.CommandTimeout = 30;
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

    /// <summary>
    /// GET /api/repairs/technicians — technician picker options.
    ///
    /// With ?repairKey= the list is QUALIFICATION-FILTERED for that repair, the
    /// way legacy's dbo.techsGet / dbo.techsGetNew filters it for
    /// frmRepairOpen_UpdateTech (docs/smoke-test-findings-2026-05-19.md Bug 3 —
    /// the unfiltered list mixed internal techs, outsource vendors and junk
    /// rows like 000/AED/AES together):
    ///   * outsourced repair  -> outsource vendors only (tblJobTypes 6)
    ///   * in-house repair    -> techs holding a tblTechnicianInstrumentTypes
    ///     row for the scope's sRigidOrFlexible; for FLEXIBLE scopes the row's
    ///     bFlexLargeDiameter must also match the scope type category's
    ///     bLargeDiameter flag
    ///   * a blank scope-type R/F disables the qualification filter, exactly as
    ///     legacy's IsNull(@psRigidOrFlexible,'')='' bypasses the join
    ///   * the repair's currently-assigned header techs are ALWAYS unioned back
    ///     in, qualified or not, so an existing assignment never renders as an
    ///     unknown key (legacy re-inserts them the same way)
    /// Without repairKey the behaviour is unchanged (all active technicians);
    /// jobTypeKey narrows that path to a single legacy job type.
    ///
    /// The logic is inlined rather than calling dbo.techsGetNew because the
    /// paired write-side proc (dbo.repairUpdateTech) does not exist on this
    /// database at all — see UpdateTechs — and this controller otherwise calls
    /// no stored procedures.
    /// </summary>
    [HttpGet("technicians")]
    public async Task<IActionResult> GetTechnicians(
        [FromQuery] int? repairKey = null,
        [FromQuery] int? jobTypeKey = null)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        string sql;
        if (repairKey is > 0)
        {
            sql = """
                DECLARE @rf nvarchar(1) = NULL, @largeDia bit = 0, @outsourced bit = 0,
                        @tech1 int = 0, @tech2 int = 0, @found bit = 0;
                -- bOutsourced OR an assigned vendor: legacy passes the form an
                -- explicit outsourced flag, cloud derives it from lVendorKey.
                -- This repo carries both columns, so honour either.
                SELECT @found      = 1,
                       @rf         = st.sRigidOrFlexible,
                       @largeDia   = CASE WHEN ISNULL(sc.bLargeDiameter, 0) = 1 THEN 1 ELSE 0 END,
                       @outsourced = CASE WHEN ISNULL(r.bOutsourced, 0) = 1
                                            OR ISNULL(r.lVendorKey, 0) > 0 THEN 1 ELSE 0 END,
                       @tech1      = ISNULL(r.lTechnicianKey, 0),
                       @tech2      = ISNULL(r.lTechnician2Key, 0)
                FROM tblRepair r
                JOIN tblScope s ON s.lScopeKey = r.lScopeKey
                JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                LEFT JOIN tblScopeTypeCategories sc ON sc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
                WHERE r.lRepairKey = @repairKey;

                IF @found = 0
                    SELECT CAST(NULL AS int) AS lTechnicianKey, CAST(NULL AS nvarchar(100)) AS sTechName WHERE 1 = 0;
                ELSE
                    SELECT t.lTechnicianKey, ISNULL(t.sTechName, '') AS sTechName
                    FROM tblTechnicians t
                    WHERE ISNULL(t.bIsActive, 1) = 1
                      AND (
                            (@outsourced = 1 AND t.lJobTypeKey = 6)
                         OR (@outsourced = 0 AND (
                                ISNULL(@rf, '') = ''
                             OR EXISTS (SELECT 1 FROM tblTechnicianInstrumentTypes it
                                        WHERE it.lTechnicianKey = t.lTechnicianKey
                                          AND it.sRigidOrFlexible = @rf
                                          -- Strict, as legacy compares
                                          -- (bFlexLargeDiameter = @bLargeDiameter):
                                          -- a NULL diameter row qualifies for
                                          -- NEITHER flexible class.
                                          AND (@rf <> 'F' OR it.bFlexLargeDiameter = @largeDia))))
                      )
                    UNION
                    -- Currently-assigned header techs, qualified or not.
                    SELECT t.lTechnicianKey, ISNULL(t.sTechName, '') AS sTechName
                    FROM tblTechnicians t
                    WHERE t.lTechnicianKey IN (@tech1, @tech2) AND t.lTechnicianKey > 0
                    ORDER BY sTechName;
                """;
        }
        else
        {
            sql = """
                SELECT lTechnicianKey, ISNULL(sTechName, '') AS sTechName
                FROM tblTechnicians
                WHERE ISNULL(bIsActive, 1) = 1
                  AND (@jobTypeKey IS NULL OR lJobTypeKey = @jobTypeKey)
                ORDER BY sTechName
                """;
        }

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        if (repairKey is > 0) cmd.Parameters.AddWithValue("@repairKey", repairKey.Value);
        else cmd.Parameters.AddWithValue("@jobTypeKey", (object?)jobTypeKey ?? DBNull.Value);
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
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", repairKey);
        cmd.Parameters.AddWithValue("@statusId", (object?)body.StatusId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@techKey", (object?)body.TechnicianKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", (object?)body.Notes ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();

        // Log status change if status was provided. Audit columns populated from
        // the JWT user_key claim so the Status Log shows who made the change.
        if (body.StatusId.HasValue)
        {
            await using var logCmd = new SqlCommand("""
                INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate, Created_datetime, Created_UserKey)
                SELECT @repairKey, @statusId, rs.sRepairStatus, GETDATE(), GETDATE(), @userKey
                FROM tblRepairStatuses rs WHERE rs.lRepairStatusID = @statusId
                """, conn);
            logCmd.CommandTimeout = 30;
            logCmd.Parameters.AddWithValue("@repairKey", repairKey);
            logCmd.Parameters.AddWithValue("@statusId", body.StatusId.Value);
            logCmd.Parameters.AddWithValue("@userKey", this.GetCurrentUserKey());
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
        cmd.CommandTimeout = 30;
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

        var userKey = this.GetCurrentUserKey();

        // Update the repair record
        await using var updateCmd = new SqlCommand(
            "UPDATE tblRepair SET lRepairStatusID = @statusId WHERE lRepairKey = @id", conn);
        updateCmd.CommandTimeout = 30;
        updateCmd.Parameters.AddWithValue("@id", repairKey);
        updateCmd.Parameters.AddWithValue("@statusId", body.StatusId);
        var rows = await updateCmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();

        // Insert status log entry. Audit columns populated from the JWT user_key
        // claim so the Status Log shows who made the change (was always "System").
        await using var logCmd = new SqlCommand("""
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate, Created_datetime, Created_UserKey)
            SELECT @repairKey, @statusId, rs.sRepairStatus, GETDATE(), GETDATE(), @userKey
            FROM tblRepairStatuses rs WHERE rs.lRepairStatusID = @statusId
            """, conn);
        logCmd.CommandTimeout = 30;
        logCmd.Parameters.AddWithValue("@repairKey", repairKey);
        logCmd.Parameters.AddWithValue("@statusId", body.StatusId);
        logCmd.Parameters.AddWithValue("@userKey", userKey);
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
                   sl.ChangeDate,
                   ISNULL(u.sUserFullName, '') AS sChangedBy
            FROM tblRepairStatusLog sl
            LEFT JOIN tblUsers u ON u.lUserKey = sl.Created_UserKey
            WHERE sl.lRepairKey = @repairKey
            ORDER BY sl.ChangeDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var history = new List<RepairStatusLogEntry>();
        while (await reader.ReadAsync())
        {
            history.Add(new RepairStatusLogEntry(
                LogId: Convert.ToInt32(reader["lRepairStatusLogID"]),
                StatusName: reader["sRepairStatus"]?.ToString() ?? "",
                ChangedAt: reader["ChangeDate"] == DBNull.Value ? DateTime.MinValue : Convert.ToDateTime(reader["ChangeDate"]),
                ChangedBy: reader["sChangedBy"]?.ToString() is { Length: > 0 } name ? name : null
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
                   sInsLightFibersPF, sInsAlcoholWipePF, sInsFinalPF,
                   mCommentsDisIns
            FROM tblRepair WHERE lRepairKey = @repairKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
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
            InsFinalPF: R("sInsFinalPF"),
            DiInsComments: R("mCommentsDisIns")
        ));
    }

    [HttpPut("{repairKey:int}/inspections")]
    public async Task<IActionResult> UpdateInspections(int repairKey, [FromBody] RepairInspections body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // tblRepair has a trigger that calls dbo.clientAdditionalInfoUpdate (not migrated to Azure).
        // Disable triggers around the UPDATE to prevent a 500 on inspection saves.
        //
        // SAFETY NOTE: DISABLE/ENABLE TRIGGER must run inside a transaction.
        // If the UPDATE fails between DISABLE and ENABLE in autocommit mode,
        // the ENABLE never runs and triggers stay disabled GLOBALLY — affecting
        // every subsequent insert/update across all connections. The txn wrap
        // ensures a rollback reverts the DISABLE state along with the failed
        // UPDATE. Same defensive pattern as Orders/Loaners/Repairs invoice-create.
        const string sql = """
            DISABLE TRIGGER ALL ON tblRepair;
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
                sInsFinalPF = @insFinalPF,
                mCommentsDisIns = @diInsComments
            WHERE lRepairKey = @repairKey;
            ENABLE TRIGGER ALL ON tblRepair;
            """;

        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
        await using var cmd = new SqlCommand(sql, conn, txn);
        cmd.CommandTimeout = 30;
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
        cmd.Parameters.AddWithValue("@diInsComments", (object?)body.DiInsComments ?? DBNull.Value);
        var rows = await cmd.ExecuteNonQueryAsync();
        await txn.CommitAsync();
        return rows > 0 ? NoContent() : NotFound();
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
    }

    // ── Repair Item Catalog ──
    [HttpGet("items")]
    public async Task<IActionResult> GetRepairItemCatalog([FromQuery] int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT ri.lRepairItemKey,
                   ISNULL(ri.sProblemID, '')          AS sProblemID,
                   ISNULL(ri.sItemDescription, '')     AS sItemDescription,
                   ISNULL(ri.sRigidOrFlexible, '')     AS sRigidOrFlexible,
                   ISNULL(ri.sPartOrLabor, '')         AS sPartOrLabor,
                   ISNULL(pd.dblRepairPrice, 0)        AS dblDefaultPrice,
                   ISNULL(td1.lMinutes, ri.tMinutesTech1) AS lMinutesTech1,
                   ISNULL(td2.lMinutes, ri.tMinutesTech2) AS lMinutesTech2,
                   ISNULL(td3.lMinutes, ri.tMinutesTech3) AS lMinutesTech3
            FROM tblRepairItem ri
            -- Resolve this repair's scope type and client pricing category
            CROSS APPLY (
                SELECT ISNULL(st.lScopeTypeKey, 0)    AS lScopeTypeKey,
                       ISNULL(st.sRigidOrFlexible, '') AS sScopeRF,
                       c.lPricingCategoryKey
                FROM tblRepair r
                JOIN tblScope      s  ON s.lScopeKey      = r.lScopeKey
                JOIN tblScopeType  st ON st.lScopeTypeKey = s.lScopeTypeKey
                JOIN tblDepartment d  ON d.lDepartmentKey = r.lDepartmentKey
                JOIN tblClient     c  ON c.lClientKey     = d.lClientKey
                WHERE r.lRepairKey = @repairKey
            ) scope
            LEFT JOIN tblPricingDetail pd
                   ON pd.lRepairItemKey       = ri.lRepairItemKey
                  AND pd.lPricingCategoryKey  = scope.lPricingCategoryKey
            -- Per-model repair item configuration (for tech-time overrides)
            LEFT JOIN tblScopeTypeRepairItems stri
                   ON stri.lRepairItemKey = ri.lRepairItemKey
                  AND stri.lScopeTypeKey  = scope.lScopeTypeKey
            LEFT JOIN tblScopeTypeRepairItemTechDetails td1
                   ON td1.lScopeTypeRepairItemKey = stri.lScopeTypeRepairItemKey AND td1.lTechLevel = 1
            LEFT JOIN tblScopeTypeRepairItemTechDetails td2
                   ON td2.lScopeTypeRepairItemKey = stri.lScopeTypeRepairItemKey AND td2.lTechLevel = 2
            LEFT JOIN tblScopeTypeRepairItemTechDetails td3
                   ON td3.lScopeTypeRepairItemKey = stri.lScopeTypeRepairItemKey AND td3.lTechLevel = 3
            WHERE ISNULL(ri.bActive, 1) = 1
              AND (
                  -- Explicitly configured for this scope model
                  stri.lScopeTypeRepairItemKey IS NOT NULL
                  -- OR universal item (no rigid/flexible category restriction)
                  OR ISNULL(ri.sRigidOrFlexible, '') = ''
                  -- OR item matches this scope's rigid/flexible category
                  OR ri.sRigidOrFlexible = scope.sScopeRF
              )
            ORDER BY ri.sItemDescription
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<RepairCatalogItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new RepairCatalogItem(
                ItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
                ItemCode: reader["sProblemID"].ToString()!,
                Description: reader["sItemDescription"].ToString()!,
                DefaultPrice: Convert.ToDecimal(reader["dblDefaultPrice"]),
                RigidOrFlexible: reader["sRigidOrFlexible"].ToString()!,
                PartOrLabor: reader["sPartOrLabor"].ToString()!,
                MinutesTech1: reader["lMinutesTech1"] == DBNull.Value ? null : Convert.ToInt32(reader["lMinutesTech1"]),
                MinutesTech2: reader["lMinutesTech2"] == DBNull.Value ? null : Convert.ToInt32(reader["lMinutesTech2"]),
                MinutesTech3: reader["lMinutesTech3"] == DBNull.Value ? null : Convert.ToInt32(reader["lMinutesTech3"])
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
            VALUES
                (@repairKey, @itemKey, @cause, @approved, @fixType,
                 @amount, @baseAmount, @comments, @techKey);
            SELECT SCOPE_IDENTITY();
            """;

        // Guard + insert in ONE transaction — a finalized/closed repair's quote
        // is settled and must not take new lines.
        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            return locked;

        await using var cmd = new SqlCommand(sql, conn, tx);
        cmd.CommandTimeout = 30;
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
        await tx.CommitAsync();
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

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            return locked;

        await using var cmd = new SqlCommand(sql, conn, tx);
        cmd.CommandTimeout = 30;
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
        if (rows == 0) return NotFound();
        await tx.CommitAsync();
        return NoContent();
    }

    [HttpDelete("{repairKey:int}/lineitems/{tranKey:int}")]
    public async Task<IActionResult> DeleteLineItem(int repairKey, int tranKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            return locked;

        await using var cmd = new SqlCommand(
            "DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey", conn, tx);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@tranKey", tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) return NotFound();
        await tx.CommitAsync();
        return NoContent();
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

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            return locked;

        await using var cmd = new SqlCommand(sql, conn, tx);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@cause", (object?)body.Cause ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tranKey", tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var patchRows = await cmd.ExecuteNonQueryAsync();
        if (patchRows == 0) return NotFound();
        await tx.CommitAsync();
        return NoContent();
    }

    // ── Amendment Lookups ──
    [HttpGet("/api/amend-types")]
    public async Task<IActionResult> GetAmendTypes()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = "SELECT lAmendRepairTypeKey, sAmendRepairType FROM tblAmendRepairTypes ORDER BY sAmendRepairType";
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
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
        cmd.CommandTimeout = 30;
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
        cmd.CommandTimeout = 30;
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
            // 0. Editable guard — takes the repair row's UPDLOCK and holds it for
            //    the amendment writes below.
            if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            {
                await tx.RollbackAsync();
                return locked;
            }

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
                updCmd.CommandTimeout = 30;
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
            numCmd.CommandTimeout = 30;
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
            insCmd.CommandTimeout = 30;
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

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            return locked;

        const string sql = "UPDATE tblRepairItemTran SET sApproved = @approved WHERE lRepairKey = @repairKey";
        await using var cmd = new SqlCommand(sql, conn, tx);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@approved", body.Approved ?? "Y");
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        await tx.CommitAsync();
        return Ok(new { updated = rows });
    }

    // ── Update Techs ──

    /// <summary>
    /// PATCH /api/repairs/{repairKey}/techs — legacy frmRepairOpen_UpdateTech /
    /// dbo.repairUpdateTech(plRepairKey, pbTech1, pbAllRepairItems,
    /// plTechnicianKey) parity.
    ///
    /// ONE header slot per call — Tech1 writes lTechnicianKey, otherwise
    /// lTechnician2Key — and the OTHER slot is left untouched. (The previous
    /// shape took both keys and wrote both every time, so the modal's default
    /// null secondary silently erased an existing Tech 2.)
    ///
    /// The same technician is then pushed onto the repair's line items, and the
    /// push is SLOT-SYMMETRIC: tblRepairItemTran carries BOTH lTechnicianKey and
    /// lTechnician2Key, so Tech1 writes the line's primary column and Tech2 the
    /// line's secondary — never the other. The scope follows the same slot: every
    /// tblRepairItemTran row when AllRepairItems is set, otherwise only the rows
    /// whose CHOSEN slot is still empty ("Repair Items without Tech").
    /// (dbo.repairUpdateTech's body was read off prod North on 2026-08-04 and is
    /// exactly this: pbTech1=1 → SET lTechnicianKey WHERE @all=1 OR
    /// ISNULL(lTechnicianKey,0)=0; pbTech1=0 → the same over lTechnician2Key. An
    /// earlier version of this comment claimed the line table had a single tech
    /// column, and the code written from that premise stamped a Tech 2 save into
    /// every line's PRIMARY column.)
    ///
    /// dbo.repairUpdateTech does not exist on this database, so the two writes
    /// are inline SQL in ONE transaction: the header and the lines must agree or
    /// neither lands.
    /// </summary>
    [HttpPatch("{repairKey:int}/techs")]
    public async Task<IActionResult> UpdateTechs(int repairKey, [FromBody] UpdateTechsRequest body)
    {
        if (body.TechKey <= 0)
            return BadRequest(new { message = "A technician must be selected." });

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            if (await CheckRepairEditableAsync(conn, repairKey, tx) is { } locked)
            {
                await tx.RollbackAsync();
                return locked;
            }

            const string headerSql = """
                UPDATE tblRepair SET
                    lTechnicianKey  = CASE WHEN @tech1 = 1 THEN @techKey ELSE lTechnicianKey  END,
                    lTechnician2Key = CASE WHEN @tech1 = 1 THEN lTechnician2Key ELSE @techKey END
                WHERE lRepairKey = @repairKey
                """;
            int headerRows;
            await using (var headerCmd = new SqlCommand(headerSql, conn, tx))
            {
                headerCmd.CommandTimeout = 30;
                headerCmd.Parameters.AddWithValue("@repairKey", repairKey);
                headerCmd.Parameters.AddWithValue("@techKey", body.TechKey);
                headerCmd.Parameters.AddWithValue("@tech1", body.Tech1 ? 1 : 0);
                headerRows = await headerCmd.ExecuteNonQueryAsync();
            }

            if (headerRows == 0)
            {
                await tx.RollbackAsync();
                return NotFound(new { message = $"Repair {repairKey} not found." });
            }

            const string itemSql = """
                UPDATE tblRepairItemTran SET
                    lTechnicianKey  = CASE WHEN @tech1 = 1 THEN @techKey ELSE lTechnicianKey  END,
                    lTechnician2Key = CASE WHEN @tech1 = 1 THEN lTechnician2Key ELSE @techKey END
                WHERE lRepairKey = @repairKey
                  AND (@allItems = 1
                       OR (@tech1 = 1 AND ISNULL(lTechnicianKey, 0) = 0)
                       OR (@tech1 = 0 AND ISNULL(lTechnician2Key, 0) = 0))
                """;
            int itemRows;
            await using (var itemCmd = new SqlCommand(itemSql, conn, tx))
            {
                itemCmd.CommandTimeout = 30;
                itemCmd.Parameters.AddWithValue("@repairKey", repairKey);
                itemCmd.Parameters.AddWithValue("@techKey", body.TechKey);
                itemCmd.Parameters.AddWithValue("@tech1", body.Tech1 ? 1 : 0);
                itemCmd.Parameters.AddWithValue("@allItems", body.AllRepairItems ? 1 : 0);
                itemRows = await itemCmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return Ok(new UpdateTechsResponse(
                TechKey: body.TechKey,
                Tech1: body.Tech1,
                AllRepairItems: body.AllRepairItems,
                HeaderUpdated: headerRows,
                LineItemsUpdated: itemRows));
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
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
        cmd.CommandTimeout = 30;
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

    [HttpGet("update-slip-reasons")]
    public async Task<IActionResult> GetUpdateSlipReasons()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("SELECT lMainRepairUpdateSlipReasonKey AS [key], sMainRepairUpdateSlipReason AS name FROM tblMainRepairUpdateSlipReasons WHERE ISNULL(bActive,1) = 1 ORDER BY sMainRepairUpdateSlipReason", conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
            items.Add(new { key = Convert.ToInt32(reader["key"]), name = reader["name"]?.ToString() ?? "" });
        return Ok(items);
    }

    [HttpPost("{repairKey:int}/update-slips")]
    public async Task<IActionResult> CreateUpdateSlip(int repairKey, [FromBody] CreateUpdateSlipRequest body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO tblRepairUpdateSlips (lRepairKey, dtUpdateRequestDate, lResponsibleTech, lResponsibleTech2, lMainRepairUpdateSlipReasonKey)
            OUTPUT INSERTED.lRepairUpdateSlipKey
            VALUES (@repairKey, GETDATE(), @techKey, @tech2Key, @reasonKey)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@techKey", body.TechKey.HasValue ? (object)body.TechKey.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@tech2Key", body.Tech2Key.HasValue ? (object)body.Tech2Key.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@reasonKey", body.ReasonKey.HasValue ? (object)body.ReasonKey.Value : DBNull.Value);
        var newKey = await cmd.ExecuteScalarAsync();
        return Ok(new { slipKey = Convert.ToInt32(newKey) });
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
        cmd.CommandTimeout = 30;
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
        cmd.CommandTimeout = 30;
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

        // 1:1 — one tblInvoice row per repair. If one already exists, refresh
        // its amounts and return it. Otherwise create a new row with sTranNumber
        // populated immediately (sTranNumber is never deferred to finalization).
        //
        // Everything runs inside a single transaction:
        //   • The existence check uses WITH (UPDLOCK, HOLDLOCK) so two
        //     concurrent finalize calls for the same repairKey serialize —
        //     the second call blocks on the first's lock until it commits,
        //     then sees the row the first call inserted. Without these hints,
        //     both calls could pass the "no existing invoice" check and both
        //     create invoices, violating the 1:1 invariant.
        //   • NextAsync + tblInvoice INSERT are atomic — counter increment
        //     rolls back if the INSERT fails (same counter-burn fix as
        //     ReceivingController.Intake and OrdersController.CreateOrder).
        // The service-location lookup also runs inside the txn but is a
        // read with a brief shared lock; lock duration is negligible.
        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            // The finalized flag is read in the SAME locked statement as the key,
            // so the check costs no extra round trip and cannot race a concurrent
            // finalize between two reads.
            //
            // AGGREGATED, not "first row": the 1:1 comment above is the intent,
            // not the data — 37 real repairs carry more than one tblInvoice row
            // and 3 of those mix finalized with draft. (Excludes the lRepairKey=0
            // orphan/manual bucket, which this route cannot reach.) Reading a
            // single arbitrary row
            // would make the guard depend on which one SQL Server handed back.
            // MAX(bFinalized) fails CLOSED: if ANY invoice on this repair is
            // finalized, the refresh is refused. The aggregate also forces every
            // matching row to be scanned, so UPDLOCK, HOLDLOCK covers the whole
            // set rather than one row. Returns exactly one row always — a NULL
            // key means no invoice exists yet.
            // RowCount is carried out of the same aggregate so a repair with
            // several invoice rows can be REFUSED rather than silently resolved.
            // Picking one of them by MIN/MAX would be a tie-break, and a
            // tie-break that decides which money row gets rewritten is not an
            // answer — it just makes the wrong choice quietly. FinalizeInvoice
            // now reads the same aggregate and refuses on the same rule, so the
            // two endpoints agree on what a multi-row repair means.
            const string checkSql = """
                SELECT MIN(lInvoiceKey) AS lInvoiceKey,
                       CAST(MAX(CAST(ISNULL(bFinalized, 0) AS int)) AS bit) AS bFinalized,
                       COUNT(*) AS InvoiceRowCount
                FROM tblInvoice WITH (UPDLOCK, HOLDLOCK)
                WHERE lRepairKey = @repairKey
                """;

            int? existingKey = null;
            var existingFinalized = false;
            var existingRowCount = 0;
            await using (var checkCmd = new SqlCommand(checkSql, conn, txn))
            {
                checkCmd.CommandTimeout = 30;
                checkCmd.Parameters.AddWithValue("@repairKey", repairKey);
                await using var checkReader = await checkCmd.ExecuteReaderAsync();
                if (await checkReader.ReadAsync() && checkReader["lInvoiceKey"] != DBNull.Value)
                {
                    existingKey = Convert.ToInt32(checkReader["lInvoiceKey"]);
                    existingFinalized = Convert.ToBoolean(checkReader["bFinalized"]);
                    existingRowCount = Convert.ToInt32(checkReader["InvoiceRowCount"]);
                }
            }

            if (existingKey is { } existingKeyValue)
            {
                if (existingRowCount > 1)
                {
                    await txn.RollbackAsync();
                    return Conflict(new { message = $"This repair has {existingRowCount} invoice rows, so there is no single draft to refresh. The duplicates must be resolved before a draft invoice can be updated." });
                }

                // A FINALIZED invoice is settled: re-stamping dtTranDate to today
                // and re-deriving dblTranAmount from tblRepair.dblAmtRepair would
                // move a posted invoice's date, replace its total with a figure
                // not recomputed from the approved lines, leave tblInvoiceDetl
                // disagreeing with its own header, and never clear
                // dtGPProcessDate — so GP would keep the old figure while
                // WinScope showed a new one. That is the stranded-GP-balance
                // failure arriving through the draft door. Re-issuing a finalized
                // invoice is FinalizeInvoice's job (Reissue + Reason), which
                // voids in place, bumps the suffix and rebuilds detail.
                if (existingFinalized)
                {
                    await txn.RollbackAsync();
                    return Conflict(new { message = "This repair's invoice is already finalized. Re-issuing requires the finalize re-issue flow." });
                }

                // NOT finalized — the draft refresh path, unchanged.
                const string updateSql = """
                    UPDATE tblInvoice
                    SET dtTranDate = GETDATE(),
                        dblTranAmount = (SELECT ISNULL(dblAmtRepair, 0) FROM tblRepair WHERE lRepairKey = @repairKey)
                    WHERE lInvoiceKey = @existingKey;
                    """;
                await using var updateCmd = new SqlCommand(updateSql, conn, txn);
                updateCmd.CommandTimeout = 30;
                updateCmd.Parameters.AddWithValue("@repairKey", repairKey);
                updateCmd.Parameters.AddWithValue("@existingKey", existingKeyValue);
                await updateCmd.ExecuteNonQueryAsync();

                await txn.CommitAsync();
                return Ok(new { invoiceKey = existingKeyValue });
            }

            // Resolve service location for invoice number generation
            int serviceLocationKey;
            await using (var svcCmd = new SqlCommand(
                "SELECT ISNULL(d.lServiceLocationKey, 1) FROM tblRepair r JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey WHERE r.lRepairKey = @rk", conn, txn))
            {
                svcCmd.Parameters.AddWithValue("@rk", repairKey);
                var svcObj = await svcCmd.ExecuteScalarAsync();
                serviceLocationKey = svcObj is null or DBNull ? 1 : Convert.ToInt32(svcObj);
            }

            var tranNumber = await invoiceNumbers.NextAsync('R', serviceLocationKey, conn, txn);

            const string insertSql = """
                INSERT INTO tblInvoice (lRepairKey, lClientKey, lDepartmentKey, lScopeKey,
                    dtTranDate, dblTranAmount, sTranNumber, sInvoiceStatus, bIsManual, bIsVoid, bFinalized)
                OUTPUT INSERTED.lInvoiceKey
                SELECT r.lRepairKey, d.lClientKey, r.lDepartmentKey, r.lScopeKey,
                    GETDATE(), ISNULL(r.dblAmtRepair, 0), @tranNumber, 'Draft', 0, 0, 0
                FROM tblRepair r
                JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
                WHERE r.lRepairKey = @repairKey;
                """;

            await using var insertCmd = new SqlCommand(insertSql, conn, txn);
            insertCmd.CommandTimeout = 30;
            insertCmd.Parameters.AddWithValue("@repairKey", repairKey);
            insertCmd.Parameters.AddWithValue("@tranNumber", tranNumber);
            var result = await insertCmd.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value)
            {
                await txn.RollbackAsync();
                return NotFound();
            }

            await txn.CommitAsync();
            return Ok(new { invoiceKey = Convert.ToInt32(result), invoiceNumber = tranNumber });
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
    }

    // ── Finalize Invoice ──
    // POST /api/repairs/{repairKey}/finalize-invoice
    //
    // Ports the FINAL branch of legacy WSRepairOpen.subInvoice (~line 20328).
    // The legacy WinForms flow has no separate "finalize" action: it computes
    // bIsFinal up front and SILENTLY DOWNGRADES to a draft when a gate fails.
    // For an API that is a bad contract — the caller can't tell "I made a draft
    // because you forgot the PO" from "I finalized". So here the gates are HARD
    // 400s (REJECT) instead of silent downgrade. The gate CONDITIONS mirror the
    // legacy ones exactly:
    //   • PO# required on the repair                     (legacy ~20436)
    //   • ≥1 approved line item                           (legacy ~20384, repairGetApprovedCountAndCost)
    //   • tracking# present IF tracking-required          (legacy ~20438-20452)
    //   • outsource vendor + cost present IF outsourced   (legacy ~20489-20494)
    // The 40-day rule and new-instrument-detail-without-tech gate are NOT ported
    // here — they apply to the instrument (sRigidOrFlexible='I') path, and this
    // controller only serves scope repairs (R/F/C). See deferred doc.
    //
    // A repair carrying SEVERAL tblInvoice rows is refused with a 409 — there is
    // no single invoice to finalize and no honest way to pick one (see the
    // ambiguity gate below).
    //
    // Otherwise it find-or-creates the repair's one tblInvoice row, flips
    // bFinalized 0→1, stamps dates + suffix-on-reissue, inserts tblInvoiceDetl
    // rows from the approved tblRepairItemTran lines (the draft path skips
    // detail — finalize MUST add it), and stages the invoice to
    // tblGP_InvoiceStaging (a faithful inline port of dbo.invoiceAfterInsertNew,
    // which does NOT exist on the cloud DB — verified 2026-06-05). The on-prem
    // 30-minute job drains staging into GP; the cloud only STAGES.
    //
    // DEFERRED (NOT done here — see docs/finalize-gp-print-deferred.md):
    //   inline PO→GP push (legacy GPIntegratePO/LoadPOs), Crystal print, Avalara
    //   tax. These need Steve + on-prem network + a service account + accounting
    //   policy decisions and would be guesses if built blind.
    [HttpPost("{repairKey:int}/finalize-invoice")]
    public async Task<IActionResult> FinalizeInvoice(int repairKey, [FromBody] FinalizeInvoiceRequest? body = null)
    {
        var userKey = this.GetCurrentUserKey();
        // Explicit re-issue is opt-in. A plain POST (body null / Reissue=false)
        // against an already-finalized invoice is treated as an idempotent retry
        // and returns the existing invoice WITHOUT re-staging. Only an explicit
        // { reissue: true, reason } voids-and-re-stages (suffix bump).
        var reissue = body?.Reissue == true;

        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // ── Everything runs INSIDE one transaction, after acquiring locks ──
        // The gates, the approved-total computation, the invoice flip, the
        // detail insert, and the GP staging are all serialized against
        // concurrent edits by locking tblRepair, the approved
        // tblRepairItemTran set, and the tblInvoice row with UPDLOCK,HOLDLOCK.
        // This closes the read-before-txn race: a concurrent line-item or
        // repair edit can no longer slip between "gates passed" and "amount
        // written" — the locks block it until this txn commits, and the total
        // is computed from the SAME locked set the detail insert reads.
        await using var txn = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            // ── Gate reads on the LOCKED repair row ──
            // UPDLOCK,HOLDLOCK on tblRepair holds the row + range for the txn so
            // PO/tracking/outsource can't change underneath us. Confirms the
            // repair exists AND is a scope repair (instrument repairs use a
            // different approved-count/detail model and are rejected here).
            const string repairSql = """
                SELECT r.lRepairKey,
                       ISNULL(r.sPurchaseOrder, '')            AS sPurchaseOrder,
                       ISNULL(r.bOutsourced, 0)                AS bOutsourced,
                       ISNULL(r.lVendorKey, 0)                 AS lVendorKey,
                       ISNULL(r.dblOutSourceCost, 0)           AS dblOutSourceCost,
                       ISNULL(r.sShipTrackingNumber, '')       AS sShipTrackingNumber,
                       ISNULL(r.sShipTrackingNumberFedEx, '')  AS sShipTrackingNumberFedEx,
                       ISNULL(r.bTrackingNumberRequired, 0)    AS bTrackingNumberRequired,
                       ISNULL(st.sRigidOrFlexible, '')         AS sRigidOrFlexible
                FROM tblRepair r WITH (UPDLOCK, HOLDLOCK)
                LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
                LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
                WHERE r.lRepairKey = @repairKey
                """;

            bool outsourced; int vendorKey; decimal outsourceCost;
            bool trackingRequired; string tracking, trackingFedEx, po, rigidOrFlex;
            await using (var rc = new SqlCommand(repairSql, conn, txn))
            {
                rc.CommandTimeout = 30;
                rc.Parameters.AddWithValue("@repairKey", repairKey);
                await using var rr = await rc.ExecuteReaderAsync();
                if (!await rr.ReadAsync())
                {
                    await txn.RollbackAsync();
                    return NotFound(new { error = $"Repair {repairKey} not found." });
                }

                po            = rr["sPurchaseOrder"]?.ToString() ?? "";
                outsourced    = Convert.ToBoolean(rr["bOutsourced"]);
                vendorKey     = Convert.ToInt32(rr["lVendorKey"]);
                outsourceCost = Convert.ToDecimal(rr["dblOutSourceCost"]);
                tracking      = rr["sShipTrackingNumber"]?.ToString() ?? "";
                trackingFedEx = rr["sShipTrackingNumberFedEx"]?.ToString() ?? "";
                trackingRequired = Convert.ToBoolean(rr["bTrackingNumberRequired"]);
                rigidOrFlex   = rr["sRigidOrFlexible"]?.ToString() ?? "";
            }

            if (rigidOrFlex.Equals("I", StringComparison.OrdinalIgnoreCase))
            {
                await txn.RollbackAsync();
                return BadRequest(new { error = "Instrument repairs are not finalized through this endpoint. Use the instrument-invoice flow." });
            }

            // Gate 1: PO# required (legacy ~20436 — the core "is this final?" gate).
            if (string.IsNullOrWhiteSpace(po))
            {
                await txn.RollbackAsync();
                return BadRequest(new { error = "A purchase order number is required before this invoice can be finalized." });
            }

            // Gate 2: tracking# required IF the repair is flagged tracking-required
            // (legacy ~20438). Either carrier's tracking number satisfies it.
            if (trackingRequired && string.IsNullOrWhiteSpace(tracking) && string.IsNullOrWhiteSpace(trackingFedEx))
            {
                await txn.RollbackAsync();
                return BadRequest(new { error = "A shipping tracking number is required (this repair is flagged tracking-required) before finalizing." });
            }

            // Gate 3: outsource vendor + cost required IF outsourced (legacy ~20489).
            if (outsourced && (vendorKey <= 0 || outsourceCost <= 0))
            {
                await txn.RollbackAsync();
                return BadRequest(new { error = "An outsource vendor and a non-zero outsource cost are required before an outsourced repair can be finalized." });
            }

            // Find the repair's invoice rows. AGGREGATED, not "first row": repair↔
            // invoice is NOT 1:1 in the data — 37 real repairs carry more than one
            // tblInvoice row and 3 of those mix finalized with draft. Reading a
            // single arbitrary row made the finalized check depend on which one SQL
            // Server handed back: this used to take TOP 1 ... ORDER BY lInvoiceKey
            // DESC, so a repair whose OLDER invoice was already finalized and whose
            // NEWER row was a draft reported "not finalized", sailed past the
            // idempotency gate below, and BILLED THE REPAIR A SECOND TIME (a second
            // finalized invoice plus a second tblGP_InvoiceStaging row).
            // Same aggregate rule as CreateDraftInvoice (:1946):
            //   • MAX(bFinalized) fails CLOSED — ANY finalized row means finalized.
            //   • RowCount is carried out of the same aggregate so a repair with
            //     several invoice rows is REFUSED rather than silently resolved.
            //   • MIN(lInvoiceKey) / MAX(suffix) are exact when the count is 1,
            //     which is the ONLY case that reads them — they are not tie-breaks.
            // The aggregate forces every matching row to be scanned, so UPDLOCK,
            // HOLDLOCK covers the whole set plus its gap for the transaction and a
            // racing draft/finalize can't slip another row in. Exactly one row comes
            // back always — a NULL key means no invoice exists yet.
            int invoiceKey = 0; bool alreadyFinalized = false; int priorSuffix = 0; int invoiceRowCount = 0;
            await using (var chk = new SqlCommand("""
                SELECT MIN(lInvoiceKey) AS lInvoiceKey,
                       CAST(MAX(CAST(ISNULL(bFinalized, 0) AS int)) AS bit) AS bFinalized,
                       MAX(ISNULL(sTranNumberSuffix, 0)) AS sTranNumberSuffix,
                       COUNT(*) AS InvoiceRowCount
                FROM tblInvoice WITH (UPDLOCK, HOLDLOCK)
                WHERE lRepairKey = @repairKey
                """, conn, txn))
            {
                chk.CommandTimeout = 30;
                chk.Parameters.AddWithValue("@repairKey", repairKey);
                await using var cr = await chk.ExecuteReaderAsync();
                if (await cr.ReadAsync() && cr["lInvoiceKey"] != DBNull.Value)
                {
                    invoiceKey = Convert.ToInt32(cr["lInvoiceKey"]);
                    alreadyFinalized = Convert.ToBoolean(cr["bFinalized"]);
                    priorSuffix = Convert.ToInt32(cr["sTranNumberSuffix"]);
                    invoiceRowCount = Convert.ToInt32(cr["InvoiceRowCount"]);
                }
            }

            // ── Ambiguity gate — runs BEFORE every other invoice-state branch ──
            // Several invoice rows means there is no single invoice to finalize.
            // A re-issue is refused for the same reason rather than resolved: it
            // needs ONE unambiguous invoice identity (whose key, whose sTranNumber,
            // whose suffix), and with several rows any pick is a tie-break that
            // decides which money row gets rewritten — which is not an answer, it
            // just makes the wrong choice quietly. The duplicates get resolved
            // first; only then can this repair be finalized or re-issued.
            if (invoiceRowCount > 1)
            {
                await txn.RollbackAsync();
                return Conflict(new { message = $"This repair has {invoiceRowCount} invoice rows, so there is no single invoice to finalize. The duplicates must be resolved before this repair can be finalized or re-issued." });
            }

            // ── Idempotency gate (fix: double-stage to GP) ──
            // If the invoice is already finalized and the caller did NOT ask for
            // an explicit re-issue, this is a retry / double-click. Return the
            // existing invoice unchanged — do NOT bump the suffix, do NOT touch
            // detail, and crucially do NOT re-stage (which would double-stage to
            // GP once the on-prem job has drained the first row). Commit the
            // (lock-only) txn and return.
            if (invoiceKey != 0 && alreadyFinalized && !reissue)
            {
                await txn.CommitAsync();
                return Ok(new FinalizeInvoiceResponse(
                    InvoiceKey: invoiceKey,
                    Finalized: true,
                    ReIssue: false,
                    Suffix: priorSuffix,
                    ApprovedTotal: 0m,
                    DetailRows: 0,
                    Staged: false,
                    GpPushDeferred: true,
                    AlreadyFinalized: true));
            }

            // Re-issue semantics (legacy ~20552 + invoiceVoid + GetNextSuffix):
            // an EXPLICIT re-issue of an already-final invoice voids the prior and
            // bumps the suffix (-1, -2, …). We void in place (bIsVoid is cleared
            // back to 0 on the fresh finalize) and increment the suffix on the
            // same row rather than spawning a new row, so a re-issue never adds to
            // the repair's invoice row count. Only reachable on a single-row repair
            // — the ambiguity gate above already refused the multi-row case.
            int newSuffix = alreadyFinalized ? priorSuffix + 1 : priorSuffix;

            // Gate 4: ≥1 approved line item, computed from the LOCKED approved
            // set (legacy ~20384, scope branch: COUNT + SUM(dblRepairPrice)
            // WHERE sApproved='Y'). UPDLOCK,HOLDLOCK on this exact predicate is
            // the same set the detail insert reads below, so the total written
            // to the invoice and the detail rows can never diverge.
            int approvedCount; decimal approvedTotal;
            await using (var ac = new SqlCommand("""
                SELECT COUNT(*) AS ApprovedCount,
                       ISNULL(SUM(rit.dblRepairPrice), 0) AS ApprovedTotal
                FROM tblRepairItemTran rit WITH (UPDLOCK, HOLDLOCK)
                WHERE rit.lRepairKey = @repairKey AND rit.sApproved = 'Y'
                """, conn, txn))
            {
                ac.CommandTimeout = 30;
                ac.Parameters.AddWithValue("@repairKey", repairKey);
                await using var ar = await ac.ExecuteReaderAsync();
                await ar.ReadAsync();
                approvedCount = Convert.ToInt32(ar["ApprovedCount"]);
                approvedTotal = Convert.ToDecimal(ar["ApprovedTotal"]);
            }

            if (approvedCount == 0)
            {
                await txn.RollbackAsync();
                return BadRequest(new { error = "No line items on this repair have been approved. An invoice cannot be finalized." });
            }

            if (invoiceKey == 0)
            {
                // No draft exists — create the row already-finalized. Mirrors the
                // lean column set the draft endpoint writes (NOT the legacy
                // 200-line address-snapshot invoiceInsert; that proc does not
                // exist on the cloud DB and the cloud invoice model is lean).
                // lSalesRepKey is populated from repair→dept→client so GP staging
                // (and any future reader) sees a real rep, not 0.
                int serviceLocationKey;
                await using (var svcCmd = new SqlCommand(
                    "SELECT ISNULL(d.lServiceLocationKey, 1) FROM tblRepair r JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey WHERE r.lRepairKey = @rk", conn, txn))
                {
                    svcCmd.Parameters.AddWithValue("@rk", repairKey);
                    var svcObj = await svcCmd.ExecuteScalarAsync();
                    serviceLocationKey = svcObj is null or DBNull ? 1 : Convert.ToInt32(svcObj);
                }

                var tranNumber = await invoiceNumbers.NextAsync('R', serviceLocationKey, conn, txn);

                const string insertSql = """
                    INSERT INTO tblInvoice (lRepairKey, lClientKey, lDepartmentKey, lScopeKey,
                        lSalesRepKey, dtTranDate, dtDueDate, dblTranAmount, sPurchaseOrder, sTranNumber,
                        sInvoiceStatus, bIsManual, bIsVoid, bFinalized,
                        Created_UserKey, Created_datetime)
                    OUTPUT INSERTED.lInvoiceKey
                    SELECT r.lRepairKey, d.lClientKey, r.lDepartmentKey, r.lScopeKey,
                        COALESCE(NULLIF(r.lSalesRepKey,0), NULLIF(d.lSalesRepKey,0), NULLIF(c.lSalesRepKey,0)),
                        GETDATE(), GETDATE(), @amount, @po, @tranNumber,
                        'Finalized', 0, 0, 1,
                        @userKey, GETDATE()
                    FROM tblRepair r
                    JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
                    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                    WHERE r.lRepairKey = @repairKey;
                    """;
                await using var insertCmd = new SqlCommand(insertSql, conn, txn);
                insertCmd.CommandTimeout = 30;
                insertCmd.Parameters.AddWithValue("@repairKey", repairKey);
                insertCmd.Parameters.AddWithValue("@amount", approvedTotal);
                insertCmd.Parameters.AddWithValue("@po", po);
                insertCmd.Parameters.AddWithValue("@tranNumber", tranNumber);
                insertCmd.Parameters.AddWithValue("@userKey", userKey > 0 ? userKey : DBNull.Value);
                var ins = await insertCmd.ExecuteScalarAsync();
                if (ins is null or DBNull)
                {
                    await txn.RollbackAsync();
                    return NotFound(new { error = "Failed to create invoice — repair or department missing." });
                }
                invoiceKey = Convert.ToInt32(ins);
            }
            else
            {
                // Flip the existing (draft, or re-issued final) row to finalized.
                // Stamps the approved total + PO + dates, advances the suffix on
                // re-issue, clears any prior void/GP-process stamp so the fresh
                // finalize re-stages cleanly, and backfills lSalesRepKey from
                // repair→dept→client (it may have been 0 on the draft row).
                const string flipSql = """
                    UPDATE i
                    SET bFinalized        = 1,
                        bIsVoid           = 0,
                        sInvoiceStatus    = 'Finalized',
                        dblTranAmount     = @amount,
                        sPurchaseOrder    = @po,
                        lSalesRepKey      = COALESCE(NULLIF(i.lSalesRepKey,0), NULLIF(r.lSalesRepKey,0), NULLIF(d.lSalesRepKey,0), NULLIF(c.lSalesRepKey,0)),
                        dtTranDate        = GETDATE(),
                        dtDueDate         = ISNULL(i.dtDueDate, GETDATE()),
                        sTranNumberSuffix = NULLIF(@suffix, 0),
                        dtGPProcessDate   = NULL,
                        Updated_UserKey   = @userKey,
                        Updated_datetime  = GETDATE()
                    FROM tblInvoice i
                    JOIN tblRepair r ON r.lRepairKey = i.lRepairKey
                    JOIN tblDepartment d ON d.lDepartmentKey = i.lDepartmentKey
                    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                    WHERE i.lInvoiceKey = @invoiceKey
                    """;
                await using var flip = new SqlCommand(flipSql, conn, txn);
                flip.CommandTimeout = 30;
                flip.Parameters.AddWithValue("@amount", approvedTotal);
                flip.Parameters.AddWithValue("@po", po);
                flip.Parameters.AddWithValue("@suffix", newSuffix);
                flip.Parameters.AddWithValue("@invoiceKey", invoiceKey);
                flip.Parameters.AddWithValue("@userKey", userKey > 0 ? userKey : DBNull.Value);
                await flip.ExecuteNonQueryAsync();
            }

            // ── Insert tblInvoiceDetl from the SAME locked approved set ──
            // The draft path skips detail entirely; finalize MUST populate it.
            // Mirrors legacy invoiceDetailInsert: one detail row per approved
            // tblRepairItemTran, carrying the repair-item description, charged
            // amount (dblRepairPrice) and base value (dblRepairPriceBase).
            // Re-issue safety: clear any prior detail for this invoice first so
            // a re-finalize doesn't double the lines.
            await using (var delDetl = new SqlCommand(
                "DELETE FROM tblInvoiceDetl WHERE lInvoiceKey = @invoiceKey", conn, txn))
            {
                delDetl.CommandTimeout = 30;
                delDetl.Parameters.AddWithValue("@invoiceKey", invoiceKey);
                await delDetl.ExecuteNonQueryAsync();
            }

            const string detlSql = """
                INSERT INTO tblInvoiceDetl
                    (lInvoiceKey, lRepairItemKey, lRepairItemTranKey, sItemDescription,
                     dblItemAmount, dblItemValue, sProductID, mComments,
                     dtCreateDate, lCreateUser, Created_UserKey, Created_datetime)
                SELECT @invoiceKey, rit.lRepairItemKey, rit.lRepairItemTranKey,
                       LEFT(ISNULL(ri.sItemDescription, ''), 200),
                       ISNULL(rit.dblRepairPrice, 0),
                       ISNULL(rit.dblRepairPriceBase, rit.dblRepairPrice),
                       LEFT(ISNULL(rit.sProblemID, ''), 6),
                       rit.sComments,
                       GETDATE(), @userKey, @userKey, GETDATE()
                FROM tblRepairItemTran rit
                LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
                WHERE rit.lRepairKey = @repairKey AND rit.sApproved = 'Y'
                """;
            int detailRows;
            await using (var detl = new SqlCommand(detlSql, conn, txn))
            {
                detl.CommandTimeout = 30;
                detl.Parameters.AddWithValue("@invoiceKey", invoiceKey);
                detl.Parameters.AddWithValue("@repairKey", repairKey);
                detl.Parameters.AddWithValue("@userKey", userKey > 0 ? userKey : DBNull.Value);
                detailRows = await detl.ExecuteNonQueryAsync();
            }

            // Safety: the approved-count gate above passed under the same lock,
            // so detailRows should equal approvedCount. If detail somehow wrote
            // zero rows, refuse to finalize an empty invoice — roll back.
            if (detailRows == 0)
            {
                await txn.RollbackAsync();
                return BadRequest(new { error = "No invoice detail could be created from the approved line items. Finalize aborted." });
            }

            // Keep the repair header's billed amount + PO in sync with what was
            // just finalized (legacy repairUpdateForNewInvoice stamps dtDateOut,
            // dblAmtRepair, sPurchaseOrder). We touch only dblAmtRepair +
            // dtDateOut here; PO already came FROM the repair.
            await using (var rUpd = new SqlCommand("""
                UPDATE tblRepair
                SET dblAmtRepair = @amount,
                    dtDateOut    = ISNULL(dtDateOut, GETDATE())
                WHERE lRepairKey = @repairKey
                """, conn, txn))
            {
                rUpd.CommandTimeout = 30;
                rUpd.Parameters.AddWithValue("@amount", approvedTotal);
                rUpd.Parameters.AddWithValue("@repairKey", repairKey);
                await rUpd.ExecuteNonQueryAsync();
            }

            // ── Stage to GP (inline port of dbo.invoiceAfterInsertNew) ──
            // The legacy proc does not exist on the cloud DB; the staging TABLE
            // (tblGP_InvoiceStaging) DOES. We replicate the proc's logic in C#:
            //   • Guard: only stage when bFinalized=1 AND TotalAmountDue>0.
            //   • TotalAmountDue = tran + shipping + 3 jurisdiction tax amounts.
            //   • sBatchNumber  = 'WS - ' + yyyymmdd  (deterministic).
            //   • GPID_Department = tblDepartment.sGPID.
            //   • GPID_SalesRep   = tblSalesRep.sGPID. The effective rep is
            //     resolved by COALESCE over invoice→repair→dept→client (the
            //     invoice's lSalesRepKey is now populated on create/flip, but the
            //     COALESCE also self-heals legacy rows where it is 0). For a South
            //     WO (sTranNumber starts 'S') we follow lSalesRepKeyLink to the
            //     South rep's GPID first — the cloud signal is the WO prefix (the
            //     legacy fnDatabaseKey()/lDatabaseKey routing does not exist on
            //     the single cloud DB).
            //   • Idempotency: only reached for a fresh finalize or an EXPLICIT
            //     re-issue (a plain retry short-circuited above and never gets
            //     here). We delete prior UNPROCESSED staging rows for the same
            //     WO# (sTranNumberNoSuffix) so the re-issue replaces its own
            //     un-drained attempt without disturbing rows the on-prem job has
            //     already processed.
            // NOTE: GPID_SalesRep is NOT NULL on the staging table. If no rep
            // resolves we stage '' (empty), matching the legacy LEFT-JOIN-miss.
            // GLAccount / TaxScheduleID / PaymentTerms are left NULL here — the
            // legacy proc also leaves them for the drain job / GP defaults.
            decimal totalAmountDue;
            await using (var stage = new SqlCommand("""
                DECLARE @batch nvarchar(15) = 'WS - ' + CONVERT(varchar(8), GETDATE(), 112);
                DECLARE @tn nvarchar(50), @tnNoSuffix nvarchar(50),
                        @total decimal(18,2), @tran decimal(18,2),
                        @ship decimal(18,2), @tax decimal(18,2),
                        @po2 nvarchar(50), @due date, @deptGpid nvarchar(15),
                        @repGpid nvarchar(15), @effRep int;

                SELECT @tnNoSuffix = i.sTranNumber,
                       @tn = i.sTranNumber + CASE WHEN ISNULL(i.sTranNumberSuffix,0)=0 THEN ''
                                                  ELSE '-' + CAST(i.sTranNumberSuffix AS varchar(10)) END,
                       @tran = CAST(ISNULL(i.dblTranAmount,0) AS decimal(18,2)),
                       @ship = CAST(ISNULL(i.dblShippingAmt,0) AS decimal(18,2)),
                       @tax  = CAST(ISNULL(i.dblJuris1Amt,0)+ISNULL(i.dblJuris2Amt,0)+ISNULL(i.dblJuris3Amt,0) AS decimal(18,2)),
                       @total = CAST(ISNULL(i.dblTranAmount,0)+ISNULL(i.dblShippingAmt,0)
                                + ISNULL(i.dblJuris1Amt,0)+ISNULL(i.dblJuris2Amt,0)+ISNULL(i.dblJuris3Amt,0) AS decimal(18,2)),
                       @po2 = i.sPurchaseOrder, @due = i.dtDueDate,
                       @deptGpid = d.sGPID,
                       @effRep = COALESCE(NULLIF(i.lSalesRepKey,0), NULLIF(r.lSalesRepKey,0),
                                          NULLIF(d.lSalesRepKey,0), NULLIF(c.lSalesRepKey,0))
                FROM tblInvoice i
                JOIN tblDepartment d ON d.lDepartmentKey = i.lDepartmentKey
                JOIN tblRepair r ON r.lRepairKey = i.lRepairKey
                LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
                WHERE i.lInvoiceKey = @invoiceKey;

                -- South-link rep swap (WO prefix 'S'): prefer the South rep that
                -- links back to the effective rep; otherwise the rep's own GPID.
                SET @repGpid = CASE
                    WHEN LEFT(@tn,1) = 'S'
                      THEN ISNULL((SELECT TOP 1 link.sGPID FROM tblSalesRep link WHERE link.lSalesRepKeyLink = @effRep),
                                  (SELECT TOP 1 srD.sGPID FROM tblSalesRep srD WHERE srD.lSalesRepKey = @effRep))
                    ELSE (SELECT TOP 1 srD.sGPID FROM tblSalesRep srD WHERE srD.lSalesRepKey = @effRep) END;

                -- Idempotency: clear our own un-drained prior attempts for this WO#.
                DELETE FROM tblGP_InvoiceStaging
                WHERE sTranNumberNoSuffix = @tnNoSuffix AND bProcessed = 0;

                IF @total > 0
                BEGIN
                    INSERT INTO tblGP_InvoiceStaging
                        (lInvoiceKey, sTranNumber, dtTranDate, sBatchNumber, GPID_Department,
                         TotalAmountDue, dblTranAmount, dblShippingAmount, dblTaxAmount,
                         GPID_SalesRep, sPurchaseOrder, dtDueDate, bProcessed,
                         sTranNumberNoSuffix, dtPostedDate, lUserKey,
                         Created_UserKey, Created_datetime)
                    VALUES
                        (@invoiceKey, @tn, CONVERT(date, GETDATE()), @batch, @deptGpid,
                         @total, @tran, @ship, @tax,
                         ISNULL(@repGpid, ''), @po2, @due, 0,
                         @tnNoSuffix, CONVERT(date, GETDATE()), @userKey,
                         @userKey, GETDATE());
                END

                SELECT @total AS TotalAmountDue;
                """, conn, txn))
            {
                stage.CommandTimeout = 30;
                stage.Parameters.AddWithValue("@invoiceKey", invoiceKey);
                stage.Parameters.AddWithValue("@userKey", userKey > 0 ? userKey : DBNull.Value);
                var totalObj = await stage.ExecuteScalarAsync();
                totalAmountDue = totalObj is null or DBNull ? 0m : Convert.ToDecimal(totalObj);
            }

            await txn.CommitAsync();

            return Ok(new FinalizeInvoiceResponse(
                InvoiceKey: invoiceKey,
                Finalized: true,
                ReIssue: alreadyFinalized && reissue,
                Suffix: newSuffix,
                ApprovedTotal: approvedTotal,
                DetailRows: detailRows,
                Staged: totalAmountDue > 0,
                GpPushDeferred: true,
                AlreadyFinalized: false));
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
    }

    // ── Close / Reopen ──

    /// <summary>
    /// POST /api/repairs/{repairKey}/close — close the WO: sRepairClosed = 'Y',
    /// and backfill dtDateOut. Adapted from the cloud repo's CloseRepair.
    ///
    /// Closing is a STATE, not a lock — it engages no read-only behaviour, exactly
    /// as legacy's "Closed Repair" checkbox engages none (see RepairLock). This
    /// endpoint exists because redesign-matched previously had no way to set the
    /// flag at all, which is the actual parity gap.
    ///
    /// Deliberately permissive about invoicing/QC state — warranty and no-charge
    /// repairs close without invoices — and deliberately NOT fired automatically
    /// on finalize: legacy keeps closing a separate operator decision.
    /// </summary>
    [HttpPost("{repairKey:int}/close")]
    public async Task<IActionResult> CloseRepair(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            UPDATE tblRepair SET
                sRepairClosed = 'Y',
                dtDateOut     = COALESCE(dtDateOut, GETDATE())
            WHERE lRepairKey = @repairKey
              AND UPPER(LTRIM(RTRIM(ISNULL(sRepairClosed, 'N')))) <> 'Y'
            """;
        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows > 0) return Ok(new { repairKey, closed = true });

        return await RepairExistsAsync(conn, repairKey)
            ? Conflict(new { message = "This repair is already closed." })
            : NotFound(new { message = $"Repair {repairKey} not found." });
    }

    /// <summary>
    /// POST /api/repairs/{repairKey}/reopen — clear the closed flag (mistakes
    /// happen). dtDateOut is kept: it is history.
    ///
    /// Blocked while a live FINALIZED invoice exists, so that "closed" and
    /// "invoiced" cannot disagree in the record: void the invoice first. Note
    /// this is a bookkeeping consistency rule, not an edit lock — a closed
    /// repair is editable either way.
    ///
    /// UPDLOCK, HOLDLOCK on the repair row AND on the invoice range inside the
    /// transaction is deliberate (cloud's ordering): it serializes reopen
    /// against a concurrent invoice finalize rather than letting the two
    /// interleave into an open-but-invoiced repair.
    /// </summary>
    [HttpPost("{repairKey:int}/reopen")]
    public async Task<IActionResult> ReopenRepair(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            const string sql = """
                UPDATE r SET
                    sRepairClosed = 'N'
                FROM tblRepair r WITH (UPDLOCK, HOLDLOCK)
                WHERE r.lRepairKey = @repairKey
                  AND UPPER(LTRIM(RTRIM(ISNULL(r.sRepairClosed, 'N')))) = 'Y'
                  AND NOT EXISTS (SELECT 1 FROM tblInvoice i WITH (UPDLOCK, HOLDLOCK)
                                  WHERE i.lRepairKey = r.lRepairKey
                                    AND i.bFinalized = 1)
                """;
            int rows;
            await using (var cmd = new SqlCommand(sql, conn, tx))
            {
                cmd.CommandTimeout = 30;
                cmd.Parameters.AddWithValue("@repairKey", repairKey);
                rows = await cmd.ExecuteNonQueryAsync();
            }
            await tx.CommitAsync();

            if (rows > 0) return Ok(new { repairKey, reopened = true });

            return await RepairExistsAsync(conn, repairKey)
                ? Conflict(new { message = "This repair cannot be reopened — it is not closed, or it has a finalized invoice (void the invoice first)." })
                : NotFound(new { message = $"Repair {repairKey} not found." });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Repair Notes ──
    [HttpGet("{repairKey:int}/repair-notes")]
    public async Task<IActionResult> GetRepairNotes(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            IF NOT EXISTS (SELECT 1 FROM tblOwnerTypes WHERE sOwnerType = 'Repair')
                INSERT INTO tblOwnerTypes (sOwnerType) VALUES ('Repair');

            SELECT n.lNoteKey, n.sNote, n.dtNoteDate,
                   ISNULL(u.sUserFullName, '') AS sUserFullName
            FROM tblNotes n
            LEFT JOIN tblUsers u ON u.lUserKey = n.lUserKey
            WHERE n.lOwnerKey = @repairKey
              AND n.lOwnerTypeKey = (SELECT TOP 1 lOwnerTypeKey FROM tblOwnerTypes WHERE sOwnerType = 'Repair')
            ORDER BY n.dtNoteDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
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

        // Was hardcoded lUserKey = 1 — every note showed up authored by user 1
        // (or "System" if the GetRepairNotes join misses). Now we capture the
        // actual signed-in user via the user_key JWT claim.
        const string sql = """
            IF NOT EXISTS (SELECT 1 FROM tblOwnerTypes WHERE sOwnerType = 'Repair')
                INSERT INTO tblOwnerTypes (sOwnerType) VALUES ('Repair');

            INSERT INTO tblNotes (lOwnerKey, lOwnerTypeKey, sNote, dtNoteDate, lUserKey)
            VALUES (@repairKey,
                    (SELECT TOP 1 lOwnerTypeKey FROM tblOwnerTypes WHERE sOwnerType = 'Repair'),
                    @note, GETDATE(), @userKey)
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@note", body.Note ?? "");
        cmd.Parameters.AddWithValue("@userKey", this.GetCurrentUserKey());
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
        cmd.CommandTimeout = 30;
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

        // Return ALL scopes matching the serial. A serial is not unique across
        // clients/departments, so a single-row lookup (TOP 1) silently hid every
        // other owner's scope — making it impossible to receive a repair for them.
        // The caller disambiguates when more than one row comes back.
        const string sql = """
            SELECT
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
            ORDER BY c.sClientName1, d.sDepartmentName, s.lScopeKey DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@sn", sn.Trim());
        await using var reader = await cmd.ExecuteReaderAsync();

        var matches = new List<object>();
        while (await reader.ReadAsync())
        {
            matches.Add(new {
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

        // Always an array (possibly empty) — the client treats 0 as "not found",
        // 1 as auto-select, >1 as a disambiguation prompt.
        return Ok(matches);
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
            scopeCmd.CommandTimeout = 30;
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
        cmd.CommandTimeout = 30;
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
        woCmd.CommandTimeout = 30;
        woCmd.Parameters.AddWithValue("@k", newKey);
        await woCmd.ExecuteNonQueryAsync();

        return Ok(new { repairKey = newKey });
    }
}
