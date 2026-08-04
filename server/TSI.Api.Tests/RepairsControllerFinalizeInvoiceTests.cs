using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using TSI.Api.Controllers;
using TSI.Api.Models;
using TSI.Api.Services;

namespace TSI.Api.Tests;

/// <summary>
/// Controller-level integration tests for POST /api/repairs/{repairKey}/finalize-invoice,
/// centred on the multi-invoice-row guard. Hits localhost\WinscopeWeb so the
/// transaction, the UPDLOCK/HOLDLOCK aggregate, the tblInvoiceDetl insert and the
/// tblGP_InvoiceStaging write are all genuine — the defect this class pins down is a
/// double-BILL, and a mocked DB would not have shown it.
///
/// Repair↔invoice is NOT 1:1 in the real data (37 repairs carry several tblInvoice
/// rows, 3 of them mixing finalized with draft). The money test is
/// <see cref="FinalizeInvoice_RepairWithOlderFinalizedAndNewerDraft_RefusesWith409AndCreatesNoSecondFinalizedInvoice"/>:
/// against the pre-fix TOP-1-newest lookup it returned 200, flipped the draft, left the
/// repair with TWO finalized invoices and staged a second row to GP.
///
/// SHARED DATABASE. Every fixture row is inserted here, its identity key captured, and
/// deleted by that exact key in a finally. Nothing is deleted by pattern, nothing is
/// truncated, and no assertion counts rows the tests did not create.
///
/// <see cref="IInvoiceNumberService"/> is a THROWING stub on purpose: none of these
/// tests should reach the create-invoice path, so a call would mean the shared WO
/// counter had been burned.
/// </summary>
public sealed class RepairsControllerFinalizeInvoiceTests
{
    private const string ConnectionString =
        "Server=localhost;Database=WinscopeWeb;Trusted_Connection=True;TrustServerCertificate=True;";

    private readonly IConfiguration _config;
    private readonly IInvoiceNumberService _invoiceNumbers = new ThrowingInvoiceNumberService();

    private readonly int _userKey;
    private readonly int _scopeKey;
    private readonly int _departmentKey;
    private readonly int _repairItemKey;

    public RepairsControllerFinalizeInvoiceTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
            })
            .Build();

        using var conn = new SqlConnection(ConnectionString);
        conn.Open();

        _userKey = QueryScalarInt(
            conn,
            "SELECT TOP 1 Id FROM dbo.AspNetUsers WHERE Id > 0 ORDER BY Id DESC",
            "AspNetUsers (any user with Id > 0)");

        // The scope must NOT be an instrument ('I') — FinalizeInvoice rejects those
        // outright. Take a scope/department pair off an existing repair so both FKs
        // are known-good; we create no lookup data of our own.
        using (var fkCmd = new SqlCommand(
            "SELECT TOP 1 s.lScopeKey, r.lDepartmentKey " +
            "FROM tblScope s " +
            "JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey " +
            "JOIN tblRepair r ON r.lScopeKey = s.lScopeKey " +
            "JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey " +
            "WHERE ISNULL(st.sRigidOrFlexible, '') NOT IN ('', 'I')", conn))
        using (var fr = fkCmd.ExecuteReader())
        {
            if (!fr.Read())
                throw new InvalidOperationException(
                    "Test setup: no scope with a non-instrument tblScopeType joined to a repair with a department.");
            _scopeKey = Convert.ToInt32(fr["lScopeKey"], CultureInfo.InvariantCulture);
            _departmentKey = Convert.ToInt32(fr["lDepartmentKey"], CultureInfo.InvariantCulture);
        }

        _repairItemKey = QueryScalarInt(
            conn,
            "SELECT TOP 1 lRepairItemKey FROM tblRepairItem ORDER BY lRepairItemKey",
            "tblRepairItem (any repair item)");
    }

    // ─── Test A — the money test ─────────────────────────────────────────────

    [Fact]
    public async Task FinalizeInvoice_RepairWithOlderFinalizedAndNewerDraft_RefusesWith409AndCreatesNoSecondFinalizedInvoice()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            // Order matters: the FINALIZED row must get the LOWER lInvoiceKey so the
            // pre-fix "TOP 1 ... ORDER BY lInvoiceKey DESC" lookup lands on the DRAFT
            // and reports the repair as un-finalized.
            var finalized = await InsertInvoiceAsync(fixture.RepairKey, isFinalized: true);
            var draft = await InsertInvoiceAsync(fixture.RepairKey, isFinalized: false);
            fixture.Invoices.Add(finalized);
            fixture.Invoices.Add(draft);

            var controller = CreateController();
            var actionResult = await controller.FinalizeInvoice(fixture.RepairKey);

            var after = await ReadInvoiceStateAsync(fixture);
            var diagnostic =
                $"Observed after FinalizeInvoice on a repair with an older FINALIZED invoice " +
                $"(key {finalized.InvoiceKey}) and a newer DRAFT (key {draft.InvoiceKey}): " +
                $"result={actionResult.GetType().Name}; " +
                $"draft bFinalized={after.DraftFinalizedFlagText}; " +
                $"finalized-invoice count among the two fixture keys={after.FinalizedCount} (must stay 1); " +
                $"tblGP_InvoiceStaging rows for the fixture tran numbers={after.StagingRowCount} (must stay 0); " +
                $"tblInvoiceDetl rows for the fixture invoice keys={after.DetailRowCount} (must stay 0).";

            Assert.True(actionResult is ConflictObjectResult,
                "A repair carrying more than one tblInvoice row has no single invoice to finalize, " +
                "so the endpoint must refuse with 409 Conflict. " + diagnostic);
            Assert.Equal(StatusCodes.Status409Conflict, ((ConflictObjectResult)actionResult).StatusCode);

            Assert.False(after.DraftFinalized,
                "The draft invoice must NOT have been flipped to finalized. " + diagnostic);
            Assert.True(after.FinalizedCount == 1,
                "The repair was already billed once; finalizing again would bill it twice. " + diagnostic);
            Assert.True(after.StagingRowCount == 0,
                "A second tblGP_InvoiceStaging row means the repair would be pushed to GP twice. " + diagnostic);
            Assert.True(after.DetailRowCount == 0,
                "No invoice detail should have been written for a refused finalize. " + diagnostic);
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Test B — idempotent retry still works ───────────────────────────────

    [Fact]
    public async Task FinalizeInvoice_SingleFinalizedInvoice_PlainPost_IsStillAnIdempotentNoOp()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            // A GP-process stamp from a previous drain. An idempotent retry must not
            // clear it — clearing it is what re-stages the invoice to GP.
            var gpProcessed = new DateTime(2020, 1, 15, 0, 0, 0, DateTimeKind.Unspecified);
            var only = await InsertInvoiceAsync(fixture.RepairKey, isFinalized: true, gpProcessDate: gpProcessed);
            fixture.Invoices.Add(only);

            var controller = CreateController();
            var actionResult = await controller.FinalizeInvoice(fixture.RepairKey);

            var ok = Assert.IsType<OkObjectResult>(actionResult);
            var body = Assert.IsType<FinalizeInvoiceResponse>(ok.Value);
            Assert.True(body.AlreadyFinalized, "A plain POST against a finalized invoice is an idempotent retry.");
            Assert.False(body.ReIssue);
            Assert.False(body.Staged);
            Assert.Equal(0, body.Suffix);
            Assert.Equal(only.InvoiceKey, body.InvoiceKey);

            var after = await ReadInvoiceStateAsync(fixture);
            Assert.Equal(1, after.FinalizedCount);
            Assert.Equal(0, after.StagingRowCount);
            Assert.Equal(0, after.DetailRowCount);

            using var conn = new SqlConnection(ConnectionString);
            await conn.OpenAsync();
            using var cmd = new SqlCommand(
                "SELECT ISNULL(sTranNumberSuffix, 0) AS sTranNumberSuffix, dtGPProcessDate " +
                "FROM tblInvoice WHERE lInvoiceKey = @k", conn);
            cmd.Parameters.AddWithValue("@k", only.InvoiceKey);
            using var r = await cmd.ExecuteReaderAsync();
            Assert.True(await r.ReadAsync(), "The fixture invoice row should still exist.");
            Assert.Equal(0, Convert.ToInt32(r["sTranNumberSuffix"], CultureInfo.InvariantCulture));
            Assert.True(r["dtGPProcessDate"] != DBNull.Value,
                "An idempotent retry must leave dtGPProcessDate alone — clearing it re-stages to GP.");
            Assert.Equal(gpProcessed, Convert.ToDateTime(r["dtGPProcessDate"], CultureInfo.InvariantCulture));
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Test C — healthy single-draft finalize still works ──────────────────

    [Fact]
    public async Task FinalizeInvoice_SingleDraftInvoice_FinalizesThatRowAndStagesIt()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            var draft = await InsertInvoiceAsync(fixture.RepairKey, isFinalized: false);
            fixture.Invoices.Add(draft);

            var controller = CreateController();
            var actionResult = await controller.FinalizeInvoice(fixture.RepairKey);

            var ok = Assert.IsType<OkObjectResult>(actionResult);
            var body = Assert.IsType<FinalizeInvoiceResponse>(ok.Value);
            Assert.Equal(draft.InvoiceKey, body.InvoiceKey);
            Assert.True(body.Finalized);
            Assert.False(body.AlreadyFinalized);
            Assert.False(body.ReIssue);
            Assert.Equal(ApprovedLinePrice, body.ApprovedTotal);
            Assert.Equal(1, body.DetailRows);
            Assert.True(body.Staged, "A finalized invoice with a positive total stages to GP.");

            var after = await ReadInvoiceStateAsync(fixture);
            Assert.Equal(1, after.FinalizedCount);
            Assert.Equal(1, after.DetailRowCount);
            Assert.Equal(1, after.StagingRowCount);
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Test D — reissue against a multi-row repair is refused too ──────────

    [Fact]
    public async Task FinalizeInvoice_ReissueOnRepairWithSeveralInvoiceRows_RefusesWith409AndMutatesNothing()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            var finalized = await InsertInvoiceAsync(fixture.RepairKey, isFinalized: true);
            var draft = await InsertInvoiceAsync(fixture.RepairKey, isFinalized: false);
            fixture.Invoices.Add(finalized);
            fixture.Invoices.Add(draft);

            var controller = CreateController();
            var actionResult = await controller.FinalizeInvoice(
                fixture.RepairKey, new FinalizeInvoiceRequest(Reissue: true, Reason: "test"));

            var after = await ReadInvoiceStateAsync(fixture);
            var diagnostic =
                $"Observed after a RE-ISSUE against a repair with two invoice rows " +
                $"(finalized key {finalized.InvoiceKey}, draft key {draft.InvoiceKey}): " +
                $"result={actionResult.GetType().Name}; " +
                $"draft bFinalized={after.DraftFinalizedFlagText}; " +
                $"finalized-invoice count={after.FinalizedCount}; " +
                $"staging rows={after.StagingRowCount}; detail rows={after.DetailRowCount}.";

            Assert.True(actionResult is ConflictObjectResult,
                "A re-issue needs ONE unambiguous invoice identity; with several rows any pick is a " +
                "tie-break over which money row gets rewritten, so it must be refused. " + diagnostic);
            Assert.Equal(StatusCodes.Status409Conflict, ((ConflictObjectResult)actionResult).StatusCode);

            Assert.False(after.DraftFinalized, diagnostic);
            Assert.Equal(1, after.FinalizedCount);
            Assert.Equal(0, after.StagingRowCount);
            Assert.Equal(0, after.DetailRowCount);

            // The suffix on the pre-existing finalized row must be untouched — a
            // refused re-issue rewrites nothing.
            using var conn = new SqlConnection(ConnectionString);
            await conn.OpenAsync();
            using var cmd = new SqlCommand(
                "SELECT ISNULL(sTranNumberSuffix, 0) FROM tblInvoice WHERE lInvoiceKey = @k", conn);
            cmd.Parameters.AddWithValue("@k", finalized.InvoiceKey);
            Assert.Equal(0, Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture));
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Fixtures ────────────────────────────────────────────────────────────

    private const decimal ApprovedLinePrice = 123.45m;

    private sealed record InvoiceFixture(int InvoiceKey, string TranNumber);

    private sealed class RepairFixture
    {
        public int RepairKey { get; init; }
        public int RepairItemTranKey { get; init; }
        public List<InvoiceFixture> Invoices { get; } = new();
    }

    private sealed record InvoiceState(
        bool DraftFinalized,
        string DraftFinalizedFlagText,
        int FinalizedCount,
        int StagingRowCount,
        int DetailRowCount);

    /// <summary>
    /// A repair that clears every finalize gate (PO present, not tracking-required,
    /// not outsourced, non-instrument scope) plus one approved line.
    /// </summary>
    private async Task<RepairFixture> CreateRepairFixtureAsync()
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        // tblRepair and tblRepairItemTran both carry enabled triggers, which SQL Server
        // forbids alongside a bare OUTPUT clause — hence OUTPUT … INTO a table variable.
        int repairKey;
        using (var cmd = new SqlCommand("""
            DECLARE @ids TABLE (lRepairKey int);
            INSERT INTO tblRepair (lScopeKey, lDepartmentKey, sPurchaseOrder,
                bTrackingNumberRequired, bOutsourced, dtDateIn, dblAmtRepair, sWorkOrderNumber)
            OUTPUT INSERTED.lRepairKey INTO @ids
            VALUES (@scopeKey, @deptKey, @po, 0, 0, GETDATE(), 0, @wo);
            SELECT lRepairKey FROM @ids;
            """, conn))
        {
            cmd.Parameters.AddWithValue("@scopeKey", _scopeKey);
            cmd.Parameters.AddWithValue("@deptKey", _departmentKey);
            cmd.Parameters.AddWithValue("@po", "ZZT-TEST-PO");
            cmd.Parameters.AddWithValue("@wo", NewFixtureTag());
            repairKey = Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
        }

        int repairItemTranKey;
        using (var cmd = new SqlCommand("""
            DECLARE @ids TABLE (lRepairItemTranKey int);
            INSERT INTO tblRepairItemTran (lRepairKey, lRepairItemKey, sApproved,
                dblRepairPrice, dblRepairPriceBase)
            OUTPUT INSERTED.lRepairItemTranKey INTO @ids
            VALUES (@repairKey, @repairItemKey, 'Y', @price, @price);
            SELECT lRepairItemTranKey FROM @ids;
            """, conn))
        {
            cmd.Parameters.AddWithValue("@repairKey", repairKey);
            cmd.Parameters.AddWithValue("@repairItemKey", _repairItemKey);
            cmd.Parameters.AddWithValue("@price", ApprovedLinePrice);
            repairItemTranKey = Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
        }

        return new RepairFixture { RepairKey = repairKey, RepairItemTranKey = repairItemTranKey };
    }

    /// <summary>
    /// Inserts a tblInvoice row DIRECTLY with a made-up unique sTranNumber. The
    /// invoice-number service is never called, so the shared daily counter is
    /// never advanced.
    /// </summary>
    private async Task<InvoiceFixture> InsertInvoiceAsync(
        int repairKey, bool isFinalized, DateTime? gpProcessDate = null)
    {
        var tranNumber = NewFixtureTag();

        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        using var cmd = new SqlCommand("""
            INSERT INTO tblInvoice (lRepairKey, lClientKey, lDepartmentKey, lScopeKey,
                dtTranDate, dtDueDate, dblTranAmount, sPurchaseOrder, sTranNumber,
                sInvoiceStatus, bIsManual, bIsVoid, bFinalized, dtGPProcessDate,
                Created_UserKey, Created_datetime)
            OUTPUT INSERTED.lInvoiceKey
            SELECT r.lRepairKey, d.lClientKey, r.lDepartmentKey, r.lScopeKey,
                GETDATE(), GETDATE(), @amount, r.sPurchaseOrder, @tranNumber,
                @status, 0, 0, @finalized, @gpProcessDate,
                @userKey, GETDATE()
            FROM tblRepair r
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            WHERE r.lRepairKey = @repairKey;
            """, conn);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        cmd.Parameters.AddWithValue("@amount", ApprovedLinePrice);
        cmd.Parameters.AddWithValue("@tranNumber", tranNumber);
        cmd.Parameters.AddWithValue("@status", isFinalized ? "Finalized" : "Draft");
        cmd.Parameters.AddWithValue("@finalized", isFinalized);
        cmd.Parameters.AddWithValue("@gpProcessDate", (object?)gpProcessDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@userKey", _userKey);

        var raw = await cmd.ExecuteScalarAsync();
        if (raw is null || raw == DBNull.Value)
            throw new InvalidOperationException(
                $"Test setup: could not insert a tblInvoice fixture row for repair {repairKey}.");

        return new InvoiceFixture(Convert.ToInt32(raw, CultureInfo.InvariantCulture), tranNumber);
    }

    /// <summary>
    /// Post-call state, read back BY THE FIXTURE'S OWN KEYS only — never a table-wide
    /// count, which would be meaningless on a shared database.
    /// </summary>
    private async Task<InvoiceState> ReadInvoiceStateAsync(RepairFixture fixture)
    {
        var keys = fixture.Invoices.Select(i => i.InvoiceKey).ToList();
        var tranNumbers = fixture.Invoices.Select(i => i.TranNumber).ToList();

        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        var flags = new Dictionary<int, bool>();
        using (var cmd = new SqlCommand(
            $"SELECT lInvoiceKey, ISNULL(bFinalized, 0) AS bFinalized FROM tblInvoice " +
            $"WHERE lInvoiceKey IN ({InClause(keys.Count, "k")})", conn))
        {
            for (var i = 0; i < keys.Count; i++) cmd.Parameters.AddWithValue($"@k{i}", keys[i]);
            using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync())
                flags[Convert.ToInt32(r["lInvoiceKey"], CultureInfo.InvariantCulture)] =
                    Convert.ToBoolean(r["bFinalized"], CultureInfo.InvariantCulture);
        }

        // "The draft" is the highest-keyed fixture invoice — the one the pre-fix
        // TOP-1-newest lookup would have picked and flipped.
        var newestKey = keys.Count == 0 ? 0 : keys.Max();
        var draftFinalized = flags.TryGetValue(newestKey, out var f) && f;

        int stagingCount;
        using (var cmd = new SqlCommand(
            $"SELECT COUNT(*) FROM tblGP_InvoiceStaging " +
            $"WHERE sTranNumberNoSuffix IN ({InClause(tranNumbers.Count, "t")})", conn))
        {
            for (var i = 0; i < tranNumbers.Count; i++) cmd.Parameters.AddWithValue($"@t{i}", tranNumbers[i]);
            stagingCount = Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
        }

        int detailCount;
        using (var cmd = new SqlCommand(
            $"SELECT COUNT(*) FROM tblInvoiceDetl WHERE lInvoiceKey IN ({InClause(keys.Count, "k")})", conn))
        {
            for (var i = 0; i < keys.Count; i++) cmd.Parameters.AddWithValue($"@k{i}", keys[i]);
            detailCount = Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
        }

        return new InvoiceState(
            DraftFinalized: draftFinalized,
            DraftFinalizedFlagText: flags.TryGetValue(newestKey, out var g) ? (g ? "1" : "0") : "row missing",
            FinalizedCount: flags.Values.Count(v => v),
            StagingRowCount: stagingCount,
            DetailRowCount: detailCount);
    }

    /// <summary>
    /// Deletes exactly the rows this fixture created, child-first — including any
    /// staging/detail rows the code under test wrote, so a failing (red) run leaves
    /// the shared database as clean as a passing one.
    /// </summary>
    private static async Task CleanupAsync(RepairFixture fixture)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        foreach (var invoice in fixture.Invoices)
        {
            await ExecuteAsync(conn,
                "DELETE FROM tblGP_InvoiceStaging WHERE lInvoiceKey = @k OR sTranNumberNoSuffix = @t OR sTranNumber = @t",
                ("@k", invoice.InvoiceKey), ("@t", invoice.TranNumber));
            await ExecuteAsync(conn,
                "DELETE FROM tblInvoiceDetl WHERE lInvoiceKey = @k", ("@k", invoice.InvoiceKey));
            await ExecuteAsync(conn,
                "DELETE FROM tblInvoice WHERE lInvoiceKey = @k", ("@k", invoice.InvoiceKey));
        }

        if (fixture.RepairItemTranKey > 0)
            await ExecuteAsync(conn,
                "DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @k", ("@k", fixture.RepairItemTranKey));

        if (fixture.RepairKey > 0)
        {
            // trRepairPrimaryAndApproved rebuilds this roll-up whenever a line changes and
            // leaves nothing behind once the last line is gone, but delete it by our own
            // repair key anyway so cleanup does not depend on trigger behaviour.
            await ExecuteAsync(conn,
                "DELETE FROM tblRepairPrimaryAndApprovedAmounts WHERE lRepairKey = @k", ("@k", fixture.RepairKey));
            await ExecuteAsync(conn,
                "DELETE FROM tblRepair WHERE lRepairKey = @k", ("@k", fixture.RepairKey));
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private RepairsController CreateController()
    {
        var controller = new RepairsController(_config, _invoiceNumbers);

        var idStr = _userKey.ToString(CultureInfo.InvariantCulture);
        var claims = new[]
        {
            new Claim("user_key", idStr),
            new Claim(ClaimTypes.NameIdentifier, idStr),
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal },
        };
        return controller;
    }

    /// <summary>
    /// An 11-char tag that fits tblInvoice.sTranNumber (nvarchar(13)) and cannot
    /// collide with a real WO number, which never starts 'ZZT'.
    /// </summary>
    private static string NewFixtureTag() =>
        "ZZT" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

    private static string InClause(int count, string prefix) =>
        count == 0 ? "NULL" : string.Join(", ", Enumerable.Range(0, count).Select(i => $"@{prefix}{i}"));

    private static async Task ExecuteAsync(
        SqlConnection conn, string sql, params (string Name, object Value)[] parameters)
    {
        using var cmd = new SqlCommand(sql, conn);
        foreach (var (name, value) in parameters) cmd.Parameters.AddWithValue(name, value);
        await cmd.ExecuteNonQueryAsync();
    }

    private static int QueryScalarInt(SqlConnection conn, string sql, string descriptionForError)
    {
        using var cmd = new SqlCommand(sql, conn);
        var raw = cmd.ExecuteScalar();
        if (raw is null || raw == DBNull.Value)
            throw new InvalidOperationException(
                $"Test setup: missing lookup data — {descriptionForError}. Seed it and re-run.");
        return Convert.ToInt32(raw, CultureInfo.InvariantCulture);
    }

    private sealed class ThrowingInvoiceNumberService : IInvoiceNumberService
    {
        public Task<string> NextAsync(
            char invoiceType, int serviceLocationKey, SqlConnection conn,
            SqlTransaction? tx = null, CancellationToken ct = default) =>
            throw new InvalidOperationException(
                "FinalizeInvoice reached the create-invoice path. Every fixture in this class " +
                "already carries its tblInvoice rows, so this call would only burn the shared " +
                "daily WO counter.");
    }
}
