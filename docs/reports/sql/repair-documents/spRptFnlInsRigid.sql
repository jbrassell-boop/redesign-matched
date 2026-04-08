CREATE PROCEDURE [dbo].[spRptFnlInsRigid]
	(
		@plRepairKey int,
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plUserKey int
	)
AS
BEGIN
	SET	NOCOUNT ON

	Declare @sUserFullName nvarchar(100)
	Select @sUserFullName = sUserFullName From dbo.tblUsers Where lUserKey = @plUserKey

	Update tblRepairInspection Set lUserKey = @plUserKey Where lRepairKey = @plRepairKey And lRepairInspectionType = 2 

	Declare @LengthIn decimal(10,2)
	Select @LengthIn = nInsertionTubeLength From tblRepairInspection Where lRepairKey = @plRepairKey And lRepairInspectionType=1
	Set @LengthIn = ISNULL(@LengthIn,0)

	Insert Into tblRptFnlInsHdr ( lSessionID, sSessionTime, lRepairKey, sClientName1, sClientName2, sScopeTypeDesc, sComplaintDesc, sWorkOrderNumber, sPurchaseOrder, sSerialNumber, nCountConnectors,
		sInsImagePF, 
		sInsEyePiecePF,
		sInsInsertionTubePF,
		sInsAirWaterPF,	--Body/Nosecone/Light Post
		sInsVisionPF, --Objective/Distal End
		sInsLightFibersPF,
		sInsHotColdLeakPF,
		sInsAuxWaterPF, --Autoclave 
		nLengthIn,
		nLengthOut,
		nVideoAdjSetting, --Insertion Tube Diameter
		sInsFinalPF,
		sInsScopeIsUsableYN,
		sDistName1, sDistName2, dtDateOut, mCommentsVisible, mCommentsRolling, mCommentsBlind, bDisplayUAorNWT, sInitTech, sInitInsptr, sAutoclaveable,
		sCompanyName1, sCompanyPhoneVOICE
		 )
	Select @plSessionID, @psSessionTime, r.lRepairKey, c.sClientName1, c.sClientName2, st.sScopeTypeDesc, r.sComplaintDesc, r.sWorkOrderNumber, r.sPurchaseOrder, s.sSerialNumber, i.lConnectors,
		Case When Cast(IsNull(i.bImageClearAndInFocus,0) As int) + Cast(IsNull(i.bImageRoundAndClearToEdge,0) As int) + Cast(IsNull(i.bImageFreeOfContamination,0) As int) + Cast(IsNull(i.bImageLensSystemSecure,0) As int) = 0 Then 'P' Else 'F' End As ImageTest,
		Case When Cast(IsNull(i.bEyepieceColor,0) As int) + Cast(IsNull(i.bEyepieceCondition,0) As int) + Cast(IsNull(i.bEyepieceWindow,0) As int) + Cast(IsNull(i.bEyepieceGlueSeal,0) As int) + Cast(IsNull(i.bOcularLens,0) As int) = 0 Then 'P' Else 'F' End As EyepieceTest,
		Case When Cast(IsNull(i.bInsertionTubeConnectionToBody,0) As int) + Cast(IsNull(i.bTubingFinish,0) As int) + Cast(IsNull(i.bInsertionTube,0) As int) + Cast(IsNull(i.bInsertionTubeTip,0) As int) = 0 Then 'P' Else 'F' End As TubingTest,
		Case When Cast(IsNull(i.bIDBand,0) As int) + Cast(IsNull(i.bBodyCondition,0) As int) + Cast(IsNull(i.bNoseconeCondition,0) As int) + Cast(IsNull(i.bGlueSealsIntact,0) As int) + Cast(IsNull(i.bLightPostCondition,0) As int) + Cast(IsNull(i.bModelAndLightPostInAlignment,0) As int) + Cast(IsNull(i.bLightPostAndTipAngleInAlignment,0) As int) = 0 Then 'P' Else 'F' End As BodyTest,
		Case When Cast(IsNull(i.bWindowIntactAndClear,0) As int) + Cast(IsNull(i.bNegativeLensIntactAndClear,0) As int) + Cast(IsNull(i.bObjectiveLensIntactAndSecure,0) As int) = 0 Then 'P' Else 'F' End As ObjectiveTest,
		Case When Cast(IsNull(i.bColorOfLightTipAndPostAcceptable,0) As int) + Cast(IsNull(i.bFibersIntactAndNotLoose,0) As int) + Cast(IsNull(i.bFiberGlueIntactAndSealed,0) As int) = 0 Then 'P' Else 'F' End As LightFibersTest,
		Case When IsNull(bHotColdLeakTestPass,0) = 1 Then 'P' Else 'F' End As HotColdTest,
		Case 
			When IsNull(st.bAutoclaveable,0) = 0 Then 'P'	--Not autoclaveable
			When IsNull(bAutoclaveTestPass,0) = 1 Then 'P'  --Autoclaveable, and passed
			Else 'F' 
		End As AutoclaveTest,
		@LengthIn As LengthIn,
		i.nInsertionTubeLength,
		i.nInsertionTubeDiameter,
		'P' As FinalTest, 
		'Y' As ScopeIsUsable,
		--di.sDistName1, di.sDistName2, r.dtDateOut, r.mComments AS mCommentsVisible, s.mComments, r.mCommentsHidden, d.bDisplayUAorNWT, IsNull(te.sTechName, 'N/A'), IsNull(@sUserFullName, 'N/A'),
		di.sDistName1, di.sDistName2, r.dtDateOut, r.mComments AS mCommentsVisible, s.mComments, r.mCommentsHidden, d.bDisplayUAorNWT, IsNull(te.sTechInits, 'N/A'), IsNull(@sUserFullName, 'N/A'),
		Case When IsNull(st.bAutoclaveable,0) = 0 Then 'N' Else 'Y' End,
		co.sCompanyName1, co.sCompanyPhoneVoice 
	From dbo.tblRepairInspection i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblDistributor di on (r.lDistributorKey = di.lDistributorKey)
		join dbo.tblCompany co on (di.lCompanyKey = co.lCompanyKey)
		left join dbo.tblTechnicians te ON	i.lTechnicianKey = te.lTechnicianKey
	Where i.lRepairKey = @plRepairKey And lRepairInspectionType = 2

	Update tblRptFnlInsHdr Set sInsFinalPF = 'F', sInsScopeIsUsableYN = 'N' 
	Where lRepairKey = @plRepairKey And lSessionID = @plSessionID And sSessionTime = @psSessionTime And 
		(sInsImagePF = 'F' Or sInsEyePiecePF = 'F' Or sInsInsertionTubePF = 'F' Or sInsAirWaterPF = 'F' Or sInsVisionPF = 'F' Or sInsLightFibersPF = 'F' Or sInsHotColdLeakPF = 'F' Or sInsAuxWaterPF = 'F')


	INSERT INTO tblRptFnlInsDtl 
		(	lSessionID, sSessionTime, lRepairKey, sItemDescription, sComments, 
			sApproved, dblRepairPrice, sFixType, sProductID, sUAorNWT
		)
	SELECT	RH.lSessionID, RH.sSessionTime, RT.lRepairKey, 
			RI.sItemDescription, RT.sComments, ' ', 0, 
			RT.sFixType, RI.sProductID, RT.sUAorNWT
	FROM	tblRptFnlInsHdr RH WITH (NOLOCK)
			INNER JOIN	tblRepairItemTran RT WITH (NOLOCK)
					ON	RH.lRepairKey = RT.lRepairKey
			INNER JOIN	tblRepairItem RI WITH (NOLOCK)
					ON	RT.lRepairItemKey = RI.lRepairItemKey
	WHERE	RH.lSessionID	= @plSessionID 
	AND		RH.sSessionTime	= @psSessionTime

	INSERT INTO tblRptFnlInsDtl 
		(	lRepairKey, lSessionID, sSessionTime, sItemDescription, sComments, 
			sApproved, dblRepairPrice, sFixType, sProductID, sUAorNWT		)
	SELECT	RT.lRepairKey, @plSessionID, @psSessionTime, RI.sItemDescription, 
			RT.sComments, RT.sApproved, RT.dblRepairPrice, 
			RT.sFixType, RI.sProductID, RT.sUAorNWT
	FROM	tblRepairItemTran RT
			INNER JOIN	tblRepairItem RI
					ON	RT.lRepairItemKey = RI.lRepairItemKey
	WHERE	RT.lRepairKey = @plRepairKey
	AND		RT.sApproved = 'Y'
END

