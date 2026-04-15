using DiScanService;
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
            await Task.Delay(_opts.FileSettleDelayMs, stoppingToken);
            if (!File.Exists(e.FullPath)) return;

            try
            {
                await processor.ProcessAsync(e.FullPath, stoppingToken);
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
