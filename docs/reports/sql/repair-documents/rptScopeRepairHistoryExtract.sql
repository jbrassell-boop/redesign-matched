CREATE PROCEDURE [dbo].[rptScopeRepairHistoryExtract]
	(
		@pdtDateFrom date = null,
		@pdtDateTo date = null,
		@psScopeKeys nvarchar(MAX) = null,
		@plRepairKey int = null,
		@pbConsumption bit = 0,
		@pbDetails bit = 1,
		@plContractKey int = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptScopeRepairHistoryExtract @pdtDateFrom = '7/1/2010', @pdtDateTo='7/17/2019', @psScopeKeys='145270', @pbConsumption=1, @pbDetails=1

	Declare @i int
	Declare @lRepairKey int
	Declare @Amt decimal(10,2)

	Create Table #Results
		(
			ID int identity(1,1),
			lScopeKey int, 
			lRepairKey int, 
			lRepairItemTranKey int, 
			lRepairItemKey int, 
			dtTranDate date, 
			dtDateIn date, 
			sWorkOrderNumber nvarchar(50),
			sSerialNumber nvarchar(50), 
			sScopeTypeDesc nvarchar(200), 
			sTranNumber nvarchar(50), 
			sComplaintDesc nvarchar(MAX), 
			sRepairReason nvarchaR(200),
			sNumberOfUses nvarchar(50),
			sItemDescription nvarchar(200), 
			sApproved nvarchar(1), 
			sUnderContract nvarchar(1),
			sUAOrNWT nvarchar(1),
			sComments nvarchar(MAX),
			dblRepairPrice decimal(10,2),
			dblTotal decimal(10,2)
		)
	
		Create Table #ScopeKeys
			(
				lScopeKey int
			)

		If IsNull(@psScopeKeys,'')<>''
			Insert Into #ScopeKeys ( lScopeKey ) Select a.Int_Value From dbo.ParseTxt2Tbl(@psScopeKeys,',') a	

		INSERT INTO #Results ( lScopeKey, lRepairKey, sWorkOrderNumber, lRepairItemTranKey, lRepairItemKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, 
			sTranNumber, sComplaintDesc, sRepairReason, sItemDescription, sApproved, dblRepairPrice, sUnderContract, sUAorNWT, sComments, sNumberOfUses )
		SELECT	II.lScopeKey, II.lRepairKey, RE.sWorkOrderNumber, RT.lRepairItemTranKey, RT.lRepairItemKey, II.dtTranDate, RE.dtDateIn, II.sSerialNumber, II.sScopeTypeDesc, 
			II.sTranNumber, RE.sComplaintDesc, rr.sRepairReason, RI.sItemDescription, RT.sApproved, 
			Case 
				When @pbConsumption = 0 Then RT.dblRepairPrice
				Else pd.dblRepairPrice
			END As dblRepairPrice, 
			II.sUnderContract, RT.sUAorNWT, RT.sComments,  RE.sNumOfUses
		FROM tblInvoice II JOIN tblRepair RE ON II.lRepairKey = RE.lRepairKey
			JOIN tblRepairItemTran RT ON RE.lRepairKey = RT.lRepairKey
			JOIN tblRepairItem RI ON RT.lRepairItemKey = RI.lRepairItemKey
			LEFT JOIN dbo.tblPricingDetail pd on (RE.lPricingCategoryKey = pd.lPricingCategoryKey) And (RT.lRepairItemKey = pd.lRepairItemKey)
			LEFT JOIN dbo.tblRepairReasons rr on (re.lRepairReasonKey = rr.lRepairReasonKey)
			LEFT JOIN #ScopeKeys sk on (RE.lScopeKey = sk.lScopeKey)
		WHERE	(
					(	
							(ISNULL(@psScopeKeys,'')<>'') 
						And (II.dtTranDate >= @pdtDateFrom)
						AND	(II.dtTranDate < DateAdd(day,1,@pdtDateTo))
						And	(sk.lScopeKey Is Not Null)
					)
					Or
					(		(ISNULL(@plRepairKey,0)>0)
						And (RE.lRepairKey = @plRepairKey)
					)
					Or
					(		(ISNULL(@plContractKey,0)>0)
						And (RE.lContractKey = @plContractKey)
					)
				)
				AND		RT.sFixType <> 'B'
		ORDER BY lRepairKey, sItemDescription

		If @pbConsumption = 1
			BEGIN
				Create Table #MaxAmounts
					(
						lRepairKey int,
						dblMax decimal(10,2)
					)

				Insert Into #MaxAmounts ( lRepairKey, dblMax ) 
				Select h.lRepairKey, st.mMaxCharge
				From #Results h join tblScope s on (h.lScopeKey = s.lScopeKey)
					join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
				Where IsNull(st.mMaxCharge,0)>0
				Group By h.lRepairKey, st.mMaxCharge

				Update m
				Set dblMax = r.mMaxCharge
				From #MaxAmounts  m join dbo.tblRepair r on (m.lRepairKey = r.lRepairKey)
				Where ISNULL(r.mMaxCharge,0)>0


				Create Table #RepairAmounts
					(
						lRepairKey int,
						sWorkOrderNumber nvarchar(50),
						dblTotal money
					)

				Insert Into #RepairAmounts ( lRepairKey, sWorkOrderNumber, dblTotal ) 
				Select h.lRepairKey, h.sWorkOrderNumber, SUM(h.dblRepairPrice) As Total
				From #Results h
				Group By h.lRepairKey, h.sWorkOrderNumber

				Insert Into #Results ( lScopeKey, lRepairKey, sWorkOrderNumber, lRepairItemTranKey, lRepairItemKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, 
					sTranNumber, sComplaintDesc, sRepairReason, sItemDescription, sApproved, dblRepairPrice, sNumberOfUses )
				Select r.lScopeKey, r.lRepairKey, ra.sWorkOrderNumber, 99999, 99999, r.dtTranDate, r.dtDateIn, r.sSerialNumber, r.sScopeTypeDesc, r.sTranNumber, r.sComplaintDesc, r.sRepairReason,
					'ZZZZ Adjustment' As ItemDescription, 'Y' As sApproved, m.dblMax - ra.dblTotal As RepairPrice, r.sNumberOfUses
				From #RepairAmounts ra join #MaxAmounts m on (ra.lRepairKey = m.lRepairKey)
					join (	Select lScopeKey, lRepairKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, sTranNumber, sComplaintDesc, sRepairReason, sNumberOfUses
							From #Results
							Group By lScopeKey, lRepairKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, sTranNumber, sComplaintDesc, sRepairReason, sNumberOfUses
						) r on (ra.lRepairKey = r.lRepairKey)
				Where ra.dblTotal > m.dblMax And IsNull(m.dblMax,0)>0

				Drop Table #MaxAmounts
				Drop Table #RepairAmounts
			END				

		--Get Totals
		Update r
		Set dblTotal = t.dblTotal
		From #Results r join
			(
				Select r.lRepairKey, SUM(r.dblRepairPrice) As dblTotal
				From #Results r 
				Group By r.lRepairKey
			) t on (r.lRepairKey = t.lRepairKey)
			join
			(
				Select r.lRepairKey, MIN(ID) As MinID 
				From #Results r 
				Group By r.lRepairKey
			) a on (r.ID = a.MinID)

		Update #Results Set sComplaintDesc = Null, sRepairReason = Null 
		Where ID Not In 
			(Select MinID From (Select lRepairKey, MIN(ID) As MinID From #Results Group By lRepairKey) a)

		If @pbDetails = 1 
			Select dtDateIn, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, sComplaintDesc, sRepairReason, sNumberOfUses, sItemDescription, sComments, sUAOrNWT,  dblRepairPrice, dblTotal
			From #Results r 
			Order By r.sSerialNumber, r.dtDateIn DESC, sWorkOrderNumber, r.sItemDescription
		else
			Select dtDateIn, sScopeTypeDesc, sSerialNumber, MAX(sComplaintDesc) As sCompaintDesc, sNumberOfUses, SUM(dblRepairPrice) As RepairPrice, SUM(dblTotal) As Total
			From #Results r 
			Group By dtDateIn, sScopeTypeDesc, sSerialNumber
			Order By r.dtDateIn DESC

	
		Drop Table #ScopeKeys
		Drop Table #Results
END

