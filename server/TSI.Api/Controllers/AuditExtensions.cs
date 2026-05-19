using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace TSI.Api.Controllers;

/// <summary>
/// Helpers for reading the current request's audit context from the JWT.
/// Used to populate Created_UserKey / Updated_UserKey / Deleted_UserKey
/// columns without a per-request DB lookup.
/// </summary>
public static class AuditExtensions
{
    /// <summary>
    /// Returns the integer user key (tblUsers.lUserKey) for the current request,
    /// or 0 if not available. JwtService.GenerateToken emits this both as a
    /// "user_key" claim and via ClaimTypes.NameIdentifier for redundancy.
    /// </summary>
    public static int GetCurrentUserKey(this ControllerBase controller)
    {
        var claim = controller.User?.FindFirst("user_key")?.Value
                  ?? controller.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var key) ? key : 0;
    }
}
