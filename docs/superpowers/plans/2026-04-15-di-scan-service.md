# D&I Scan-to-Repair Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows Service that watches a shared folder for scanned OM05-1 forms, reads the work order barcode and P/F/N/A bubbles, auto-loads repair line items, and surfaces a review queue in the portal for ops to approve before generating the Requisition for Approval.

**Architecture:** A standalone .NET 8 Worker Service (`DiScanService`) runs on the app server, uses `FileSystemWatcher` to detect new scans, wraps Aspose.BarCode and Aspose.OMR behind interfaces for testability, and writes directly to Azure SQL (WinScope). The redesign-matched portal adds a `DiReviewController` and a `/di-review` React page for ops to review, adjust, and approve loaded repairs.

**Tech Stack:** .NET 8 Worker Service, Aspose.BarCode 26.x, Aspose.OMR, Microsoft.Data.SqlClient 5.x, xUnit + Moq (tests), React 19 + TypeScript + Ant Design (portal UI)

---

## File Map

### New: `services/DiScanService/`
| File | Responsibility |
|---|---|
| `DiScanService.csproj` | Project file — NuGet refs |
| `Program.cs` | Host builder, DI wiring |
| `DiScanOptions.cs` | Config model bound from `appsettings.json` |
| `Worker.cs` | `BackgroundService` — FileSystemWatcher lifecycle |
| `ScanProcessor.cs` | Orchestrates one scan file end-to-end |
| `Interfaces/IBarcodeReader.cs` | Contract for WO# barcode extraction |
| `Interfaces/IOmrReader.cs` | Contract for P/F/N/A field extraction |
| `Interfaces/IRepairRepository.cs` | Contract for DB reads/writes |
| `Interfaces/IScanLogger.cs` | Contract for tblDiScanLog writes |
| `Readers/BarcodeReader.cs` | Aspose.BarCode implementation |
| `Readers/OmrReader.cs` | Aspose.OMR implementation |
| `Data/RepairRepository.cs` | SqlClient implementation |
| `Data/ScanLogger.cs` | SqlClient implementation |
| `Models/DiMappingEntry.cs` | Record: field name + repair item key + description |
| `Models/ScanResult.cs` | Record: outcome of one scan attempt |
| `appsettings.json` | Watch/archive/error folder paths + connection string |
| `templates/OM05-1.omr` | Aspose.OMR template (created in Task 5, validated physically) |

### New: `services/DiScanService.Tests/`
| File | Responsibility |
|---|---|
| `DiScanService.Tests.csproj` | Test project — xUnit + Moq |
| `ScanProcessorTests.cs` | All orchestration logic tests |
| `RepairRepositoryTests.cs` | SQL query shape tests (against LocalDB) |
| `ScanLoggerTests.cs` | Log insert tests |

### New: `server/TSI.Api/Controllers/DiReviewController.cs`
Five endpoints: list queue, get detail, remove item, approve, hold.

### New: `client/src/pages/di-review/`
| File | Responsibility |
|---|---|
| `types.ts` | `DiReviewItem`, `DiReviewDetail`, `LoadedRepair` |
| `index.tsx` | Re-export |
| `DiReviewPage.tsx` | Queue list — table of pending WOs |
| `DiReviewPanel.tsx` | Inline expand — failures, loaded items, comments, approve/hold |

### New: `client/src/api/diReview.ts`
API calls matching `DiReviewController` endpoints.

### Modified: `client/src/App.tsx` (or router file)
Add `/di-review` route.

### New: `docs/sql/`
| File | Responsibility |
|---|---|
| `01_tblDiRepairMapping.sql` | CREATE TABLE |
| `02_tblDiScanLog.sql` | CREATE TABLE |
| `03_AddDiReviewStatus.sql` | INSERT new status row |

---

## Task 1: SQL Scripts (Word doc package for Steve)

**Files:**
- Create: `docs/sql/01_tblDiRepairMapping.sql`
- Create: `docs/sql/02_tblDiScanLog.sql`
- Create: `docs/sql/03_AddDiReviewStatus.sql`

- [ ] **Step 1: Create mapping table script**

```sql
-- docs/sql/01_tblDiRepairMapping.sql
-- Run against WinScope (Azure SQL) — packaged for Steve to deploy
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tblDiRepairMapping')
BEGIN
    CREATE TABLE dbo.tblDiRepairMapping (
        lMappingKey      INT          IDENTITY(1,1) NOT NULL PRIMARY KEY,
        sInspectionField VARCHAR(50)  NOT NULL,
        lRepairItemKey   INT          NOT NULL,
        sDescription     VARCHAR(200) NULL,
        bActive          BIT          NOT NULL CONSTRAINT DF_DiRepairMapping_bActive DEFAULT 1,
        dtCreated        DATETIME     NOT NULL CONSTRAINT DF_DiRepairMapping_dtCreated DEFAULT GETDATE()
    );

    CREATE INDEX IX_DiRepairMapping_Field
        ON dbo.tblDiRepairMapping (sInspectionField)
        WHERE bActive = 1;
END
GO
```

- [ ] **Step 2: Create scan log table script**

```sql
-- docs/sql/02_tblDiScanLog.sql
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tblDiScanLog')
BEGIN
    CREATE TABLE dbo.tblDiScanLog (
        lLogKey          INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
        dtScanned        DATETIME      NOT NULL CONSTRAINT DF_DiScanLog_dtScanned DEFAULT GETDATE(),
        sFileName        VARCHAR(500)  NULL,
        sWorkOrderNumber VARCHAR(50)   NULL,
        sStatus          VARCHAR(20)   NOT NULL,   -- 'Success','BarcodeError','WONotFound','OMRError','Duplicate'
        iFailureCount    INT           NULL,
        iItemsLoaded     INT           NULL,
        sErrorMessage    VARCHAR(1000) NULL,
        sArchivePath     VARCHAR(500)  NULL
    );
END
GO
```

- [ ] **Step 3: Create status insert script**

```sql
-- docs/sql/03_AddDiReviewStatus.sql
-- Adds 'Pending D&I Review' status if it does not already exist
IF NOT EXISTS (
    SELECT 1 FROM dbo.tblRepairStatuses WHERE sRepairStatus = 'Pending D&I Review'
)
BEGIN
    INSERT INTO dbo.tblRepairStatuses (sRepairStatus, lRepairStatusSortOrder)
    VALUES ('Pending D&I Review', 999);
END
GO
```

- [ ] **Step 4: Commit**

```bash
git add docs/sql/
git commit -m "feat: add SQL scripts for D&I scan service tables and status"
```

---

## Task 2: DiScanService Project Scaffold

**Files:**
- Create: `services/DiScanService/DiScanService.csproj`
- Create: `services/DiScanService/DiScanOptions.cs`
- Create: `services/DiScanService/Models/DiMappingEntry.cs`
- Create: `services/DiScanService/Models/ScanResult.cs`
- Create: `services/DiScanService/Interfaces/IBarcodeReader.cs`
- Create: `services/DiScanService/Interfaces/IOmrReader.cs`
- Create: `services/DiScanService/Interfaces/IRepairRepository.cs`
- Create: `services/DiScanService/Interfaces/IScanLogger.cs`
- Create: `services/DiScanService.Tests/DiScanService.Tests.csproj`

- [ ] **Step 1: Create service project file**

```xml
<!-- services/DiScanService/DiScanService.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Worker">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UserSecretsId>di-scan-service</UserSecretsId>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Hosting" Version="8.*" />
    <PackageReference Include="Microsoft.Data.SqlClient" Version="5.*" />
    <PackageReference Include="Aspose.BarCode" Version="26.*" />
    <PackageReference Include="Aspose.OMR" Version="24.*" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Create test project file**

```xml
<!-- services/DiScanService.Tests/DiScanService.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.6.0" />
    <PackageReference Include="xunit" Version="2.4.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.4.5" />
    <PackageReference Include="Moq" Version="4.20.70" />
    <ProjectReference Include="..\DiScanService\DiScanService.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 3: Create config model**

```csharp
// services/DiScanService/DiScanOptions.cs
namespace DiScanService;

public sealed class DiScanOptions
{
    public string WatchFolder   { get; init; } = string.Empty;
    public string ArchiveFolder { get; init; } = string.Empty;
    public string ErrorFolder   { get; init; } = string.Empty;
    public int    FileSettleDelayMs { get; init; } = 2000;
    public string OmrTemplatePath   { get; init; } = string.Empty;
}
```

- [ ] **Step 4: Create model records**

```csharp
// services/DiScanService/Models/DiMappingEntry.cs
namespace DiScanService.Models;

public sealed record DiMappingEntry(
    string InspectionField,
    int    RepairItemKey,
    string Description
);
```

```csharp
// services/DiScanService/Models/ScanResult.cs
namespace DiScanService.Models;

public enum ScanStatus { Success, BarcodeError, WONotFound, OMRError, Duplicate }

public sealed record ScanResult(
    ScanStatus Status,
    string?    WorkOrderNumber,
    int        FailureCount,
    int        ItemsLoaded,
    string?    ArchivePath,
    string?    ErrorMessage
);
```

- [ ] **Step 5: Create interfaces**

```csharp
// services/DiScanService/Interfaces/IBarcodeReader.cs
namespace DiScanService.Interfaces;

public interface IBarcodeReader
{
    /// <summary>Returns the WO# string embedded in the barcode, or null if unreadable.</summary>
    string? ReadWorkOrderNumber(string filePath);
}
```

```csharp
// services/DiScanService/Interfaces/IOmrReader.cs
namespace DiScanService.Interfaces;

public interface IOmrReader
{
    /// <summary>
    /// Reads P/F/N/A boxes from the scanned form.
    /// Returns a dictionary of OMR field name → result value ("P", "F", "N/A", or "").
    /// </summary>
    IReadOnlyDictionary<string, string> ReadForm(string filePath);
}
```

```csharp
// services/DiScanService/Interfaces/IRepairRepository.cs
namespace DiScanService.Interfaces;

using DiScanService.Models;

public interface IRepairRepository
{
    Task<int?> GetRepairKeyAsync(string woNumber, CancellationToken ct);
    Task<bool> IsAlreadyInDiReviewAsync(int repairKey, CancellationToken ct);
    Task<IReadOnlyList<DiMappingEntry>> GetMappingsForFailuresAsync(
        IEnumerable<string> failedFields, CancellationToken ct);
    Task LoadLineItemsAsync(int repairKey, IEnumerable<DiMappingEntry> items, CancellationToken ct);
    Task SetDiReviewStatusAsync(int repairKey, CancellationToken ct);
}
```

```csharp
// services/DiScanService/Interfaces/IScanLogger.cs
namespace DiScanService.Interfaces;

using DiScanService.Models;

public interface IScanLogger
{
    Task LogAsync(string fileName, ScanResult result, CancellationToken ct);
}
```

- [ ] **Step 6: Create appsettings.json**

```json
// services/DiScanService/appsettings.json
{
  "DiScan": {
    "WatchFolder":        "\\\\server\\scans\\di-intake",
    "ArchiveFolder":      "\\\\server\\scans\\di-archive",
    "ErrorFolder":        "\\\\server\\scans\\di-errors",
    "FileSettleDelayMs":  2000,
    "OmrTemplatePath":    "C:\\TSI\\DiScanService\\templates\\OM05-1.omr"
  },
  "ConnectionStrings": {
    "WinScope": "Server=tsi-sql-jb2026.database.windows.net;Database=WinScope;User Id=tsiadmin;Password=REPLACE_WITH_SECRET;"
  },
  "Logging": {
    "LogLevel": { "Default": "Information" }
  }
}
```

- [ ] **Step 7: Commit scaffold**

```bash
git add services/
git commit -m "feat: scaffold DiScanService project, interfaces, and models"
```

---

## Task 3: RepairRepository + Tests

**Files:**
- Create: `services/DiScanService/Data/RepairRepository.cs`
- Create: `services/DiScanService.Tests/RepairRepositoryTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// services/DiScanService.Tests/RepairRepositoryTests.cs
using DiScanService.Data;
using DiScanService.Models;
using Microsoft.Data.SqlClient;
using Xunit;

// These are integration tests — run against a local dev DB with test data.
// Skip in CI with: [Trait("Category", "Integration")]
public class RepairRepositoryTests
{
    // Replace with local dev connection string before running
    private const string ConnStr =
        "Server=localhost;Database=WinScope;Trusted_Connection=True;";

    [Trait("Category", "Integration")]
    [Fact]
    public async Task GetRepairKeyAsync_ReturnsNull_WhenWONotFound()
    {
        var repo = new RepairRepository(ConnStr);
        var result = await repo.GetRepairKeyAsync("WO-DOES-NOT-EXIST", CancellationToken.None);
        Assert.Null(result);
    }

    [Trait("Category", "Integration")]
    [Fact]
    public async Task GetMappingsForFailures_ReturnsEmpty_WhenNoMappingsDefined()
    {
        var repo = new RepairRepository(ConnStr);
        var result = await repo.GetMappingsForFailuresAsync(
            ["insAngulationPF"], CancellationToken.None);
        // Empty until tblDiRepairMapping is populated
        Assert.IsAssignableFrom<IReadOnlyList<DiMappingEntry>>(result);
    }
}
```

- [ ] **Step 2: Run tests — expect them to skip or fail with connection error**

```bash
cd services/DiScanService.Tests
dotnet test --filter "Category=Integration" -v
```
Expected: skipped or "cannot open database" — confirms test structure is correct.

- [ ] **Step 3: Implement RepairRepository**

```csharp
// services/DiScanService/Data/RepairRepository.cs
using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Data.SqlClient;

namespace DiScanService.Data;

public sealed class RepairRepository(string connectionString) : IRepairRepository
{
    public async Task<int?> GetRepairKeyAsync(string woNumber, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(
            "SELECT lRepairKey FROM tblRepair WHERE sWorkOrderNumber = @wo", conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@wo", woNumber);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is DBNull or null ? null : Convert.ToInt32(result);
    }

    public async Task<bool> IsAlreadyInDiReviewAsync(int repairKey, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand("""
            SELECT COUNT(1)
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            WHERE r.lRepairKey = @key
              AND rs.sRepairStatus = 'Pending D&I Review'
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", repairKey);
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync(ct));
        return count > 0;
    }

    public async Task<IReadOnlyList<DiMappingEntry>> GetMappingsForFailuresAsync(
        IEnumerable<string> failedFields, CancellationToken ct)
    {
        var fields = failedFields.ToList();
        if (fields.Count == 0) return [];

        var paramNames = fields.Select((_, i) => $"@f{i}").ToList();
        var inClause   = string.Join(",", paramNames);

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand($"""
            SELECT sInspectionField, lRepairItemKey, ISNULL(sDescription,'') AS sDescription
            FROM tblDiRepairMapping
            WHERE bActive = 1
              AND sInspectionField IN ({inClause})
            """, conn);
        cmd.CommandTimeout = 30;
        for (int i = 0; i < fields.Count; i++)
            cmd.Parameters.AddWithValue(paramNames[i], fields[i]);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var results = new List<DiMappingEntry>();
        while (await reader.ReadAsync(ct))
            results.Add(new DiMappingEntry(
                reader.GetString(0),
                reader.GetInt32(1),
                reader.GetString(2)));
        return results;
    }

    public async Task LoadLineItemsAsync(
        int repairKey, IEnumerable<DiMappingEntry> items, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);

        foreach (var item in items)
        {
            await using var cmd = new SqlCommand("""
                INSERT INTO tblRepairItemTran
                    (lRepairKey, lRepairItemKey, sApproved, sFixType, dblRepairPrice, dblRepairPriceBase, sComments)
                VALUES
                    (@repairKey, @itemKey, 'P', 'R', 0, 0, @desc)
                """, conn);
            cmd.CommandTimeout = 30;
            cmd.Parameters.AddWithValue("@repairKey", repairKey);
            cmd.Parameters.AddWithValue("@itemKey",   item.RepairItemKey);
            cmd.Parameters.AddWithValue("@desc",      (object?)item.Description ?? DBNull.Value);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    public async Task SetDiReviewStatusAsync(int repairKey, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);

        // Get the DI_REVIEW status ID
        await using var idCmd = new SqlCommand(
            "SELECT lRepairStatusID FROM tblRepairStatuses WHERE sRepairStatus = 'Pending D&I Review'",
            conn);
        idCmd.CommandTimeout = 30;
        var statusId = Convert.ToInt32(await idCmd.ExecuteScalarAsync(ct));

        // Update repair + write status log (mirrors existing pattern in RepairsController)
        await using var updateCmd = new SqlCommand("""
            UPDATE tblRepair SET lRepairStatusID = @statusId WHERE lRepairKey = @key;
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate)
            SELECT @key, @statusId, sRepairStatus, GETDATE()
            FROM tblRepairStatuses WHERE lRepairStatusID = @statusId;
            """, conn);
        updateCmd.CommandTimeout = 30;
        updateCmd.Parameters.AddWithValue("@statusId", statusId);
        updateCmd.Parameters.AddWithValue("@key",      repairKey);
        await updateCmd.ExecuteNonQueryAsync(ct);
    }
}
```

- [ ] **Step 4: Build to verify compilation**

```bash
cd services/DiScanService
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add services/DiScanService/Data/RepairRepository.cs services/DiScanService.Tests/RepairRepositoryTests.cs
git commit -m "feat: add RepairRepository with SQL implementation and integration tests"
```

---

## Task 4: ScanLogger + Tests

**Files:**
- Create: `services/DiScanService/Data/ScanLogger.cs`
- Create: `services/DiScanService.Tests/ScanLoggerTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
// services/DiScanService.Tests/ScanLoggerTests.cs
using DiScanService.Data;
using DiScanService.Models;
using Xunit;

public class ScanLoggerTests
{
    [Trait("Category", "Integration")]
    [Fact]
    public async Task LogAsync_DoesNotThrow_OnSuccess()
    {
        const string connStr = "Server=localhost;Database=WinScope;Trusted_Connection=True;";
        var logger = new ScanLogger(connStr);
        var result = new ScanResult(ScanStatus.Success, "WO-TEST-001", 3, 3, @"C:\archive\test.pdf", null);

        // Should insert a row without throwing
        var ex = await Record.ExceptionAsync(
            () => logger.LogAsync("test.pdf", result, CancellationToken.None));
        Assert.Null(ex);
    }
}
```

- [ ] **Step 2: Implement ScanLogger**

```csharp
// services/DiScanService/Data/ScanLogger.cs
using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Data.SqlClient;

namespace DiScanService.Data;

public sealed class ScanLogger(string connectionString) : IScanLogger
{
    public async Task LogAsync(string fileName, ScanResult result, CancellationToken ct)
    {
        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new SqlCommand("""
            INSERT INTO tblDiScanLog
                (sFileName, sWorkOrderNumber, sStatus, iFailureCount, iItemsLoaded, sErrorMessage, sArchivePath)
            VALUES
                (@file, @wo, @status, @failures, @items, @error, @archive)
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@file",     (object?)fileName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@wo",        (object?)result.WorkOrderNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@status",    result.Status.ToString());
        cmd.Parameters.AddWithValue("@failures",  (object?)result.FailureCount);
        cmd.Parameters.AddWithValue("@items",     (object?)result.ItemsLoaded);
        cmd.Parameters.AddWithValue("@error",     (object?)result.ErrorMessage ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@archive",   (object?)result.ArchivePath ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add services/DiScanService/Data/ScanLogger.cs services/DiScanService.Tests/ScanLoggerTests.cs
git commit -m "feat: add ScanLogger writing to tblDiScanLog"
```

---

## Task 5: BarcodeReader + OmrReader Implementations

**Files:**
- Create: `services/DiScanService/Readers/BarcodeReader.cs`
- Create: `services/DiScanService/Readers/OmrReader.cs`

> **Note:** Aspose.BarCode and Aspose.OMR wrap third-party libraries. Unit tests would require fixture image files. Physical validation (Task 9) replaces unit testing for these readers. The interfaces isolate the rest of the system from Aspose.

- [ ] **Step 1: Implement BarcodeReader**

```csharp
// services/DiScanService/Readers/BarcodeReader.cs
using Aspose.BarCode.Recognition;
using DiScanService.Interfaces;

namespace DiScanService.Readers;

public sealed class BarcodeReader : IBarcodeReader
{
    public string? ReadWorkOrderNumber(string filePath)
    {
        using var reader = new BarCodeReader(filePath, DecodeType.Code128, DecodeType.QR);
        foreach (var result in reader.ReadBarCodes())
        {
            var value = result.CodeText?.Trim();
            if (!string.IsNullOrEmpty(value))
                return value;
        }
        return null;
    }
}
```

- [ ] **Step 2: Create OMR template file**

Create the Aspose.OMR template at `services/DiScanService/templates/OM05-1.omr`.
This file defines the position of every P/F/N/A box on the form. **This step requires physical testing** — print the form, fill it, scan it, and adjust positions until recognition is accurate. The field names below MUST match the values used in `tblDiRepairMapping.sInspectionField`.

```
?image=OM05-1-blank.png
?answer_sheet=
	columns_count=3
	answers_list=("P","F","N/A")
	bubble_size=Small
?section=3A
?question=insLeakPF
	content=Leak Test Performed
?question=insHotColdLeakPF
	content=Fluid Invasion Detected
?section=3B
?question=insAngulationPF
	content=Angulation System
?section=3C
?question=insImagePF
	content=Video Image
?question=insLightFibersPF
	content=Light Bundle
?question=insFiberLightTransPF
	content=Fiber Light Transmission
?question=insVisionPF
	content=Video Features
?question=insFocalDistancePF
	content=Focal Distance
?question=insImageCentrationPF
	content=Image Centration
?question=insFogPF
	content=Fog
?section=3D
?question=insSuctionPF
	content=Suction Channel
?question=insForcepChannelPF
	content=Forcep / Biopsy Channel
?question=insAuxWaterPF
	content=Auxiliary Water Channel
?question=insAirWaterPF
	content=A/W System Channel
?section=3E
?question=insLightGuideConnectorPF
	content=Light Guide Connector
?section=3G-3I
?question=insInsertionTubePF
	content=Insertion Tube
?question=insDistalTipPF
	content=Distal Tip / C-Cover
?question=insEyePiecePF
	content=Lenses
?question=insUniversalCordPF
	content=Universal Cord
?section=4
?question=insInternalChannelsPF
	content=Internal Channels
```

- [ ] **Step 3: Implement OmrReader**

```csharp
// services/DiScanService/Readers/OmrReader.cs
using Aspose.OMR.Api;
using DiScanService.Interfaces;

namespace DiScanService.Readers;

public sealed class OmrReader(string templatePath) : IOmrReader
{
    public IReadOnlyDictionary<string, string> ReadForm(string filePath)
    {
        var engine   = new OmrEngine();
        var template = engine.GetTemplateProcessor(templatePath);
        var result   = template.RecognizeImage(filePath);

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var element in result.RecognitionResults)
        {
            // element.Name = field name (e.g. "insAngulationPF")
            // element.ChosenAnswers = e.g. ["F"] or []
            var chosen = element.ChosenAnswers?.FirstOrDefault() ?? string.Empty;
            dict[element.Name] = chosen;
        }
        return dict;
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add services/DiScanService/Readers/ services/DiScanService/templates/
git commit -m "feat: add BarcodeReader, OmrReader, and OM05-1 template stub"
```

---

## Task 6: ScanProcessor + Tests

**Files:**
- Create: `services/DiScanService/ScanProcessor.cs`
- Create: `services/DiScanService.Tests/ScanProcessorTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// services/DiScanService.Tests/ScanProcessorTests.cs
using DiScanService;
using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

public class ScanProcessorTests
{
    private static ScanProcessor BuildProcessor(
        IBarcodeReader? barcode = null,
        IOmrReader? omr = null,
        IRepairRepository? repo = null,
        IScanLogger? logger = null)
    {
        var opts = Options.Create(new DiScanOptions
        {
            ArchiveFolder = @"C:\fake\archive",
            ErrorFolder   = @"C:\fake\errors"
        });
        return new ScanProcessor(
            barcode  ?? Mock.Of<IBarcodeReader>(),
            omr      ?? Mock.Of<IOmrReader>(),
            repo     ?? Mock.Of<IRepairRepository>(),
            logger   ?? Mock.Of<IScanLogger>(),
            opts,
            NullLogger<ScanProcessor>.Instance);
    }

    [Fact]
    public async Task ProcessAsync_ReturnsBarcodeError_WhenBarcodeUnreadable()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns((string?)null);

        var processor = BuildProcessor(barcode: barcode.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.BarcodeError, result.Status);
    }

    [Fact]
    public async Task ProcessAsync_ReturnsWONotFound_WhenRepairKeyNull()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns("WO-2026-0001");

        var repo = new Mock<IRepairRepository>();
        repo.Setup(r => r.GetRepairKeyAsync("WO-2026-0001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((int?)null);

        var processor = BuildProcessor(barcode: barcode.Object, repo: repo.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.WONotFound, result.Status);
    }

    [Fact]
    public async Task ProcessAsync_ReturnsDuplicate_WhenAlreadyInDiReview()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns("WO-2026-0001");

        var repo = new Mock<IRepairRepository>();
        repo.Setup(r => r.GetRepairKeyAsync("WO-2026-0001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        repo.Setup(r => r.IsAlreadyInDiReviewAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var processor = BuildProcessor(barcode: barcode.Object, repo: repo.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.Duplicate, result.Status);
    }

    [Fact]
    public async Task ProcessAsync_LoadsItemsAndSetsStatus_OnSuccess()
    {
        var barcode = new Mock<IBarcodeReader>();
        barcode.Setup(b => b.ReadWorkOrderNumber(It.IsAny<string>())).Returns("WO-2026-0001");

        var omr = new Mock<IOmrReader>();
        omr.Setup(o => o.ReadForm(It.IsAny<string>())).Returns(new Dictionary<string, string>
        {
            ["insLeakPF"]       = "P",
            ["insAngulationPF"] = "F",
            ["insDistalTipPF"]  = "F"
        });

        var mappings = new List<DiMappingEntry>
        {
            new("insAngulationPF", 101, "Angulation Cable Replacement"),
            new("insDistalTipPF",  202, "Distal Tip Repair")
        };

        var repo = new Mock<IRepairRepository>();
        repo.Setup(r => r.GetRepairKeyAsync("WO-2026-0001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        repo.Setup(r => r.IsAlreadyInDiReviewAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        repo.Setup(r => r.GetMappingsForFailuresAsync(
                It.Is<IEnumerable<string>>(f => f.Contains("insAngulationPF") && f.Contains("insDistalTipPF")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(mappings);

        var processor = BuildProcessor(barcode: barcode.Object, omr: omr.Object, repo: repo.Object);
        var result = await processor.ProcessAsync(@"C:\fake\scan.pdf", CancellationToken.None);

        Assert.Equal(ScanStatus.Success, result.Status);
        Assert.Equal(2, result.FailureCount);
        Assert.Equal(2, result.ItemsLoaded);

        repo.Verify(r => r.LoadLineItemsAsync(
            42,
            It.Is<IEnumerable<DiMappingEntry>>(items => items.Count() == 2),
            It.IsAny<CancellationToken>()), Times.Once);

        repo.Verify(r => r.SetDiReviewStatusAsync(42, It.IsAny<CancellationToken>()), Times.Once);
    }
}
```

- [ ] **Step 2: Run tests — expect compilation failure (ScanProcessor not yet written)**

```bash
cd services/DiScanService.Tests
dotnet build
```
Expected: Build error — `ScanProcessor` not found.

- [ ] **Step 3: Implement ScanProcessor**

```csharp
// services/DiScanService/ScanProcessor.cs
using DiScanService.Interfaces;
using DiScanService.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DiScanService;

public sealed class ScanProcessor(
    IBarcodeReader    barcodeReader,
    IOmrReader        omrReader,
    IRepairRepository repository,
    IScanLogger       scanLogger,
    IOptions<DiScanOptions> options,
    ILogger<ScanProcessor>  logger)
{
    private readonly DiScanOptions _opts = options.Value;

    public async Task<ScanResult> ProcessAsync(string filePath, CancellationToken ct)
    {
        var fileName = Path.GetFileName(filePath);

        // 1. Read barcode
        var woNumber = barcodeReader.ReadWorkOrderNumber(filePath);
        if (string.IsNullOrEmpty(woNumber))
        {
            logger.LogWarning("Barcode unreadable in {File}", fileName);
            var r = new ScanResult(ScanStatus.BarcodeError, null, 0, 0, null, "Barcode unreadable");
            MoveFile(filePath, _opts.ErrorFolder);
            await scanLogger.LogAsync(fileName, r, ct);
            return r;
        }

        // 2. Look up repair key
        var repairKey = await repository.GetRepairKeyAsync(woNumber, ct);
        if (repairKey is null)
        {
            logger.LogWarning("WO {WO} not found in database", woNumber);
            var r = new ScanResult(ScanStatus.WONotFound, woNumber, 0, 0, null, $"WO {woNumber} not found");
            MoveFile(filePath, _opts.ErrorFolder);
            await scanLogger.LogAsync(fileName, r, ct);
            return r;
        }

        // 3. Duplicate check
        if (await repository.IsAlreadyInDiReviewAsync(repairKey.Value, ct))
        {
            logger.LogWarning("WO {WO} already in D&I Review — skipping duplicate", woNumber);
            var r = new ScanResult(ScanStatus.Duplicate, woNumber, 0, 0, null, "Already in D&I Review");
            await scanLogger.LogAsync(fileName, r, ct);
            return r;
        }

        // 4. Read OMR bubbles
        var fields   = omrReader.ReadForm(filePath);
        var failures = fields
            .Where(kv => kv.Value.Equals("F", StringComparison.OrdinalIgnoreCase))
            .Select(kv => kv.Key)
            .ToList();

        logger.LogInformation("WO {WO}: {Count} failures detected", woNumber, failures.Count);

        // 5. Map failures → repair items
        var mappings = await repository.GetMappingsForFailuresAsync(failures, ct);

        // 6. Load line items + set status
        await repository.LoadLineItemsAsync(repairKey.Value, mappings, ct);
        await repository.SetDiReviewStatusAsync(repairKey.Value, ct);

        // 7. Archive
        var archivePath = ArchiveFile(filePath);

        var success = new ScanResult(
            ScanStatus.Success, woNumber, failures.Count, mappings.Count, archivePath, null);
        await scanLogger.LogAsync(fileName, success, ct);

        logger.LogInformation("WO {WO}: processed — {Items} items loaded", woNumber, mappings.Count);
        return success;
    }

    private static string ArchiveFile(string filePath)
    {
        // Caller (Worker) handles actual file move; processor just returns intended path
        return filePath;
    }

    private static void MoveFile(string filePath, string destFolder)
    {
        try
        {
            Directory.CreateDirectory(destFolder);
            var dest = Path.Combine(destFolder, Path.GetFileName(filePath));
            File.Move(filePath, dest, overwrite: true);
        }
        catch { /* log swallowed — best effort */ }
    }
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd services/DiScanService.Tests
dotnet test -v
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add services/DiScanService/ScanProcessor.cs services/DiScanService.Tests/ScanProcessorTests.cs
git commit -m "feat: add ScanProcessor with full orchestration logic and unit tests"
```

---

## Task 7: Worker + Program (Wire Everything Together)

**Files:**
- Create: `services/DiScanService/Worker.cs`
- Create: `services/DiScanService/Program.cs`

- [ ] **Step 1: Implement Worker**

```csharp
// services/DiScanService/Worker.cs
using DiScanService;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public sealed class Worker(
    ScanProcessor processor,
    IOptions<DiScanOptions> options,
    ILogger<Worker> logger) : BackgroundService
{
    private readonly DiScanOptions _opts = options.Value;
    private FileSystemWatcher? _watcher;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Directory.CreateDirectory(_opts.WatchFolder);
        Directory.CreateDirectory(_opts.ArchiveFolder);
        Directory.CreateDirectory(_opts.ErrorFolder);

        _watcher = new FileSystemWatcher(_opts.WatchFolder)
        {
            NotifyFilter        = NotifyFilters.FileName,
            Filter              = "*.*",
            EnableRaisingEvents = true
        };

        _watcher.Created += async (_, e) =>
        {
            // Settle delay — scanner may still be writing the file
            await Task.Delay(_opts.FileSettleDelayMs, stoppingToken);
            if (!File.Exists(e.FullPath)) return;

            try
            {
                await processor.ProcessAsync(e.FullPath, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled error processing {File}", e.Name);
            }
        };

        logger.LogInformation("DiScanService watching {Folder}", _opts.WatchFolder);
        return Task.CompletedTask;
    }

    public override void Dispose()
    {
        _watcher?.Dispose();
        base.Dispose();
    }
}
```

- [ ] **Step 2: Implement Program.cs**

```csharp
// services/DiScanService/Program.cs
using DiScanService;
using DiScanService.Data;
using DiScanService.Interfaces;
using DiScanService.Readers;

var host = Host.CreateDefaultBuilder(args)
    .UseWindowsService()
    .ConfigureServices((ctx, services) =>
    {
        services.Configure<DiScanOptions>(ctx.Configuration.GetSection("DiScan"));

        var connStr = ctx.Configuration.GetConnectionString("WinScope")
            ?? throw new InvalidOperationException("WinScope connection string missing");

        services.AddSingleton<IBarcodeReader, BarcodeReader>();
        services.AddSingleton<IOmrReader>(_ =>
            new OmrReader(ctx.Configuration["DiScan:OmrTemplatePath"]
                ?? throw new InvalidOperationException("OmrTemplatePath missing")));
        services.AddSingleton<IRepairRepository>(_ => new RepairRepository(connStr));
        services.AddSingleton<IScanLogger>(_ => new ScanLogger(connStr));
        services.AddSingleton<ScanProcessor>();
        services.AddHostedService<Worker>();
    })
    .Build();

await host.RunAsync();
```

- [ ] **Step 3: Build the full service**

```bash
cd services/DiScanService
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add services/DiScanService/Worker.cs services/DiScanService/Program.cs
git commit -m "feat: wire DiScanService Worker and Program DI setup"
```

---

## Task 8: Portal API — DiReviewController

**Files:**
- Create: `server/TSI.Api/Controllers/DiReviewController.cs`

- [ ] **Step 1: Create controller**

```csharp
// server/TSI.Api/Controllers/DiReviewController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

[ApiController]
[Route("api/di-review")]
public class DiReviewController : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(Environment.GetEnvironmentVariable("WISNSCOPENET_CONN")
            ?? throw new InvalidOperationException("Connection string not configured"));

    // GET /api/di-review
    // Returns all WOs in 'Pending D&I Review' status
    [HttpGet]
    public async Task<IActionResult> GetQueue()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            SELECT r.lRepairKey,
                   r.sWorkOrderNumber,
                   ISNULL(c.sClientName,'') AS sClientName,
                   ISNULL(st.sScopeTypeDesc,'') AS sScopeType,
                   ISNULL(s.sSerialNumber,'') AS sSerialNumber,
                   ISNULL(l.dtScanned, r.dtDateIn) AS dtScanned,
                   ISNULL(l.iFailureCount, 0) AS iFailureCount,
                   ISNULL(l.iItemsLoaded, 0) AS iItemsLoaded,
                   ISNULL(l.sStatus,'') AS sScanStatus
            FROM tblRepair r
            JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
            LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
            LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
            LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
            LEFT JOIN (
                SELECT sWorkOrderNumber, MAX(dtScanned) AS dtScanned,
                       MAX(iFailureCount) AS iFailureCount, MAX(iItemsLoaded) AS iItemsLoaded,
                       MAX(sStatus) AS sStatus
                FROM tblDiScanLog GROUP BY sWorkOrderNumber
            ) l ON l.sWorkOrderNumber = r.sWorkOrderNumber
            WHERE rs.sRepairStatus = 'Pending D&I Review'
            ORDER BY ISNULL(l.dtScanned, r.dtDateIn) ASC
            """, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
            items.Add(new {
                repairKey       = reader.GetInt32(0),
                woNumber        = reader.GetString(1),
                client          = reader.GetString(2),
                scopeType       = reader.GetString(3),
                serialNumber    = reader.GetString(4),
                scannedAt       = reader.GetDateTime(5),
                failureCount    = reader.GetInt32(6),
                itemsLoaded     = reader.GetInt32(7),
                scanStatus      = reader.GetString(8)
            });
        return Ok(items);
    }

    // GET /api/di-review/{repairKey}
    // Returns loaded repair items for a single WO in the queue
    [HttpGet("{repairKey:int}")]
    public async Task<IActionResult> GetDetail(int repairKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand("""
            SELECT rit.lRepairItemTranKey,
                   ISNULL(ri.sRepairItemDesc,'') AS sDescription,
                   ISNULL(rit.sComments,'') AS sFinding,
                   rit.sApproved
            FROM tblRepairItemTran rit
            LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
            WHERE rit.lRepairKey = @key
            ORDER BY rit.lRepairItemTranKey
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@key", repairKey);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
            items.Add(new {
                tranKey     = reader.GetInt32(0),
                description = reader.GetString(1),
                finding     = reader.GetString(2),
                approved    = reader.GetString(3)
            });
        return Ok(items);
    }

    // DELETE /api/di-review/{repairKey}/items/{tranKey}
    [HttpDelete("{repairKey:int}/items/{tranKey:int}")]
    public async Task<IActionResult> RemoveItem(int repairKey, int tranKey)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();
        await using var cmd = new SqlCommand(
            "DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey",
            conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@tranKey",   tranKey);
        cmd.Parameters.AddWithValue("@repairKey", repairKey);
        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0 ? NoContent() : NotFound();
    }

    // POST /api/di-review/{repairKey}/approve
    [HttpPost("{repairKey:int}/approve")]
    public async Task<IActionResult> Approve(int repairKey, [FromBody] ApproveBody body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Save tech comments
        if (!string.IsNullOrWhiteSpace(body.TechComments))
        {
            await using var notesCmd = new SqlCommand(
                "UPDATE tblRepair SET mCommentsDisIns = @notes WHERE lRepairKey = @key", conn);
            notesCmd.CommandTimeout = 30;
            notesCmd.Parameters.AddWithValue("@notes", body.TechComments);
            notesCmd.Parameters.AddWithValue("@key",   repairKey);
            await notesCmd.ExecuteNonQueryAsync();
        }

        // Move WO off D&I Review status → back to open/in-progress
        // Uses the lowest-sort-order non-D&I-Review status as the target
        await using var statusCmd = new SqlCommand("""
            DECLARE @nextStatusId INT = (
                SELECT TOP 1 lRepairStatusID
                FROM tblRepairStatuses
                WHERE sRepairStatus <> 'Pending D&I Review'
                  AND ISNULL(bIsReadOnly,0) = 0
                ORDER BY lRepairStatusSortOrder
            );
            UPDATE tblRepair SET lRepairStatusID = @nextStatusId WHERE lRepairKey = @key;
            INSERT INTO tblRepairStatusLog (lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate)
            SELECT @key, @nextStatusId, sRepairStatus, GETDATE()
            FROM tblRepairStatuses WHERE lRepairStatusID = @nextStatusId;
            """, conn);
        statusCmd.CommandTimeout = 30;
        statusCmd.Parameters.AddWithValue("@key", repairKey);
        await statusCmd.ExecuteNonQueryAsync();

        return NoContent();
    }

    // POST /api/di-review/{repairKey}/hold
    [HttpPost("{repairKey:int}/hold")]
    public async Task<IActionResult> Hold(int repairKey, [FromBody] HoldBody body)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        // Append hold note to mCommentsDisIns
        await using var cmd = new SqlCommand("""
            UPDATE tblRepair
            SET mCommentsDisIns = ISNULL(mCommentsDisIns,'') + CHAR(13)+CHAR(10)
                + '[HOLD ' + CONVERT(VARCHAR,GETDATE(),120) + '] ' + @note
            WHERE lRepairKey = @key
            """, conn);
        cmd.CommandTimeout = 30;
        cmd.Parameters.AddWithValue("@note", body.Note ?? string.Empty);
        cmd.Parameters.AddWithValue("@key",  repairKey);
        await cmd.ExecuteNonQueryAsync();

        return NoContent();
    }

    public record ApproveBody(string? TechComments);
    public record HoldBody(string? Note);
}
```

- [ ] **Step 2: Build API project**

```bash
cd server/TSI.Api
dotnet build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/DiReviewController.cs
git commit -m "feat: add DiReviewController with queue, approve, hold, and remove-item endpoints"
```

---

## Task 9: Portal UI — Types + API Client

**Files:**
- Create: `client/src/pages/di-review/types.ts`
- Create: `client/src/api/diReview.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
// client/src/pages/di-review/types.ts
export interface DiQueueItem {
  repairKey:    number;
  woNumber:     string;
  client:       string;
  scopeType:    string;
  serialNumber: string;
  scannedAt:    string;
  failureCount: number;
  itemsLoaded:  number;
  scanStatus:   string;  // 'Success' | 'BarcodeError' | 'OMRError' | 'Duplicate'
}

export interface LoadedRepair {
  tranKey:     number;
  description: string;
  finding:     string;   // D&I field name that triggered this item
  approved:    string;
}
```

- [ ] **Step 2: Create API client**

```typescript
// client/src/api/diReview.ts
import axios from 'axios';
import type { DiQueueItem, LoadedRepair } from '../pages/di-review/types';

const BASE = '/api/di-review';

export const getDiQueue = () =>
  axios.get<DiQueueItem[]>(BASE).then(r => r.data);

export const getDiDetail = (repairKey: number) =>
  axios.get<LoadedRepair[]>(`${BASE}/${repairKey}`).then(r => r.data);

export const removeDiItem = (repairKey: number, tranKey: number) =>
  axios.delete(`${BASE}/${repairKey}/items/${tranKey}`);

export const approveDiReview = (repairKey: number, techComments: string) =>
  axios.post(`${BASE}/${repairKey}/approve`, { techComments });

export const holdDiReview = (repairKey: number, note: string) =>
  axios.post(`${BASE}/${repairKey}/hold`, { note });
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/di-review/types.ts client/src/api/diReview.ts
git commit -m "feat: add DiReview TypeScript types and API client"
```

---

## Task 10: Portal UI — Queue Page + Review Panel

**Files:**
- Create: `client/src/pages/di-review/DiReviewPage.tsx`
- Create: `client/src/pages/di-review/DiReviewPanel.tsx`
- Create: `client/src/pages/di-review/index.tsx`

- [ ] **Step 1: Create DiReviewPanel**

```tsx
// client/src/pages/di-review/DiReviewPanel.tsx
import { useState } from 'react';
import { Button, Input, Table, Popconfirm, Tag, message } from 'antd';
import type { LoadedRepair } from './types';
import { removeDiItem, approveDiReview, holdDiReview } from '../../api/diReview';

interface Props {
  repairKey: number;
  woNumber:  string;
  client:    string;
  items:     LoadedRepair[];
  scannedAt: string;
  failureCount: number;
  onDone: () => void;
  onRefresh: () => void;
}

export const DiReviewPanel = ({
  repairKey, woNumber, client, items: initialItems,
  scannedAt, failureCount, onDone, onRefresh
}: Props) => {
  const [items, setItems]           = useState(initialItems);
  const [comments, setComments]     = useState('');
  const [holdNote, setHoldNote]     = useState('');
  const [showHold, setShowHold]     = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleRemove = async (tranKey: number) => {
    await removeDiItem(repairKey, tranKey);
    setItems(prev => prev.filter(i => i.tranKey !== tranKey));
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approveDiReview(repairKey, comments);
      message.success(`WO ${woNumber} approved — open to generate requisition`);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const handleHold = async () => {
    if (!holdNote.trim()) { message.warning('Enter a hold reason'); return; }
    await holdDiReview(repairKey, holdNote);
    message.info(`WO ${woNumber} held`);
    setShowHold(false);
    onRefresh();
  };

  const columns = [
    { title: 'D&I Finding', dataIndex: 'finding', key: 'finding',
      render: (v: string) => <Tag color="error">{v || '—'}</Tag> },
    { title: 'Repair Item', dataIndex: 'description', key: 'description' },
    { title: '', key: 'action', width: 80,
      render: (_: unknown, row: LoadedRepair) => (
        <Popconfirm title="Remove this item?" onConfirm={() => handleRemove(row.tranKey)}>
          <Button size="small" danger type="link">Remove</Button>
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 6 }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--muted)' }}>
        {client} · Scanned {new Date(scannedAt).toLocaleString()} · {failureCount} failures
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="tranKey"
        size="small"
        pagination={false}
        style={{ marginBottom: 12 }}
      />

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
          Tech Comments (transcribe from paper)
        </div>
        <Input.TextArea
          value={comments}
          onChange={e => setComments(e.target.value)}
          placeholder="Type tech's handwritten notes here..."
          rows={2}
        />
      </div>

      {showHold && (
        <div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
          <Input
            value={holdNote}
            onChange={e => setHoldNote(e.target.value)}
            placeholder="Hold reason..."
            style={{ flex: 1 }}
          />
          <Button onClick={handleHold}>Save Hold</Button>
          <Button onClick={() => setShowHold(false)}>Cancel</Button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={() => setShowHold(true)}>Hold</Button>
        <Button
          type="primary"
          loading={saving}
          onClick={handleApprove}
          style={{ background: 'var(--success)' }}
        >
          Approve &amp; Generate Requisition
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create DiReviewPage**

```tsx
// client/src/pages/di-review/DiReviewPage.tsx
import { useEffect, useState } from 'react';
import { Table, Badge, Button, Spin, message, Tag } from 'antd';
import type { DiQueueItem, LoadedRepair } from './types';
import { getDiQueue, getDiDetail } from '../../api/diReview';
import { DiReviewPanel } from './DiReviewPanel';

export const DiReviewPage = () => {
  const [queue, setQueue]             = useState<DiQueueItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [detail, setDetail]           = useState<LoadedRepair[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadQueue = () => {
    setLoading(true);
    getDiQueue()
      .then(setQueue)
      .catch(() => message.error('Failed to load queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const handleExpand = async (repairKey: number) => {
    if (expanded === repairKey) { setExpanded(null); setDetail(null); return; }
    setExpanded(repairKey);
    setDetailLoading(true);
    try {
      const items = await getDiDetail(repairKey);
      setDetail(items);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: 'Work Order', dataIndex: 'woNumber', key: 'woNumber',
      render: (v: string) => <span style={{ fontWeight: 700 }}>{v}</span> },
    { title: 'Client',       dataIndex: 'client',    key: 'client' },
    { title: 'Scope',        dataIndex: 'scopeType', key: 'scopeType' },
    { title: 'Scanned',      dataIndex: 'scannedAt', key: 'scannedAt',
      render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Failures', dataIndex: 'failureCount', key: 'failureCount', align: 'center' as const,
      render: (v: number, row: DiQueueItem) =>
        row.scanStatus !== 'Success'
          ? <Tag color="warning">⚠ Scan Error</Tag>
          : <Tag color="error">{v} Fails</Tag>
    },
    { title: 'Items Loaded', dataIndex: 'itemsLoaded', key: 'itemsLoaded', align: 'center' as const,
      render: (v: number, row: DiQueueItem) =>
        row.scanStatus !== 'Success' ? '—' : <Tag color="success">{v} Items</Tag>
    },
    { title: '', key: 'action',
      render: (_: unknown, row: DiQueueItem) => (
        <Button size="small" type="primary" onClick={() => handleExpand(row.repairKey)}>
          {expanded === row.repairKey ? 'Close' : row.scanStatus !== 'Success' ? 'Fix' : 'Review'}
        </Button>
      )
    },
  ];

  const pendingCount = queue.filter(q => q.scanStatus === 'Success').length;

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>D&amp;I Scan Review Queue</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            Work orders auto-loaded from scanned D&amp;I forms — review before sending for approval
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge count={pendingCount} color="red" />
        )}
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={queue}
          columns={columns}
          rowKey="repairKey"
          size="small"
          pagination={false}
          expandable={{
            expandedRowKeys: expanded ? [expanded] : [],
            expandedRowRender: (row: DiQueueItem) =>
              detailLoading ? <Spin /> : detail ? (
                <DiReviewPanel
                  repairKey={row.repairKey}
                  woNumber={row.woNumber}
                  client={row.client}
                  items={detail}
                  scannedAt={row.scannedAt}
                  failureCount={row.failureCount}
                  onDone={() => { setExpanded(null); loadQueue(); }}
                  onRefresh={loadQueue}
                />
              ) : null,
            showExpandColumn: false,
          }}
        />
      </Spin>
    </div>
  );
};
```

- [ ] **Step 3: Create index re-export**

```typescript
// client/src/pages/di-review/index.tsx
export { DiReviewPage } from './DiReviewPage';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/di-review/
git commit -m "feat: add DiReviewPage and DiReviewPanel portal UI"
```

---

## Task 11: Wire Route + Verify

**Files:**
- Modify: router/App file (check current routing pattern first)

- [ ] **Step 1: Find the router file**

```bash
grep -r "createBrowserRouter\|<Route" client/src --include="*.tsx" -l
```

- [ ] **Step 2: Add /di-review route**

Open the router file found above. Add the import and route following the exact same pattern used by existing routes:

```tsx
import { DiReviewPage } from './pages/di-review';

// Inside the routes array, add:
{ path: '/di-review', element: <DiReviewPage /> }
```

- [ ] **Step 3: Run the dev server and verify the page loads**

```bash
cd client && npm run dev
```
Open `http://localhost:5173/di-review`. Expected: page renders with "D&I Scan Review Queue" heading and an empty table (no real data yet — that's correct).

- [ ] **Step 4: Check browser console for errors**
Expected: No errors. If CORS or 401 errors appear, confirm the API dev proxy is running and the endpoint is unauthenticated for dev.

- [ ] **Step 5: Commit**

```bash
git add client/src/
git commit -m "feat: add /di-review route to portal"
```

---

## Task 12: Physical OMR Validation (Non-Code)

> This task is a physical validation step — cannot be automated.

- [ ] **Step 1:** Print the redesigned OM05-1 form from the portal
- [ ] **Step 2:** Fill in several test cases — some all-pass, some with multiple failures
- [ ] **Step 3:** Scan on the actual production scanner, drop into the watch folder
- [ ] **Step 4:** Check `tblDiScanLog` for Success rows and confirm failure counts match what was filled in
- [ ] **Step 5:** Check `tblRepairItemTran` for the inserted line items on the test WOs
- [ ] **Step 6:** If any fields are misread, adjust the `OM05-1.omr` template positions and repeat from Step 2
- [ ] **Step 7:** Once 3 consecutive scans read correctly, mark template as validated

---

## Pre-Launch Checklist

Before going live (separate from code tasks):

- [ ] `tblDiRepairMapping` populated — Joe + tech leads define all ~20 field → catalog item mappings
- [ ] OM05-1 paper form reprinted with standardized OMR box layout
- [ ] OMR template validated (Task 12 complete)
- [ ] Shared folder path confirmed with IT; service account has read/write/delete on all three folders
- [ ] Steve has deployed SQL scripts (Tasks 1) to production WinScope
- [ ] DiScanService installed as Windows Service on app server: `sc create DiScanService binPath="C:\TSI\DiScanService\DiScanService.exe"`
- [ ] Service starts successfully and watch folder log entry appears
