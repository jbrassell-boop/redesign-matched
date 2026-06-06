namespace TSI.Api.Models;

// ── Pending Contracts (deal origination) ──────────────────────────────────
// Staged deals live in 5 dedicated tables (tblPendingContract*), separate from
// tblContract. Lifecycle: create → assemble (scopes/depts/affiliates) →
// generate CSA → convert to a real tblContract.
//
// NOTE: the cloud WinscopeWeb DB has the 5 tables but NONE of the legacy
// pendingContract* stored procedures, so this controller talks to the tables
// directly with inline parameterized SQL (the established convention in this
// codebase — see ContractsController / DepartmentsController). See
// docs/pending-contracts-deferred.md for the convert-engine blocker.

public record PendingContractListItem(
    int PendingContractKey,
    int ClientKey,
    string ClientName,
    string Name,
    int ContractTypeKey,
    string ContractType,
    string Status,
    DateTime? StatusDate,
    DateTime? CreationDate,
    int SalesRepKey,
    string SalesRep,
    int TermMonths,
    int ScopeCount,
    bool IsDead
);

public record PendingContractListResponse(
    IEnumerable<PendingContractListItem> Items,
    int TotalCount
);

public record PendingContractDetail(
    int PendingContractKey,
    int ClientKey,
    string ClientName,
    string Name,
    int ContractTypeKey,
    string ContractType,
    string Status,
    DateTime? StatusDate,
    DateTime? CreationDate,
    int SalesRepKey,
    string SalesRep,
    int TermMonths,
    int AgreementTemplateKey,
    string BillName1,
    string BillName2,
    string Address1,
    string Address2,
    string City,
    string State,
    string Zip,
    string Country,
    string Phone,
    string Fax,
    int ScopeCount,
    int DepartmentCount,
    int AffiliateCount
);

public record CreatePendingContractRequest(
    int ClientKey,
    int ContractTypeKey,
    string? Name   // optional; server auto-generates + dedups if blank
);

public record PatchPendingContractRequest(
    string? Status,
    int? SalesRepKey,
    int? ContractTypeKey,
    int? TermMonths,
    int? AgreementTemplateKey,
    string? Address1,
    string? Address2,
    string? City,
    string? State,
    string? Zip,
    string? Country,
    string? Phone,
    string? Fax
);

// ── Scopes sub-resource ──
public record PendingContractScopeItem(
    int PendingContractScopeKey,
    int ScopeKey,            // 0 = model-only (no serial assigned yet)
    int ScopeTypeKey,
    string ScopeTypeDesc,
    string SerialNumber,
    string RigidOrFlexible,
    int ClientKey,
    string ClientName,
    int DepartmentKey,
    string DepartmentName,
    int Quantity,
    decimal UnitCost,
    decimal ContractCost
);

// A scope already in inventory that can be added to the pending contract.
public record AvailablePendingContractScope(
    int ScopeKey,
    string SerialNumber,
    int ScopeTypeKey,
    string ScopeTypeDesc,
    string RigidOrFlexible,
    int ClientKey,
    string ClientName,
    int DepartmentKey,
    string DepartmentName
);

// Add an existing inventory scope (by lScopeKey) to the pending contract.
public record AddPendingContractScopeRequest(
    int ScopeKey
);

// Add a model-only line (no serial yet) — lScopeKey stays 0 until assigned.
public record AddPendingContractScopeTypeRequest(
    int ScopeTypeKey,
    int DepartmentKey,
    int ClientKey,
    int Quantity,
    decimal UnitCost
);

public record PatchPendingContractScopeRequest(
    int? ScopeTypeKey,
    int? Quantity,
    decimal? UnitCost,
    decimal? Cost,
    string? SerialNumber    // assigning a serial promotes a model-only line
);

// ── Departments / Affiliates sub-resources ──
public record PendingContractDepartmentItem(
    int DepartmentKey,
    string DepartmentName,
    string ClientName
);

public record AvailableDepartment(
    int DepartmentKey,
    string DepartmentName,
    string ClientName
);

public record AddPendingContractDepartmentsRequest(
    int[] DepartmentKeys
);

public record PendingContractAffiliateItem(
    int DepartmentKey,
    string DepartmentName,
    string ClientName
);

public record AddPendingContractAffiliateRequest(
    int DepartmentKey
);

// ── Agreement-template lookup ──
public record PendingContractAgreementTemplate(
    int AgreementTemplateKey,
    string Name,
    string FileName
);

// ── Convert ──
public record ConvertPendingContractRequest(
    string ContractName,
    string ContractNumber,        // PO# (≤ 20 chars)
    DateTime EffectiveDate,
    DateTime TerminationDate,
    int ContractLength,           // months
    int InstallmentTypeId         // invoice frequency
);
