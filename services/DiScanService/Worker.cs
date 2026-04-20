using DiScanService;
using DiScanService.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public sealed class Worker(
    ScanProcessor processor,
    IOptions<DiScanOptions> options,
    ILogger<Worker> logger) : BackgroundService
{
    private readonly DiScanOptions _opts = options.Value;
    private FileSystemWatcher? _watcher;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Directory.CreateDirectory(_opts.WatchFolder);
        Directory.CreateDirectory(_opts.ArchiveFolder);
        Directory.CreateDirectory(_opts.ErrorFolder);

        _watcher = new FileSystemWatcher(_opts.WatchFolder)
        {
            NotifyFilter        = NotifyFilters.FileName,
            Filter              = "*.*",
            EnableRaisingEvents = true
        };

        _watcher.Created += async (_, e) =>
        {
            // Settle delay — scanner may still be writing the file
            try
            {
                await Task.Delay(_opts.FileSettleDelayMs, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return; // Service shutting down during settle — skip this file
            }

            if (!File.Exists(e.FullPath)) return;

            try
            {
                var result = await processor.ProcessAsync(e.FullPath, CancellationToken.None);
                if (result.Status == ScanStatus.Success && result.ArchivePath != null)
                {
                    try
                    {
                        Directory.CreateDirectory(Path.GetDirectoryName(result.ArchivePath)!);
                        File.Move(e.FullPath, result.ArchivePath, overwrite: true);
                    }
                    catch (Exception archiveEx)
                    {
                        logger.LogError(archiveEx, "Failed to archive {File} to {Dest}", e.Name, result.ArchivePath);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled error processing {File}", e.Name);
            }
        };

        logger.LogInformation("DiScanService watching {Folder}", _opts.WatchFolder);
        return Task.CompletedTask;
    }

    public override void Dispose()
    {
        _watcher?.Dispose();
        base.Dispose();
    }
}
