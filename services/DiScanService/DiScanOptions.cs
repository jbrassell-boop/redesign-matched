namespace DiScanService;

public sealed class DiScanOptions
{
    public string WatchFolder   { get; init; } = string.Empty;
    public string ArchiveFolder { get; init; } = string.Empty;
    public string ErrorFolder   { get; init; } = string.Empty;
    public int    FileSettleDelayMs { get; init; } = 2000;
    public string OmrTemplatePath   { get; init; } = string.Empty;
}
