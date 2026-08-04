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
/// Controller-level integration tests for PATCH /api/repairs/{repairKey}/techs,
/// centred on the LINE push. Hits localhost\WinscopeWeb so the real
/// tblRepairItemTran columns decide the outcome — the defect these tests pin down
/// is that the line push wrote lTechnicianKey no matter which header slot the user
/// picked, and no mock of a table with "a single tech column" could have shown it.
///
/// tblRepairItemTran carries BOTH lTechnicianKey and lTechnician2Key, and
/// dbo.repairUpdateTech (read off prod North 2026-08-04) is slot-symmetric over
/// them. The destructive test is
/// <see cref="UpdateTechs_Tech2WithAllRepairItems_FillsSecondarySlotAndLeavesEveryPrimaryAlone"/>:
/// against the pre-fix single-column UPDATE a Tech 2 save overwrote the primary
/// technician on every line of the repair.
///
/// SHARED DATABASE. Every fixture row is inserted here, its identity key captured,
/// and deleted by that exact key in a finally. Nothing is deleted by pattern and no
/// assertion counts rows the tests did not create.
/// </summary>
public sealed class RepairsControllerUpdateTechsTests
{
    private const string ConnectionString =
        "Server=localhost;Database=WinscopeWeb;Trusted_Connection=True;TrustServerCertificate=True;";

    private readonly IConfiguration _config;
    private readonly IInvoiceNumberService _invoiceNumbers = new ThrowingInvoiceNumberService();

    private readonly int _userKey;
    private readonly int _scopeKey;
    private readonly int _departmentKey;
    private readonly int _repairItemKey;

    /// <summary>The technician the endpoint is asked to write.</summary>
    private readonly int _targetTech;

    /// <summary>A DIFFERENT technician, pre-seeded on the fixture lines — the
    /// survivor whose disappearance is the bug.</summary>
    private readonly int _incumbentTech;

    /// <summary>A third technician, for the slot that must be left alone.</summary>
    private readonly int _otherTech;

    public RepairsControllerUpdateTechsTests()
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

        // Take a scope/department pair off an existing repair so both FKs are
        // known-good; we create no lookup data of our own.
        using (var fkCmd = new SqlCommand(
            "SELECT TOP 1 r.lScopeKey, r.lDepartmentKey " +
            "FROM tblRepair r " +
            "JOIN tblScope s ON s.lScopeKey = r.lScopeKey " +
            "JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey", conn))
        using (var fr = fkCmd.ExecuteReader())
        {
            if (!fr.Read())
                throw new InvalidOperationException(
                    "Test setup: no repair with both a scope and a department to borrow FKs from.");
            _scopeKey = Convert.ToInt32(fr["lScopeKey"], CultureInfo.InvariantCulture);
            _departmentKey = Convert.ToInt32(fr["lDepartmentKey"], CultureInfo.InvariantCulture);
        }

        _repairItemKey = QueryScalarInt(
            conn,
            "SELECT TOP 1 lRepairItemKey FROM tblRepairItem ORDER BY lRepairItemKey",
            "tblRepairItem (any repair item)");

        var techs = new List<int>();
        using (var techCmd = new SqlCommand(
            "SELECT TOP 3 lTechnicianKey FROM tblTechnicians ORDER BY lTechnicianKey", conn))
        using (var tr = techCmd.ExecuteReader())
        {
            while (tr.Read()) techs.Add(Convert.ToInt32(tr["lTechnicianKey"], CultureInfo.InvariantCulture));
        }
        if (techs.Count < 3)
            throw new InvalidOperationException(
                "Test setup: fewer than three rows in tblTechnicians. These tests need three " +
                "distinct technicians to tell one slot's write from another's survival.");
        _targetTech = techs[0];
        _incumbentTech = techs[1];
        _otherTech = techs[2];
    }

    // ─── Test 1 — the destructive-overwrite regression test ──────────────────

    [Fact]
    public async Task UpdateTechs_Tech2WithAllRepairItems_FillsSecondarySlotAndLeavesEveryPrimaryAlone()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            // Line A already belongs to another technician. Line B is unassigned.
            var lineA = await InsertLineAsync(fixture, tech1: _incumbentTech, tech2: null);
            var lineB = await InsertLineAsync(fixture, tech1: null, tech2: null);

            var controller = CreateController();
            var actionResult = await controller.UpdateTechs(
                fixture.RepairKey, new UpdateTechsRequest(_targetTech, Tech1: false, AllRepairItems: true));

            var a = await ReadLineAsync(lineA);
            var b = await ReadLineAsync(lineB);
            var header = await ReadHeaderAsync(fixture.RepairKey);
            var diagnostic =
                $"Observed after a Tech 2 save (tech {_targetTech}) with All Repair Items on a repair " +
                $"whose line {lineA} was assigned to tech {_incumbentTech}: " +
                $"result={actionResult.GetType().Name}; " +
                $"line A (lTechnicianKey={Text(a.Tech1)}, lTechnician2Key={Text(a.Tech2)}); " +
                $"line B (lTechnicianKey={Text(b.Tech1)}, lTechnician2Key={Text(b.Tech2)}); " +
                $"header (lTechnicianKey={Text(header.Tech1)}, lTechnician2Key={Text(header.Tech2)}).";

            var ok = Assert.IsType<OkObjectResult>(actionResult);
            var body = Assert.IsType<UpdateTechsResponse>(ok.Value);
            Assert.Equal(2, body.LineItemsUpdated);

            Assert.True(a.Tech1 == _incumbentTech,
                "A Tech 2 save must never touch a line's PRIMARY technician — overwriting it " +
                "destroys who actually did the work. " + diagnostic);
            Assert.Equal(_targetTech, a.Tech2);
            Assert.True(Unassigned(b.Tech1), diagnostic);
            Assert.Equal(_targetTech, b.Tech2);

            Assert.Equal(_targetTech, header.Tech2);
            Assert.True(Unassigned(header.Tech1),
                "A Tech 2 save must leave the header's primary slot alone. " + diagnostic);
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Test 2 — "without tech" scopes on the CHOSEN slot ───────────────────

    [Fact]
    public async Task UpdateTechs_Tech2WithoutTechScope_TestsTheSecondarySlotNotThePrimary()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            // Line A has a primary tech but no secondary — "without Tech 2", so it takes it.
            var lineA = await InsertLineAsync(fixture, tech1: _incumbentTech, tech2: null);
            // Line B already carries a secondary — it must keep the one it has.
            var lineB = await InsertLineAsync(fixture, tech1: null, tech2: _otherTech);

            var controller = CreateController();
            var actionResult = await controller.UpdateTechs(
                fixture.RepairKey, new UpdateTechsRequest(_targetTech, Tech1: false, AllRepairItems: false));

            var a = await ReadLineAsync(lineA);
            var b = await ReadLineAsync(lineB);
            var diagnostic =
                $"Observed after a Tech 2 save (tech {_targetTech}) scoped to 'Repair Items without Tech': " +
                $"result={actionResult.GetType().Name}; " +
                $"line A had tech1={_incumbentTech}/tech2=NULL and is now " +
                $"(lTechnicianKey={Text(a.Tech1)}, lTechnician2Key={Text(a.Tech2)}); " +
                $"line B had tech1=NULL/tech2={_otherTech} and is now " +
                $"(lTechnicianKey={Text(b.Tech1)}, lTechnician2Key={Text(b.Tech2)}).";

            var ok = Assert.IsType<OkObjectResult>(actionResult);
            var body = Assert.IsType<UpdateTechsResponse>(ok.Value);
            Assert.True(body.LineItemsUpdated == 1,
                "Exactly one line is missing a Tech 2, so exactly one line should have been written. " +
                diagnostic);

            Assert.Equal(_targetTech, a.Tech2);
            Assert.True(a.Tech1 == _incumbentTech,
                "Having a PRIMARY tech does not exclude a line from a Tech 2 fill. " + diagnostic);

            Assert.True(b.Tech2 == _otherTech,
                "A line that already carries a Tech 2 is not 'without tech' and must keep its own. " +
                diagnostic);
            Assert.True(Unassigned(b.Tech1), diagnostic);
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Test 3 — the already-correct Tech 1 path stays correct ──────────────

    [Fact]
    public async Task UpdateTechs_Tech1WithAllRepairItems_FillsPrimarySlotAndLeavesSecondaryAlone()
    {
        var fixture = await CreateRepairFixtureAsync();
        try
        {
            var lineA = await InsertLineAsync(fixture, tech1: null, tech2: _otherTech);
            var lineB = await InsertLineAsync(fixture, tech1: _incumbentTech, tech2: null);

            var controller = CreateController();
            var actionResult = await controller.UpdateTechs(
                fixture.RepairKey, new UpdateTechsRequest(_targetTech, Tech1: true, AllRepairItems: true));

            var a = await ReadLineAsync(lineA);
            var b = await ReadLineAsync(lineB);
            var header = await ReadHeaderAsync(fixture.RepairKey);
            var diagnostic =
                $"Observed after a Tech 1 save (tech {_targetTech}) with All Repair Items: " +
                $"result={actionResult.GetType().Name}; " +
                $"line A (lTechnicianKey={Text(a.Tech1)}, lTechnician2Key={Text(a.Tech2)}); " +
                $"line B (lTechnicianKey={Text(b.Tech1)}, lTechnician2Key={Text(b.Tech2)}); " +
                $"header (lTechnicianKey={Text(header.Tech1)}, lTechnician2Key={Text(header.Tech2)}).";

            var ok = Assert.IsType<OkObjectResult>(actionResult);
            var body = Assert.IsType<UpdateTechsResponse>(ok.Value);
            Assert.Equal(2, body.LineItemsUpdated);

            Assert.Equal(_targetTech, a.Tech1);
            Assert.True(a.Tech2 == _otherTech,
                "A Tech 1 save must leave the line's SECONDARY technician alone. " + diagnostic);
            Assert.Equal(_targetTech, b.Tech1);
            Assert.True(Unassigned(b.Tech2), diagnostic);

            Assert.Equal(_targetTech, header.Tech1);
            Assert.True(Unassigned(header.Tech2),
                "A Tech 1 save must leave the header's secondary slot alone. " + diagnostic);
        }
        finally
        {
            await CleanupAsync(fixture);
        }
    }

    // ─── Fixtures ────────────────────────────────────────────────────────────

    private const decimal LinePrice = 45.67m;

    private sealed class RepairFixture
    {
        public int RepairKey { get; init; }
        public List<int> LineKeys { get; } = new();
    }

    private sealed record TechSlots(int? Tech1, int? Tech2);

    /// <summary>
    /// A repair with NO invoice at all, so CheckRepairEditableAsync lets the write
    /// through, and no technician in either header slot, so every slot the tests
    /// read back was written by the endpoint.
    /// </summary>
    private async Task<RepairFixture> CreateRepairFixtureAsync()
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        // tblRepair carries enabled triggers, which SQL Server forbids alongside a
        // bare OUTPUT clause — hence OUTPUT … INTO a table variable.
        using var cmd = new SqlCommand("""
            DECLARE @ids TABLE (lRepairKey int);
            INSERT INTO tblRepair (lScopeKey, lDepartmentKey, sPurchaseOrder,
                bTrackingNumberRequired, bOutsourced, dtDateIn, dblAmtRepair, sWorkOrderNumber)
            OUTPUT INSERTED.lRepairKey INTO @ids
            VALUES (@scopeKey, @deptKey, @po, 0, 0, GETDATE(), 0, @wo);
            SELECT lRepairKey FROM @ids;
            """, conn);
        cmd.Parameters.AddWithValue("@scopeKey", _scopeKey);
        cmd.Parameters.AddWithValue("@deptKey", _departmentKey);
        cmd.Parameters.AddWithValue("@po", "ZZT-TEST-PO");
        cmd.Parameters.AddWithValue("@wo", NewFixtureTag());
        var repairKey = Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture);

        return new RepairFixture { RepairKey = repairKey };
    }

    /// <summary>One tblRepairItemTran row with both technician slots seeded exactly
    /// as the caller asks, so the assertions can tell a write from a survival.</summary>
    private async Task<int> InsertLineAsync(RepairFixture fixture, int? tech1, int? tech2)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        using var cmd = new SqlCommand("""
            DECLARE @ids TABLE (lRepairItemTranKey int);
            INSERT INTO tblRepairItemTran (lRepairKey, lRepairItemKey, sApproved,
                dblRepairPrice, dblRepairPriceBase, lTechnicianKey, lTechnician2Key)
            OUTPUT INSERTED.lRepairItemTranKey INTO @ids
            VALUES (@repairKey, @repairItemKey, 'Y', @price, @price, @tech1, @tech2);
            SELECT lRepairItemTranKey FROM @ids;
            """, conn);
        cmd.Parameters.AddWithValue("@repairKey", fixture.RepairKey);
        cmd.Parameters.AddWithValue("@repairItemKey", _repairItemKey);
        cmd.Parameters.AddWithValue("@price", LinePrice);
        cmd.Parameters.AddWithValue("@tech1", (object?)tech1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tech2", (object?)tech2 ?? DBNull.Value);

        var key = Convert.ToInt32(await cmd.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
        fixture.LineKeys.Add(key);
        return key;
    }

    private static async Task<TechSlots> ReadLineAsync(int lineKey) =>
        await ReadSlotsAsync(
            "SELECT lTechnicianKey, lTechnician2Key FROM tblRepairItemTran WHERE lRepairItemTranKey = @k",
            lineKey,
            $"tblRepairItemTran row {lineKey}");

    private static async Task<TechSlots> ReadHeaderAsync(int repairKey) =>
        await ReadSlotsAsync(
            "SELECT lTechnicianKey, lTechnician2Key FROM tblRepair WHERE lRepairKey = @k",
            repairKey,
            $"tblRepair row {repairKey}");

    private static async Task<TechSlots> ReadSlotsAsync(string sql, int key, string descriptionForError)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@k", key);
        using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync())
            throw new InvalidOperationException($"Test read-back: {descriptionForError} is gone.");
        return new TechSlots(
            r["lTechnicianKey"] == DBNull.Value ? null : Convert.ToInt32(r["lTechnicianKey"], CultureInfo.InvariantCulture),
            r["lTechnician2Key"] == DBNull.Value ? null : Convert.ToInt32(r["lTechnician2Key"], CultureInfo.InvariantCulture));
    }

    /// <summary>
    /// Deletes exactly the rows this fixture created, child-first, so a failing
    /// (red) run leaves the shared database as clean as a passing one.
    /// </summary>
    private static async Task CleanupAsync(RepairFixture fixture)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        foreach (var lineKey in fixture.LineKeys)
            await ExecuteAsync(conn,
                "DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @k", ("@k", lineKey));

        if (fixture.RepairKey > 0)
        {
            // trRepairPrimaryAndApproved rebuilds this roll-up whenever a line changes;
            // delete it by our own repair key so cleanup does not depend on the trigger.
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

    private static string Text(int? techKey) => techKey?.ToString(CultureInfo.InvariantCulture) ?? "NULL";

    /// <summary>
    /// "No technician in this slot". Both tables DEFAULT their technician columns to
    /// ((0)), so an unassigned slot reads back as 0 on a row nobody set and as NULL on
    /// one inserted with an explicit NULL — which is why the endpoint's own scope
    /// predicate is ISNULL(col, 0) = 0 rather than col IS NULL.
    /// </summary>
    private static bool Unassigned(int? techKey) => (techKey ?? 0) == 0;

    /// <summary>
    /// An 11-char tag that cannot collide with a real WO number, which never
    /// starts 'ZZT'.
    /// </summary>
    private static string NewFixtureTag() =>
        "ZZT" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

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
                "UpdateTechs must never allocate an invoice number.");
    }
}
