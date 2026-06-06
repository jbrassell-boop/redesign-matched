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
--      ported VERBATIM from production WinScopeNet (10.0.0.15\Goldmine) -- only
--      change is CREATE -> CREATE OR ALTER. Both are pure single-database DML
--      (no linked servers, no fnDatabaseKey, no THROW), and every table/column
--      they touch was verified present on WinscopeWeb (2026-06-06).
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

	Declare @nMonhtlyAmount decimal(10,2)
	-- ISNULL guard (parallels @nContractTotal below). With the Deleted_datetime
	-- filter above, a pending contract whose scopes are all soft-deleted yields
	-- SUM(nCost)=NULL; without this guard dblAmtInvoiced would be inserted NULL.
	-- Zero active scopes => $0 (matches the @nContractTotal=0 the next block sets).
	Set @nMonhtlyAmount = ISNULL(@nAnnualAmount,0) / 12

	Declare @sInstallmentType nvarchar(50)
	Select @sInstallmentType=sInstallmentType from dbo.tblContractInstallmentTypes Where lInstallmentTypeID = @plInstallmentTypeID


	Declare @nContractTotal decimal(10,2)
	if @sInstallmentType = 'Once'
		Set @nContractTotal = ISNULL(@nAnnualAmount,0)
	else
		Set @nContractTotal = ISNULL(@nAnnualAmount,0) * @plContractLength / 12

	Declare @ErrorMessage nvarchar(max) = ''
	Declare @lContractKey int = 0

	Begin Try
		Begin Transaction
			Insert Into dbo.tblContract ( sContractName1, lClientKey, dtDateEffective, dtDateTermination, lBillDay, sContractNumber, dtCreateDate,
				sContractBillName1, sContractBillName2, sContractAddr1, sContractAddr2, sContractCity, sContractState, sContractZip, sContractCountry,
				lContractTypeKey, lPaymentTermsKey, lSalesRepKey, lSalesTaxKey, lInstallmentTypeID, dblAmtTotal, dblAmtInvoiced, lContractLengthInMonths,
				bCostsPerDepartment, lCreateUser, bManualSchedule )
			Select @psContractName, pc.lClientKey, @pdtDateEffective, @pdtDateTermination, @lBillDay, @psContractNumber, @dtNow,
				c.sClientName1, c.sClientName2, c.sBillAddr1, c.sBillAddr2, c.sBillCity, c.sBillState, c.sBillZip, c.sBillCountry,
				pc.lContractTypeKey, c.lPaymentTermsKey, pc.lSalesRepKey, c.lSalesTaxKey, @plInstallmentTypeID, @nContractTotal, @nMonhtlyAmount, @plContractLength,
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
