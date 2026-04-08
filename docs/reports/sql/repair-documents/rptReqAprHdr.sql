CREATE PROCEDURE [dbo].[rptReqAprHdr]
	(
		@plRepairKey int,
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@psSalesTaxFlag nvarchar(50),
		@pmShipping decimal(10,2) = 0,
		@pmSalesTax decimal(10,2) = 0,
		@psReviewedBy nvarchar(100) = null
	)
AS
BEGIN
	SET NOCOUNT ON;
    
	INSERT INTO tblRptReqAprHdr ( lRepairKey, lFriendRepairKey, lSessionID, sSessionTime, sClientName1, sClientName2, sComplaintDesc, sWorkOrderNumber, dtAprRecvd, 
		sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, sAngInLeft, sAngInRight, sAngInUp, sAngInDown, sPurchaseOrder, 
		sSerialNumber, sScopeTypeDesc, sAngLeft, sAngRight, sAngUp, sAngDown, sBrokenFibersIn, sDeliveryDesc, sDistName1, sDistName2, sCompanyName1, sCompanyName2, 
		sCompanyPhoneVoice, sCompanyPhoneFAX, mCommentsVisible, mCommentsRolling, mCommentsBlind, sReqAprTotalsOnly, sDispProductID, sPS3, sPS3Out, bDisplayUAorNWT,
		sSalesTaxFlag,dblShipping, dblSalesTax, sReviewedBy )
	SELECT r.lRepairKey, r.lFriendRepairKey, @plSessionID, @psSessionTime, c.sClientName1, c.sClientName2, r.sComplaintDesc, r.sWorkOrderNumber, r.dtAprRecvd, 
		r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sAngInLeft, r.sAngInRight, r.sAngInUp, r.sAngInDown, 
		r.sPurchaseOrder, s.sSerialNumber, st.sScopeTypeDesc, 
		Case When st.sAppliesAngLeftRight = 'Y' Then ISNULL(st.sAngLeft,'N/A') Else 'N/A' End As sAngLeft,
		Case When st.sAppliesAngLeftRight = 'Y' Then ISNULL(st.sAngRight,'N/A') Else 'N/A' End As sAngRight,
		Case When st.sAppliesAngUpDown = 'Y' Then ISNULL(st.sAngUp,'N/A') Else 'N/A' End As sAngUp,
		Case When st.sAppliesAngUpDown = 'Y' Then ISNULL(st.sAngDown,'N/A') Else 'N/A' End As sAngDown,
		r.sBrokenFibersIn, dm.sDeliveryDesc, di.sDistName1, di.sDistName2, co.sCompanyName1, co.sCompanyName2, co.sCompanyPhoneVoice, co.sCompanyPhoneFAX, 
		r.mComments AS mCommentsVisible, s.mComments AS mCommentsRolling,  r.mCommentsHidden, Case When r.sReqAprTotalsOnly='N' Then 'N' Else 'Y' End, 
		d.sDispProductID, r.sPS3, r.sPS3Out, d.bDisplayUAorNWT, @psSalesTaxFlag, @pmShipping, @pmSalesTax, @psReviewedBy
	FROM dbo.tblRepair r join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)	
		join dbo.tblDistributor di on (r.lDistributorKey = di.lDistributorKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblDeliveryMethod dm on (r.lDeliveryMethodKey=dm.lDeliveryMethodKey)
		join dbo.tblCompany co on (di.lCompanyKey=co.lCompanyKey)
	Where r.lRepairKey = @plRepairKey

	Declare @cnt int
	Select @cnt = Count(*) From dbo.tblRptReqAprHdr h Where h.lRepairKey = @plRepairKey And h.lSessionID = @plSessionID And h.sSessionTime = @psSessionTime

	Select Case When @cnt = 0 Then 0 Else 1 End AS HeaderExists
END



