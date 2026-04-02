namespace TSI.Api.Models;

public record ContractListItem(
    int ContractKey,
    int ClientKey,
    string Name,
    string ContractNumber,
    string ContractId,
    DateTime? EffectiveDate,
    DateTime? TerminationDate,
    double TotalAmount,
    double AmtInvoiced,
    int ScopeCount,
    string Status,
    int ContractType
);

public record ContractDetail(
    int ContractKey,
    int ClientKey,
    string Name,
    string ContractNumber,
    string ContractId,
    DateTime? EffectiveDate,
    DateTime? TerminationDate,
    int LengthInMonths,
    double TotalAmount,
    double AmtInvoiced,
    int InstallmentsTotal,
    int InstallmentsInvoiced,
    int ContractType,
    bool ServicePlan,
    bool SharedRisk,
    bool TaxExempt,
    string BillName,
    string BillAddress,
    string BillCity,
    string BillState,
    string BillZip,
    string Phone,
    string BillEmail,
    string Comments,
    int CountFlexible,
    int CountRigid,
    int CountCamera,
    int CountInstrument,
    int CountAll,
    string Status,
    DateTime? LastUpdate,
    DateTime? CreateDate
);

public record ContractListResponse(
    IEnumerable<ContractListItem> Contracts,
    int TotalCount
);

public record ContractStats(
    int Total,
    int Active,
    int Expiring,
    int Expired,
    double TotalACV
);
