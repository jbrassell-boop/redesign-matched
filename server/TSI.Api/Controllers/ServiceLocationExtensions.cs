using Microsoft.AspNetCore.Mvc;

namespace TSI.Api.Controllers;

/// <summary>
/// Helpers for reading the user's currently-active service location from the
/// request. The frontend always knows the value (banner DDL backed by
/// <c>useServiceLocation</c> + localStorage) and sends it on every request
/// via the <c>X-Service-Location</c> header (set by the axios interceptor in
/// <c>client/src/api/client.ts</c>). A user cannot be signed into the system
/// without a location selected, so the header is always present on
/// authenticated calls — its absence indicates the frontend wiring is broken
/// or someone is hitting the API outside the React app.
///
/// Mirrors the canonical shape on the cloud repo (Steve's f1797dd).
/// </summary>
public static class ServiceLocationExtensions
{
    public static int GetActiveServiceLocation(this ControllerBase controller)
    {
        var raw = controller.Request.Headers["X-Service-Location"].FirstOrDefault();
        if (!int.TryParse(raw, out var key) || key <= 0)
        {
            throw new InvalidOperationException(
                "X-Service-Location header is missing or invalid. " +
                "The frontend axios client must send the user's current banner " +
                "selection on every request to a location-scoped endpoint.");
        }
        return key;
    }
}
