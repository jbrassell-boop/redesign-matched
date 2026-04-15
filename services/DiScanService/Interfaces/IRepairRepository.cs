namespace DiScanService.Interfaces;

using DiScanService.Models;

public interface IRepairRepository
{
    Task<int?> GetRepairKeyAsync(string woNumber, CancellationToken ct);
    Task<bool> IsAlreadyInDiReviewAsync(int repairKey, CancellationToken ct);
    Task<IReadOnlyList<DiMappingEntry>> GetMappingsForFailuresAsync(
        IEnumerable<string> failedFields, CancellationToken ct);
    Task LoadLineItemsAsync(int repairKey, IEnumerable<DiMappingEntry> items, CancellationToken ct);
    Task SetDiReviewStatusAsync(int repairKey, CancellationToken ct);
}
