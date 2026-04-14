<#
.SYNOPSIS
    Runs the TSI Monthly Ops Review SQL script and exports results to Excel.
.EXAMPLE
    .\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
    .\Run-OpsReview.ps1 -StartDate "2026-01-01" -EndDate "2026-03-31"  # quarterly
.NOTES
    Requires the ImportExcel module: Install-Module ImportExcel -Scope CurrentUser
#>
param(
    [Parameter(Mandatory)]
    [string]$StartDate,
    [Parameter(Mandatory)]
    [string]$EndDate,
    [string]$OutputFolder = "$env:USERPROFILE\Desktop\TSI Ops Reports"
)

if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
    Write-Host "Created folder: $OutputFolder" -ForegroundColor DarkGray
}

# ── Prerequisites ─────────────────────────────────────────────────────────────
if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
    Write-Error "ImportExcel module not found. Run: Install-Module ImportExcel -Scope CurrentUser"
    exit 1
}
Import-Module ImportExcel

Add-Type -AssemblyName "System.Data"

# ── Config ────────────────────────────────────────────────────────────────────
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User ID=BrightLogixUser;Password=12345;TrustServerCertificate=True;Encrypt=False"
$sqlFile = Join-Path $PSScriptRoot "monthly-ops-review.sql"

$tabNames = @(
    "1 - Throughput & TAT",
    "2 - 40-Day Returns",
    "3 - Contract vs FFS",
    "4 - Contract P&L",
    "5A - Loaner Summary",
    "5B - Loaner Models",
    "6 - Tech Scorecard",
    "7 - Tech D&I Finds",
    "8 - Tech Defect %",
    "9 - Tech Inventory",
    "10A - Tech Amendments",
    "10B - Ops Misquotes",
    "11 - Update Slips",
    "12 - Avoidable Damage",
    "13 - Van Service",
    "14 - Outsourced Repairs",
    "15 - Inventory Ordering",
    "16A - NR Rate",
    "16B - DI Breakdown"
)

# ── Validate ──────────────────────────────────────────────────────────────────
if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

$xlPath = Join-Path $OutputFolder ("OpsReview_{0}_{1}.xlsx" -f $StartDate, $EndDate)
if (Test-Path $xlPath) { Remove-Item $xlPath -Force }

# ── Run SQL ───────────────────────────────────────────────────────────────────
$sql = Get-Content $sqlFile -Raw
$sql = $sql -replace "(?m)^DECLARE @StartDate date = '[^']*'", "DECLARE @StartDate date = '$StartDate'"
$sql = $sql -replace "(?m)^DECLARE @EndDate   date = '[^']*'", "DECLARE @EndDate   date = '$EndDate'"

Write-Host "Connecting to WinScopeNet..." -ForegroundColor Cyan
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
    $cmd.CommandTimeout = 300
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $ds = New-Object System.Data.DataSet
    $adapter.Fill($ds) | Out-Null
}
finally {
    if ($conn.State -eq 'Open') { $conn.Close() }
}

Write-Host ("Query returned {0} result sets." -f $ds.Tables.Count) -ForegroundColor Green

# ── Export to Excel ───────────────────────────────────────────────────────────
Write-Host "Writing $xlPath ..." -ForegroundColor Cyan

$xl = $null
for ($i = 0; $i -lt $ds.Tables.Count; $i++) {
    $tab  = if ($i -lt $tabNames.Count) { $tabNames[$i] } else { "Set $($i+1)" }
    $rows = $ds.Tables[$i].Rows.Count
    Write-Host ("  {0,-28} {1} rows" -f $tab, $rows)

    $params = @{
        Path          = $xlPath
        WorksheetName = $tab
        AutoSize      = $true
        FreezeTopRow  = $true
        BoldTopRow    = $true
    }
    if ($xl) {
        $xl = $ds.Tables[$i] | Export-Excel @params -ExcelPackage $xl -PassThru
    } else {
        $xl = $ds.Tables[$i] | Export-Excel @params -PassThru
    }
}

Close-ExcelPackage $xl

Write-Host "`nSaved: $xlPath" -ForegroundColor Green
