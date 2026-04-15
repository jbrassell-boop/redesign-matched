using DiScanService.Data;
using DiScanService.Models;
using Xunit;

namespace DiScanService.Tests;

/// <summary>
/// Integration tests for ScanLogger.
/// These tests run against a local dev DB and write to tblDiScanLog.
/// Skip in CI with: [Trait("Category", "Integration")]
/// </summary>
public class ScanLoggerTests
{
    // Replace with local dev connection string before running
    private const string ConnStr =
        "Server=localhost;Database=WinScope;Trusted_Connection=True;";

    [Trait("Category", "Integration")]
    [Fact]
    public async Task LogAsync_DoesNotThrow_OnSuccess()
    {
        var logger = new ScanLogger(ConnStr);
        var result = new ScanResult(ScanStatus.Success, "WO-TEST-001", 3, 3, @"C:\archive\test.pdf", null);

        // Should insert a row without throwing
        var ex = await Record.ExceptionAsync(
            () => logger.LogAsync("test.pdf", result, CancellationToken.None));
        Assert.Null(ex);
    }
}
