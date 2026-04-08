CREATE	PROCEDURE [dbo].[spRptDataSrcRepairReqApr]
	@plRepairKey		INT
AS
BEGIN
/*
DECLARE	@plRepairKey	INT
SET		@plRepairKey	= 464506
--*/

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
			RT.dblRepairPrice, 
			CASE	WHEN RT.sFixType = 'W' THEN '(warranty)'
					WHEN RT.sFixType = 'C' THEN '(complimentary)'
					ELSE RT.sComments
			END AS sTranComments, RT.sUAorNWT
	FROM	tblRepair RE WITH (NOLOCK)
			INNER JOIN	tblDepartment DE WITH (NOLOCK)
					ON	RE.lDepartmentKey = DE.lDepartmentKey
			INNER JOIN	tblClient CL WITH (NOLOCK)
					ON	DE.lClientKey = CL.lClientKey
			INNER JOIN	tblScope SC WITH (NOLOCK)
					ON	RE.lScopeKey = SC.lScopeKey
			INNER JOIN	tblScopeType ST WITH (NOLOCK)
					ON	SC.lScopeTypeKey = ST.lScopeTypeKey
			INNER JOIN	tblDeliveryMethod DM WITH (NOLOCK)
					ON	RE.lDeliveryMethodKey = DM.lDeliveryMethodKey
			INNER JOIN	tblDistributor DI WITH (NOLOCK)
					ON	RE.lDistributorKey = DI.lDistributorKey
			INNER JOIN	tblCompany CO WITH (NOLOCK)
					ON	DI.lCompanyKey = CO.lCompanyKey
			LEFT JOIN	tblRepairItemTran RT WITH (NOLOCK)
					ON	RE.lRepairKey = RT.lRepairKey
			LEFT JOIN	tblRepairItem RI WITH (NOLOCK)
					ON	RI.lRepairItemKey = RT.lRepairItemKey
	WHERE	RE.lRepairKey = @plRepairKey
	AND		RT.sFixType <> 'B'
END
