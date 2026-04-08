CREATE PROCEDURE [dbo].[portalRptReqApr]
	(	
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plRepairKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--We pass in UserKey to lSessionID.  Since users are only creating one Req at a time, this isn't a problem and cleans things up
	Delete From dbo.tblRptReqAprHdr Where lSessionID = @plSessionID
	Delete From dbo.tblRptReqAprDtl Where lSessionID = @plSessionID

    INSERT INTO dbo.tblRptReqAprHdr ( lRepairKey, lFriendRepairKey, lSessionID, sSessionTime, sClientName1, sClientName2, sComplaintDesc, sWorkOrderNumber, dtAprRecvd, 
		sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, sAngInLeft, sAngInRight, sAngInUp, sAngInDown, sPurchaseOrder, 
        sSerialNumber, sScopeTypeDesc, sAngLeft, sAngRight, sAngUp, sAngDown, sBrokenFibersIn, sDeliveryDesc, sDistName1, sDistName2, sCompanyName1, sCompanyName2, 
		sCompanyPhoneVoice, sCompanyPhoneFAX, mCommentsVisible, mCommentsRolling, mCommentsBlind, sReqAprTotalsOnly, sDispProductID, sPS3, sPS3Out, 
		bDisplayUAorNWT, dblShipping, dblSalesTax, sReviewedBy )
	SELECT r.lRepairKey, r.lFriendRepairKey, @plSessionID, @psSessionTime, c.sClientName1, c.sClientName2, r.sComplaintDesc, r.sWorkOrderNumber, r.dtAprRecvd, 
		r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sAngInLeft, r.sAngInRight, r.sAngInUp, r.sAngInDown, r.sPurchaseOrder, 
		s.sSerialNumber, st.sScopeTypeDesc, 
		   Case When st.sAppliesAngLeftRight = 'Y' Then ISNULL(st.sAngLeft,'N/A') Else 'N/A' End As sAngLeft,
		   Case When st.sAppliesAngLeftRight = 'Y' Then ISNULL(st.sAngRight,'N/A') Else 'N/A' End As sAngRight,
		   Case When st.sAppliesAngUpDown = 'Y' Then ISNULL(st.sAngUp,'N/A') Else 'N/A' End As sAngUp,
		   Case When st.sAppliesAngUpDown = 'Y' Then ISNULL(st.sAngDown,'N/A') Else 'N/A' End As sAngDown,
		   r.sBrokenFibersIn, dm.sDeliveryDesc, di.sDistName1, di.sDistName2, co.sCompanyName1, co.sCompanyName2, co.sCompanyPhoneVoice, co.sCompanyPhoneFAX, 
		   r.mComments AS mCommentsVisible, s.mComments AS mCommentsRolling, r.mCommentsHidden, Case When r.sReqAprTotalsOnly='N' Then 'N' Else 'Y' End, d.sDispProductID, 
		   r.sPS3, r.sPS3Out, d.bDisplayUAorNWT, r.dblAmtShipping, r.nSalesTax, r.sReviewedBy
	  FROM dbo.tblRepair r join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblDeliveryMethod dm on (r.lDeliveryMethodKey = dm.lDeliveryMethodKey)
		join dbo.tblDistributor di on (r.lDistributorKey = di.lDistributorKey)
		join dbo.tblCompany co on (di.lCompanyKey = co.lCompanyKey)
	WHERE r.lRepairKey = @plRepairKey


	UPDATE tblRptReqAprHdr 
	Set sFriendWorkOrderNumber = r.sWorkOrderNumber, sFriendSerialNumber = s.sSerialNumber, sFriendScopeTypeDesc = st.sScopeTypeDesc
	FROM dbo.tblRptReqAprHdr h join dbo.tblRepair r on (h.lFriendRepairKey = r.lRepairKey) 
		join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	WHERE h.lSessionID = @plSessionID AND h.sSessionTime = @psSessionTime And h.lRepairKey = @plRepairKey 

	--------------------Req Detail
	INSERT INTO dbo.tblRptReqAprDtl ( lRepairKey, lSessionID, sSessionTime, sItemDescription, dblRepairPrice, sTranComments, sProductID, sUAorNWT )
	SELECT rit.lRepairKey, @plSessionID, @psSessionTime, ri.sItemDescription, rit.dblRepairPrice, 
		CASE	WHEN sFixType = 'W' THEN '(warranty)'
				WHEN sFixType = 'C' THEN '(complimentary)'
				ELSE  sComments
		END, ri.sProductID, rit.sUAorNWT
	FROM dbo.tblRepairItemTran rit join dbo.tblRepairItem ri on (rit.lRepairItemKey = ri.lRepairItemKey)
	WHERE rit.lRepairKey = @plRepairKey And rit.sFixType <> 'B'


	--------------------Add Non-Contract Cost if necessary
	Declare @bIncludeConsumptionReportWithReq bit
	Select @bIncludeConsumptionReportWithReq = bIncludeConsumptionReportWithReq 
	From dbo.tblDepartment d join dbo.tblRepair r on (d.lDepartmentKey=r.lDepartmentKey)
	Where r.lRepairKey = @plRepairKey
	
	If ISNULL(@bIncludeConsumptionReportWithReq,0)=1
		BEGIN
			Declare @NonContractCost decimal(10,2)
			Set @NonContractCost = dbo.fn_RepairNonInstrumentConsumption(@plRepairKey)

			Update dbo.tblRptReqAprHdr
			Set mCommentsRolling = 'Non-Contract Cost: ' + dbo.fn_FormatCurrency(@NonContractCost) + nchar(13) + nchar(13) + Convert(nvarchar(MAX),ISNULL(mCommentsRolling,''))
			Where lRepairKey = @plRepairKey And lSessionID = @plSessionID
		END


	--------------------Add Barcode and Company Email Address
	Declare @sCompanyEmailAddress nvarchar(50)
	Set @sCompanyEmailAddress = 'ops-tsi@totalscopeinc.com'
	
	Update dbo.tblRptReqAprHdr
	Set sBarCode = '*4.' + Cast(lRepairKey as varchar(15)) + '*',
		sCompanyEmailAddress = @sCompanyEmailAddress
	Where lSessionID=@plSessionID And sSessionTime=@psSessionTime And lRepairKey=@plRepairKey

	Declare @dtDate date
	Set @dtDate = GETDATE()
	
	--This is passed as a parameter, so we need to get it
	Select ISNULL(dtReqSent,@dtDate) As dtReqSent From dbo.tblRepair Where lRepairKey = @plRepairKey
END
