namespace DiScanService.Models;

public enum ScanStatus { Success, BarcodeError, WONotFound, OMRError, Duplicate }

public sealed record ScanResult(
    ScanStatus Status,
    string?    WorkOrderNumber,
    int        FailureCount,
    int        ItemsLoaded,
    string?    ArchivePath,
    string?    ErrorMessage
);
