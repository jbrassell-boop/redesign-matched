
CREATE PROCEDURE [dbo].[portalRptDataSrcRepairReqApr]
	(
		@plRepairKey		INT,
		@prmPortal			tinyint
	)
AS
BEGIN

	SELECT	RE.lRepairKey, RE.lFriendRepairKey, 
			RE.sComplaintDesc, RE.sWorkOrderNumber, RE.dtAprRecvd, 
			RE.sShipName1, RE.sShipName2, RE.sShipAddr1, RE.sShipAddr2, 
			RE.sShipCity, RE.sShipState, RE.sShipZip, 
			RE.sAngInLeft, RE.sAngInRight, RE.sAngInUp, RE.sAngInDown, 
			RE.sPurchaseOrder, RE.sPS3, RE.sPS3Out,
			RE.mComments AS mCommentsVisible, 
			RE.mCommentsHidden, RE.sReqAprTotalsOnly, 
			CL.sClientName1, CL.sClientName2, 
			DE.sDispProductID, DE.bDisplayUAorNWT,
			SC.sSerialNumber, 
			ST.sScopeTypeDesc, ST.sAngLeft, ST.sAngRight, ST.sAngUp, 
			ST.sAngDown, RE.sBrokenFibersIn, DM.sDeliveryDesc, 
			DI.sDistName1, DI.sDistName2, CO.sCompanyName1, 
			CO.sCompanyName2, CO.sCompanyPhoneVoice, CO.sCompanyPhoneFAX, 
			SC.mComments AS mCommentsRolling, 
			RI.sItemDescription, RI.sProductID, 
			Case When dbo.fn_ShowCostsForDistributor(RE.lDistributorKey,@prmPortal)=0 Then Null Else RT.dblRepairPrice End As dblRepairPrice, 
			CASE	WHEN RT.sFixType = 'W' THEN '(warranty)'
					WHEN RT.sFixType = 'C' THEN '(complimentary)'
					ELSE RT.sComments
			END AS sTranComments, RT.sUAorNWT,
			dbo.fn_GetAddressBlock(1,CL.sClientName1,cl.sClientName2,RE.sShipAddr1,RE.sShipAddr2,RE.sShipCity,RE.sShipState,RE.sShipZip,0,'','') As ShipAddrBlk1,
			dbo.fn_GetAddressBlock(2,CL.sClientName1,cl.sClientName2,RE.sShipAddr1,RE.sShipAddr2,RE.sShipCity,RE.sShipState,RE.sShipZip,0,'','') As ShipAddrBlk2,
			dbo.fn_GetAddressBlock(3,CL.sClientName1,cl.sClientName2,RE.sShipAddr1,RE.sShipAddr2,RE.sShipCity,RE.sShipState,RE.sShipZip,0,'','') As ShipAddrBlk3,
			dbo.fn_GetAddressBlock(4,CL.sClientName1,cl.sClientName2,RE.sShipAddr1,RE.sShipAddr2,RE.sShipCity,RE.sShipState,RE.sShipZip,0,'','') As ShipAddrBlk4,
			dbo.fn_GetAddressBlock(5,CL.sClientName1,cl.sClientName2,RE.sShipAddr1,RE.sShipAddr2,RE.sShipCity,RE.sShipState,RE.sShipZip,0,'','') As ShipAddrBlk5,
			ST.sRigidOrFlexible
	FROM	dbo.tblRepair RE WITH (NOLOCK) JOIN	dbo.tblDepartment DE WITH (NOLOCK) ON	RE.lDepartmentKey = DE.lDepartmentKey
				JOIN	dbo.tblClient CL WITH (NOLOCK) ON	DE.lClientKey = CL.lClientKey
				JOIN	dbo.tblScope SC WITH (NOLOCK) ON	RE.lScopeKey = SC.lScopeKey
				JOIN	dbo.tblScopeType ST WITH (NOLOCK) ON	SC.lScopeTypeKey = ST.lScopeTypeKey
				JOIN	dbo.tblDeliveryMethod DM WITH (NOLOCK) ON	RE.lDeliveryMethodKey = DM.lDeliveryMethodKey
				JOIN	dbo.tblDistributor DI WITH (NOLOCK) ON	RE.lDistributorKey = DI.lDistributorKey
				JOIN	dbo.tblCompany CO WITH (NOLOCK) ON	DI.lCompanyKey = CO.lCompanyKey
				LEFT JOIN	(Select * From dbo.tblRepairItemTran Where sFixType<>'B') RT ON	RE.lRepairKey = RT.lRepairKey
				LEFT JOIN	dbo.tblRepairItem RI WITH (NOLOCK) ON	RI.lRepairItemKey = RT.lRepairItemKey
	WHERE	RE.lRepairKey = @plRepairKey
		AND	ST.sScopeTypeDesc <> 'Contract'
	ORDER BY RI.sItemDescription  
END
