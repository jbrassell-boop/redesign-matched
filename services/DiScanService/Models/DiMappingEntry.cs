namespace DiScanService.Models;

public sealed record DiMappingEntry(
    string InspectionField,
    int    RepairItemKey,
    string Description
);
