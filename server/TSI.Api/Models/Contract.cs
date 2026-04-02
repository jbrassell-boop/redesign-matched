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

public record ContractDepartment(
    int ContractDepartmentKey,
    int DepartmentKey,
    string DepartmentName,
    DateTime? EffectiveDate,
    DateTime? EndDate,
    bool NonBillable,
    string? PoNumber
);

public record ContractScope(
    int ContractScopeKey,
    int ScopeKey,
    string SerialNumber,
    string Model,
    string Manufacturer,
    string RigidOrFlexible,
    DateTime? ScopeAdded,
    DateTime? ScopeRemoved,
    decimal Cost
);

public record ContractRepair(
    int RepairKey,
    string Wo,
    string SerialNumber,
    string Model,
    string RepairType,
    DateTime? DateIn,
    string Status,
    decimal Cost,
    string Tech
);

public record ContractNote(
    int NoteKey,
    DateTime? NoteDate,
    string Author,
    string Note
);

public record ContractAmendment(
    int AmendmentKey,
    DateTime? AmendmentDate,
    string Status,
    decimal PreviousTotal,
    decimal NewTotal,
    decimal PreviousInvoiceAmount,
    decimal NewInvoiceAmount,
    int RemainingMonths
);

public record ContractAmendmentScope(
    int AmendmentScopeKey,
    int AmendmentKey,
    string SerialNumber,
    string Model,
    string Manufacturer,
    bool IsAdd,
    decimal Cost,
    DateTime? ChangeDate
);

public record ContractInvoice(
    int InstallmentKey,
    string InvoiceNumber,
    DateTime? DateCreated,
    DateTime? DateDue,
    double Amount,
    string Status
);

public record ContractDocument(
    int DocumentKey,
    string DocumentName,
    string FileName,
    DateTime? DocumentDate,
    string CategoryType
);

public record ContractHealth(
    decimal Revenue,
    decimal Consumption,
    decimal PercentConsumed,
    decimal PercentTimeElapsed,
    decimal Margin,
    string Grade
);
