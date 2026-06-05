namespace TSI.Api.Services;

/// <summary>
/// Pure, side-effect-free next-lot-number allocation, ported from the legacy
/// <c>dbo.inventory_GetNextLotNumber</c> gap-fill. Returns the smallest
/// <c>(u + 1)</c> where <c>u</c> is a used number at or above the floor and
/// <c>(u + 1)</c> is itself unused; numbers below the floor are ignored; and it
/// bootstraps at the floor when nothing at/above the floor is used.
///
/// The DB I/O (reading the used set under an app-lock and claiming the number
/// in <c>tblLotNumberLock</c>) lives in <see cref="LotNumberService"/>; this is
/// the testable core of the algorithm.
/// </summary>
public static class LotNumberAllocator
{
    /// <summary>
    /// Lowest lot number the legacy proc will ever hand out (the historical
    /// consumable-lot floor). Matches <c>WHERE u.sLotNumber &gt;= 25190</c>.
    /// </summary>
    public const int DefaultFloor = 25190;

    public static int Next(IEnumerable<int> used, int floor = DefaultFloor)
    {
        var set = used as HashSet<int> ?? new HashSet<int>(used);

        int? smallestQualifying = null;
        foreach (var u in set)
        {
            // Only numbers that immediately precede a free slot qualify, and
            // only at/above the floor — this is what the legacy left-join /
            // MIN(u)+1 produces, including its quirk of never backfilling the
            // range below the lowest used number.
            if (u >= floor && !set.Contains(u + 1))
            {
                if (smallestQualifying is null || u < smallestQualifying)
                    smallestQualifying = u;
            }
        }

        return smallestQualifying is null ? floor : smallestQualifying.Value + 1;
    }
}
