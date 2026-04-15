using DiScanService;
using DiScanService.Data;
using DiScanService.Interfaces;
using DiScanService.Readers;

var host = Host.CreateDefaultBuilder(args)
    .UseWindowsService()
    .ConfigureServices((ctx, services) =>
    {
        services.Configure<DiScanOptions>(ctx.Configuration.GetSection("DiScan"));

        var connStr = ctx.Configuration.GetConnectionString("WinScope")
            ?? throw new InvalidOperationException("WinScope connection string missing");

        services.AddSingleton<IBarcodeReader, BarcodeReader>();
        services.AddSingleton<IOmrReader>(_ =>
            new OmrReader(ctx.Configuration["DiScan:OmrTemplatePath"]
                ?? throw new InvalidOperationException("OmrTemplatePath missing")));
        services.AddSingleton<IRepairRepository>(_ => new RepairRepository(connStr));
        services.AddSingleton<IScanLogger>(_ => new ScanLogger(connStr));
        services.AddSingleton<ScanProcessor>();
        services.AddHostedService<Worker>();
    })
    .Build();

await host.RunAsync();
