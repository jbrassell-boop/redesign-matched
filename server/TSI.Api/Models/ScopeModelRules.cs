using System.Text.RegularExpressions;

namespace TSI.Api.Models;

/// <summary>
/// Pure validation / derivation rules for creating a scope model (tblScopeType).
/// Extracted from ScopeModelsController so the logic is unit-testable without a DB.
/// </summary>
public static partial class ScopeModelRules
{
    /// <summary>Valid values for tblScopeType.sRigidOrFlexible on create: Flexible, Rigid, Instrument, Camera.</summary>
    public static readonly IReadOnlySet<string> ValidTypes =
        new HashSet<string>(StringComparer.Ordinal) { "F", "R", "I", "C" };

    [GeneratedRegex(@"^[A-Z]{2}\d{0,4}$")]
    private static partial Regex ItemCodePattern();

    /// <summary>
    /// True when <paramref name="itemCode"/> matches the XX#### shape:
    /// exactly two uppercase letters followed by up to four digits.
    /// Assumes the caller has already trimmed/upper-cased.
    /// </summary>
    public static bool IsValidItemCode(string itemCode) => ItemCodePattern().IsMatch(itemCode);

    /// <summary>
    /// Angulation / broken-fiber applicability flag for the given scope type.
    /// Flexible scopes ('F') track angulation up/down/left/right and broken fibers; all other
    /// types do not. Returns the 'Y' / 'N' value stored in sAppliesAng* columns.
    /// </summary>
    public static string AppliesAngulation(string type) => type == "F" ? "Y" : "N";
}
