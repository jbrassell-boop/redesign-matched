using DiScanService;
using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DiScanService.Tests;

public class ScanProcessorTests
{
    private static ScanProcessor BuildProcessor(
        IBarcodeReader? barcode = null,
        IOmrReader? omr = null,
        IRepairRepository? repo = null,
        IScanLogger? logger = null)
    {
        var opts = Options.Create(new DiScanOptions
        {
            ArchiveFolder = @"C:\fake\archive",
            ErrorFolder   = @"C:\fake\errors"
        });
        return new ScanProcessor(
            barcode  ?? Mock.Of<IBarcodeReader>(),
            omr      ?? Mock.Of<IOmrReader>(),
            repo     ?? Mock.Of<IRepairRepository>(),
            logger   ?? Mock.Of<IScanLogger>(),
            opts,
            NullLogger<ScanProcessor>.Instance);
    }

    [Fact]
    public async Task ProcessAsync_ReturnsBarcodeError_WhenBarcodeUnreadable()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns((string?)null);

        var processor = BuildProcessor(barcode: barcode.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.BarcodeError, result.Status);
    }

    [Fact]
    public async Task ProcessAsync_ReturnsWONotFound_WhenRepairKeyNull()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns("WO-2026-0001");

        var repo = new Mock<IRepairRepository>();
        repo.Setup(r => r.GetRepairKeyAsync("WO-2026-0001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((int?)null);

        var processor = BuildProcessor(barcode: barcode.Object, repo: repo.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.WONotFound, result.Status);
    }

    [Fact]
    public async Task ProcessAsync_ReturnsDuplicate_WhenAlreadyInDiReview()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns("WO-2026-0001");

        var repo = new Mock<IRepairRepository>();
        repo.Setup(r => r.GetRepairKeyAsync("WO-2026-0001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        repo.Setup(r => r.IsAlreadyInDiReviewAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var processor = BuildProcessor(barcode: barcode.Object, repo: repo.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.Duplicate, result.Status);
    }

    [Fact]
    public async Task ProcessAsync_LoadsItemsAndSetsStatus_OnSuccess()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns("WO-2026-0001");

        var omr = new Mock<IOmrReader>();
        omr.Setup(o => o.ReadForm(It.IsAny<string>())).Returns(new Dictionary<string, string>
        {
            ["insLeakPF"]       = "P",
            ["insAngulationPF"] = "F",
            ["insDistalTipPF"]  = "F"
        });

        var mappings = new List<DiMappingEntry>
        {
            new("insAngulationPF", 101, "Angulation Cable Replacement"),
            new("insDistalTipPF",  202, "Distal Tip Repair")
        };

        var repo = new Mock<IRepairRepository>();
        repo.Setup(r => r.GetRepairKeyAsync("WO-2026-0001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        repo.Setup(r => r.IsAlreadyInDiReviewAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        repo.Setup(r => r.GetMappingsForFailuresAsync(
                It.Is<IEnumerable<string>>(f => f.Contains("insAngulationPF") && f.Contains("insDistalTipPF")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(mappings);

        var processor = BuildProcessor(barcode: barcode.Object, omr: omr.Object, repo: repo.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.Success, result.Status);
        Assert.Equal(2, result.FailureCount);
        Assert.Equal(2, result.ItemsLoaded);

        repo.Verify(r => r.LoadLineItemsAsync(
            42,
            It.Is<IEnumerable<DiMappingEntry>>(items => items.Count() == 2),
            It.IsAny<CancellationToken>()), Times.Once);

        repo.Verify(r => r.SetDiReviewStatusAsync(42, It.IsAny<CancellationToken>()), Times.Once);
    }
}
