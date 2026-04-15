using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DiScanService;

public sealed class ScanProcessor(
    IBarcodeReader    barcodeReader,
    IOmrReader        omrReader,
    IRepairRepository repository,
    IScanLogger       scanLogger,
    IOptions<DiScanOptions> options,
    ILogger<ScanProcessor>  logger)
{
    private readonly DiScanOptions _opts = options.Value;

    public async Task<ScanResult> ProcessAsync(string filePath, CancellationToken ct)
    {
        var fileName = Path.GetFileName(filePath);

        // 1. Read barcode
        var woNumber = barcodeReader.ReadWorkOrderNumber(filePath);
        if (string.IsNullOrEmpty(woNumber))
        {
            logger.LogWarning("Barcode unreadable in {File}", fileName);
            var r = new ScanResult(ScanStatus.BarcodeError, null, 0, 0, null, "Barcode unreadable");
            MoveFile(filePath, _opts.ErrorFolder);
            await scanLogger.LogAsync(fileName, r, ct);
            return r;
        }

        // 2. Look up repair key
        var repairKey = await repository.GetRepairKeyAsync(woNumber, ct);
        if (repairKey is null)
        {
            logger.LogWarning("WO {WO} not found in database", woNumber);
            var r = new ScanResult(ScanStatus.WONotFound, woNumber, 0, 0, null, $"WO {woNumber} not found");
            MoveFile(filePath, _opts.ErrorFolder);
            await scanLogger.LogAsync(fileName, r, ct);
            return r;
        }

        // 3. Duplicate check
        if (await repository.IsAlreadyInDiReviewAsync(repairKey.Value, ct))
        {
            logger.LogWarning("WO {WO} already in D&I Review — skipping duplicate", woNumber);
            var r = new ScanResult(ScanStatus.Duplicate, woNumber, 0, 0, null, "Already in D&I Review");
            await scanLogger.LogAsync(fileName, r, ct);
            return r;
        }

        // 4. Read OMR bubbles
        var fields   = omrReader.ReadForm(filePath);
        var failures = fields
            .Where(kv => kv.Value.Equals("F", StringComparison.OrdinalIgnoreCase))
            .Select(kv => kv.Key)
            .ToList();

        logger.LogInformation("WO {WO}: {Count} failures detected", woNumber, failures.Count);

        // 5. Map failures → repair items
        var mappings = await repository.GetMappingsForFailuresAsync(failures, ct);

        // 6. Load line items + set status
        await repository.LoadLineItemsAsync(repairKey.Value, mappings, ct);
        await repository.SetDiReviewStatusAsync(repairKey.Value, ct);

        // 7. Archive
        var archivePath = ArchiveFile(filePath);

        var success = new ScanResult(
            ScanStatus.Success, woNumber, failures.Count, mappings.Count, archivePath, null);
        await scanLogger.LogAsync(fileName, success, ct);

        logger.LogInformation("WO {WO}: processed — {Items} items loaded", woNumber, mappings.Count);
        return success;
    }

    private static string ArchiveFile(string filePath)
    {
        // Caller (Worker) handles actual file move; processor just returns intended path
        return filePath;
    }

    private static void MoveFile(string filePath, string destFolder)
    {
        try
        {
            Directory.CreateDirectory(destFolder);
            var dest = Path.Combine(destFolder, Path.GetFileName(filePath));
            File.Move(filePath, dest, overwrite: true);
        }
        catch { /* log swallowed — best effort */ }
    }
}
