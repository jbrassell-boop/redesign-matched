-- Migration 002: Provision the pending-contract -> contract CONVERT engine
--
-- The cloud WinscopeWeb DB has the five tblPendingContract* tables but none of
-- the legacy pendingContract* stored procedures, and the two contract-type
-- lookup tables (tblContractTypes, tblContractInstallmentTypes) were created
-- empty. PendingContractsController.ConvertToContract ran the full pre-flight
-- and then returned 501 because the convert engine was not provisioned.
--
-- This migration closes that gap by:
--   1) Seeding tblContractTypes + tblContractInstallmentTypes with the exact
--      rows the legacy system uses. The values are load-bearing: the billing
--      schedule proc BRANCHES on the literal strings 'CPO', 'Once', 'Monthly',
--      'Quarterly', 'Annual', so the keys AND text must match legacy exactly.
--   2) Creating dbo.pendingContractConvert and dbo.contractBillingScheduleCreate
--      ported from production WinScopeNet (10.0.0.15\Goldmine). Both are pure
--      single-database DML (no linked servers, no fnDatabaseKey, no THROW), and
--      every table/column they touch was verified present on WinscopeWeb.
--      contractBillingScheduleCreate is VERBATIM. pendingContractConvert has THREE
--      documented cloud deviations (each commented inline at its site):
--        a) source SELECTs filter `Deleted_datetime IS NULL` (cloud soft-deletes
--           where legacy hard-deleted -- keeps the result equivalent to legacy);
--        b) the zero-active-scopes amount is ISNULL-guarded (avoid NULL dblAmtInvoiced);
--        c) dblAmtInvoiced is the PER-PERIOD invoice amount (total / #periods), not
--           legacy's annual/12 monthly estimate, so the schedule built at convert is
--           correct for Quarterly/Annual/Once up front (approved 2026-06-06).
--
-- Idempotent: seeds only missing keys; procs use CREATE OR ALTER.
-- Run once against WinscopeWeb. Safe to re-run.

-- ===========================================================================
-- 1) Seed the lookup tables (identity-preserving, only inserts missing keys)
-- ===========================================================================
SET IDENTITY_INSERT dbo.tblContractTypes ON;
INSERT INTO dbo.tblContractTypes (lContractTypeKey, sContractType)
SELECT v.k, v.t
FROM (VALUES
    (1, N'CPO'),
    (2, N'Fuse'),
    (3, N'Capitated Service'),
    (4, N'Airway'),
    (5, N'Rental'),
    (7, N'Shared Risk')
) v(k, t)
WHERE NOT EXISTS (SELECT 1 FROM dbo.tblContractTypes x WHERE x.lContractTypeKey = v.k);
SET IDENTITY_INSERT dbo.tblContractTypes OFF;

SET IDENTITY_INSERT dbo.tblContractInstallmentTypes ON;
INSERT INTO dbo.tblContractInstallmentTypes (lInstallmentTypeID, sInstallmentType, lInstallmentMonths)
SELECT v.k, v.t, v.m
FROM (VALUES
    (1, N'Monthly',   1),
    (2, N'Quarterly', 3),
    (3, N'Annual',    12),
    (4, N'18 Months', 18),
    (5, N'Once',      18)
) v(k, t, m)
WHERE NOT EXISTS (SELECT 1 FROM dbo.tblContractInstallmentTypes x WHERE x.lInstallmentTypeID = v.k);
SET IDENTITY_INSERT dbo.tblContractInstallmentTypes OFF;
GO

-- ===========================================================================
-- 2) dbo.pendingContractConvert  (ported verbatim from legacy WinScopeNet)
--    Creates the tblContract row + migrates scopes/depts/affiliates and flips
--    the pending row to 'Converted'. Self-manages its own transaction and
--    returns (lContractKey, ErrMsg); a non-empty ErrMsg means it rolled back.
--    CLOUD ADAPTATION (the only deviation from verbatim): each source SELECT
--    filters `Deleted_datetime IS NULL`. Legacy HARD-deleted removed
--    scopes/depts/affiliates, so they were already gone; the cloud SOFT-deletes
--    them (PendingContractsController sets Deleted_datetime), so without this
--    filter the proc would migrate — and bill — rows the user removed. The
--    filter makes the cloud result EQUIVALENT to legacy.
-- ===========================================================================
CREATE OR ALTER PROCEDURE [dbo].[pendingContractConvert]
	(
		@plPendingContractKey int,
		@psContractName nvarchar(100),
		@pdtDateEffective date,
		@pdtDateTermination date,
		@psContractNumber nvarchar(50),
		@plInstallmentTypeID int,
		@plContractLength int,
		@plUserKey int
	)

AS
BEGIN
	SET NOCOUNT ON;

    Declare @lBillDay int
	Set @lBillDay = DATEPART(day,@pdtDateEffective)

	Declare @dtNow datetime
	Set @dtNow=GETDATE()

	--Annual Amount
	Declare @nAnnualAmount decimal(10,2)
	Select @nAnnualAmount = SUM(nCost) From dbo.tblPendingContractScope Where lPendingContractKey = @plPendingContractKey And Deleted_datetime IS NULL

	-- Installment type (and contract type below) drive the billing-period count.
	Declare @sInstallmentType nvarchar(50)
	Select @sInstallmentType = sInstallmentType
	from dbo.tblContractInstallmentTypes Where lInstallmentTypeID = @plInstallmentTypeID

	-- Contract TYPE matters too: contractBillingScheduleCreate emits a SINGLE invoice
	-- for a CPO contract (like the 'Once' frequency), so per-invoice = full total there.
	Declare @sContractType nvarchar(50)
	Select @sContractType = ct.sContractType
	From dbo.tblPendingContract pc join dbo.tblContractTypes ct on (ct.lContractTypeKey = pc.lContractTypeKey)
	Where pc.lPendingContractKey = @plPendingContractKey


	Declare @nContractTotal decimal(10,2)
	if @sInstallmentType = 'Once'
		Set @nContractTotal = ISNULL(@nAnnualAmount,0)
	else
		Set @nContractTotal = ISNULL(@nAnnualAmount,0) * @plContractLength / 12

	-- CLOUD ENHANCEMENT (deviates from the verbatim legacy proc; approved 2026-06-06):
	-- dblAmtInvoiced is the PER-PERIOD invoice amount, not annual/12. Legacy convert
	-- hardcoded annual/12 (a monthly estimate finalized later on the contract form);
	-- the cloud auto-builds the billing schedule at convert, so the per-invoice amount
	-- must be correct up front: dblAmtInvoiced = total / (number of schedule rows).
	-- The divisor is counted with the EXACT logic contractBillingScheduleCreate uses
	-- to emit rows -- NOT @plContractLength/installmentMonths, which disagrees when the
	-- term isn't a clean multiple of the period (a 13-month quarterly = 5 invoices, not
	-- 4) or for '18 Months' (the schedule's step CASE has no 18-month branch, so it
	-- falls through to monthly). Mirror it exactly: CPO contract type or 'Once'
	-- frequency => a single invoice for the whole total; otherwise step
	-- dtEffective..dtTermination by the schedule's month step (Monthly=1, Quarterly=3,
	-- Annual=12, anything else => 1) and count each '< termination' bill date. A
	-- freshly-converted contract has no amendments, so the schedule's amendment loop
	-- adds no extra rows here.
	Declare @nPeriods int = 0
	If @sContractType = 'CPO' Or @sInstallmentType = 'Once'
		Set @nPeriods = 1
	Else
	Begin
		Declare @nStepMonths int = CASE @sInstallmentType WHEN 'Monthly' THEN 1 WHEN 'Quarterly' THEN 3 WHEN 'Annual' THEN 12 ELSE 1 END
		Declare @dtCursor date = @pdtDateEffective
		While @dtCursor < @pdtDateTermination
		Begin
			Set @nPeriods = @nPeriods + 1
			Set @dtCursor = DATEADD(month, @nStepMonths, @dtCursor)
		End
	End
	If @nPeriods < 1 Set @nPeriods = 1
	-- dblAmtInvoiced is the NOMINAL per-period rate (rounded to the cent). Because the
	-- schedule repeats it on every row, a total that doesn't divide evenly would leave
	-- the schedule a few cents off -- so the convert flow runs LAST-INSTALLMENT
	-- RECONCILIATION after building the schedule (see
	-- PendingContractsController.ConvertToContract): the rounding remainder is placed on
	-- the FINAL bill row so the schedule sums EXACTLY to dblAmtTotal (standard billing
	-- practice). The shared contractBillingScheduleCreate proc is left untouched -- its
	-- per-period rate is user-authoritative for non-convert reschedules.
	Declare @nPerInvoice decimal(10,2) = ISNULL(@nContractTotal, 0) / @nPeriods

	Declare @ErrorMessage nvarchar(max) = ''
	Declare @lContractKey int = 0

	Begin Try
		Begin Transaction
			-- P1b race guard: atomically claim the pending row so two concurrent converts
			-- can't both proceed. This UPDATE takes a row lock; a second converter then
			-- finds the row is no longer 'Pending' (@@ROWCOUNT = 0) and bails, so one
			-- pending contract can never create two real contracts.
			-- NULL sStatus is treated as 'Pending' everywhere else (the API preflight uses
			-- ISNULL(sStatus,'Pending')), so the claim must accept NULL too or legacy/live
			-- NULL-status rows would pass preflight and then fail this guard.
			Update dbo.tblPendingContract Set sStatus = 'Converting', dtStatusDate = @dtNow
				Where lPendingContractKey = @plPendingContractKey And (sStatus IS NULL OR sStatus = 'Pending')
			If @@ROWCOUNT = 0
			Begin
				Rollback Transaction
				Select 0 As lContractKey,
					'Pending contract is not in Pending status (already converted or being converted).' As ErrMsg
				Return
			End

			Insert Into dbo.tblContract ( sContractName1, lClientKey, dtDateEffective, dtDateTermination, lBillDay, sContractNumber, dtCreateDate,
				sContractBillName1, sContractBillName2, sContractAddr1, sContractAddr2, sContractCity, sContractState, sContractZip, sContractCountry,
				lContractTypeKey, lPaymentTermsKey, lSalesRepKey, lSalesTaxKey, lInstallmentTypeID, dblAmtTotal, dblAmtInvoiced, lContractLengthInMonths,
				bCostsPerDepartment, lCreateUser, bManualSchedule )
			Select @psContractName, pc.lClientKey, @pdtDateEffective, @pdtDateTermination, @lBillDay, @psContractNumber, @dtNow,
				c.sClientName1, c.sClientName2, c.sBillAddr1, c.sBillAddr2, c.sBillCity, c.sBillState, c.sBillZip, c.sBillCountry,
				pc.lContractTypeKey, c.lPaymentTermsKey, pc.lSalesRepKey, c.lSalesTaxKey, @plInstallmentTypeID, @nContractTotal, @nPerInvoice, @plContractLength,
				0 As bCostsPerDepartment, @plUserKey, 0 As bManualSchedule
			From dbo.tblPendingContract pc join dbo.tblClient c on (pc.lClientKey = c.lClientKey)
			Where pc.lPendingContractKey = @plPendingContractKey

			Set @lContractKey = SCOPE_IDENTITY()

			Insert Into dbo.tblContractDepartments ( lContractKey, lDepartmentKey, bCalcCostFromScopes, bNonBillable, dtContractDepartmentEffectiveDate, dtContractDepartmentEndDate )
			Select @lContractKey, d.lDepartmentKey, 1, 0, @pdtDateEffective, @pdtDateTermination
			From dbo.tblPendingContractDepartments d
			Where d.lPendingContractKey = @plPendingContractKey And d.Deleted_datetime IS NULL

			Insert Into dbo.tblContractAffiliates ( lContractKey, lDepartmentKey, dtAffiliateStartDate, dtAffiliateEndDate )
			Select @lContractKey, a.lDepartmentKey, @pdtDateEffective, @pdtDateTermination
			From tblPendingContractAffiliates a
			Where a.lPendingContractKey = @plPendingContractKey And a.Deleted_datetime IS NULL

			Insert Into dbo.tblContractScope ( lContractKey, lScopeKey, nCost, dtCreateDate, dtLastUpdate, dtScopeAdded, dtScopeRemoved, lCreateUser, lLastUpdateUser )
			Select @lContractKey, s.lScopeKey, s.nCost, @dtNow, @dtNow, @pdtDateEffective, @pdtDateTermination, @plUserKey, @plUserKey
			from dbo.tblPendingContractScope s
			Where s.lPendingContractKey = @plPendingContractKey And s.Deleted_datetime IS NULL

			Update dbo.tblPendingContract Set sStatus = 'Converted', dtStatusDate = @dtNow Where lPendingContractKey=@plPendingContractKey
		Commit Transaction
	End Try

	Begin Catch
		If @@TRANCOUNT>0
			Rollback Transaction

		Set @ErrorMessage = ERROR_MESSAGE()
	End Catch


	Select @lContractKey As lContractKey, @ErrorMessage As ErrMsg
END
GO

-- ===========================================================================
-- 3) dbo.contractBillingScheduleCreate  (ported verbatim from legacy WinScopeNet)
--    Builds tblContractBillSchedule rows. No internal transaction; the caller
--    wraps it. RETURNs early (no-op) if a finalized non-repair invoice already
--    exists for the contract.
-- ===========================================================================
CREATE OR ALTER PROCEDURE [dbo].[contractBillingScheduleCreate]
	(
		@plContractKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.contractUpdateBillingSchedule @plContractKey=282

	Declare @cnt int
	Select @cnt = Count(*) From dbo.tblInvoice Where lContractKey=@plContractKey And ISNULL(lRepairKey,0)=0 And bFinalized=1

	If @cnt > 0
		RETURN

	--Delete schedule
	Delete from tblContractBillSchedule Where lContractKey = @plContractKey

	Declare @lBillDay int
	Declare @sInstallmentType nvarchar(50)
	Declare @lInstallmentMonths int
	Declare @dtStart date
	Declare @dtEnd date
	Declare @sContractType nvarchar(50)
	Declare @nBillAmount decimal(10,2)

	Select @dtStart = c.dtDateEffective, @dtEnd = c.dtDateTermination, @sInstallmentType = cit.sInstallmentType,
		@sContractType = ct.sContractType, @nBillAmount = c.dblAmtInvoiced, @lInstallmentMonths = cit.lInstallmentMonths
	From dbo.tblContract c join dbo.tblContractInstallmentTypes cit on (c.lInstallmentTypeID = cit.lInstallmentTypeID)
		join dbo.tblContractTypes ct on (c.lContractTypeKey = ct.lContractTypeKey)
	Where c.lContractKey = @plContractKey

	Set @lBillDay = DatePart(day,@dtStart)

	Declare @dtBillDate date
	Set @dtBillDate = @dtStart

	Declare @cntAmendments int
	Declare @i int

	Create Table #Amendments
		(
			ID int identity(1,1),
			AmendmentDate date,
			PreviousInvoiceAmount decimal(10,2)
		)

	Insert Into #Amendments ( AmendmentDate, [PreviousInvoiceAmount] )
	Select a.dtContractAmendmentDate, a.nPreviousInvoiceAmount
	From tblContractAmendments a
	Where a.lContractKey = @plContractKey
	Order By a.dtContractAmendmentDate

	Select @cntAmendments = Count(*) From #Amendments
	Declare @dtAmendmentDate date
	Declare @PrevAmount decimal(10,2)

	Set @i = 1
	While @cntAmendments>=@i
		BEGIN
			Select @dtAmendmentDate = a.AmendmentDate, @PrevAmount = a.PreviousInvoiceAmount From #Amendments a Where ID = @i

			While @dtBillDate < @dtAmendmentDate
				BEGIN
					Insert Into dbo.tblContractBillSchedule ( lContractKey, dtBillDate, nBillAmount, dtBillDateEnd )
					Values ( @plContractKey, @dtBillDate, @PrevAmount, DateAdd(day,-1,DateAdd(month,@lInstallmentMonths,@dtBillDate)) )

					If @sContractType = 'CPO' Or @sInstallmentType = 'Once'
						Set @dtBillDate = @dtEnd
					else
						Set @dtBillDate = DateAdd(month, Case @sInstallmentType
															When 'Monthly' Then 1
															When 'Quarterly' Then 3
															When 'Annual' Then 12
															Else 1
														End, @dtBillDate)
				END

				Set @i = @i + 1
			END


	While @dtBillDate < @dtEnd
		BEGIN
			Insert Into dbo.tblContractBillSchedule ( lContractKey, dtBillDate, nBillAmount, dtBillDateEnd )
			Values ( @plContractKey, @dtBillDate, @nBillAmount, DateAdd(day,-1,DateAdd(month,@lInstallmentMonths,@dtBillDate)) )

			If @sContractType = 'CPO' Or @sInstallmentType = 'Once'
				Set @dtBillDate = @dtEnd
			else
				Set @dtBillDate = DateAdd(month, Case @sInstallmentType
													When 'Monthly' Then 1
													When 'Quarterly' Then 3
													When 'Annual' Then 12
													Else 1
												End, @dtBillDate)

		END

	Drop Table #Amendments
END
GO
