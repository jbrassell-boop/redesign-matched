namespace TSI.Api.Models;

public record DevListItem(
    int ToDoId,
    string Title,
    string? Description,
    int StatusId,
    string Status,
    string? Assignee,
    string? RequestDate,
    string? CompletionDate,
    int? TargetYear,
    int? TargetQuarter,
    int SortOrder
);

public record DevListStatus(
    int StatusId,
    string Status
);

public record DevListStats(
    int Total,
    int Pending,
    int InProgress,
    int Awaiting,
    int Completed,
    int Review
);

public record DevListResponse(
    IEnumerable<DevListItem> Items,
    int TotalCount
);
