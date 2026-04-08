CREATE PROCEDURE [dbo].[portalRptDataSrcRepairFnlInsRigid]
	(
		@plRepairKey		INT,
		@prmPortal			tinyint
	)
AS
BEGIN

	--exec dbo.portalRptDataSrcRepairFnlInsRigid @plRepairKey = 1, @prmPortal=1

	Declare @Results Table 
		(
			lRepairKey int, 
			sClientName1 nvarchar(200), 
			sClientName2 nvarchar(200), 
			sScopeTypeDesc nvarchar(200), 
			sComplaintDesc nvarchar(200), 
			sWorkOrderNumber nvarchar(50), 
			sPurchaseOrder nvarchar(50), 
			sSerialNumber nvarchar(50), 
			nCountConnectors nvarchar(20),
			sInsImagePF nvarchar(20), 
			sInsEyePiecePF nvarchar(20),
			sInsInsertionTubePF nvarchar(20),
			sInsAirWaterPF nvarchar(20),	--Body/Nosecone/Light Post
			sInsVisionPF nvarchar(20), --Objective/Distal End
			sInsLightFibersPF nvarchar(20),
			sInsHotColdLeakPF nvarchar(20),
			sInsAuxWaterPF nvarchar(20), --Autoclave 
			nLengthIn nvarchar(20),
			nLengthOut nvarchar(20),
			nVideoAdjSetting nvarchar(20), --Insertion Tube Diameter
			sInsFinalPF nvarchar(20),
			sInsScopeIsUsableYN nvarchar(20),
			sDistName1 nvarchar(200), 
			sDistName2 nvarchar(200), 
			dtDateOut date, 
			mCommentsVisible nvarchar(max), 
			mCommentsRolling nvarchar(max), 
			mCommentsBlind nvarchar(max), 
			bDisplayUAorNWT bit, 
			sInitTech nvarchar(100), 
			sInitInsptr nvarchar(100)
		)

	Declare @Details Table
		(
			lRepairKey int,
			sItemDescription nvarchar(200),
			sComments nvarchar(200), 
			sApproved nvarchar(20), 
			dblRepairPrice money, 
			sFixType nvarchar(20), 
			sProductID nvarchar(50), 
			sUAorNWT nvarchar(50)
		)

	Declare @LengthIn decimal(10,2)
	Select @LengthIn = nInsertionTubeLength From dbo.tblRepairInspection Where lRepairKey = @plRepairKey And lRepairInspectionType=1
	Set @LengthIn = ISNULL(@LengthIn,0)

	Insert Into @Results ( lRepairKey, sClientName1, sClientName2, sScopeTypeDesc, sComplaintDesc, sWorkOrderNumber, sPurchaseOrder, sSerialNumber, nCountConnectors,
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
		sDistName1, sDistName2, dtDateOut, mCommentsVisible, mCommentsRolling, mCommentsBlind, bDisplayUAorNWT, sInitTech, sInitInsptr )
	Select r.lRepairKey, c.sClientName1, c.sClientName2, st.sScopeTypeDesc, r.sComplaintDesc, r.sWorkOrderNumber, r.sPurchaseOrder, s.sSerialNumber, i.lConnectors,
		Case When Cast(IsNull(i.bImageClearAndInFocus,0) As int) + Cast(IsNull(i.bImageRoundAndClearToEdge,0) As int) + Cast(IsNull(i.bImageFreeOfContamination,0) As int) + Cast(IsNull(i.bImageLensSystemSecure,0) As int) = 0 Then 'P' Else 'F' End As ImageTest,
		Case When Cast(IsNull(i.bEyepieceColor,0) As int) + Cast(IsNull(i.bEyepieceCondition,0) As int) + Cast(IsNull(i.bEyepieceWindow,0) As int) + Cast(IsNull(i.bEyepieceGlueSeal,0) As int) + Cast(IsNull(i.bOcularLens,0) As int) = 0 Then 'P' Else 'F' End As EyepieceTest,
		Case When Cast(IsNull(i.bInsertionTubeConnectionToBody,0) As int) + Cast(IsNull(i.bTubingFinish,0) As int) + Cast(IsNull(i.bInsertionTube,0) As int) + Cast(IsNull(i.bInsertionTubeTip,0) As int) = 0 Then 'P' Else 'F' End As TubingTest,
		Case When Cast(IsNull(i.bIDBand,0) As int) + Cast(IsNull(i.bBodyCondition,0) As int) + Cast(IsNull(i.bNoseconeCondition,0) As int) + Cast(IsNull(i.bGlueSealsIntact,0) As int) + Cast(IsNull(i.bLightPostCondition,0) As int) + Cast(IsNull(i.bModelAndLightPostInAlignment,0) As int) + Cast(IsNull(i.bLightPostAndTipAngleInAlignment,0) As int) = 0 Then 'P' Else 'F' End As BodyTest,
		Case When Cast(IsNull(i.bWindowIntactAndClear,0) As int) + Cast(IsNull(i.bNegativeLensIntactAndClear,0) As int) + Cast(IsNull(i.bObjectiveLensIntactAndSecure,0) As int) = 0 Then 'P' Else 'F' End As ObjectiveTest,
		Case When Cast(IsNull(i.bColorOfLightTipAndPostAcceptable,0) As int) + Cast(IsNull(i.bFibersIntactAndNotLoose,0) As int) + Cast(IsNull(i.bFiberGlueIntactAndSealed,0) As int) = 0 Then 'P' Else 'F' End As LightFibersTest,
		Case When IsNull(bHotColdLeakTestPass,0) = 1 Then 'P' Else 'F' End As HotColdTest,
		Case When IsNull(bAutoclaveTestPass,0) = 1 Then 'P' Else 'F' End As AutoclaveTest,
		@LengthIn As LengthIn,
		i.nInsertionTubeLength,
		i.nInsertionTubeDiameter,
		'P' As FinalTest, 
		'Y' As ScopeIsUsable,
		di.sDistName1, di.sDistName2, r.dtDateOut, r.mComments AS mCommentsVisible, s.mComments, r.mCommentsHidden, d.bDisplayUAorNWT, IsNull(te.sTechInits, 'N/A'), IsNull(u.sUserFullName, 'N/A')
	From dbo.tblRepairInspection i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblDistributor di on (r.lDistributorKey = di.lDistributorKey)
		left join dbo.tblTechnicians te ON	i.lTechnicianKey = te.lTechnicianKey
		left join dbo.tblUsers u on (i.lUserKey = u.lUserKey)
	Where i.lRepairKey = @plRepairKey And lRepairInspectionType = 2

	Update @Results 
	Set sInsFinalPF = 'F', sInsScopeIsUsableYN = 'N' 
	Where	sInsImagePF = 'F' 
		Or sInsEyePiecePF = 'F' 
		Or sInsInsertionTubePF = 'F' 
		Or sInsAirWaterPF = 'F' 
		Or sInsVisionPF = 'F' 
		Or sInsLightFibersPF = 'F' 
		Or sInsHotColdLeakPF = 'F' 
		Or sInsAuxWaterPF = 'F'

	INSERT INTO @Details (lRepairKey, sItemDescription, sComments, sApproved, dblRepairPrice, sFixType, sProductID, sUAorNWT )
	SELECT	RT.lRepairKey, RI.sItemDescription, RT.sComments, ' ', 0, RT.sFixType, RI.sProductID, RT.sUAorNWT 
	FROM	dbo.tblRepairItemTran RT
				Join dbo.tblRepairItem RI ON RT.lRepairItemKey = RI.lRepairItemKey
	WHERE	RT.lRepairKey = @plRepairKey

	Select r.*, d.sItemDescription,
			d.sComments, 
			d.sApproved, 
			d.dblRepairPrice, 
			d.sFixType, 
			d.sProductID, 
			d.sUAorNWT,
			dbo.fn_FormatDate(r.dtDateOut, 'mmmm d, yyyy') As DateOutLong
	From @Results r join @Details d on (r.lRepairKey = d.lRepairKey)
	ORDER BY d.sItemDescription  
END
