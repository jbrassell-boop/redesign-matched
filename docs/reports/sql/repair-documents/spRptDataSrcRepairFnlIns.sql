CREATE	PROCEDURE [dbo].[spRptDataSrcRepairFnlIns]
	@plRepairKey		INT
AS
BEGIN
/*
	DECLARE	@plRepairKey	INT
	SET		@plRepairKey	= 464506
--*/
	SELECT	RE.lRepairKey, RE.lFriendRepairKey, CL.sClientName1, CL.sClientName2, RE.sComplaintDesc, 
			RE.sWorkOrderNumber, RE.dtExpDelDate, RE.dtDateOut, 
			RE.sAngInLeft, RE.sAngOutLeft, RE.sAngInRight, RE.sAngOutRight, 
			RE.sAngInUp, RE.sAngOutUp, RE.sAngInDown, RE.sAngOutDown, 
			RE.sPurchaseOrder, SC.sSerialNumber, ST.sScopeTypeDesc, 
			ST.sAngLeft, ST.sAngRight, ST.sAngUp, ST.sAngDown, RE.sBrokenFibersIn, RE.sBrokenFibersOut, 
			RE.sInsLeakPF, RE.sInsFogPF, RE.sInsAirWaterPF, RE.sInsSuctionPF, RE.sInsImagePF, RE.sInsAngulationPF, 
			RE.sIncludesETOCapYN, RE.sIncludesCO2CapYN, RE.sIncludesBioCapYN, RE.sIncludesAirWaterValveYN, 
			RE.sIncludesWaterProofCapYN, RE.sIncludesHoodYN, RE.sIncludesSuctionValveYN, RE.sInsFinalPF, 
			RE.sInsScopeIsUsableYN, 
			IsNull(TE.sTechInits, 'N/A') AS sInitTech, 
			IsNull(T1.sTechInits, 'N/A') AS sInitInsptr, 
			DI.sDistName1, DI.sDistName2, RE.mComments AS mCommentsVisible, SC.mComments, RE.mCommentsHidden, 
			RE.sInsOpticsAnglePF, RE.sInsOpticsFieldPF, RE.sInsOpticsResolutionPF, RE.sInsFiberAnglePF, 
			RE.sInsFiberLightTransPF, RE.sInsHotColdLeakPF, RE.sInsFocalDistancePF, RE.sInsVisionPF, 
			RE.sInsInsertionTubePF, RE.sInsEyePiecePF, RE.sInsLightFibersPF, RE.sIncludesBoxYN, RE.sIncludesCaseYN, 
			RE.sRackPosition, RE.nLengthIn, RE.nLengthOut, RE.nVideoAdjSetting, RE.nCountConnectors, ST.sLengthSpec, 
			SC.sRigidOrFlexible, RE.sInsAlcoholWipePF, RE.sInsCamLensCleanedPF, RE.sInsCamFocusPF, RE.sInsCamWhiteBalancePF, 
			RE.sInsCamControlButtonsPF, RE.sInsCamCableConnectorPF, RE.sInsCamVideoAppearancePF, RE.sInsCamSoakCapAssemblyPF, 
			RE.sInsCoupLeakPF, RE.sInsCoupLensCleanedPF, RE.sInsCoupFocusPF, RE.sInsCoupFogPF, RE.sInsCoupFocusMechPF, 
			RE.sInsCoupScopeRetainingMechPF, RE.sIncludesCamCouplerYN, RE.sIncludesCamSoakCapYN, 
			RE.sIncludesCamEdgeCardProtYN, DE.sDispProductID, RE.sPS3, RE.sPS3Out, RE.sInsCamCablePF, 
			RE.sInsCamEdgeCardProtectorPF, RE.sInsForcepChannelPF, RE.sInsAuxWaterPF, RE.sBRJigSize, DE.bDisplayUAorNWT,
			RI.sItemDescription, RI.sProductID, 
			RT.sComments, ' ' AS sApproved, 0 AS dblRepairPrice, RT.sFixType, RT.sUAorNWT
	FROM	tblRepair RE
			INNER JOIN	tblScope SC WITH (NOLOCK)
					ON	RE.lScopeKey = SC.lScopeKey
			INNER JOIN	tblScopeType ST  WITH (NOLOCK)
					ON	SC.lScopeTypeKey = ST.lScopeTypeKey
			INNER JOIN	tblDepartment DE  WITH (NOLOCK)
					ON	RE.lDepartmentKey = DE.lDepartmentKey
			INNER JOIN	tblClient CL  WITH (NOLOCK)
					ON	CL.lClientKey = DE.lClientKey
			INNER JOIN	tblDistributor DI  WITH (NOLOCK)
					ON	RE.lDistributorKey = DI.lDistributorKey
			INNER JOIN	tblCompany  CO WITH (NOLOCK)
					ON	DI.lCompanyKey = CO.lCompanyKey
			LEFT JOIN	tblTechnicians TE  WITH (NOLOCK)
					ON	RE.lTechnicianKey = TE.lTechnicianKey
			LEFT JOIN	tblTechnicians T1  WITH (NOLOCK)
					ON	RE.lInspectorKey = T1.lTechnicianKey
			LEFT JOIN	tblRepairItemTran RT WITH (NOLOCK)
					ON	RE.lRepairKey = RT.lRepairKey
			LEFT JOIN	tblRepairItem RI WITH (NOLOCK)
					ON	RI.lRepairItemKey = RT.lRepairItemKey
	WHERE	RE.lRepairKey = @plRepairKey

END
