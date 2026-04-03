<#
.SYNOPSIS
  Bulk-copy WinscopeNet tables from local SQL Server to Azure SQL.

.DESCRIPTION
  Uses BCP to export tables from a local SQL Server instance and import them
  into Azure SQL in FK dependency order. Handles IDENTITY_INSERT automatically.

  Tables migrated (in order):
    Tier 1 (lookups):  tblRepairStatuses, tblServiceLocations, tblRepairLevels,
                       tblDeliveryMethod, tblRepairReasons, tblPaymentTerms,
                       tblPricingCategory, tblPricingDetail, tblManufacturers, tblScopeTypeCategories
    Tier 2 (core):     tblSalesRep, tblScopeType, tblClient, tblTechnicians,
                       tblDepartment, tblScope, tblRepairItem
    Tier 3 (txn):      tblRepair, tblRepairItemTran

.PARAMETER LocalServer
  Local SQL Server instance name. Default: localhost

.PARAMETER LocalDb
  Local database name. Default: WinscopeNet

.PARAMETER AzureServer
  Azure SQL server FQDN. Default: tsi-sql-jb2026.database.windows.net

.PARAMETER AzureDb
  Azure database name. Default: WinscopeNet

.PARAMETER AzureUser
  Azure SQL login. Default: tsi_dev

.PARAMETER AzurePassword
  Azure SQL password. Required.

.PARAMETER TempDir
  Directory for BCP data files. Default: $env:TEMP\tsi-migrate

.PARAMETER Tables
  Comma-separated list of tables to migrate. Default: all tables in dependency order.
  Use this to re-run a specific table: -Tables "tblClient,tblDepartment"

.PARAMETER SkipExport
  Skip the BCP OUT step (reuse existing files in TempDir).

.PARAMETER SkipTruncate
  Skip truncating target tables before import. Use with caution - will fail on
  duplicate primary keys.

.EXAMPLE
  .\scripts\migrate-data.ps1 -AzurePassword "yourpassword"

.EXAMPLE
  .\scripts\migrate-data.ps1 -AzurePassword "p@ss" -Tables "tblClient,tblDepartment"

.EXAMPLE
  .\scripts\migrate-data.ps1 -AzurePassword "p@ss" -SkipExport
#>

[CmdletBinding()]
param(
    [string]$LocalServer   = "localhost",
    [string]$LocalDb       = "WinscopeNet",
    [string]$AzureServer   = "tsi-sql-jb2026.database.windows.net",
    [string]$AzureDb       = "WinscopeNet",
    [string]$AzureUser     = "tsi_dev",

    [Parameter(Mandatory = $true)]
    [string]$AzurePassword,

    [string]$TempDir       = "$env:TEMP\tsi-migrate",
    [string]$Tables        = "",
    [switch]$SkipExport,
    [switch]$SkipTruncate
)

$ErrorActionPreference = "Stop"

# FK dependency order
# Tables listed so that each table FK parents appear before it.
$allTables = @(
    # Tier 1: Lookups (no FK dependencies)
    "tblRepairStatuses",
    "tblServiceLocations",
    "tblRepairLevels",
    "tblDeliveryMethod",
    "tblRepairReasons",
    "tblPaymentTerms",
    "tblPricingCategory",
    "tblPricingDetail",      # FK: tblPricingCategory, tblRepairItem
    "tblManufacturers",
    "tblScopeTypeCategories",

    # Tier 2: Core entities
    "tblSalesRep",
    "tblScopeType",         # FK: tblManufacturers, tblScopeTypeCategories
    "tblClient",             # FK: tblSalesRep, tblPricingCategory, tblPaymentTerms
    "tblTechnicians",        # FK: tblServiceLocations
    "tblDepartment",         # FK: tblClient, tblServiceLocations, tblSalesRep, tblPricingCategory
    "tblScope",              # FK: tblScopeType, tblDepartment
    "tblRepairItem",

    # Tier 3: Transactions
    "tblRepair",             # FK: tblRepairStatuses, tblDepartment, tblScope, tblTechnicians, ...
    "tblRepairItemTran"      # FK: tblRepair, tblRepairItem, tblTechnicians
)

# Tables WITHOUT identity columns (no IDENTITY_INSERT needed)
$noIdentity = @("tblServiceLocations")

# Resolve table list
if ($Tables -ne "") {
    $tableList = $Tables -split "," | ForEach-Object { $_.Trim() }
} else {
    $tableList = $allTables
}

# Validate BCP is available
$bcp = Get-Command bcp -ErrorAction SilentlyContinue
if (-not $bcp) {
    Write-Error "bcp.exe not found. Install SQL Server command-line utilities: https://learn.microsoft.com/en-us/sql/tools/bcp-utility"
    exit 1
}

$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmd) {
    Write-Error "sqlcmd.exe not found. Install SQL Server command-line utilities."
    exit 1
}

# Create temp directory
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  TSI Data Migration: Local -> Azure SQL" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Source:  $LocalServer / $LocalDb"
Write-Host "  Target:  $AzureServer / $AzureDb"
Write-Host "  Tables:  $($tableList.Count)"
Write-Host "  Temp:    $TempDir"
Write-Host ""

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$results = @()

# ==============================================
# STEP 1: BCP OUT (export from local)
# ==============================================
if (-not $SkipExport) {
    Write-Host "-- STEP 1: Exporting from local --" -ForegroundColor Yellow
    Write-Host ""

    foreach ($table in $tableList) {
        $outFile = Join-Path $TempDir "$table.dat"
        $fmtFile = Join-Path $TempDir "$table.fmt"

        Write-Host "  Exporting $table ... " -NoNewline

        # Export native format file first
        & bcp "$LocalDb.dbo.$table" format nul -n -f $fmtFile -S $LocalServer -T 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED (format)" -ForegroundColor Red
            $results += [PSCustomObject]@{ Table = $table; Export = "FAIL"; Import = "-"; Rows = 0 }
            continue
        }

        # Export data
        $output = & bcp "$LocalDb.dbo.$table" out $outFile -n -S $LocalServer -T 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED" -ForegroundColor Red
            $results += [PSCustomObject]@{ Table = $table; Export = "FAIL"; Import = "-"; Rows = 0 }
            continue
        }

        # Parse row count from bcp output
        $rowLine = $output | Select-String "(\d+) rows copied"
        if ($rowLine) {
            $rowCount = [int]($rowLine.Matches[0].Groups[1].Value)
        } else {
            $rowCount = 0
        }

        if (Test-Path $outFile) {
            $size = "{0:N1} MB" -f ((Get-Item $outFile).Length / 1MB)
        } else {
            $size = "0 MB"
        }
        Write-Host "$rowCount rows ($size)" -ForegroundColor Green
    }

    Write-Host ""
}

# ==============================================
# STEP 2: Truncate target tables (reverse FK order)
# ==============================================
if (-not $SkipTruncate) {
    Write-Host "-- STEP 2: Truncating target tables --" -ForegroundColor Yellow
    Write-Host ""

    # Reverse order so child tables are truncated before parents
    $reverseTables = $tableList[($tableList.Count - 1)..0]

    # Build SQL: delete in reverse FK order (Azure SQL does not support sp_MSforeachtable)
    $delLines = @()

    # First, find and disable FK constraints on our specific tables
    foreach ($table in $reverseTables) {
        $delLines += "-- Disable FKs referencing $table"
        $delLines += "DECLARE @sql_$($table.Replace('tbl','')) NVARCHAR(MAX) = '';"
        $delLines += "SELECT @sql_$($table.Replace('tbl','')) = @sql_$($table.Replace('tbl','')) + 'ALTER TABLE ' + OBJECT_SCHEMA_NAME(parent_object_id) + '.' + OBJECT_NAME(parent_object_id) + ' NOCHECK CONSTRAINT ' + name + ';' + CHAR(13) FROM sys.foreign_keys WHERE referenced_object_id = OBJECT_ID('dbo.$table');"
        $delLines += "IF LEN(@sql_$($table.Replace('tbl',''))) > 0 EXEC sp_executesql @sql_$($table.Replace('tbl',''));"
    }
    $delLines += ""

    # Delete rows in reverse FK order
    foreach ($table in $reverseTables) {
        $delLines += "DELETE FROM dbo.$table;"
    }
    $delLines += ""

    # Reseed identity columns
    foreach ($table in $reverseTables) {
        if ($table -notin $noIdentity) {
            $delLines += "DBCC CHECKIDENT('dbo.$table', RESEED, 0);"
        }
    }
    $delLines += ""

    # Re-enable FK constraints
    foreach ($table in $reverseTables) {
        $delLines += "DECLARE @re_$($table.Replace('tbl','')) NVARCHAR(MAX) = '';"
        $delLines += "SELECT @re_$($table.Replace('tbl','')) = @re_$($table.Replace('tbl','')) + 'ALTER TABLE ' + OBJECT_SCHEMA_NAME(parent_object_id) + '.' + OBJECT_NAME(parent_object_id) + ' WITH CHECK CHECK CONSTRAINT ' + name + ';' + CHAR(13) FROM sys.foreign_keys WHERE referenced_object_id = OBJECT_ID('dbo.$table');"
        $delLines += "IF LEN(@re_$($table.Replace('tbl',''))) > 0 EXEC sp_executesql @re_$($table.Replace('tbl',''));"
    }

    $delSql = $delLines -join "`r`n"
    $delFile = Join-Path $TempDir "_delete.sql"
    $delSql | Out-File -FilePath $delFile -Encoding ASCII

    Write-Host "  Clearing $($reverseTables.Count) tables on Azure ... " -NoNewline

    $delOutput = & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword -i $delFile 2>&1
    # Check for actual SQL errors (not DBCC info messages)
    $sqlErrors = $delOutput | Select-String "Msg \d+, Level (1[1-9]|2[0-5])"
    if ($sqlErrors) {
        Write-Host "FAILED" -ForegroundColor Red
        $sqlErrors | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        exit 1
    }

    Write-Host "OK" -ForegroundColor Green
    Write-Host ""
}

# ==============================================
# STEP 3: BCP IN (import to Azure)
# ==============================================
Write-Host "-- STEP 3: Importing to Azure SQL --" -ForegroundColor Yellow
Write-Host ""

foreach ($table in $tableList) {
    $datFile = Join-Path $TempDir "$table.dat"

    if (-not (Test-Path $datFile)) {
        Write-Host "  $table - SKIPPED (no data file)" -ForegroundColor DarkGray
        $results += [PSCustomObject]@{ Table = $table; Status = "SKIP"; Rows = 0 }
        continue
    }

    $fileSize = (Get-Item $datFile).Length
    if ($fileSize -eq 0) {
        Write-Host "  $table - SKIPPED (empty)" -ForegroundColor DarkGray
        $results += [PSCustomObject]@{ Table = $table; Status = "SKIP"; Rows = 0 }
        continue
    }

    Write-Host "  Importing $table ... " -NoNewline

    # Enable IDENTITY_INSERT if table has identity column
    $hasIdentity = $table -notin $noIdentity
    if ($hasIdentity) {
        & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword -Q "SET IDENTITY_INSERT dbo.$table ON;" -b 2>&1 | Out-Null
    }

    # BCP IN: -E keeps identity values, -b 5000 batches to avoid timeouts, -h TABLOCK for perf
    $output = & bcp "$AzureDb.dbo.$table" in $datFile -n -S $AzureServer -U $AzureUser -P $AzurePassword -b 5000 -h "TABLOCK" -E 2>&1
    $exitCode = $LASTEXITCODE

    # Turn IDENTITY_INSERT back off
    if ($hasIdentity) {
        & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword -Q "SET IDENTITY_INSERT dbo.$table OFF;" -b 2>&1 | Out-Null
    }

    if ($exitCode -ne 0) {
        Write-Host "FAILED" -ForegroundColor Red
        $errMsg = ($output | Select-String "Error|SQLState") -join "; "
        if ($errMsg) {
            Write-Host "    $errMsg" -ForegroundColor DarkRed
        }
        $results += [PSCustomObject]@{ Table = $table; Status = "FAIL"; Rows = 0 }
        continue
    }

    $rowLine = $output | Select-String "(\d+) rows copied"
    if ($rowLine) {
        $rowCount = [int]($rowLine.Matches[0].Groups[1].Value)
    } else {
        $rowCount = 0
    }

    Write-Host "$rowCount rows" -ForegroundColor Green
    $results += [PSCustomObject]@{ Table = $table; Status = "OK"; Rows = $rowCount }
}

# ==============================================
# STEP 4: Validate row counts
# ==============================================
Write-Host ""
Write-Host "-- STEP 4: Validating --" -ForegroundColor Yellow
Write-Host ""

$valLines = @()
foreach ($table in $tableList) {
    $valLines += "SELECT '$table' AS [Table], COUNT(*) AS [Rows] FROM dbo.$table;"
}
$validationSql = $valLines -join "`r`n"

$valFile = Join-Path $TempDir "_validate.sql"
$validationSql | Out-File -FilePath $valFile -Encoding ASCII

$valOutput = & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword -i $valFile -W -s "|" 2>&1
foreach ($line in $valOutput) {
    if ($line -match "^\s*tbl") {
        $parts = $line -split "\|"
        $tName = $parts[0].Trim()
        $tRows = $parts[1].Trim()
        Write-Host ("  {0,-25} {1} rows" -f $tName, $tRows) -ForegroundColor DarkCyan
    }
}

# ==============================================
# SUMMARY
# ==============================================
$stopwatch.Stop()
$elapsed = $stopwatch.Elapsed

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Migration Complete" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$okCount   = ($results | Where-Object Status -eq "OK").Count
$failCount = ($results | Where-Object Status -eq "FAIL").Count
$skipCount = ($results | Where-Object Status -eq "SKIP").Count
$totalRows = ($results | Measure-Object -Property Rows -Sum).Sum

Write-Host "  Succeeded:  $okCount" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "  Failed:     $failCount" -ForegroundColor Red
}
if ($skipCount -gt 0) {
    Write-Host "  Skipped:    $skipCount" -ForegroundColor DarkGray
}
Write-Host ("  Total rows: {0:N0}" -f $totalRows)
Write-Host ("  Elapsed:    {0:mm\:ss}" -f $elapsed)
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "  Failed tables:" -ForegroundColor Red
    $results | Where-Object Status -eq "FAIL" | ForEach-Object {
        Write-Host "    - $($_.Table)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Re-run failed tables with:" -ForegroundColor Yellow
    $failedNames = ($results | Where-Object Status -eq "FAIL" | ForEach-Object { $_.Table }) -join ","
    Write-Host "    .\scripts\migrate-data.ps1 -AzurePassword `"...`" -Tables `"$failedNames`" -SkipTruncate" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "  Data files in: $TempDir" -ForegroundColor DarkGray
Write-Host "  Clean up with: Remove-Item -Recurse `"$TempDir`"" -ForegroundColor DarkGray
Write-Host ""
