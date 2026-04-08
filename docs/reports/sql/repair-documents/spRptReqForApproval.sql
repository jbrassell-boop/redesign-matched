CREATE PROCEDURE [dbo].[spRptReqForApproval]
	(
		@plRepairKey int,
		@plSessionID int,
		@psSessionTime varchar(20)
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lBarCodeKey int
	Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Req For Appr'

    INSERT INTO tblRptReqAprHdr ( lRepairKey, lFriendRepairKey, lSessionID, sSessionTime, sClientName1, sClientName2, 
									sComplaintDesc, sWorkOrderNumber, dtAprRecvd, 
									sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, 
									sAngInLeft, sAngInRight, sAngInUp, sAngInDown, sPurchaseOrder, 
									sSerialNumber, sScopeTypeDesc, sAngLeft, sAngRight, sAngUp, sAngDown, sBrokenFibersIn, 
									sDeliveryDesc, sDistName1, sDistName2, sCompanyName1, sCompanyName2, sCompanyPhoneVoice,
									sCompanyPhoneFAX, mCommentsVisible, mCommentsRolling, mCommentsBlind, sReqAprTotalsOnly,
									sDispProductID, sPS3, sPS3Out, bDisplayUAorNWT, sBarCode
								)
	SELECT tblRepair.lRepairKey, tblRepair.lFriendRepairKey, @plSessionID, @psSessionTime, tblClient.sClientName1, 
		   tblClient.sClientName2, tblRepair.sComplaintDesc, tblRepair.sWorkOrderNumber, 
		   tblRepair.dtAprRecvd, 
		   tblRepair.sShipName1, tblRepair.sShipName2, tblRepair.sShipAddr1, tblRepair.sShipAddr2, tblRepair.sShipCity, 
		   tblRepair.sShipState, tblRepair.sShipZip, tblRepair.sAngInLeft, tblRepair.sAngInRight, 
		   tblRepair.sAngInUp, tblRepair.sAngInDown, tblRepair.sPurchaseOrder, tblScope.sSerialNumber, 
		   tblScopeType.sScopeTypeDesc, 
		   Case When tblScopeType.sAppliesAngLeftRight = 'Y' Then ISNULL(tblScopeType.sAngLeft,'N/A') Else 'N/A' End As sAngLeft,
		   Case When tblScopeType.sAppliesAngLeftRight = 'Y' Then ISNULL(tblScopeType.sAngRight,'N/A') Else 'N/A' End As sAngRight,
		   Case When tblScopeType.sAppliesAngUpDown = 'Y' Then ISNULL(tblScopeType.sAngUp,'N/A') Else 'N/A' End As sAngUp,
		   Case When tblScopeType.sAppliesAngUpDown = 'Y' Then ISNULL(tblScopeType.sAngDown,'N/A') Else 'N/A' End As sAngDown,
		   tblRepair.sBrokenFibersIn, tblDeliveryMethod.sDeliveryDesc, 
		   tblDistributor.sDistName1, tblDistributor.sDistName2, tblCompany.sCompanyName1, 
		   tblCompany.sCompanyName2, tblCompany.sCompanyPhoneVoice, tblCompany.sCompanyPhoneFAX, 
		   tblRepair.mComments AS mCommentsVisible, tblScope.mComments AS mCommentsRolling, 
		   tblRepair.mCommentsHidden, tblRepair.sReqAprTotalsOnly, tblDepartment.sDispProductID, 
		   tblRepair.sPS3, tblRepair.sPS3Out, tblDepartment.bDisplayUAorNWT,
		   '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(tblRepair.lRepairKey as varchar(15)) + '*' 
	FROM tblRepair, tblClient, tblScope, tblScopeType, 
		   tblDepartment, tblDeliveryMethod, tblDistributor, tblCompany 
	WHERE tblRepair.lRepairKey = @plRepairKey
	   AND tblRepair.lScopeKey = tblScope.lScopeKey
	   AND tblRepair.lDeliveryMethodKey = tblDeliveryMethod.lDeliveryMethodKey
	   AND tblRepair.lDistributorKey = tblDistributor.lDistributorKey
	   AND tblRepair.lDepartmentKey = tblDepartment.lDepartmentKey
	   AND tblScope.lScopeTypeKey = tblScopeType.lScopeTypeKey
	   AND tblClient.lClientKey = tblDepartment.lClientKey
	   AND tblDistributor.lCompanyKey = tblCompany.lCompanyKey

	UPDATE tblRptReqAprHdr 
	SET		sFriendWorkOrderNumber = RE.sWorkOrderNumber, 
			sFriendSerialNumber = SC.sSerialNumber, 
			sFriendScopeTypeDesc = ST.sScopeTypeDesc
	FROM tblRepair RE, tblScope SC, tblScopeType ST
	WHERE tblRptReqAprHdr.lSessionID = @plSessionID 
		AND  tblRptReqAprHdr.sSessionTime = @psSessionTime
		AND  tblRptReqAprHdr.lFriendRepairKey = RE.lRepairKey 
		AND  RE.lScopeKey = SC.lScopeKey 
		AND  SC.lScopeTypeKey = ST.lScopeTypeKey 

	

	INSERT INTO tblRptReqAprDtl ( lRepairKey, lSessionID, sSessionTime, sItemDescription, dblRepairPrice, sTranComments, sProductID, sUAorNWT )
	SELECT tblRepairItemTran.lRepairKey, @plSessionID, @psSessionTime, tblRepairItem.sItemDescription, tblRepairItemTran.dblRepairPrice, 
		CASE	WHEN sFixType = 'W' THEN '(warranty)'
				WHEN sFixType = 'C' THEN '(complimentary)'
				ELSE  sComments
		END, 
		tblRepairItem.sProductID, tblRepairItemTran.sUAorNWT
	FROM tblRepairItemTran, tblRepairItem 
	WHERE tblRepairItemTran.lRepairItemKey = tblRepairItem.lRepairItemKey
		AND tblRepairItemTran.lRepairKey = @plRepairKey
		AND tblRepairItemTran.sFixType <> 'B'

END


