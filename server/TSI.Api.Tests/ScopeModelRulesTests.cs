using TSI.Api.Models;

namespace TSI.Api.Tests;

public class ScopeModelRulesTests
{
    [Theory]
    [InlineData("AB")]        // two letters, zero digits
    [InlineData("AB1")]
    [InlineData("AB12")]
    [InlineData("AB123")]
    [InlineData("AB1234")]    // two letters, four digits (max)
    [InlineData("ZZ9999")]
    public void IsValidItemCode_AcceptsXXUpToFourDigits(string code)
    {
        Assert.True(ScopeModelRules.IsValidItemCode(code));
    }

    [Theory]
    [InlineData("A1234")]      // only one leading letter
    [InlineData("ABC123")]     // three leading letters
    [InlineData("AB12345")]    // five digits
    [InlineData("ab1234")]     // lowercase (caller is expected to upper-case first)
    [InlineData("A11234")]     // letter+digit prefix
    [InlineData("1234")]       // no letters
    [InlineData("AB-12")]      // separator
    [InlineData("")]           // empty
    public void IsValidItemCode_RejectsMalformed(string code)
    {
        Assert.False(ScopeModelRules.IsValidItemCode(code));
    }

    [Fact]
    public void AppliesAngulation_IsYesForFlexibleOnly()
    {
        Assert.Equal("Y", ScopeModelRules.AppliesAngulation("F"));
        Assert.Equal("N", ScopeModelRules.AppliesAngulation("R"));
        Assert.Equal("N", ScopeModelRules.AppliesAngulation("I"));
        Assert.Equal("N", ScopeModelRules.AppliesAngulation("C"));
    }

    [Fact]
    public void ValidTypes_AreExactlyFRIC()
    {
        Assert.Equal(new[] { "C", "F", "I", "R" }, ScopeModelRules.ValidTypes.OrderBy(t => t).ToArray());
    }
}
