CREATE	PROCEDURE [dbo].[spRptBroadLaneExport]
	@plSessionID			INTEGER,
	@psSessionTime			VARCHAR(20),
	@psDateFrom				VARCHAR(20),
	@psDateTo				VARCHAR(20),
	@pdblRevenueRate		FLOAT,
	@plReportingGroupKey	INTEGER,
	@psContractID			VARCHAR(40)

AS
BEGIN
/*
DECLARE	@plRepairKey	INTEGERDECLARE	@plSessionID	INTEGERDECLARE	@psSessionTime	VARCHAR(20)DECLARE	@psDateFrom		VARCHAR(20)DECLARE	@psDateTo		VARCHAR(20)SET		@plSessionID	= 1SET		@psSessionTime	= '1'SET		@psDateFrom		= '04/01/2011'SET		@psDateTo		= '09/30/2013'--*/
	BEGIN TRY
		SET	NOCOUNT ON

		INSERT	INTO tblRptBroadlaneExport 
			(	lSessionID, sSessionTime, dtAsOfDate, 
				lClientKey, sContractNumber, 
				sClientName1, sClientName2, 
				sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, 
				sReferenceNum, dblSalesAmt, 
				dblRevenueRate
			)
		SELECT	@plSessionID, @psSessionTime, @psDateTo, 
				CL.lClientKey, @psContractID, 
				MIN(CL.sClientName1), MIN(CL.sClientName2), 
				MIN(CL.sMailAddr1), MIN(CL.sMailAddr2), 
				MIN(CL.sMailCity), MIN(CL.sMailState), MIN(CL.sMailZip), 
				MIN(CL.sReferenceNum), SUM(IV.dblTranAmount + IV.dblShippingAmt),
				@pdblRevenueRate
		FROM	tblClient CL
				INNER JOIN	tblInvoice IV
						ON	CL.lClientKey = IV.lClientKey
		WHERE	IV.dtTranDate			>= @psDateFrom
		AND		IV.dtTranDate			<= @psDateTo
		AND		CL.lReportingGroupKey	= @plReportingGroupKey
		GROUP	BY CL.lClientKey



		INSERT	INTO tblRptInvoiceHdr 
			(	dtTranDate, sBillName1, sSerialNumber, sTranNumber, sPurchaseOrder, 
				dblTranAmount, dblShippingAmt, lSessionID, sSessionTime, sScopeTypeDesc,
				sJuris1Name, dblJuris1Pct, dblJuris1Amt,
				sJuris2Name, dblJuris2Pct, dblJuris2Amt,
				sJuris3Name, dblJuris3Pct, dblJuris3Amt
			)
		SELECT	IV.dtTranDate, IV.sBillName1, IV.sSerialNumber, IV.sTranNumber, IV.sPurchaseOrder, 
				IV.dblTranAmount, IV.dblShippingAmt, @plSessionID, @psSessionTime, IV.sScopeTypeDesc,
				sJuris1Name, dblJuris1Pct, dblJuris1Amt,
				sJuris2Name, dblJuris2Pct, dblJuris2Amt,
				sJuris3Name, dblJuris3Pct, dblJuris3Amt
		FROM	tblInvoice IV
		WHERE	IV.dtTranDate >= @psDateFrom
		AND		IV.dtTranDate <= @psDateTo
	END TRY
	BEGIN CATCH
		DECLARE @lsReturnValue		VARCHAR(4000)
		SET	@lsReturnValue = dbo.udfErrorSpecs()
		RAISERROR (@lsReturnValue, 16, 1)
	END CATCH
END
