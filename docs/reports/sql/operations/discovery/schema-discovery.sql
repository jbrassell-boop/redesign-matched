-- DISCOVERY QUERIES — run once, document findings in schema-notes.md
-- Server: 10.0.0.15\Goldmine | DB: WinScopeNet | READ ONLY

-- 1. Loaner tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Loan%' ORDER BY TABLE_NAME;

-- 2. Defect tracking tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Defect%' ORDER BY TABLE_NAME;

-- 3. Inventory and lot tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Inventor%' OR TABLE_NAME LIKE '%Lot%'
ORDER BY TABLE_NAME;

-- 4. Amendment reason tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Amend%' ORDER BY TABLE_NAME;

-- 5. Update slip tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%UpdateSlip%' OR TABLE_NAME LIKE '%Update_Slip%'
   OR TABLE_NAME LIKE '%SlipReason%' OR TABLE_NAME LIKE '%Slip%'
ORDER BY TABLE_NAME;

-- 6. Ordering / purchasing / receiving tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Order%' OR TABLE_NAME LIKE '%Purchas%'
   OR TABLE_NAME LIKE '%Receiv%'
ORDER BY TABLE_NAME;

-- 7. Verify Not Repairable repair item key
SELECT lRepairItemKey, sRepairItem FROM tblRepairItem
WHERE sRepairItem LIKE '%Not Rep%' OR sRepairItem LIKE '%Cannot Rep%'
ORDER BY sRepairItem;

-- 8. tblAmendRepairComments columns
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblAmendRepairComments'
ORDER BY ORDINAL_POSITION;

-- 9. Sample recent amendment comments
SELECT TOP 20 * FROM tblAmendRepairComments
ORDER BY lAmendRepairCommentKey DESC;

-- 10. tblRepairUpdateSlips columns
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblRepairUpdateSlips'
ORDER BY ORDINAL_POSITION;

-- 11. fnWithin40Days output columns
SELECT TOP 1 * FROM dbo.fnWithin40Days('2026-03-01', '2026-03-31', 'A', 0);

-- 12. tblRepairFailureCodes columns (for avoidable damage section)
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblRepairFailureCodes'
ORDER BY ORDINAL_POSITION;

-- 13. Any table with Reason in name (catch-all for reason lookup tables)
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Reason%'
ORDER BY TABLE_NAME;
