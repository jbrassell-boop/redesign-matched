###############################################################################
# migrate-data.ps1
# Copies key tables from local WinscopeNet SQL Server to Azure SQL using BCP.
#
# USAGE:
#   .\scripts\migrate-data.ps1 -AzurePassword "yourpassword"
#
# OPTIONAL OVERRIDES:
#   -LocalServer  "."                              (default: local default instance)
#   -LocalDB      "WinscopeNet"                    (default)
#   -AzureServer  "tsi-sql-jb2026.database.windows.net"  (default)
#   -AzureDB      "WinscopeNet"                    (default)
#   -AzureUser    "tsi_dev"                        (default)
#   -TempDir      "$env:TEMP\bcp-migration"        (default)
#
# PREREQUISITES:
#   - bcp.exe in PATH (ships with SQL Server tools / ODBC Driver 18)
#   - sqlcmd.exe in PATH
#   - Azure SQL firewall: your public IP must be whitelisted
#   - Azure SQL already has schema loaded (BACPAC import or schema-only script)
#   - Local SQL login tsi_dev must have SELECT on all source tables
#
# FK-SAFE INSERT ORDER (derived from table-schemas.md index coverage):
#   1. tblScopeTypeCategories  -- no dependencies
#   2. tblRepairStatuses       -- no dependencies
#   3. tblTechnicians          -- no dependencies
#   4. tblClient               -- no hard FK enforced (nullable keys default 0)
#   5. tblScopeType            -- lScopeTypeCatKey -> tblScopeTypeCategories
#   6. tblDepartment           -- lClientKey -> tblClient
#   7. tblScope                -- lDepartmentKey -> tblDepartment
#                                 lScopeTypeKey  -> tblScopeType
#   8. tblRepair               -- lDepartmentKey -> tblDepartment
#                                 lScopeKey      -> tblScope
#                                 lTechnicianKey -> tblTechnicians
#                                 lRepairStatusID -> tblRepairStatuses
#
# NOTE: tblRepair has 190,000+ rows; export/import will take several minutes.
# NOTE: BCP native mode (-n) is used for maximum fidelity (types, nulls, identity).
###############################################################################

param(
    [string]$LocalServer  = ".",
    [string]$LocalDB      = "WinscopeNet",
    [string]$AzureServer  = "tsi-sql-jb2026.database.windows.net",
    [string]$AzureDB      = "WinscopeNet",
    [string]$AzureUser    = "tsi_dev",
    [Parameter(Mandatory = $true)]
    [string]$AzurePassword,
    [string]$TempDir      = "$env:TEMP\bcp-migration"
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Tables in FK-safe insert order
$Tables = @(
    "tblScopeTypeCategories",   # no deps; referenced by tblScopeType
    "tblRepairStatuses",        # no deps; referenced by tblRepair
    "tblTechnicians",           # no deps; referenced by tblRepair
    "tblClient",                # no enforced FK deps
    "tblScopeType",             # lScopeTypeCatKey -> tblScopeTypeCategories
    "tblDepartment",            # lClientKey       -> tblClient
    "tblScope",                 # lDepartmentKey   -> tblDepartment
                                # lScopeTypeKey    -> tblScopeType
    "tblRepair"                 # lDepartmentKey   -> tblDepartment
                                # lScopeKey        -> tblScope
                                # lTechnicianKey   -> tblTechnicians
                                # lRepairStatusID  -> tblRepairStatuses
)

Write-Host ""
Write-Host "=== WinscopeNet BCP Migration ===" -ForegroundColor Cyan
Write-Host "  From : $LocalServer / $LocalDB"
Write-Host "  To   : $AzureServer / $AzureDB"
Write-Host "  Tables: $($Tables.Count) (in FK-safe order)"
Write-Host ""

# Create temp working directory
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Write-Host "Temp dir : $TempDir" -ForegroundColor DarkGray
Write-Host ""

# ---- Helper: run a sqlcmd scalar query, return trimmed string ----------------
function Invoke-SqlScalar {
    param(
        [string]$Server,
        [string]$Database,
        [string]$Query,
        [string]$User      = $null,
        [string]$Password  = $null
    )
    if ($User) {
        $raw = & sqlcmd -S $Server -d $Database -U $User -P $Password -Q $Query -h -1 -W 2>&1
    } else {
        $raw = & sqlcmd -S $Server -d $Database -Q $Query -h -1 -W -E 2>&1
    }
    # Find the first line that looks like a number
    $line = $raw | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -First 1
    return if ($line) { $line.Trim() } else { "?" }
}

# ---- Phase 1: Export all tables from local SQL Server -----------------------
Write-Host "[Phase 1] Exporting from local WinscopeNet..." -ForegroundColor Yellow
$ExportResults = @{}

foreach ($table in $Tables) {
    $file = Join-Path $TempDir "$table.dat"
    Write-Host "  Exporting $table ..." -NoNewline

    $bcpOut = & bcp "$LocalDB.dbo.$table" out $file `
        -S $LocalServer -T -n -q 2>&1

    # BCP prints row count in a line like "X rows copied."
    $countLine = $bcpOut | Select-String "rows copied"
    $rowCount  = if ($countLine) {
        ($countLine.ToString() -replace '.*?(\d[\d,]*).*', '$1').Replace(',','')
    } else { "?" }

    $ExportResults[$table] = $rowCount
    Write-Host " $rowCount rows exported" -ForegroundColor Green

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "BCP export returned non-zero exit code for $table. Output:"
        $bcpOut | ForEach-Object { Write-Warning "  $_" }
    }
}

# ---- Phase 2: Import all tables into Azure SQL -------------------------------
Write-Host ""
Write-Host "[Phase 2] Importing to Azure SQL..." -ForegroundColor Yellow

foreach ($table in $Tables) {
    $file = Join-Path $TempDir "$table.dat"

    if (-not (Test-Path $file)) {
        Write-Warning "  Skipping $table — export file not found: $file"
        continue
    }

    Write-Host "  Importing $table ..." -NoNewline

    # Delete existing rows first (TRUNCATE not usable here due to possible FK checks;
    # use DELETE so FK enforcement order matters — we already go deps-first)
    $delResult = & sqlcmd -S $AzureServer -d $AzureDB -U $AzureUser -P $AzurePassword `
        -Q "DELETE FROM dbo.[$table]" -b 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "DELETE on $table returned non-zero. Output: $delResult"
    }

    # BCP in with IDENTITY_INSERT hint so identity PKs are preserved
    $bcpIn = & bcp "$AzureDB.dbo.$table" in $file `
        -S $AzureServer `
        -U $AzureUser `
        -P $AzurePassword `
        -n -q `
        -h "IDENTITY_INSERT" 2>&1

    $countLine = $bcpIn | Select-String "rows copied"
    $rowCount  = if ($countLine) {
        ($countLine.ToString() -replace '.*?(\d[\d,]*).*', '$1').Replace(',','')
    } else { "?" }

    Write-Host " $rowCount rows imported" -ForegroundColor Green

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "BCP import returned non-zero exit code for $table. Output:"
        $bcpIn | ForEach-Object { Write-Warning "  $_" }
    }
}

# ---- Phase 3: Verify row counts in Azure ------------------------------------
Write-Host ""
Write-Host "[Phase 3] Verification — Azure row counts vs local export..." -ForegroundColor Yellow
Write-Host ""

$allOk = $true
$fmt   = "{0,-32} {1,12} {2,12}  {3}"

Write-Host ($fmt -f "Table", "Exported", "Azure", "Status") -ForegroundColor DarkCyan
Write-Host ($fmt -f ("-" * 32), ("-" * 12), ("-" * 12), ("-" * 6)) -ForegroundColor DarkGray

foreach ($table in $Tables) {
    $exported = $ExportResults[$table]
    $azure    = Invoke-SqlScalar `
        -Server   $AzureServer `
        -Database $AzureDB `
        -User     $AzureUser `
        -Password $AzurePassword `
        -Query    "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.[$table]"

    $match  = ($exported -eq $azure)
    $status = if ($match) { "OK" } else { "MISMATCH" }
    $color  = if ($match) { "Green" } else { "Red" }
    if (-not $match) { $allOk = $false }

    Write-Host ($fmt -f $table, $exported, $azure, $status) -ForegroundColor $color
}

Write-Host ""
if ($allOk) {
    Write-Host "All tables match." -ForegroundColor Green
} else {
    Write-Host "One or more tables have row-count mismatches. Review warnings above." -ForegroundColor Red
}

$elapsed = (Get-Date) - $StartTime
Write-Host ""
Write-Host "Done in $($elapsed.TotalSeconds.ToString('0.0'))s" -ForegroundColor Cyan
Write-Host "Temp files at: $TempDir  (safe to delete after confirming data)" -ForegroundColor DarkGray
Write-Host ""
