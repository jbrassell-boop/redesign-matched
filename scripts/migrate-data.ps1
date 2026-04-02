###############################################################################
# migrate-data.ps1
# Copies key tables from local WinscopeNet SQL Server to Azure SQL using BCP.
#
# USAGE:
#   .\scripts\migrate-data.ps1 -AzurePassword "yourpassword"
#
# RE-RUN A SINGLE TABLE:
#   .\scripts\migrate-data.ps1 -AzurePassword "p@ss" -Tables "tblRepair" -SkipTruncate
#
# REUSE EXPORTED FILES (skip export step):
#   .\scripts\migrate-data.ps1 -AzurePassword "p@ss" -SkipExport
#
# OPTIONAL OVERRIDES:
#   -LocalServer  "."                              (default: local default instance)
#   -LocalDB      "WinscopeNet"                    (default)
#   -AzureServer  "tsi-sql-jb2026.database.windows.net"  (default)
#   -AzureDB      "WinscopeNet"                    (default)
#   -AzureUser    "tsi_dev"                        (default)
#   -TempDir      "$env:TEMP\bcp-migration"        (default)
#   -BatchSize    5000                             (default)
#
# PREREQUISITES:
#   - bcp.exe in PATH (ships with SQL Server tools / ODBC Driver 18)
#   - sqlcmd.exe in PATH
#   - Azure SQL firewall: your public IP must be whitelisted
#   - Azure SQL already has schema loaded (BACPAC import or schema-only script)
#   - Local SQL login tsi_dev must have SELECT on all source tables
#
# FK-SAFE INSERT ORDER (19 tables):
#   Lookups (no deps):
#     tblScopeTypeCategories, tblRepairStatuses, tblTechnicians,
#     tblPaymentTerms, tblContractTypes, tblSalesTax, tblSalesRep
#   Core entities:
#     tblClient, tblScopeType
#   Client children:
#     tblDepartment, tblContract
#   Department children:
#     tblScope, tblContractAffiliates
#   Scope children:
#     tblRepair
#   Inventory:
#     tblInventory, tblInventorySize
#   Suppliers:
#     tblSupplier, tblSupplierPO
#   Quality:
#     tblRepairInspection
###############################################################################

param(
    [string]$LocalServer  = ".",
    [string]$LocalDB      = "WinscopeNet",
    [string]$AzureServer  = "tsi-sql-jb2026.database.windows.net",
    [string]$AzureDB      = "WinscopeNet",
    [string]$AzureUser    = "tsi_dev",
    [Parameter(Mandatory = $true)]
    [string]$AzurePassword,
    [string]$TempDir      = "$env:TEMP\bcp-migration",
    [int]$BatchSize        = 5000,
    [switch]$SkipExport,
    [switch]$SkipTruncate,
    # Pass one or more table names to only process those tables (must still be in FK order)
    [string[]]$Tables      = @()
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# All 19 tables in FK-safe insert order
$AllTables = @(
    # ── Lookups (no dependencies) ──────────────────────────────────────────────
    "tblScopeTypeCategories",   # referenced by tblScopeType
    "tblRepairStatuses",        # referenced by tblRepair
    "tblTechnicians",           # referenced by tblRepair
    "tblPaymentTerms",          # referenced by tblContract
    "tblContractTypes",         # referenced by tblContract (lContractTypeKey)
    "tblSalesTax",              # referenced by tblContract
    "tblSalesRep",              # referenced by tblContract
    # ── Core entities ─────────────────────────────────────────────────────────
    "tblClient",                # no enforced FK deps
    "tblScopeType",             # lScopeTypeCatKey -> tblScopeTypeCategories
    # ── Client children ───────────────────────────────────────────────────────
    "tblDepartment",            # lClientKey -> tblClient
    "tblContract",              # lClientKey -> tblClient
    # ── Department / Contract children ────────────────────────────────────────
    "tblScope",                 # lDepartmentKey -> tblDepartment, lScopeTypeKey -> tblScopeType
    "tblContractAffiliates",    # lContractKey -> tblContract, lDepartmentKey -> tblDepartment
    # ── Repair (deepest core dependency) ──────────────────────────────────────
    "tblRepair",                # lDepartmentKey, lScopeKey, lTechnicianKey, lRepairStatusID
    # ── Inventory ─────────────────────────────────────────────────────────────
    "tblInventory",             # no enforced FK deps
    "tblInventorySize",         # lInventoryKey -> tblInventory
    # ── Suppliers ─────────────────────────────────────────────────────────────
    "tblSupplier",              # no enforced FK deps
    "tblSupplierPO",            # lSupplierKey -> tblSupplier
    # ── Quality ───────────────────────────────────────────────────────────────
    "tblRepairInspection"       # lRepairKey -> tblRepair
)

# If -Tables was specified, filter AllTables to just those (preserving FK order)
if ($Tables.Count -gt 0) {
    $RunTables = $AllTables | Where-Object { $Tables -contains $_ }
    $Skipped = $Tables | Where-Object { $AllTables -notcontains $_ }
    if ($Skipped) { Write-Warning "Unknown tables (will be skipped): $($Skipped -join ', ')" }
} else {
    $RunTables = $AllTables
}

Write-Host ""
Write-Host "=== WinscopeNet BCP Migration ===" -ForegroundColor Cyan
Write-Host "  From      : $LocalServer / $LocalDB"
Write-Host "  To        : $AzureServer / $AzureDB"
Write-Host "  Tables    : $($RunTables.Count) (in FK-safe order)"
Write-Host "  BatchSize : $BatchSize rows"
if ($SkipExport)   { Write-Host "  SkipExport   : ON — reusing existing .dat files" -ForegroundColor Yellow }
if ($SkipTruncate) { Write-Host "  SkipTruncate : ON — existing Azure rows will NOT be cleared" -ForegroundColor Yellow }
Write-Host ""

New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Write-Host "Temp dir  : $TempDir" -ForegroundColor DarkGray
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
    $line = $raw | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -First 1
    return if ($line) { $line.Trim() } else { "?" }
}

# ---- Phase 1: Export all tables from local SQL Server -----------------------
$ExportResults = @{}

if ($SkipExport) {
    Write-Host "[Phase 1] Skipped (SkipExport). Loading counts from existing .dat files..." -ForegroundColor DarkGray
    foreach ($table in $RunTables) {
        $file = Join-Path $TempDir "$table.dat"
        $ExportResults[$table] = if (Test-Path $file) { "cached" } else { "missing" }
    }
} else {
    Write-Host "[Phase 1] Exporting from local WinscopeNet..." -ForegroundColor Yellow

    foreach ($table in $RunTables) {
        $file = Join-Path $TempDir "$table.dat"
        Write-Host "  Exporting $table ..." -NoNewline

        $bcpOut = & bcp "$LocalDB.dbo.$table" out $file `
            -S $LocalServer -T -n -q 2>&1

        $countLine = $bcpOut | Select-String "rows copied"
        $rowCount  = if ($countLine) {
            ($countLine.ToString() -replace '.*?(\d[\d,]*).*', '$1').Replace(',','')
        } else { "?" }

        $ExportResults[$table] = $rowCount
        Write-Host " $rowCount rows" -ForegroundColor Green

        if ($LASTEXITCODE -ne 0) {
            Write-Warning "BCP export non-zero exit for $table — output:"
            $bcpOut | ForEach-Object { Write-Warning "  $_" }
        }
    }
}

# ---- Phase 2: Truncate Azure tables (reverse FK order) ----------------------
if (-not $SkipTruncate) {
    Write-Host ""
    Write-Host "[Phase 2] Clearing Azure tables (reverse FK order)..." -ForegroundColor Yellow

    $ReverseTables = [System.Linq.Enumerable]::Reverse($RunTables) | ForEach-Object { $_ }

    foreach ($table in $ReverseTables) {
        Write-Host "  Clearing $table ..." -NoNewline

        # Try TRUNCATE first (fastest); fall back to DELETE if FK constraints block it
        $truncResult = & sqlcmd -S $AzureServer -d $AzureDB -U $AzureUser -P $AzurePassword `
            -Q "TRUNCATE TABLE dbo.[$table]" -b 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " truncated" -ForegroundColor Green
        } else {
            $delResult = & sqlcmd -S $AzureServer -d $AzureDB -U $AzureUser -P $AzurePassword `
                -Q "DELETE FROM dbo.[$table]" -b 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host " deleted" -ForegroundColor Yellow
            } else {
                Write-Warning "Could not clear $table — TRUNCATE and DELETE both failed."
                $delResult | ForEach-Object { Write-Warning "  $_" }
            }
        }
    }
} else {
    Write-Host "[Phase 2] Skipped (SkipTruncate)." -ForegroundColor DarkGray
}

# ---- Phase 3: Import into Azure SQL (FK insert order, batched) --------------
Write-Host ""
Write-Host "[Phase 3] Importing to Azure SQL (batch=$BatchSize)..." -ForegroundColor Yellow

$ImportResults = @{}

foreach ($table in $RunTables) {
    $file = Join-Path $TempDir "$table.dat"

    if (-not (Test-Path $file)) {
        Write-Warning "  Skipping $table — export file not found: $file"
        $ImportResults[$table] = "missing"
        continue
    }

    Write-Host "  Importing $table ..." -NoNewline

    $bcpIn = & bcp "$AzureDB.dbo.$table" in $file `
        -S $AzureServer `
        -U $AzureUser `
        -P $AzurePassword `
        -n -q `
        -b $BatchSize `
        -h "IDENTITY_INSERT" 2>&1

    $countLine = $bcpIn | Select-String "rows copied"
    $rowCount  = if ($countLine) {
        ($countLine.ToString() -replace '.*?(\d[\d,]*).*', '$1').Replace(',','')
    } else { "?" }

    $ImportResults[$table] = $rowCount
    Write-Host " $rowCount rows" -ForegroundColor Green

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "BCP import non-zero exit for $table — output:"
        $bcpIn | ForEach-Object { Write-Warning "  $_" }
    }
}

# ---- Phase 4: Verify row counts in Azure ------------------------------------
Write-Host ""
Write-Host "[Phase 4] Verification — Azure row counts vs local export..." -ForegroundColor Yellow
Write-Host ""

$allOk = $true
$fmt   = "{0,-32} {1,12} {2,12}  {3}"

Write-Host ($fmt -f "Table", "Exported", "Azure", "Status") -ForegroundColor DarkCyan
Write-Host ($fmt -f ("-" * 32), ("-" * 12), ("-" * 12), ("-" * 8)) -ForegroundColor DarkGray

foreach ($table in $RunTables) {
    $exported = $ExportResults[$table]
    if ($exported -eq "missing") {
        Write-Host ($fmt -f $table, "MISSING", "—", "SKIPPED") -ForegroundColor Yellow
        continue
    }

    $azure = Invoke-SqlScalar `
        -Server   $AzureServer `
        -Database $AzureDB `
        -User     $AzureUser `
        -Password $AzurePassword `
        -Query    "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.[$table]"

    $match  = ($SkipExport -or $exported -eq "cached") ? ($azure -ne "?" -and [int]$azure -gt 0) : ($exported -eq $azure)
    $status = if ($match) { "OK" } else { "MISMATCH" }
    $color  = if ($match) { "Green" } else { "Red" }
    if (-not $match) { $allOk = $false }

    $exportedDisplay = if ($exported -eq "cached") { "(cached)" } else { $exported }
    Write-Host ($fmt -f $table, $exportedDisplay, $azure, $status) -ForegroundColor $color
}

Write-Host ""
if ($allOk) {
    Write-Host "All tables OK." -ForegroundColor Green
} else {
    Write-Host "One or more tables have row-count mismatches. Review warnings above." -ForegroundColor Red
}

$elapsed = (Get-Date) - $StartTime
Write-Host ""
Write-Host "Done in $($elapsed.TotalSeconds.ToString('0.0'))s" -ForegroundColor Cyan
Write-Host "Temp files: $TempDir  (safe to delete after confirming data)" -ForegroundColor DarkGray
Write-Host ""
