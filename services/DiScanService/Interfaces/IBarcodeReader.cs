namespace DiScanService.Interfaces;

public interface IBarcodeReader
{
    /// <summary>Returns the WO# string embedded in the barcode, or null if unreadable.</summary>
    string? ReadWorkOrderNumber(string filePath);
}
