namespace DiScanService.Interfaces;

using DiScanService.Models;

public interface IScanLogger
{
    Task LogAsync(string fileName, ScanResult result, CancellationToken ct);
}
