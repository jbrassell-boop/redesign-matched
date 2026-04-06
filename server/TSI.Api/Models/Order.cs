namespace TSI.Api.Models;

public record CreateOrderRequest(
    int DepartmentKey,
    string OrderType,
    int? ScopeKey,
    string? SerialNumber,
    int? ScopeTypeKey,
    string? Complaint,
    string? PurchaseOrder,
    string? RackPosition,
    int? PackageTypeKey,
    string? IncludesCaseYN,
    string? IncludesETOCapYN,
    string? IncludesWaterProofCapYN
);

public record CreateOrderResponse(
    int RepairKey,
    string WorkOrderNumber
);

public record WizardClient(
    int ClientKey,
    string Name,
    string City,
    string State,
    string Zip,
    bool IsActive
);

public record WizardDepartment(
    int DepartmentKey,
    int ClientKey,
    string Name
);

public record WizardScope(
    int ScopeKey,
    string SerialNumber,
    string Model,
    string Manufacturer,
    string Type
);

public record WizardInstrumentType(
    string TypeCode,
    string Label
);

public record WizardScopeType(
    int ScopeTypeKey,
    string Description,
    string Manufacturer
);
