CREATE PROCEDURE [dbo].[rptScopeRepairHistoryInsert]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@pdtDateFrom date = null,
		@pdtDateTo date = null,
		@psScopeKeys nvarchar(MAX) = null,
		@plRepairKey int = null,
		@pbConsumption bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptScopeRepairHistoryInsert @plSessionID = 0, @psSessionTime = 'ABCD', @plRepairKey = 513536, @pbConsumption=1
	/*
		exec dbo.rptScopeRepairHistoryInsert @plSessionID = 0, @psSessionTime = 'ABCD', @pdtDateFrom='10/1/2017', @pdtDateTo='5/1/2019', @psScopeKeys='9642', @pbConsumption=1
		Select * from tblRptScopeRprHist Where lSessionID=0 And sSessionTime='ABCD'
	*/
	Delete From tblRptScopeRprHist Where lSessionID = @plSessionID

	Create Table #ScopeKeys
		(
			lScopeKey int
		)

	If IsNull(@psScopeKeys,'')<>''
		Insert Into #ScopeKeys ( lScopeKey ) Select a.Int_Value From dbo.ParseTxt2Tbl(@psScopeKeys,',') a	

	INSERT INTO tblRptScopeRprHist ( lSessionID, sSessionTime, lScopeKey, lRepairKey, lRepairItemTranKey, lRepairItemKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, 
		sTranNumber, sComplaintDesc, sItemDescription, sApproved, dblRepairPrice, sUnderContract, sUAorNWT, sComments )
	SELECT	@plSessionID, @psSessionTime, II.lScopeKey, II.lRepairKey, RT.lRepairItemTranKey, RT.lRepairItemKey, II.dtTranDate, RE.dtDateIn, II.sSerialNumber, II.sScopeTypeDesc, 
		II.sTranNumber, RE.sComplaintDesc, RI.sItemDescription, RT.sApproved, 
		Case 
			When @pbConsumption = 0 Then RT.dblRepairPrice
			Else pd.dblRepairPrice
		END As dblRepairPrice, 
		II.sUnderContract, RT.sUAorNWT, RT.sComments
	FROM tblInvoice II JOIN tblRepair RE ON II.lRepairKey = RE.lRepairKey
		JOIN tblRepairItemTran RT ON RE.lRepairKey = RT.lRepairKey
		JOIN tblRepairItem RI ON RT.lRepairItemKey = RI.lRepairItemKey
		LEFT JOIN dbo.tblPricingDetail pd on (RE.lPricingCategoryKey = pd.lPricingCategoryKey) And (RT.lRepairItemKey = pd.lRepairItemKey)
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
			)
			AND		RT.sFixType <> 'B'

	If @pbConsumption = 1
		BEGIN
			Create Table #MaxAmounts
				(
					lRepairKey int,
					dblMax decimal(10,2)
				)

			Insert Into #MaxAmounts ( lRepairKey, dblMax ) 
			Select h.lRepairKey, st.mMaxCharge
			From dbo.tblRptScopeRprHist h join tblScope s on (h.lScopeKey = s.lScopeKey)
				join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
			Where IsNull(st.mMaxCharge,0)>0 And h.lSessionID=@plSessionID And h.sSessionTime=@psSessionTime
			Group By h.lRepairKey, st.mMaxCharge

			Update m 
			Set dblMax = r.mMaxCharge
			From #MaxAmounts m join dbo.tblRepair r on (m.lRepairKey = r.lRepairKey)
			Where ISNULL(r.mMaxCharge,0)>0
			


			Create Table #RepairAmounts
				(
					lRepairKey int,
					dblTotal money
				)

			Insert Into #RepairAmounts ( lRepairKey, dblTotal ) 
			Select h.lRepairKey, SUM(h.dblRepairPrice) As Total
			From dbo.tblRptScopeRprHist h Where lSessionID=@plSessionID And sSessionTime=@psSessionTime
			Group By h.lRepairKey

			Insert Into dbo.tblRptScopeRprHist ( lSessionID, sSessionTime, lScopeKey, lRepairKey, lRepairItemTranKey, lRepairItemKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, 
				sTranNumber, sComplaintDesc, sItemDescription, sApproved, dblRepairPrice )
			Select r.lSessionID, r.sSessionTime, r.lScopeKey, r.lRepairKey, 99999, 99999, r.dtTranDate, r.dtDateIn, r.sSerialNumber, r.sScopeTypeDesc, r.sTranNumber, r.sComplaintDesc,
				'ZZZZ Adjustment' As ItemDescription, 'Y' As sApproved, m.dblMax - ra.dblTotal As RepairPrice
			From #RepairAmounts ra join #MaxAmounts m on (ra.lRepairKey = m.lRepairKey)
				join (	Select lSessionID, sSessionTime, lScopeKey, lRepairKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, sTranNumber, sComplaintDesc
						From dbo.tblRptScopeRprHist
						Where lSessionID = @plSessionID And sSessionTime = @psSessionTime
						Group By lSessionID, sSessionTime, lScopeKey, lRepairKey, dtTranDate, dtDateIn, sSerialNumber, sScopeTypeDesc, sTranNumber, sComplaintDesc
					) r on (ra.lRepairKey = r.lRepairKey)
			Where ra.dblTotal > m.dblMax And IsNull(m.dblMax,0)>0
		END				
END
