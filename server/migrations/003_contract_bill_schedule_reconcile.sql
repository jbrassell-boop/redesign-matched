-- Migration 003: shared "reconcile billing schedule to contract total" proc.
--
-- Used by the pending-contract CONVERT flow (PendingContractsController.ConvertToContract),
-- where dblAmtInvoiced is freshly derived from dblAmtTotal / #periods so the schedule
-- already sums to ~total and this only fixes sub-cent rounding on the final row.
--
-- It places the rounding remainder on the FINAL bill row so the schedule sums EXACTLY
-- to tblContract.dblAmtTotal (standard billing/amortization practice).
--
-- CONVERT-DERIVED schedules ONLY. Do NOT call this for:
--   * a manual schedule (bManualSchedule = 1) -- rows are user-authored; or
--   * a plain "regenerate" of an existing contract -- its dblAmtInvoiced may be a
--     user-entered rate or carry amendment amounts, so forcing the sum onto the final
--     row would distort the billing. (ContractsController.RegenerateBillSchedule
--     therefore rebuilds WITHOUT reconciling.)
-- Callers gate accordingly before invoking.
--
-- Idempotent (CREATE OR ALTER); no-op when the schedule already sums to the total
-- or the contract has no schedule rows.

CREATE OR ALTER PROCEDURE [dbo].[contractBillScheduleReconcileToTotal]
    @plContractKey int
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @total decimal(18,2) = (SELECT dblAmtTotal FROM dbo.tblContract WHERE lContractKey = @plContractKey);
    DECLARE @sum   decimal(18,2) = (SELECT SUM(nBillAmount) FROM dbo.tblContractBillSchedule WHERE lContractKey = @plContractKey);

    IF @total IS NOT NULL AND @sum IS NOT NULL AND @total <> @sum
        UPDATE dbo.tblContractBillSchedule
        SET nBillAmount = ISNULL(nBillAmount, 0) + (@total - @sum)
        WHERE lContractInvoiceScheduleKey = (
            SELECT TOP 1 lContractInvoiceScheduleKey
            FROM dbo.tblContractBillSchedule
            WHERE lContractKey = @plContractKey
            ORDER BY dtBillDate DESC, lContractInvoiceScheduleKey DESC);
END
GO
