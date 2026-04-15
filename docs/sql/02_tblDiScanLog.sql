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
