using Aspose.BarCode.Recognition;
using DiScanService.Interfaces;

namespace DiScanService.Readers;

public sealed class BarcodeReader : IBarcodeReader
{
    public string? ReadWorkOrderNumber(string filePath)
    {
        using var reader = new BarCodeReader(filePath, DecodeType.Code128, DecodeType.QR);
        foreach (var result in reader.ReadBarCodes())
        {
            var value = result.CodeText?.Trim();
            if (!string.IsNullOrEmpty(value))
                return value;
        }
        return null;
    }
}
