using TSI.Api.Services;

namespace TSI.Api.Tests;

/// <summary>
/// Pins the legacy <c>dbo.inventory_GetNextLotNumber</c> semantics that the
/// cloud lot-number generator must reproduce: the next lot number is the
/// smallest <c>(u + 1)</c> where <c>u</c> is an already-used number at or above
/// the floor and <c>(u + 1)</c> is itself unused. Numbers below the floor are
/// ignored. With no used numbers at/above the floor, allocation bootstraps at
/// the floor.
/// </summary>
public class LotNumberAllocatorTests
{
    [Fact]
    public void EmptyUsedSet_ReturnsFloor()
    {
        Assert.Equal(25190, LotNumberAllocator.Next(Array.Empty<int>(), floor: 25190));
    }

    [Fact]
    public void ContiguousRunFromFloor_ReturnsNextAfterMax()
    {
        Assert.Equal(25193, LotNumberAllocator.Next(new[] { 25190, 25191, 25192 }, floor: 25190));
    }

    [Fact]
    public void InternalGap_IsFilledWithSmallestFreeNumber()
    {
        // 25192 is free between 25191 and 25193 -> it is reused first.
        Assert.Equal(25192, LotNumberAllocator.Next(new[] { 25190, 25191, 25193 }, floor: 25190));
    }

    [Fact]
    public void NumbersBelowFloor_AreIgnored()
    {
        Assert.Equal(25191, LotNumberAllocator.Next(new[] { 100, 200, 25190 }, floor: 25190));
    }

    [Fact]
    public void Duplicates_AreDeduped()
    {
        Assert.Equal(25192, LotNumberAllocator.Next(new[] { 25190, 25190, 25191 }, floor: 25190));
    }

    [Fact]
    public void DoesNotBackfillBelowLowestUsed_MatchingLegacy()
    {
        // Faithful to the legacy proc: it only returns a number that immediately
        // follows a used number, so a free range below the lowest used number
        // (25195 here) is not allocated -> next is 25197, not 25190.
        Assert.Equal(25197, LotNumberAllocator.Next(new[] { 25195, 25196 }, floor: 25190));
    }

    [Fact]
    public void DefaultFloor_Is25190()
    {
        Assert.Equal(25190, LotNumberAllocator.Next(Array.Empty<int>()));
    }
}
