namespace DiScanService.Interfaces;

public interface IOmrReader
{
    /// <summary>
    /// Reads P/F/N/A boxes from the scanned form.
    /// Returns a dictionary of OMR field name → result value ("P", "F", "N/A", or "").
    /// </summary>
    IReadOnlyDictionary<string, string> ReadForm(string filePath);
}
