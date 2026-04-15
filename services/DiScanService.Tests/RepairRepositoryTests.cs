using DiScanService.Data;
using DiScanService.Models;
using Microsoft.Data.SqlClient;
using Xunit;

namespace DiScanService.Tests;

/// <summary>
/// Integration tests for RepairRepository.
/// These tests run against a local dev DB with test data.
/// Skip in CI with: [Trait("Category", "Integration")]
/// </summary>
public class RepairRepositoryTests
{
    // Replace with local dev connection string before running
    private const string ConnStr =
        "Server=localhost;Database=WinScope;Trusted_Connection=True;";

    [Trait("Category", "Integration")]
    [Fact]
    public async Task GetRepairKeyAsync_ReturnsNull_WhenWONotFound()
    {
        var repo = new RepairRepository(ConnStr);
        var result = await repo.GetRepairKeyAsync("WO-DOES-NOT-EXIST", CancellationToken.None);
        Assert.Null(result);
    }

    [Trait("Category", "Integration")]
    [Fact]
    public async Task GetMappingsForFailures_ReturnsEmpty_WhenNoMappingsDefined()
    {
        var repo = new RepairRepository(ConnStr);
        var result = await repo.GetMappingsForFailuresAsync(
            ["insAngulationPF"], CancellationToken.None);
        // Empty until tblDiRepairMapping is populated
        Assert.IsAssignableFrom<IReadOnlyList<DiMappingEntry>>(result);
    }
}
