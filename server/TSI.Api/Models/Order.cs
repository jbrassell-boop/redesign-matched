namespace TSI.Api.Models;

public record CreateOrderRequest(
    int DepartmentKey,
    string OrderType // "repair", "instrument", "product-sale", "endocart"
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
