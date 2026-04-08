namespace TSI.Api.Models;

public record FieldRegistryScreen(
    string Screen,
    string LastUpdated,
    List<FieldRegistryEntry> Fields
);

public record FieldRegistryEntry(
    string Id,
    string Label,
    string SqlTable,
    string SqlQuery,
    string ApiEndpoint,
    string ResponseProperty,
    string Status,
    string Notes,
    string VerifiedAt,
    string VerifiedBy
);

public record FieldUpdateRequest(
    string ScreenFile,
    string FieldId,
    string Status,
    string SqlQuery,
    string SqlTable,
    string ApiEndpoint,
    string ResponseProperty,
    string Notes,
    string VerifiedBy
);

public record LiveValueRequest(
    string SqlQuery
);

public record LiveValueResponse(
    string Value,
    string Error
);

public record PreviewRowsResponse(
    List<string> Rows,
    string Error
);
