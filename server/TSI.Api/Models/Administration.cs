namespace TSI.Api.Models;

// ── Users ──
public record AdminUserItem(
    int UserKey,
    string Name,
    string Email,
    string? Role,
    string? Location,
    DateTime? LastLogin,
    bool IsActive
);

public record AdminUserListResponse(
    List<AdminUserItem> Items,
    int TotalCount,
    int Page,
    int PageSize
);

// ── Security Groups ──
public record SecurityGroupItem(
    int GroupKey,
    string GroupName,
    string? Description,
    int MemberCount,
    bool IsActive
);

// ── Delivery Methods ──
public record DeliveryMethodItem(
    int MethodKey,
    string MethodName,
    decimal? Cost,
    bool IsDefault,
    bool IsActive
);

// ── Payment Terms ──
public record PaymentTermsItem(
    int TermsKey,
    string Description,
    string? GreatPlainsId,
    int? DueDays,
    string? DueDateMode,
    bool IsDefault
);

// ── Scope Categories ──
public record ScopeCategoryItem(
    int CategoryKey,
    string CategoryName,
    string? InstrumentType,
    string? Size,
    bool IsActive
);

// ── Distributors ──
public record DistributorItem(
    int DistributorKey,
    string Name,
    string? Contact,
    string? Phone,
    string? CompanyName,
    string? City,
    string? State,
    bool IsActive
);

// ── Companies ──
public record CompanyItem(
    int CompanyKey,
    string CompanyName,
    string? Abbreviation,
    string? Phone,
    string? City,
    string? State,
    string? PeachTreeId,
    int DistributorCount
);

// ── Repair Reasons ──
public record RepairReasonItem(
    int ReasonKey,
    string Reason,
    string? Category,
    bool IsActive
);

// ── Repair Statuses ──
public record RepairStatusItem(
    int StatusId,
    string StatusName,
    int? SortOrder,
    bool IsActive
);

// ── Reporting Groups ──
public record ReportingGroupItem(
    int GroupKey,
    string GroupName,
    bool IsActive
);

// ── Standard Departments ──
public record StandardDeptItem(
    int DeptKey,
    string DeptName,
    bool IsActive
);

// ── Cleaning Systems ──
public record CleaningSystemItem(
    int SystemKey,
    string SystemName,
    bool IsActive
);

// ── Countries ──
public record CountryItem(
    int CountryKey,
    string CountryName
);

// ── Holidays ──
public record HolidayItem(
    int HolidayKey,
    string HolidayName,
    DateTime? HolidayDate,
    string? DayOfWeek,
    bool IsRecurring,
    bool IsActive
);

// ── Sales Tax ──
public record SalesTaxItem(
    int TaxKey,
    string? StateCode,
    string? StateName,
    decimal? Rate,
    DateTime? EffectiveDate,
    bool IsTaxable
);

// ── Credit Limits ──
public record CreditLimitItem(
    int LimitKey,
    decimal Amount
);

// ── Pricing Lists ──
public record PricingListItem(
    int ListKey,
    string ListName,
    int ClientCount,
    int ItemCount,
    DateTime? LastUpdated,
    bool IsActive
);

// ── System Settings ──
public record SystemSettingItem(
    int ConfigKey,
    string Name,
    bool? BoolValue,
    string? StringValue,
    int? IntValue,
    decimal? DecimalValue
);

// ── Audit Log ──
public record AuditLogItem(
    int AuditKey,
    DateTime Timestamp,
    string UserName,
    string Action,
    string Module,
    string Description,
    string? IpAddress
);

public record AuditLogResponse(
    List<AuditLogItem> Items,
    int TotalCount
);

// ── Sales Rep Reassignment ──
public record SalesRepOption(
    int SalesRepKey,
    string Name
);

public record SalesRepAssignment(
    int DepartmentKey,
    string ClientName,
    string DepartmentName,
    string? City,
    string? State,
    string? Zip,
    string CurrentRep
);

// ── Bonus Pools ──
public record BonusPoolItem(
    int PoolKey,
    string Name,
    string? Period,
    decimal? Target,
    decimal? Actual,
    decimal? PayoutPct,
    bool IsActive
);

// ── Stats ──
public record AdminStats(
    int ActiveUsers,
    int SecurityGroups,
    int PricingLists,
    int AuditEntries24h,
    int LockedAccounts
);

// ── CRUD request models ──
public record UpsertRepairReasonRequest(
    string Reason,
    bool Active
);

public record UpsertRepairStatusRequest(
    string StatusName,
    int? SortOrder
);

public record PatchUserRequest(
    string? FullName,
    string? EmailAddress,
    bool? Active
);
