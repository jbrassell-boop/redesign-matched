using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using TSI.Api.Models;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/financial")]
[Authorize]
public class FinancialController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    private static int CalcAgingDays(object? dueDate, object? tranDate)
    {
        var dt = dueDate as DateTime? ?? tranDate as DateTime?;
        if (dt == null) return 0;
        return Math.Max(0, (int)Math.Round((DateTime.UtcNow - dt.Value).TotalDays));
    }

    private static string DeriveStatus(bool isPaid, bool isVoid, int agingDays)
    {
        if (isPaid) return "Paid";
        if (isVoid) return "Void";
        if (agingDays > 90) return "Overdue";
        if (agingDays > 60) return "Past Due";
        if (agingDays > 0) return "Unpaid";
        return "Current";
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] string? search = null,
        [FromQuery] string? statusFilter = null,
        [FromQuery] string? clientFilter = null,
        [FromQuery] string tab = "outstanding",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (tab == "outstanding")
            where.Add("i.dblTranAmount > 0");
        else if (tab == "drafts")
            where.Add("(i.sExported IS NULL OR i.sExported = '')");

        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(i.sTranNumber LIKE @search OR i.sBillName1 LIKE @search)");
        if (!string.IsNullOrWhiteSpace(clientFilter))
            where.Add("i.sBillName1 = @clientFilter");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"SELECT COUNT(*) FROM tblInvoice i {whereClause}";

        var dataSql = $"""
            SELECT i.lInvoiceKey, i.sTranNumber, i.sBillName1,
                   ISNULL(i.dblTranAmount, 0) AS dblTranAmount,
                   ISNULL(i.dblJuris1Amt, 0) + ISNULL(i.dblJuris2Amt, 0) AS dblTaxAmount,
                   i.sTermsDesc, i.sDeliveryDesc,
                   i.dtTranDate, i.dtDueDate,
                   i.sPurchaseOrder, i.sSerialNumber, i.sScopeTypeDesc,
                   ISNULL(i.dblShippingAmt, 0) AS dblShippingAmt,
                   i.sExported
            FROM tblInvoice i
            {whereClause}
            ORDER BY i.dblTranAmount DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(clientFilter)) countCmd.Parameters.AddWithValue("@clientFilter", clientFilter);
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        if (!string.IsNullOrWhiteSpace(clientFilter)) dataCmd.Parameters.AddWithValue("@clientFilter", clientFilter);
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<InvoiceListItem>();
        while (await reader.ReadAsync())
        {
            var dueDate = reader["dtDueDate"] as DateTime?;
            var tranDate = reader["dtTranDate"] as DateTime?;
            var agingDays = CalcAgingDays(dueDate, tranDate);
            var exported = reader["sExported"]?.ToString() ?? "";

            items.Add(new InvoiceListItem(
                InvoiceKey: Convert.ToInt32(reader["lInvoiceKey"]),
                InvoiceNumber: reader["sTranNumber"]?.ToString() ?? "",
                ClientName: reader["sBillName1"]?.ToString() ?? "",
                Amount: Convert.ToDouble(reader["dblTranAmount"]),
                TaxAmount: Convert.ToDouble(reader["dblTaxAmount"]),
                Discount: 0,
                PaymentTerms: reader["sTermsDesc"]?.ToString() ?? "",
                GLAccount: "",
                IssuedDate: tranDate?.ToString("yyyy-MM-dd"),
                DueDate: dueDate?.ToString("yyyy-MM-dd"),
                AgingDays: agingDays,
                Status: DeriveStatus(false, false, agingDays),
                DeliveryMethod: reader["sDeliveryDesc"]?.ToString() ?? "",
                GreatPlainsId: ""
            ));
        }

        // Post-filter by status if requested
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            var sf = statusFilter.ToLower();
            items = items.Where(i => i.Status.ToLower().Contains(sf)).ToList();
        }

        return Ok(new InvoiceListResponse(items, totalCount));
    }

    [HttpGet("invoices/{id:int}")]
    public async Task<IActionResult> GetInvoiceDetail(int id)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT i.lInvoiceKey, i.lRepairKey, i.lClientKey, i.lDepartmentKey,
                   i.sTranNumber, i.sBillName1, i.sBillName2,
                   i.sBillAddr1, i.sBillAddr2, i.sBillCity, i.sBillState, i.sBillZip,
                   i.sShipName1, i.sShipAddr1, i.sShipCity, i.sShipState, i.sShipZip,
                   ISNULL(i.dblTranAmount, 0) AS dblTranAmount,
                   ISNULL(i.dblShippingAmt, 0) AS dblShippingAmt,
                   ISNULL(i.dblJuris1Amt, 0) + ISNULL(i.dblJuris2Amt, 0) AS dblTaxAmount,
                   i.sTermsDesc, i.sDeliveryDesc, i.sPurchaseOrder,
                   i.sScopeTypeDesc, i.sSerialNumber,
                   ISNULL(i.sRepFirst, '') + ' ' + ISNULL(i.sRepLast, '') AS SalesRep,
                   i.dtTranDate, i.dtDueDate
            FROM tblInvoice i
            WHERE i.lInvoiceKey = @id
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new { message = "Invoice not found." });

        var dueDate = reader["dtDueDate"] as DateTime?;
        var tranDate = reader["dtTranDate"] as DateTime?;
        var agingDays = CalcAgingDays(dueDate, tranDate);

        await reader.CloseAsync();

        // Load line items
        const string detailSql = """
            SELECT d.lInvoiceDetlKey, d.sItemDescription,
                   ISNULL(d.dblItemAmount, 0) AS dblItemAmount,
                   ISNULL(d.dblItemValue, 0) AS dblItemValue,
                   CAST(d.mComments AS nvarchar(max)) AS mComments
            FROM tblInvoiceDetl d
            WHERE d.lInvoiceKey = @id
            ORDER BY d.lInvoiceDetlKey
            """;

        await using var detailCmd = new SqlCommand(detailSql, conn);
        detailCmd.CommandTimeout = 30;
        detailCmd.Parameters.AddWithValue("@id", id);
        await using var detailReader = await detailCmd.ExecuteReaderAsync();
        var lineItems = new List<InvoiceLineItem>();
        while (await detailReader.ReadAsync())
        {
            lineItems.Add(new InvoiceLineItem(
                DetailKey: Convert.ToInt32(detailReader["lInvoiceDetlKey"]),
                Description: detailReader["sItemDescription"]?.ToString() ?? "",
                Amount: Convert.ToDouble(detailReader["dblItemAmount"]),
                Value: Convert.ToDouble(detailReader["dblItemValue"]),
                Comments: detailReader["mComments"]?.ToString()
            ));
        }

        // Re-read header for detail construction
        await using var cmd2 = new SqlCommand(sql, conn);
        cmd2.CommandTimeout = 30;
        cmd2.Parameters.AddWithValue("@id", id);
        await using var r = await cmd2.ExecuteReaderAsync();
        await r.ReadAsync();

        return Ok(new InvoiceDetail(
            InvoiceKey: Convert.ToInt32(r["lInvoiceKey"]),
            RepairKey: r["lRepairKey"] as int?,
            ClientKey: r["lClientKey"] as int?,
            DepartmentKey: r["lDepartmentKey"] as int?,
            InvoiceNumber: r["sTranNumber"]?.ToString() ?? "",
            ClientName: r["sBillName1"]?.ToString() ?? "",
            BillName: (r["sBillName1"]?.ToString() ?? "") + (string.IsNullOrWhiteSpace(r["sBillName2"]?.ToString()) ? "" : " " + r["sBillName2"]),
            BillAddress: r["sBillAddr1"]?.ToString() ?? "",
            BillCity: r["sBillCity"]?.ToString() ?? "",
            BillState: r["sBillState"]?.ToString() ?? "",
            BillZip: r["sBillZip"]?.ToString() ?? "",
            ShipName: r["sShipName1"]?.ToString() ?? "",
            ShipAddress: r["sShipAddr1"]?.ToString() ?? "",
            ShipCity: r["sShipCity"]?.ToString() ?? "",
            ShipState: r["sShipState"]?.ToString() ?? "",
            ShipZip: r["sShipZip"]?.ToString() ?? "",
            Amount: Convert.ToDouble(r["dblTranAmount"]),
            ShippingAmount: Convert.ToDouble(r["dblShippingAmt"]),
            TaxAmount: Convert.ToDouble(r["dblTaxAmount"]),
            PaymentTerms: r["sTermsDesc"]?.ToString() ?? "",
            DeliveryMethod: r["sDeliveryDesc"]?.ToString() ?? "",
            PurchaseOrder: r["sPurchaseOrder"]?.ToString() ?? "",
            ScopeType: r["sScopeTypeDesc"]?.ToString() ?? "",
            SerialNumber: r["sSerialNumber"]?.ToString() ?? "",
            SalesRep: r["SalesRep"]?.ToString()?.Trim() ?? "",
            IssuedDate: (r["dtTranDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            DueDate: (r["dtDueDate"] as DateTime?)?.ToString("yyyy-MM-dd"),
            AgingDays: agingDays,
            Status: DeriveStatus(false, false, agingDays),
            LineItems: lineItems
        ));
    }

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            where.Add("(p.CustomerName LIKE @search OR i.sTranNumber LIKE @search)");

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";

        var countSql = $"""
            SELECT COUNT(*) FROM tblInvoicePayments p
            LEFT JOIN tblInvoice i ON i.lInvoiceKey = p.lInvoiceKey
            {whereClause}
            """;

        var dataSql = $"""
            SELECT p.lInvoicePaymentID, p.lInvoiceKey, p.dtPaymentDate,
                   p.nInvoicePayment, p.CustomerName,
                   i.sTranNumber
            FROM tblInvoicePayments p
            LEFT JOIN tblInvoice i ON i.lInvoiceKey = p.lInvoiceKey
            {whereClause}
            ORDER BY p.dtPaymentDate DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) countCmd.Parameters.AddWithValue("@search", $"%{search}%");
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        if (!string.IsNullOrWhiteSpace(search)) dataCmd.Parameters.AddWithValue("@search", $"%{search}%");
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<InvoicePaymentItem>();
        while (await reader.ReadAsync())
        {
            items.Add(new InvoicePaymentItem(
                PaymentId: Convert.ToInt32(reader["lInvoicePaymentID"]),
                InvoiceKey: Convert.ToInt32(reader["lInvoiceKey"]),
                InvoiceNumber: reader["sTranNumber"]?.ToString() ?? "",
                ClientName: reader["CustomerName"]?.ToString() ?? "",
                PaymentAmount: Convert.ToDecimal(reader["nInvoicePayment"]),
                PaymentDate: (reader["dtPaymentDate"] as DateTime?)?.ToString("yyyy-MM-dd")
            ));
        }

        return Ok(new PaymentListResponse(items, totalCount));
    }

    [HttpGet("on-hold")]
    public async Task<IActionResult> GetClientsOnHold(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string countSql = "SELECT COUNT(*) FROM tblClient c WHERE c.bActive = 0";
        const string dataSql = """
            SELECT c.lClientKey, c.sClientName1,
                   (SELECT TOP 1 d.sDepartmentName FROM tblDepartment d WHERE d.lClientKey = c.lClientKey) AS DeptName
            FROM tblClient c
            WHERE c.bActive = 0
            ORDER BY c.sClientName1
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            """;

        await using var countCmd = new SqlCommand(countSql, conn);
        countCmd.CommandTimeout = 30;
        var totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var dataCmd = new SqlCommand(dataSql, conn);
        dataCmd.CommandTimeout = 30;
        dataCmd.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
        dataCmd.Parameters.AddWithValue("@pageSize", pageSize);

        await using var reader = await dataCmd.ExecuteReaderAsync();
        var items = new List<ClientOnHold>();
        while (await reader.ReadAsync())
        {
            items.Add(new ClientOnHold(
                ClientKey: Convert.ToInt32(reader["lClientKey"]),
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                DepartmentName: reader["DeptName"]?.ToString() ?? "",
                OnHoldDate: null,
                Reason: "Inactive"
            ));
        }

        return Ok(new HoldListResponse(items, totalCount));
    }

    [HttpGet("gl-accounts")]
    public async Task<IActionResult> GetGLAccounts()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT
                GLAccount,
                sBatchNumber,
                ISNULL(sDescription, '') AS sDescription,
                dTranDate,
                ISNULL(TRY_CAST(dblDebitAmount  AS FLOAT), 0) AS dblDebitAmount,
                ISNULL(TRY_CAST(dblCreditAmount AS FLOAT), 0) AS dblCreditAmount,
                ISNULL(TRY_CAST(dblDebitAmount  AS FLOAT), 0)
                    - ISNULL(TRY_CAST(dblCreditAmount AS FLOAT), 0) AS dblBalance
            FROM tblGP_InvoiceStaging
            WHERE GLAccount IS NOT NULL AND GLAccount <> ''
            ORDER BY GLAccount, dTranDate DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<GLAccountItem>();
        while (await reader.ReadAsync())
        {
            DateTime? tranDate = reader["dTranDate"] as DateTime?;
            items.Add(new GLAccountItem(
                AccountNumber: reader["GLAccount"]?.ToString() ?? "",
                BatchNumber: reader["sBatchNumber"]?.ToString() ?? "",
                Description: reader["sDescription"]?.ToString() ?? "",
                TransactionDate: tranDate?.ToString("yyyy-MM-dd"),
                DebitAmount: Convert.ToDouble(reader["dblDebitAmount"]),
                CreditAmount: Convert.ToDouble(reader["dblCreditAmount"]),
                Balance: Convert.ToDouble(reader["dblBalance"])
            ));
        }

        return Ok(items);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Outstanding A/R: sum of all non-zero invoices
        const string arSql = """
            SELECT ISNULL(SUM(dblTranAmount), 0) AS TotalAR,
                   COUNT(*) AS TotalInvoices
            FROM tblInvoice
            WHERE dblTranAmount > 0
            """;

        await using var arCmd = new SqlCommand(arSql, conn);
        arCmd.CommandTimeout = 30;
        await using var arReader = await arCmd.ExecuteReaderAsync();
        double totalAR = 0;
        if (await arReader.ReadAsync())
            totalAR = arReader["TotalAR"] == DBNull.Value ? 0 : Convert.ToDouble(arReader["TotalAR"]);
        await arReader.CloseAsync();

        // Overdue: invoices where due date > 90 days ago
        const string overdueSql = """
            SELECT COUNT(*) FROM tblInvoice
            WHERE dblTranAmount > 0 AND dtDueDate < DATEADD(day, -90, GETDATE())
            """;
        await using var overdueCmd = new SqlCommand(overdueSql, conn);
        overdueCmd.CommandTimeout = 30;
        var overdueCount = Convert.ToInt32(await overdueCmd.ExecuteScalarAsync());

        // Average aging days — limit to last 12 months to avoid skew from old invoices
        const string agingSql = """
            SELECT ISNULL(AVG(DATEDIFF(day, ISNULL(dtDueDate, dtTranDate), GETDATE())), 0)
            FROM tblInvoice
            WHERE dblTranAmount > 0
              AND dtDueDate IS NOT NULL
              AND dtTranDate >= DATEADD(year, -1, GETDATE())
            """;
        await using var agingCmd = new SqlCommand(agingSql, conn);
        agingCmd.CommandTimeout = 30;
        var avgAging = Convert.ToInt32(await agingCmd.ExecuteScalarAsync());

        // Drafts: invoices not exported
        const string draftsSql = "SELECT COUNT(*) FROM tblInvoice WHERE sExported IS NULL OR sExported = ''";
        await using var draftsCmd = new SqlCommand(draftsSql, conn);
        draftsCmd.CommandTimeout = 30;
        var draftsCount = Convert.ToInt32(await draftsCmd.ExecuteScalarAsync());

        // On hold: inactive clients
        const string holdSql = "SELECT COUNT(*) FROM tblClient WHERE bActive = 0";
        await using var holdCmd = new SqlCommand(holdSql, conn);
        holdCmd.CommandTimeout = 30;
        var holdCount = Convert.ToInt32(await holdCmd.ExecuteScalarAsync());

        // Paid MTD from tblInvoicePayments (cash collected)
        const string paidSql = """
            SELECT ISNULL(SUM(nInvoicePayment), 0) FROM tblInvoicePayments
            WHERE dtPaymentDate >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)
            """;
        await using var paidCmd = new SqlCommand(paidSql, conn);
        paidCmd.CommandTimeout = 30;
        var paidResult = await paidCmd.ExecuteScalarAsync();
        var paidMTD = paidResult == null || paidResult == DBNull.Value ? 0.0 : Convert.ToDouble(paidResult);

        // Revenue MTD from tblRepair (shipped revenue — consistent with Dashboard KPIs)
        const string revMtdSql = """
            SELECT ISNULL(SUM(dblAmtRepair), 0) FROM tblRepair
            WHERE dtShipDate IS NOT NULL
              AND CAST(dtShipDate AS DATE) >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)
              AND dblAmtRepair > 0
            """;
        await using var revMtdCmd = new SqlCommand(revMtdSql, conn);
        revMtdCmd.CommandTimeout = 30;
        var revMtdResult = await revMtdCmd.ExecuteScalarAsync();
        var revenueMTD = revMtdResult == null || revMtdResult == DBNull.Value ? 0.0 : Convert.ToDouble(revMtdResult);

        return Ok(new FinancialStats(
            OutstandingAR: totalAR,
            OverdueCount: overdueCount,
            AvgDaysToPay: Math.Abs(avgAging),
            DraftsCount: draftsCount,
            OnHoldCount: holdCount,
            PaidMTD: paidMTD,
            DSO: Math.Abs(avgAging),
            RevenueMTD: revenueMTD
        ));
    }

    [HttpGet("at-risk")]
    public async Task<IActionResult> GetAtRisk(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int minInvoices = 1,
        [FromQuery] bool includeOutsource = true,
        [FromQuery] bool includeLabor = true,
        [FromQuery] bool includeMaterial = true,
        [FromQuery] bool includeShipping = true,
        [FromQuery] bool includeCommissions = true)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var dateFrom = from != null && DateTime.TryParse(from, out var df) ? df : DateTime.Now.AddMonths(-12);
        var dateTo = to != null && DateTime.TryParse(to, out var dt2) ? dt2 : DateTime.Now;

        const string sql = """
            SELECT
                r.lDepartmentKey,
                ISNULL(d.sDepartmentName, 'Unknown') AS sDepartmentName,
                ISNULL(cl.sClientName1, '') AS sClientName1,
                COUNT(r.lRepairKey) AS RepairCount,
                ISNULL(SUM(r.dblAmtRepair), 0) AS Revenue,
                ISNULL(SUM(r.dblAmtCostLabor), 0) AS LaborCost,
                ISNULL(SUM(r.dblAmtCostMaterial), 0) AS MaterialCost,
                ISNULL(SUM(r.dblOutSourceCost), 0) AS OutsourceCost,
                ISNULL(SUM(r.dblAmtShipping), 0) AS ShippingCost,
                ISNULL(SUM(r.dblAmtCommission), 0) AS CommissionCost
            FROM tblRepair r
            LEFT JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
            LEFT JOIN tblClient cl ON d.lClientKey = cl.lClientKey
            WHERE r.dtDateIn >= @dateFrom AND r.dtDateIn <= @dateTo
              AND r.dblAmtRepair > 0
            GROUP BY r.lDepartmentKey, d.sDepartmentName, cl.sClientName1
            HAVING COUNT(r.lRepairKey) >= @minInvoices
            ORDER BY SUM(r.dblAmtRepair) DESC
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@dateFrom", dateFrom);
        cmd.Parameters.AddWithValue("@dateTo", dateTo);
        cmd.Parameters.AddWithValue("@minInvoices", minInvoices);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<AtRiskItem>();
        while (await reader.ReadAsync())
        {
            var revenue = Convert.ToDecimal(reader["Revenue"]);
            var labor = includeLabor ? Convert.ToDecimal(reader["LaborCost"]) : 0;
            var material = includeMaterial ? Convert.ToDecimal(reader["MaterialCost"]) : 0;
            var outsource = includeOutsource ? Convert.ToDecimal(reader["OutsourceCost"]) : 0;
            var shipping = includeShipping ? Convert.ToDecimal(reader["ShippingCost"]) : 0;
            var commission = includeCommissions ? Convert.ToDecimal(reader["CommissionCost"]) : 0;
            var totalExpenses = labor + material + outsource + shipping + commission;
            var margin = revenue - totalExpenses;
            var marginPct = revenue > 0 ? Math.Round(margin / revenue * 100, 1) : 0;

            items.Add(new AtRiskItem(
                DepartmentKey: Convert.ToInt32(reader["lDepartmentKey"]),
                DepartmentName: reader["sDepartmentName"]?.ToString() ?? "",
                ClientName: reader["sClientName1"]?.ToString() ?? "",
                RepairCount: Convert.ToInt32(reader["RepairCount"]),
                Revenue: revenue,
                LaborCost: labor,
                MaterialCost: material,
                OutsourceCost: outsource,
                ShippingCost: shipping,
                CommissionCost: commission,
                TotalExpenses: totalExpenses,
                Margin: margin,
                MarginPct: marginPct
            ));
        }

        return Ok(items);
    }

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] string groupBy = "month")
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        var dateFrom = from != null && DateTime.TryParse(from, out var df) ? df : DateTime.Now.AddMonths(-12);
        var dateTo = to != null && DateTime.TryParse(to, out var dt2) ? dt2 : DateTime.Now;

        const string sql = """
            SELECT
                FORMAT(r.dtDateIn, 'yyyy-MM') AS MonthKey,
                FORMAT(r.dtDateIn, 'MMM yyyy') AS MonthLabel,
                COUNT(r.lRepairKey) AS RepairCount,
                ISNULL(SUM(r.dblAmtRepair), 0) AS Revenue,
                ISNULL(SUM(r.dblAmtCostLabor), 0) AS LaborCost,
                ISNULL(SUM(r.dblAmtCostMaterial), 0) AS MaterialCost,
                ISNULL(SUM(r.dblOutSourceCost), 0) AS OutsourceCost
            FROM tblRepair r
            WHERE r.dtDateIn >= @dateFrom AND r.dtDateIn <= @dateTo
              AND r.dblAmtRepair > 0
            GROUP BY FORMAT(r.dtDateIn, 'yyyy-MM'), FORMAT(r.dtDateIn, 'MMM yyyy')
            ORDER BY MonthKey
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@dateFrom", dateFrom);
        cmd.Parameters.AddWithValue("@dateTo", dateTo);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<TrendingItem>();
        while (await reader.ReadAsync())
        {
            var revenue = Convert.ToDecimal(reader["Revenue"]);
            var labor = Convert.ToDecimal(reader["LaborCost"]);
            var material = Convert.ToDecimal(reader["MaterialCost"]);
            var outsource = Convert.ToDecimal(reader["OutsourceCost"]);
            var totalExpenses = labor + material + outsource;
            var margin = revenue - totalExpenses;
            var marginPct = revenue > 0 ? Math.Round(margin / revenue * 100, 1) : 0;

            items.Add(new TrendingItem(
                Month: reader["MonthLabel"]?.ToString() ?? "",
                RepairCount: Convert.ToInt32(reader["RepairCount"]),
                Revenue: revenue,
                LaborCost: labor,
                MaterialCost: material,
                OutsourceCost: outsource,
                TotalExpenses: totalExpenses,
                Margin: margin,
                MarginPct: marginPct
            ));
        }

        return Ok(items);
    }
}
