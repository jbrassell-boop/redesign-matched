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
/// Controller-level integration tests for POST /api/acquisitions/purchase-orders.
/// Hits localhost\WinscopeWeb so PO-number generation, the transaction (and its
/// rollback), and audit-column writes are all genuine. We construct the
/// controller directly with a real-DB IConfiguration and a real PONumberService;
/// that lets us bypass JwtBearer auth without bringing up WebApplicationFactory.
/// A ClaimsPrincipal with the "user_key" claim is attached so
/// AuditExtensions.GetCurrentUserKey() resolves to a real AspNetUsers.Id.
///
/// All seven tests share one sequential class — they share the monthly
/// PO-number counter seed in dbo.tblPONumbersUsed.
/// </summary>
public sealed class AcquisitionsControllerPoTests
{
    private const string ConnectionString =
        "Server=localhost;Database=WinscopeWeb;Trusted_Connection=True;TrustServerCertificate=True;";

    private readonly IConfiguration _config;
    private readonly PONumberService _poNumbers;

    private readonly int _userKey;
    private readonly int _serviceLocationKey;
    private readonly string _locationPrefix;
    private readonly int _supplierKey;
    private readonly int _scopeTypeKey;

    public AcquisitionsControllerPoTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = ConnectionString,
            })
            .Build();
        _poNumbers = new PONumberService();

        using var conn = new SqlConnection(ConnectionString);
        conn.Open();

        _userKey = QueryScalarInt(
            conn,
            "SELECT TOP 1 Id FROM dbo.AspNetUsers WHERE Id > 0 ORDER BY Id DESC",
            "AspNetUsers (any user with Id > 0)");

        using (var locCmd = new SqlCommand(
            "SELECT TOP 1 lServiceLocationKey, sTransNumberPrefix " +
            "FROM dbo.tblServiceLocations WHERE sTransNumberPrefix IS NOT NULL",
            conn))
        using (var r = locCmd.ExecuteReader())
        {
            if (!r.Read())
                throw new InvalidOperationException(
                    "Test setup: no row in dbo.tblServiceLocations with a non-null sTransNumberPrefix.");
            _serviceLocationKey = Convert.ToInt32(r["lServiceLocationKey"], CultureInfo.InvariantCulture);
            _locationPrefix = ((string)r["sTransNumberPrefix"]).Trim().ToUpperInvariant();
        }

        _supplierKey = QueryScalarInt(
            conn,
            "SELECT TOP 1 lSupplierKey FROM dbo.tblSupplier WHERE Deleted_datetime IS NULL ORDER BY lSupplierKey",
            "tblSupplier (any non-deleted supplier)");

        _scopeTypeKey = QueryScalarInt(
            conn,
            "SELECT TOP 1 lScopeTypeKey FROM dbo.tblScopeType WHERE Deleted_datetime IS NULL ORDER BY lScopeTypeKey",
            "tblScopeType (any non-deleted scope type)");
    }

    [Fact]
    public async Task Create_persists_header_and_lines()
    {
        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: _serviceLocationKey,
            SupplierKey: _supplierKey,
            DateOfPO: null,
            PaymentMethodKey: null,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>
            {
                new(_scopeTypeKey, SerialNumber: "TEST-SN-001", ScopeCost: 250.00m),
                new(_scopeTypeKey, SerialNumber: null,          ScopeCost: 100.50m),
            });

        int createdAcquisitionPoKey = 0;
        string createdPoNumber = "";

        try
        {
            var actionResult = await controller.CreateAcquisitionPurchaseOrder(request);

            var objectResult = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);

            var body = Assert.IsType<CreateAcquisitionPurchaseOrderResponse>(objectResult.Value);
            createdAcquisitionPoKey = body.AcquisitionSupplierPOKey;
            createdPoNumber = body.SupplierPONumber;

            Assert.True(body.AcquisitionSupplierPOKey > 0, "AcquisitionSupplierPOKey should be a new identity value.");
            Assert.Equal(350.50m, body.POTotal);

            // PO# format: {locationPrefix}P A {yyMM} {###}, e.g. NPA2606001.
            Assert.Matches(@"^[NSF]PA\d{7}$", body.SupplierPONumber);
            Assert.StartsWith($"{_locationPrefix}PA", body.SupplierPONumber);

            using var conn = new SqlConnection(ConnectionString);
            await conn.OpenAsync();

            // Header: bGenerated/bCancelled/bHoldGPIntegration all explicit 0;
            // supplier persisted; total back-filled by the UPDATE; date/user set;
            // PaymentMethodKey persisted as NULL because we sent null.
            using (var headerCmd = new SqlCommand(
                "SELECT lSupplierKey, sSupplierPONumber, " +
                "       ISNULL(bGenerated, 0) AS bGenerated, " +
                "       ISNULL(bCancelled, 0) AS bCancelled, " +
                "       ISNULL(dblPOTotal, 0) AS dblPOTotal, " +
                "       Created_UserKey, dtDateOfPO, " +
                "       lPaymentMethodKey, bHoldGPIntegration " +
                "FROM dbo.tblAcquisitionSupplierPO " +
                "WHERE lAcquisitionSupplierPOKey = @id", conn))
            {
                headerCmd.Parameters.AddWithValue("@id", createdAcquisitionPoKey);
                using var hr = await headerCmd.ExecuteReaderAsync();
                Assert.True(hr.Read(), "Header row should exist after commit.");

                Assert.Equal(_supplierKey, Convert.ToInt32(hr["lSupplierKey"]));
                Assert.Equal(createdPoNumber, (string)hr["sSupplierPONumber"]);
                Assert.False(Convert.ToBoolean(hr["bGenerated"]), "Draft: bGenerated must be 0.");
                Assert.False(Convert.ToBoolean(hr["bCancelled"]), "Draft: bCancelled must be 0.");
                Assert.Equal(350.50m, Convert.ToDecimal(hr["dblPOTotal"]));
                Assert.Equal(_userKey, Convert.ToInt32(hr["Created_UserKey"]));
                Assert.Equal(DateTime.Today, Convert.ToDateTime(hr["dtDateOfPO"]).Date);
                Assert.True(hr["lPaymentMethodKey"] == DBNull.Value,
                    "PaymentMethodKey should persist as NULL when not supplied.");
                // bHoldGPIntegration has no DB default; we write 0 explicitly so
                // the row's initial state never depends on ambient defaults.
                Assert.True(hr["bHoldGPIntegration"] != DBNull.Value,
                    "bHoldGPIntegration must be written explicitly, not left NULL.");
                Assert.False(Convert.ToBoolean(hr["bHoldGPIntegration"]),
                    "Draft: bHoldGPIntegration must be 0 (don't hold; PO integrates normally once generated).");
            }

            // Exactly two tran rows in order, with the right scope type / cost /
            // serial values; dtDateReceived left null at create.
            using (var lineCmd = new SqlCommand(
                "SELECT lScopeTypeKey, sSerialNumber, " +
                "       ISNULL(nScopeCost, 0) AS nScopeCost, " +
                "       dtDateReceived " +
                "FROM dbo.tblAcquisitionSupplierPOTran " +
                "WHERE lAcquisitionSupplierPOKey = @id " +
                "ORDER BY lAcquisitionSupplierPOTranKey", conn))
            {
                lineCmd.Parameters.AddWithValue("@id", createdAcquisitionPoKey);
                using var lr = await lineCmd.ExecuteReaderAsync();

                Assert.True(lr.Read(), "First tran row should exist.");
                Assert.Equal(_scopeTypeKey, Convert.ToInt32(lr["lScopeTypeKey"]));
                Assert.Equal("TEST-SN-001", (string)lr["sSerialNumber"]);
                Assert.Equal(250.00m, Convert.ToDecimal(lr["nScopeCost"]));
                Assert.True(lr["dtDateReceived"] == DBNull.Value,
                    "dtDateReceived must be NULL at create (scope not yet received).");

                Assert.True(lr.Read(), "Second tran row should exist.");
                Assert.Equal(_scopeTypeKey, Convert.ToInt32(lr["lScopeTypeKey"]));
                Assert.True(lr["sSerialNumber"] == DBNull.Value,
                    "Null SerialNumber on request must persist as NULL.");
                Assert.Equal(100.50m, Convert.ToDecimal(lr["nScopeCost"]));

                Assert.False(lr.Read(), "Should be exactly two tran rows.");
            }
        }
        finally
        {
            await CleanupCreatedPo(createdAcquisitionPoKey, createdPoNumber);
        }
    }

    [Fact]
    public async Task Create_empty_lines_returns_400()
    {
        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: _serviceLocationKey,
            SupplierKey: _supplierKey,
            DateOfPO: null,
            PaymentMethodKey: null,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>());

        var actionResult = await controller.CreateAcquisitionPurchaseOrder(request);

        var bad = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Create_unknown_supplier_returns_400()
    {
        var seed = ExpectedSeedToday(_locationPrefix);
        var counterBefore = await GetPONumberCounter(seed);

        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: _serviceLocationKey,
            SupplierKey: 2147483647,
            DateOfPO: null,
            PaymentMethodKey: null,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>
            {
                new(_scopeTypeKey, SerialNumber: null, ScopeCost: 1.00m),
            });

        var actionResult = await controller.CreateAcquisitionPurchaseOrder(request);

        var bad = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);

        Assert.Equal(counterBefore, await GetPONumberCounter(seed));
        await DeleteSeedRowIfMatches(seed);
    }

    [Fact]
    public async Task Create_unknown_scope_type_returns_400()
    {
        var seed = ExpectedSeedToday(_locationPrefix);
        var counterBefore = await GetPONumberCounter(seed);

        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: _serviceLocationKey,
            SupplierKey: _supplierKey,
            DateOfPO: null,
            PaymentMethodKey: null,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>
            {
                new(_scopeTypeKey, SerialNumber: null, ScopeCost: 1.00m),
                new(ScopeTypeKey: 2147483647, SerialNumber: null, ScopeCost: 1.00m),
            });

        var actionResult = await controller.CreateAcquisitionPurchaseOrder(request);

        var bad = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);

        Assert.Equal(counterBefore, await GetPONumberCounter(seed));
        await DeleteSeedRowIfMatches(seed);
    }

    [Fact]
    public async Task Create_unknown_service_location_returns_400()
    {
        // Capture the counter for the real location's bucket — if validation
        // leaked, NextAsync would either create or advance that row.
        var seed = ExpectedSeedToday(_locationPrefix);
        var counterBefore = await GetPONumberCounter(seed);

        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: 2147483647,
            SupplierKey: _supplierKey,
            DateOfPO: null,
            PaymentMethodKey: null,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>
            {
                new(_scopeTypeKey, SerialNumber: null, ScopeCost: 1.00m),
            });

        var actionResult = await controller.CreateAcquisitionPurchaseOrder(request);

        var bad = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);

        Assert.Equal(counterBefore, await GetPONumberCounter(seed));
        await DeleteSeedRowIfMatches(seed);
    }

    [Fact]
    public async Task Create_unknown_payment_method_returns_400()
    {
        var seed = ExpectedSeedToday(_locationPrefix);
        var counterBefore = await GetPONumberCounter(seed);

        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: _serviceLocationKey,
            SupplierKey: _supplierKey,
            DateOfPO: null,
            PaymentMethodKey: 2147483647,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>
            {
                new(_scopeTypeKey, SerialNumber: null, ScopeCost: 1.00m),
            });

        var actionResult = await controller.CreateAcquisitionPurchaseOrder(request);

        var bad = Assert.IsType<BadRequestObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);

        Assert.Equal(counterBefore, await GetPONumberCounter(seed));
        await DeleteSeedRowIfMatches(seed);
    }

    [Fact]
    public async Task Create_rolls_back_no_orphan()
    {
        // tblAcquisitionSupplierPO/Tran carry no FK or CHECK constraints, so a
        // bogus key won't fail at SQL. Trigger a deterministic C# OverflowException
        // on the second line: ScopeCost = decimal.MaxValue makes the poTotal +=
        // accumulator throw AFTER the header is INSERTed but before commit —
        // exactly the catch → RollbackAsync → throw path we want to verify.
        var beforeCount = await CountAcquisitionPosForSupplier(_supplierKey);
        var seed = ExpectedSeedToday(_locationPrefix);
        var counterBefore = await GetPONumberCounter(seed);

        var controller = CreateController();
        var request = new CreateAcquisitionPurchaseOrderRequest(
            ServiceLocationKey: _serviceLocationKey,
            SupplierKey: _supplierKey,
            DateOfPO: null,
            PaymentMethodKey: null,
            Lines: new List<CreateAcquisitionPurchaseOrderLine>
            {
                new(_scopeTypeKey, SerialNumber: null, ScopeCost: 1.00m),
                new(_scopeTypeKey, SerialNumber: null, ScopeCost: decimal.MaxValue),
            });

        await Assert.ThrowsAsync<OverflowException>(
            () => controller.CreateAcquisitionPurchaseOrder(request));

        Assert.Equal(beforeCount, await CountAcquisitionPosForSupplier(_supplierKey));
        // Counter consumption must have rolled back with the txn.
        Assert.Equal(counterBefore, await GetPONumberCounter(seed));

        await DeleteSeedRowIfMatches(seed);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private AcquisitionsController CreateController()
    {
        var controller = new AcquisitionsController(_config, _poNumbers);

        var idStr = _userKey.ToString(CultureInfo.InvariantCulture);
        var claims = new[]
        {
            new Claim("user_key", idStr),
            new Claim(ClaimTypes.NameIdentifier, idStr),
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        var httpContext = new DefaultHttpContext { User = principal };
        // PO-create is location-scoped: GetActiveServiceLocation() reads X-Service-Location
        // and the endpoint requires it to match the request's ServiceLocationKey. The tests
        // build the body with _serviceLocationKey, so set the banner header to match.
        httpContext.Request.Headers["X-Service-Location"] =
            _serviceLocationKey.ToString(CultureInfo.InvariantCulture);
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
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

    private static async Task<int> CountAcquisitionPosForSupplier(int supplierKey)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        using var cmd = new SqlCommand(
            "SELECT COUNT(*) FROM dbo.tblAcquisitionSupplierPO " +
            "WHERE lSupplierKey = @id AND Deleted_datetime IS NULL", conn);
        cmd.Parameters.AddWithValue("@id", supplierKey);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static async Task CleanupCreatedPo(int acquisitionPoKey, string poNumber)
    {
        if (acquisitionPoKey <= 0) return;

        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();

        using (var deleteLines = new SqlCommand(
            "DELETE FROM dbo.tblAcquisitionSupplierPOTran " +
            "WHERE lAcquisitionSupplierPOKey = @id", conn))
        {
            deleteLines.Parameters.AddWithValue("@id", acquisitionPoKey);
            await deleteLines.ExecuteNonQueryAsync();
        }

        using (var deleteHeader = new SqlCommand(
            "DELETE FROM dbo.tblAcquisitionSupplierPO " +
            "WHERE lAcquisitionSupplierPOKey = @id", conn))
        {
            deleteHeader.Parameters.AddWithValue("@id", acquisitionPoKey);
            await deleteHeader.ExecuteNonQueryAsync();
        }

        if (!string.IsNullOrEmpty(poNumber) && poNumber.Length >= 7)
            await DeleteSeedRowIfMatches(poNumber[..7]);
    }

    private static async Task DeleteSeedRowIfMatches(string seed)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        using var cmd = new SqlCommand(
            "DELETE FROM dbo.tblPONumbersUsed WHERE sSeed = @seed", conn);
        cmd.Parameters.AddWithValue("@seed", seed);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<int?> GetPONumberCounter(string seed)
    {
        using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        using var cmd = new SqlCommand(
            "SELECT lNextPONumber FROM dbo.tblPONumbersUsed WHERE sSeed = @seed", conn);
        cmd.Parameters.AddWithValue("@seed", seed);
        var raw = await cmd.ExecuteScalarAsync();
        if (raw is null || raw == DBNull.Value) return null;
        return Convert.ToInt32(raw, CultureInfo.InvariantCulture);
    }

    private static string ExpectedSeedToday(string locationPrefix) =>
        $"{locationPrefix}PA{DateTime.Today.ToString("yyMM", CultureInfo.InvariantCulture)}";
}
