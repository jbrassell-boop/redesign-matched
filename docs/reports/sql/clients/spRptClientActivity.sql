
CREATE	PROCEDURE [dbo].[spRptClientActivity]
	@plSessionID 			INT,
	@psSessionTime			VARCHAR(20),
	@psDatePerCurrFrom		VARCHAR(20),
	@psDatePerCurrTo		VARCHAR(20),
	@psDatePerPrevFrom		VARCHAR(20),
	@psDatePerPrevTo		VARCHAR(20),
	@psDateYTDCurrFrom		VARCHAR(20),
	@psDateYTDCurrTo		VARCHAR(20),
	@psDateYTDPrevFrom		VARCHAR(20),
	@psDateYTDPrevTo		VARCHAR(20),
	@pnSortOrder			INT
AS
BEGIN
/*
	DECLARE @plSessionID 		INT
	DECLARE @psSessionTime		VARCHAR(20)
	DECLARE @psDatePerCurrFrom	VARCHAR(20)
	DECLARE @psDatePerCurrTo	VARCHAR(20)
	DECLARE @psDatePerPrevFrom	VARCHAR(20)
	DECLARE @psDatePerPrevTo	VARCHAR(20)
	DECLARE @psDateYTDCurrFrom	VARCHAR(20)
	DECLARE @psDateYTDCurrTo	VARCHAR(20)
	DECLARE @psDateYTDPrevFrom	VARCHAR(20)
	DECLARE @psDateYTDPrevTo	VARCHAR(20)
	DECLARE @pnSortOrder		INT

	SET @plSessionID 		= 837
	SET @psSessionTime		= '20070118023941'
	SET @psDatePerCurrFrom	= '06/01/2011'
	SET @psDatePerCurrTo	= '06/30/2011'
	SET @psDatePerPrevFrom	= '06/01/2010'
	SET @psDatePerPrevTo	= '06/30/2010'
	SET @psDateYTDCurrFrom	= '01/01/2011'
	SET @psDateYTDCurrTo	= '06/30/2011'
	SET @psDateYTDPrevFrom	= '01/01/2010'
	SET @psDateYTDPrevTo	= '06/30/2010'
	SET @pnSortOrder		= 1


--*/
	SET	@psDatePerCurrFrom	= @psDatePerCurrFrom	+ ' 00:00:00'
	SET	@psDatePerPrevFrom	= @psDatePerPrevFrom	+ ' 00:00:00'
	SET	@psDateYTDCurrFrom	= @psDateYTDCurrFrom	+ ' 00:00:00'
	SET	@psDateYTDPrevFrom	= @psDateYTDPrevFrom	+ ' 00:00:00'
	SET	@psDatePerCurrTo	= @psDatePerCurrTo		+ ' 23:59:59'
	SET	@psDatePerPrevTo	= @psDatePerPrevTo		+ ' 23:59:59'
	SET	@psDateYTDCurrTo	= @psDateYTDCurrTo		+ ' 23:59:59'
	SET	@psDateYTDPrevTo	= @psDateYTDPrevTo		+ ' 23:59:59'

	DECLARE	@lsQueryText	VARCHAR(3000)

	SET	@lsQueryText = 	'INSERT INTO tblRptClnAct ' + CHAR(13) + CHAR(10) + 
						'	(' + CHAR(13) + CHAR(10) + 
						'		lSessionID, sSessionTime, ' + CHAR(13) + CHAR(10) + 
						'		lClientKey, sClientName1, sClientName2, ' + CHAR(13) + CHAR(10) + 
						'		lDepartmentKey, sDepartmentName, sDeptType,' + CHAR(13) + CHAR(10) + 
						'		sRepLast, sRepFirst, sRepInits' + CHAR(13) + CHAR(10) + 
						'	)' + CHAR(13) + CHAR(10) + 
						'SELECT	DISTINCT	' + CHAR(13) + CHAR(10) + 
						'		' +CONVERT(VARCHAR(10), @plSessionID) + ', ''' + @psSessionTime + ''',' + CHAR(13) + CHAR(10) + 
						'		DE.lClientKey, CL.sClientName1, CL.sClientName2,' + CHAR(13) + CHAR(10) + 
						'		DE.lDepartmentKey, DE.sDepartmentName, DE.sDeptType,' + CHAR(13) + CHAR(10) + 
						'		SR.sRepLast, SR.sRepFirst, SR.sRepInits' + CHAR(13) + CHAR(10) + 
						'FROM	dbo.tblClient CL WITH (NOLOCK)' + CHAR(13) + CHAR(10) + 
						'		INNER JOIN	dbo.tblDepartment DE WITH (NOLOCK)' + CHAR(13) + CHAR(10) + 
						'				ON	CL.lClientKey = DE.lClientKey' + CHAR(13) + CHAR(10) + 
						'		INNER JOIN	dbo.tblSalesRep SR WITH (NOLOCK)' + CHAR(13) + CHAR(10) + 
						'				ON	DE.lSalesRepKey = SR.lSalesRepKey' + CHAR(13) + CHAR(10) + 
						'		INNER JOIN	dbo.tblInvoice IV WITH (NOLOCK)' + CHAR(13) + CHAR(10) + 
						'				ON	DE.lDepartmentKey = IV.lDepartmentKey' + CHAR(13) + CHAR(10) + 
						'				AND	IV.dtTranDate >= ''' + @psDatePerCurrFrom + '''' + CHAR(13) + CHAR(10)
--	IF	@pnSortOrder = 1
--	BEGIN
		SET	@lsQueryText = 	@lsQueryText + 'ORDER BY CL.sClientName1, CL.sClientName2'
--	END
--	ELSE
--	BEGIN
--	END
	EXECUTE	(@lsQueryText)


	UPDATE	RC
	SET		dblInvoiceSumPerCurr	= IV.dblTranAmount,
			lInvoiceCountPerCurr	= IV.nTranCount
	FROM	tblRptClnAct RC WITH (ROWLOCK)
			INNER JOIN	(	SELECT	R2.lDepartmentKey, 
									SUM(I2.dblTranAmount) AS dblTranAmount, 
									COUNT(*) AS nTranCount
							FROM	tblRptClnAct R2 WITH (NOLOCK)
									INNER JOIN	dbo.tblInvoice I2 WITH (NOLOCK)
									ON	R2.lDepartmentKey	= I2.lDepartmentKey
									AND	I2.dtTranDate		>= @psDatePerCurrFrom
									AND	I2.dtTranDate		<= @psDatePerCurrTo 
									AND	R2.lSessionID		= @plSessionID
									AND	R2.sSessionTime		= @psSessionTime
							GROUP	BY R2.lDepartmentKey
						) AS IV
					ON	RC.lDepartmentKey = IV.lDepartmentKey
	WHERE	RC.lSessionID	= @plSessionID
	AND		RC.sSessionTime	= @psSessionTime

	UPDATE	RC
	SET		dblInvoiceSumPerPrev	= IV.dblTranAmount,
			lInvoiceCountPerPrev	= IV.nTranCount
	FROM	tblRptClnAct RC WITH (ROWLOCK)
			INNER JOIN	(	SELECT	R2.lDepartmentKey, 
									SUM(I2.dblTranAmount) AS dblTranAmount, 
									COUNT(*) AS nTranCount
							FROM	tblRptClnAct R2 WITH (NOLOCK)
									INNER JOIN	dbo.tblInvoice I2 WITH (NOLOCK)
									ON	R2.lDepartmentKey	= I2.lDepartmentKey
									AND	I2.dtTranDate		>= @psDatePerPrevFrom
									AND	I2.dtTranDate		<= @psDatePerPrevTo
									AND	R2.lSessionID		= @plSessionID
									AND	R2.sSessionTime		= @psSessionTime
							GROUP	BY R2.lDepartmentKey
						) AS IV
					ON	RC.lDepartmentKey = IV.lDepartmentKey
	WHERE	RC.lSessionID	= @plSessionID
	AND		RC.sSessionTime	= @psSessionTime

	UPDATE	RC
	SET		dblInvoiceSumYTDCurr	= IV.dblTranAmount,
			lInvoiceCountYTDCurr	= IV.nTranCount
	FROM	tblRptClnAct RC WITH (ROWLOCK)
			INNER JOIN	(	SELECT	R2.lDepartmentKey, 
									SUM(I2.dblTranAmount) AS dblTranAmount, 
									COUNT(*) AS nTranCount
							FROM	tblRptClnAct R2 WITH (NOLOCK)
									INNER JOIN	dbo.tblInvoice I2 WITH (NOLOCK)
									ON	R2.lDepartmentKey	= I2.lDepartmentKey
									AND	I2.dtTranDate		>= @psDateYTDCurrFrom
									AND	I2.dtTranDate		<= @psDateYTDCurrTo
									AND	R2.lSessionID		= @plSessionID
									AND	R2.sSessionTime		= @psSessionTime
							GROUP	BY R2.lDepartmentKey
						) AS IV
					ON	RC.lDepartmentKey = IV.lDepartmentKey
	WHERE	RC.lSessionID	= @plSessionID
	AND		RC.sSessionTime	= @psSessionTime

	UPDATE	RC
	SET		dblInvoiceSumYTDPrev	= IV.dblTranAmount,
			lInvoiceCountYTDPrev	= IV.nTranCount
	FROM	tblRptClnAct RC WITH (ROWLOCK)
			INNER JOIN	(	SELECT	R2.lDepartmentKey, 
									SUM(I2.dblTranAmount) AS dblTranAmount, 
									COUNT(*) AS nTranCount
							FROM	tblRptClnAct R2 WITH (NOLOCK)
									INNER JOIN	dbo.tblInvoice I2 WITH (NOLOCK)
									ON	R2.lDepartmentKey	= I2.lDepartmentKey
									AND	I2.dtTranDate		>= @psDateYTDPrevFrom
									AND	I2.dtTranDate		<= @psDateYTDPrevTo
									AND	R2.lSessionID		= @plSessionID
									AND	R2.sSessionTime		= @psSessionTime
							GROUP	BY R2.lDepartmentKey
						) AS IV
					ON	RC.lDepartmentKey = IV.lDepartmentKey
	WHERE	RC.lSessionID	= @plSessionID
	AND		RC.sSessionTime	= @psSessionTime

	UPDATE	RC
	SET		dtDateLastIn	= IV.dtTranDate
	FROM	tblRptClnAct RC WITH (ROWLOCK)
			INNER JOIN	(	SELECT	R2.lDepartmentKey, 
									MAX(I2.dtTranDate) AS dtTranDate
							FROM	tblRptClnAct R2 WITH (NOLOCK)
									INNER JOIN	dbo.tblInvoice I2 WITH (NOLOCK)
									ON	R2.lDepartmentKey	= I2.lDepartmentKey
									AND	R2.lSessionID		= @plSessionID
									AND	R2.sSessionTime		= @psSessionTime
							GROUP	BY R2.lDepartmentKey
						) AS IV
					ON	RC.lDepartmentKey = IV.lDepartmentKey
	WHERE	RC.lSessionID	= @plSessionID
	AND		RC.sSessionTime	= @psSessionTime

END


