namespace TSI.Api.Models;

public record ScopeModelListItem(
    int ScopeTypeKey,
    string Description,
    string Type,
    string Manufacturer,
    string Category,
    bool Active,
    string InsertTubeLength,
    string InsertTubeDiameter,
    string FieldOfView,
    string DirectionOfView,
    string AngUp,
    string AngDown,
    string AngLeft,
    string AngRight
);

public record ScopeModelDetail(
    int ScopeTypeKey,
    string Description,
    string LongDescription,
    string Type,
    string TypeId,
    string Manufacturer,
    string Category,
    bool Active,
    string AngUp,
    string AngDown,
    string AngLeft,
    string AngRight,
    string InsertTubeLength,
    string InsertTubeDiameter,
    string ForcepChannelSize,
    string FieldOfView,
    string DirectionOfView,
    string DepthOfField,
    string LengthSpec,
    string TubeSystem,
    string LensSystem,
    string Degree,
    string IDBand,
    string EyeCupMount,
    decimal? ContractCost,
    decimal? MaxCharge,
    string GLAccount,
    string ItemCode,
    bool InspRequired,
    bool ForceOnPortal,
    bool SkipPortal,
    bool Autoclaveable,
    bool Drawing,
    string Notes,
    string LastUpdated
);

public record ScopeModelStats(
    int Total,
    int ActiveCount,
    int InactiveCount,
    int Flexible,
    int Rigid,
    int Camera
);

public record ScopeModelListResponse(
    List<ScopeModelListItem> Items,
    int TotalCount
);
