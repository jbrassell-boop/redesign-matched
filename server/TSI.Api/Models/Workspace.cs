namespace TSI.Api.Models;

public record WorkspaceData(
    RepairQueueWidget RepairQueue,
    OverdueWidget Overdue,
    InvoicesWidget Invoices,
    ContractsWidget ContractsExpiring
);

public record RepairQueueWidget(
    int Received,
    int InRepair,
    int QcHold,
    int ShipReady,
    int Overdue,
    IEnumerable<RepairQueueItem> RecentItems
);

public record RepairQueueItem(
    string Wo,
    string Client,
    string ScopeType,
    int DaysIn,
    string Status
);

public record OverdueWidget(
    IEnumerable<OverdueItem> Items
);

public record OverdueItem(
    string Wo,
    string Client,
    int DaysIn,
    int Sla
);

public record InvoicesWidget(
    double TotalOutstanding,
    double PastDue30,
    double PastDue60,
    double InvoicedThisMonth
);

public record ContractsWidget(
    IEnumerable<ContractExpiringItem> Items
);

public record ContractExpiringItem(
    string Client,
    string ExpirationDate,
    int DaysUntil
);
