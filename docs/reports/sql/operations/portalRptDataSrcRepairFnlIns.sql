CREATE PROCEDURE [dbo].[portalRptDataSrcRepairFnlIns]
	(
		@plRepairKey		INT,
		@prmPortal			tinyint
	)
AS
BEGIN
	SELECT	FI.*, RE.mComments AS mCommentsVisible, SC.mComments, RE.mCommentsHidden, FS.sSerialNumber AS FriendSerialNumber,
		FST.sScopeTypeDesc AS FriendScopeTypeDescription
	FROM	(
			SELECT	1 AS nItemType,
					RE.lRepairKey, RE.lFriendRepairKey, CL.sClientName1, CL.sClientName2, RE.sComplaintDesc, 
					RE.sWorkOrderNumber, 
					--RE.sExpDelDate, 
					Case 
						When re.dtDateOut Is Not Null Then dbo.fn_FormatDate(re.dtDateOut,'mm/dd/yyyy')
						When re.sExpDelDate Is Not Null Then re.sExpDelDate
						When re.dtAprRecvd Is Not Null Then 'TBD'
						Else re.sExpDelDate
					End As sExpDelDate,
					RE.dtDateOut, 
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
					DI.sDistName1, DI.sDistName2, 
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
					RT.sComments, 
					Case When RT.sApproved='Y' Then 'Y' Else 'N' End AS sApproved, 
					Case 
						When dbo.fn_ShowCostsForDistributor(RE.lDistributorKey,@prmPortal)=0 Then Null
						When RT.sApproved='Y' Then rt.dblRepairPrice 
						Else 0 
					End AS dblRepairPrice, RT.sFixType, RT.sUAorNWT
			FROM	dbo.tblRepair RE
					INNER JOIN	dbo.tblScope SC WITH (NOLOCK)
							ON	RE.lScopeKey = SC.lScopeKey
					INNER JOIN	dbo.tblScopeType ST  WITH (NOLOCK)
							ON	SC.lScopeTypeKey = ST.lScopeTypeKey
					INNER JOIN	dbo.tblDepartment DE  WITH (NOLOCK)
							ON	RE.lDepartmentKey = DE.lDepartmentKey
					INNER JOIN	dbo.tblClient CL  WITH (NOLOCK)
							ON	CL.lClientKey = DE.lClientKey
					INNER JOIN	dbo.tblDistributor DI  WITH (NOLOCK)
							ON	RE.lDistributorKey = DI.lDistributorKey
					INNER JOIN	dbo.tblCompany  CO WITH (NOLOCK)
							ON	DI.lCompanyKey = CO.lCompanyKey
					LEFT JOIN	dbo.tblTechnicians TE  WITH (NOLOCK)
							ON	RE.lTechnicianKey = TE.lTechnicianKey
					LEFT JOIN	dbo.tblTechnicians T1  WITH (NOLOCK)
							ON	RE.lInspectorKey = T1.lTechnicianKey
					LEFT JOIN	dbo.tblRepairItemTran RT WITH (NOLOCK)
							ON	RE.lRepairKey = RT.lRepairKey
					LEFT JOIN	dbo.tblRepairItem RI WITH (NOLOCK)
							ON	RI.lRepairItemKey = RT.lRepairItemKey
			WHERE	RE.lRepairKey = @plRepairKey And RT.sFixType <> 'B' And ST.sScopeTypeDesc <> 'Contract'
		) AS FI
		INNER JOIN	dbo.tblRepair RE WITH (NOLOCK)
					ON	FI.lRepairKey = RE.lRepairKey
		INNER JOIN	dbo.tblScope SC WITH (NOLOCK)
				ON	RE.lScopeKey = SC.lScopeKey
		LEFT JOIN dbo.tblRepair FR ON (FI.lFriendRepairKey=FR.lRepairKey)
		LEFT JOIN dbo.tblScope FS ON (FR.lScopeKey=FS.lScopeKey)
		LEFT JOIN dbo.tblScopeType FST ON (FS.lScopeTypeKey=FST.lScopeTypeKey)
		ORDER BY FI.sItemDescription  
END
