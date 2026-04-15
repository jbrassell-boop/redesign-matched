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
