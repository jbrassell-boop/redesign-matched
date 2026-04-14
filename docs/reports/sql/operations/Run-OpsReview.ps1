<#
.SYNOPSIS
    Runs the TSI Monthly Ops Review SQL script against WinScopeNet.
.EXAMPLE
    .\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
    .\Run-OpsReview.ps1 -StartDate "2026-01-01" -EndDate "2026-03-31"  # quarterly
#>
param(
    [Parameter(Mandatory)]
    [string]$StartDate,
    [Parameter(Mandatory)]
    [string]$EndDate
)

$connStr  = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sqlFile  = Join-Path $PSScriptRoot "monthly-ops-review.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

$sql = Get-Content $sqlFile -Raw
$sql = $sql -replace "(?m)^DECLARE @StartDate date = '[^']*'", "DECLARE @StartDate date = '$StartDate'"
$sql = $sql -replace "(?m)^DECLARE @EndDate   date = '[^']*'", "DECLARE @EndDate   date = '$EndDate'"

$sectionNames = @(
    "1 - Throughput & TAT",
    "2 - 40-Day Returns & Warranty",
    "3 - Contract vs FFS Volume",
    "4 - Contract P&L",
    "5 - Loaner Fulfillment",
    "6 - Tech Repair Scorecard",
    "7 - Tech D&I Finds",
    "8 - Tech Defect %",
    "9 - Tech Inventory Usage",
    "10 - Tech Amendments & Misquotes",
    "11 - Update Slips",
    "12 - Avoidable Damage",
    "13 - Van Service",
    "14 - Vendor/Outsourced Repairs",
    "15 - Inventory Ordering",
    "16 - Scope Outcomes"
)

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    Write-Host "Connected to WinScopeNet" -ForegroundColor Green

    $cmd     = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
    $cmd.CommandTimeout = 300
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $ds      = New-Object System.Data.DataSet
    $adapter.Fill($ds) | Out-Null

    for ($i = 0; $i -lt $ds.Tables.Count; $i++) {
        $label = if ($i -lt $sectionNames.Count) { $sectionNames[$i] } else { "Result Set $($i+1)" }
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "  SECTION $label" -ForegroundColor Cyan
        Write-Host "  Period: $StartDate to $EndDate" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        $ds.Tables[$i] | Format-Table -AutoSize
        Write-Host "  Rows: $($ds.Tables[$i].Rows.Count)" -ForegroundColor DarkGray
    }

    Write-Host "`nDone. $($ds.Tables.Count) result set(s) returned." -ForegroundColor Green
}
catch {
    Write-Error "Failed: $_"
}
finally {
    if ($conn.State -eq 'Open') { $conn.Close() }
}
