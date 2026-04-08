CREATE PROCEDURE [dbo].[spRptRepairList]
	@pnFilterIndex		INT,
	@psTechInits		VARCHAR(10),
	@psScopeType		VARCHAR(1),
	@psSalesRepInits	VARCHAR(10),
	@psDateFrom			VARCHAR(20),
	@psDateTo			VARCHAR(20),
	@pnSortKey			INT,
	@plSessionID		INT,
	@psSessionTime		VARCHAR(20)
AS
BEGIN
/*
	DECLARE	@pnFilterIndex		INT
	DECLARE	@psTechInits		VARCHAR(10)
	DECLARE	@psScopeType		VARCHAR(1)
	DECLARE	@psSalesRepInits	VARCHAR(10)
	DECLARE	@psDateFrom			VARCHAR(20)
	DECLARE	@psDateTo			VARCHAR(20)
	DECLARE	@plSessionID		INT
	DECLARE	@psSessionTime		VARCHAR(20)
	DECLARE	@pnSortKey			INT

	SET	@pnFilterIndex		= 1
	SET	@psTechInits		= ''
	SET	@psScopeType		= ''
	SET	@psSalesRepInits	= ''
	SET	@psDateFrom			= '12/19/2011'
	SET	@psDateTo			= '12/19/2011'
	SET	@plSessionID		= 1966
	SET	@psSessionTime		= '20111031115900'
	SET	@pnSortKey		= 1

--*/
	DECLARE	@lsExecuteText	VARCHAR(6000)
	DECLARE	@lsSortField	VARCHAR(100)

	SET	NOCOUNT ON

	SET	@psDateFrom			= @psDateFrom + ' 00:00:00'
	SET	@psDateTo			= @psDateTo + ' 23:59:59'

	IF @pnSortKey = 1
		SET	@lsSortField	= 'CONVERT(VARCHAR(10), RE.dtDateIn, 112) + SC.sSerialNumber'
	ELSE IF @pnSortKey = 2
		SET	@lsSortField	= 'CONVERT(VARCHAR(10), RE.dtDateOut, 112) + SC.sSerialNumber'
	ELSE IF @pnSortKey = 3
		SET	@lsSortField	= 'CONVERT(VARCHAR(10), RE.dtAprRecvd, 112) + SC.sSerialNumber'
	ELSE IF @pnSortKey = 4
		SET	@lsSortField	= 'SC.sSerialNumber + CHAR(19) + RE.sWorkOrderNumber'
	ELSE IF @pnSortKey = 5
		SET	@lsSortField	= 'CL.sClientName1 + CHAR(19) + CL.sClientName2'
	ELSE IF @pnSortKey = 6
		SET	@lsSortField	= 'RE.sRepairClosed + CHAR(19) + RE.sWorkOrderNumber'
	ELSE IF @pnSortKey = 7
		SET	@lsSortField	= 'IsNull(T1.sTechInits,''N/A'') + CHAR(19) + RE.sWorkOrderNumber'
	ELSE IF @pnSortKey = 8
		SET	@lsSortField	= 'SR.sRepInits + CHAR(19) + RE.sWorkOrderNumber'

	SET	@lsExecuteText	=	'INSERT	INTO dbo.tblRptRepairList' + CHAR(13) + 
							'	(	lRepairKey, lSessionID, sSessionTime, sClientName1, sClientName2, sDepartmentName,' + CHAR(13) + 
							'		sRigidOrFlexible, sComplaintDesc,' + CHAR(13) + 
							'		sWorkOrderNumber, dtDateIn, dtDateOut, dtReqSent, dtAprRecvd, sPurchaseOrder, sSerialNumber,' + CHAR(13) + 
							'		sScopeTypeDesc, sInsScopeIsUsableYN, sInitTech, sInitTech2, sInitInsptr, dblAmtApproved, dblAmtUnApproved,' + CHAR(13) + 
							'		sRepairClosed, lContractKey, sRepLast, sRepFirst, sRepInits, dtExpDelDate, dtExpDelDateTSI, sSortField' + CHAR(13) + 
							'	)' + CHAR(13) + 
							'SELECT	RE.lRepairKey, ' + CONVERT(VARCHAR(10), @plSessionID) + ', ''' + @psSessionTime + ''', CL.sClientName1, CL.sClientName2,' + CHAR(13) + 
							'		DE.sDepartmentName, ST.sRigidOrFlexible, RE.sComplaintDesc,' + CHAR(13) + 
							'		RE.sWorkOrderNumber, RE.dtDateIn,' + CHAR(13) + 
							'		RE.dtDateOut, RE.dtReqSent, RE.dtAprRecvd, RE.sPurchaseOrder,' + CHAR(13) + 
							'		SC.sSerialNumber, ST.sScopeTypeDesc, RE.sInsScopeIsUsableYN,' + CHAR(13) + 
							'		IsNull(TE.sTechInits,''N/A''),         IsNull(T2.sTechInits,''N/A''),' + CHAR(13) + 
							'		IsNull(T1.sTechInits,''N/A''),' + CHAR(13) + 
							'		case	when IsNull(RE.lContractKey, 0) = 0' + CHAR(13) + 
							'				then	(	SELECT	SUM( tblRepairItemTran.dblRepairPrice)' + CHAR(13) + 
							'							FROM	tblRepairItemTran' + CHAR(13) + 
							'							WHERE	tblRepairItemTran.lRepairKey = RE.lRepairKey' + CHAR(13) + 
							'							AND		tblRepairItemTran.sApproved =''Y''' + CHAR(13) + 
							'						)' + CHAR(13) + 
							'				else 0' + CHAR(13) + 
							'		end,' + CHAR(13) + 
							'		CASE	WHEN	IsNull(RE.lContractKey, 0) = 0' + CHAR(13) + 
							'				THEN	(	SELECT	SUM( tblRepairItemTran.dblRepairPrice)' + CHAR(13) + 
							'							FROM	tblRepairItemTran' + CHAR(13) + 
							'							WHERE	tblRepairItemTran.lRepairKey = RE.lRepairKey' + CHAR(13) + 
							'							AND  tblRepairItemTran.sApproved =''N'')' + CHAR(13) + 
							'				ELSE 0' + CHAR(13) + 
							'		END,' + CHAR(13) + 
							'		RE.sRepairClosed, RE.lContractKey,' + CHAR(13) + 
							'		SR.sRepLast, SR.sRepFirst, SR.sRepInits,' + CHAR(13) + 
							'		RE.dtExpDelDate, RE.dtExpDelDateTSI, ' + @lsSortField + CHAR(13) + 
							'FROM	dbo.tblClient  CL WITH (NOLOCK)' + CHAR(13) + 
							'		INNER JOIN	dbo.tblDepartment DE WITH (NOLOCK)' + CHAR(13) + 
							'				ON	CL.lClientKey = DE.lClientKey' + CHAR(13) + 
							'		INNER JOIN	dbo.tblRepair RE WITH (NOLOCK)' + CHAR(13) + 
							'				ON	RE.lDepartmentKey = DE.lDepartmentKey' + CHAR(13) + 
							'		INNER JOIN	dbo.tblScope SC WITH (NOLOCK)' + CHAR(13) + 
							'				ON	RE.lScopeKey = SC.lScopeKey' + CHAR(13) + 
							'		INNER JOIN	dbo.tblScopeType ST WITH (NOLOCK)' + CHAR(13) + 
							'				ON	SC.lScopeTypeKey = ST.lScopeTypeKey' + CHAR(13) + 
							'		LEFT JOIN	dbo.tblTechnicians TE WITH (NOLOCK)' + CHAR(13) + 
							'				ON	RE.lTechnicianKey = TE.lTechnicianKey' + CHAR(13) + 
							'		LEFT JOIN	dbo.tblTechnicians T2 WITH (NOLOCK)' + CHAR(13) + 
							'				ON	RE.lTechnician2Key = T2.lTechnicianKey' + CHAR(13) + 
							'		LEFT JOIN	dbo.tblTechnicians T1 WITH (NOLOCK)' + CHAR(13) + 
							'				ON	RE.lInspectorKey = T1.lTechnicianKey' + CHAR(13) + 
							'		INNER JOIN	dbo.tblSalesRep SR WITH (NOLOCK)' + CHAR(13) + 
							'				ON	RE.lSalesRepKey = SR.lSalesRepKey' + CHAR(13) + 
							'WHERE '
        IF @pnFilterIndex = 1
        BEGIN
                SET	@lsExecuteText	= @lsExecuteText + 'RE.sRepairClosed = ''N'' AND RE.dtDateIn >= ''' + @psDateFrom + ''' AND RE.dtDateIn <= ''' + @psDateTo + '''' + CHAR(13)
        END
        ELSE IF @pnFilterIndex = 2
        BEGIN
                SET	@lsExecuteText	= @lsExecuteText + 'RE.sRepairClosed = ''Y'' AND RE.dtDateOut >= ''' + @psDateFrom + ''' AND RE.dtDateOut <= ''' + @psDateTo + '''' + CHAR(13)
        END
        ELSE IF @pnFilterIndex = 3
        BEGIN
                SET	@lsExecuteText	= @lsExecuteText + '((RE.sRepairClosed = ''N'' AND RE.dtDateIn >= ''' + @psDateFrom + ''' AND RE.dtDateIn <= ''' + @psDateTo + ''') OR  (RE.sRepairClosed = ''Y'' AND RE.dtDateOut >= ''' + @psDateFrom + ''' AND RE.dtDateOut <= ''' + @psDateTo + '''))' + CHAR(13)
        END
        ELSE IF @pnFilterIndex = 4
        BEGIN
                SET	@lsExecuteText	= @lsExecuteText + 'RE.dtDateIn >= ''' + @psDateFrom + ''' AND RE.dtDateIn <= '''+ @psDateTo + '''' + CHAR(13)
        END
        ELSE IF @pnFilterIndex = 5
        BEGIN
                SET	@lsExecuteText	= @lsExecuteText + 'RE.dtDateOut >= ''' + @psDateFrom + ''' AND RE.dtDateOut <= ''' + @psDateTo + '''' + CHAR(13)
        END

        IF	@psTechInits <> ''
        BEGIN
			SET	@lsExecuteText	= @lsExecuteText + ' AND (T1.sTechInits = ''' + @psTechInits + ''' OR T2.sTechInits = ''' + @psTechInits + ''')' + CHAR(13)
		END

        IF	@psScopeType <> ''
        BEGIN
			SET	@lsExecuteText	= @lsExecuteText + ' AND SC.sRigidOrFlexible = ''' + @psScopeType + '''' + CHAR(13)
		END

        IF	@psSalesRepInits <> ''
        BEGIN
			SET	@lsExecuteText	= @lsExecuteText + ' AND SR.sRepInits = ''' + @psSalesRepInits + '''' + CHAR(13)
		END
		
		--PRINT (@lsExecuteText)
		EXECUTE (@lsExecuteText)

		--Insert Into aaaTemp2 ( Temp ) Values ( @lsExecuteText ) 

		--Change Approved/Unapproved amounts if Instrument.  Easier to do here than deal with that ridiculous thing above that I didn't write.
		Update l Set dblAmtUnApproved = a.UnapprovedAmount, dblAmtApproved = a.ApprovedAmount
		From tblRptRepairList l join 
			(
				Select rim.lRepairKey, 
					Sum(Case When rim.sApproved='Y' Then Round(IsNull(rim.dblUnitCost,0) * IsNull(rim.lQuantity,0),2) Else 0 End) As ApprovedAmount ,
					Sum(Case When rim.sApproved='N' Then Round(IsNull(rim.dblUnitCost,0) * IsNull(rim.lQuantity,0),2) Else 0 End) As UnapprovedAmount
				From tblRepairInstrumentModels rim join tblRptRepairList l on (rim.lRepairKey=l.lRepairKey)
				Where l.lSessionID = @plSessionID And l.sSessionTime = @psSessionTime And l.sRigidOrFlexible = 'I'
				Group By rim.lRepairKey
			) a on (l.lRepairKey=a.lRepairKey)
		Where l.lSessionID = @plSessionID And l.sSessionTime = @psSessionTime And l.sRigidOrFlexible = 'I'


		UPDATE	RL
		SET		sComplaintDesc = RI.sItemDescription
		FROM	tblRptRepairList  RL
				INNER JOIN	tblRepairItemTran RT
						ON	RL.lRepairKey = RT.lRepairKey 
						AND	RT.sPrimaryRepair = 'Y'
				INNER JOIN	tblRepairItem  RI
						ON	RI.lRepairItemKey = RT.lRepairItemKey
		WHERE	RL.lSessionID = @plSessionID
		AND		RL.sSessionTime = @psSessionTime

END


