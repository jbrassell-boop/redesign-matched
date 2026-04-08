
CREATE PROCEDURE [dbo].[spRptFnlIns]
	@plRepairKey		INTEGER,
	@plSessionID		INTEGER,
	@psSessionTime		VARCHAR(20),
	@pbBlankInspection	bit 
AS
BEGIN
	Delete From dbo.tblRptFnlInsHdr Where lSessionID = @plSessionID
	Delete From dbo.tblRptFnlInsDtl Where lSessionID = @plSessionID

	Declare @sWorkOrderNumber nvarchar(50)
	Declare @lScopeTypeKey int
	Select @lScopeTypeKey = s.lScopeTypeKey, @sWorkOrderNumber = r.sWorkOrderNumber From tblRepair r join tblScope s on (r.lScopeKey=s.lScopeKey) Where r.lRepairKey=@plRepairKey

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Declare @lBarCodeKey int
	Declare @lBarCode2Key int
	Declare @sFlags nvarchar(MAX)

	If @pbBlankInspection=1
		Begin
			Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Blank Inspection'
			Select @lBarCode2Key=lBarCodeKey From tblBarCodeTypes Where sBarCode = 'Blank Inspection 2'
			Set @sFlags = dbo.fn_flagsGetForPaperwork(@plRepairKey,2)
		End
	Else
		Begin
			Set @lBarCodeKey=0
			Set @lBarCode2Key=0
			Set @sFlags = ''
		End


	BEGIN TRY
		SET	NOCOUNT ON

		INSERT INTO tblRptFnlInsHdr 
			(	lRepairKey, lFriendRepairKey, lSessionID, sSessionTime, sClientName1, sClientName2, sComplaintDesc, 
				sWorkOrderNumber, dtExpDelDate, dtDateOut, 
				sAngInLeft, sAngOutLeft, sAngInRight, sAngOutRight, 
				sAngInUp, sAngOutUp, sAngInDown, sAngOutDown, sNumOfUses, 
				sPurchaseOrder, sSerialNumber, sScopeTypeDesc, 
				sAngLeft, sAngRight, sAngUp, sAngDown, sBrokenFibersIn, sBrokenFibersOut, 
				sInsLeakPF, sInsFogPF, sInsAirWaterPF, sInsSuctionPF, sInsImagePF, sInsAngulationPF, 
				sIncludesETOCapYN, sIncludesCO2CapYN, sIncludesBioCapYN, sIncludesAirWaterValveYN, sIncludesWaterProofCapYN, 
				sIncludesHoodYN, sIncludesSuctionValveYN, sInsFinalPF, sInsScopeIsUsableYN, sInitTech, sInitInsptr, 
				sDistName1, sDistName2, mCommentsVisible, mCommentsRolling, mCommentsBlind, 
				sInsOpticsAnglePF, sInsOpticsFieldPF, sInsOpticsResolutionPF, sInsFiberAnglePF, sInsFiberLightTransPF, 
				sInsHotColdLeakPF, sInsFocalDistancePF, sInsVisionPF, sInsInsertionTubePF, sInsEyePiecePF, sInsLightFibersPF, 
				sIncludesBoxYN, sIncludesCaseYN, sRackPosition, nLengthIn, nLengthOut, nVideoAdjSetting, nCountConnectors, 
				sLengthSpec, sRigidOrFlexible, sInsAlcoholWipePF, sInsCamLensCleanedPF, sInsCamFocusPF, sInsCamWhiteBalancePF, 
				sInsCamControlButtonsPF, sInsCamCableConnectorPF, sInsCamVideoAppearancePF, sInsCamSoakCapAssemblyPF, 
				sInsCoupLeakPF, sInsCoupLensCleanedPF, sInsCoupFocusPF, sInsCoupFogPF, sInsCoupFocusMechPF, 
				sInsCoupScopeRetainingMechPF, sIncludesCamCouplerYN, sIncludesCamSoakCapYN, sIncludesCamEdgeCardProtYN, 
				sDispProductID, sPS3, sPS3Out, sInsCamCablePF, sInsCamEdgeCardProtectorPF, sInsForcepChannelPF, sInsAuxWaterPF,
				sBRJigSize, bDisplayUAorNWT, sInsImageCentrationPF, sBarCode, sBarCode2, sAutoclaveable,
				sCompanyName1, sCompanyPhoneVOICE, nMaxEpoxySize, sPackageType, sIncludesLightPostAdapterYN
			)
		SELECT	RE.lRepairKey, RE.lFriendRepairKey, @plSessionID, @psSessionTime, CL.sClientName1, CL.sClientName2, RE.sComplaintDesc, 
				RE.sWorkOrderNumber, RE.dtExpDelDate, RE.dtDateOut, 
				RE.sAngInLeft, RE.sAngOutLeft, RE.sAngInRight, RE.sAngOutRight, 
				RE.sAngInUp, RE.sAngOutUp, RE.sAngInDown, RE.sAngOutDown, RE.sNumOfUses, 
				RE.sPurchaseOrder, SC.sSerialNumber, ST.sScopeTypeDesc, 
				ST.sAngLeft, ST.sAngRight, ST.sAngUp, ST.sAngDown, RE.sBrokenFibersIn, RE.sBrokenFibersOut, 
				RE.sInsLeakPF, RE.sInsFogPF, RE.sInsAirWaterPF, RE.sInsSuctionPF, RE.sInsImagePF, RE.sInsAngulationPF, 
				RE.sIncludesETOCapYN, RE.sIncludesCO2CapYN, RE.sIncludesBioCapYN, RE.sIncludesAirWaterValveYN, 
				RE.sIncludesWaterProofCapYN, RE.sIncludesHoodYN, RE.sIncludesSuctionValveYN, RE.sInsFinalPF, 
				RE.sInsScopeIsUsableYN, 
				IsNull(TE.sTechInits, 'N/A'), 
				IsNull(T1.sTechInits, 'N/A'), 
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
				RE.sInsCamEdgeCardProtectorPF, RE.sInsForcepChannelPF, RE.sInsAuxWaterPF, RE.sBRJigSize, DE.bDisplayUAorNWT, RE.sInsImageCentrationPF,
				Case 
					When @pbBlankInspection=1 Then 
						--'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(re.lRepairKey as varchar(15)) + '.' + re.sWorkOrderNumber + '*' 
						'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(re.lRepairKey as varchar(15)) + '*' 
					Else ''
				End As sBarCode,
				Case
					When @pbBlankInspection=1 Then 
						'*' + Cast(IsNull(@lBarCode2Key,0) as varchar(5)) + '.' + Cast(re.lRepairKey as varchar(15)) + '*' 
					Else ''
				End As sBarCode2,
				Case When IsNull(ST.bAutoclaveable,0) = 0 Then 'N' Else 'Y' End ,
				co.sCompanyName1, co.sCompanyPhoneFAX, st.nEpoxySizeDistal,
				pt.sPackageType, ISNULL(RE.sIncludesLightPostAdapterYN,'N')
		FROM	tblRepair RE WITH (NOLOCK)
				INNER JOIN	tblScope SC WITH (NOLOCK)
						ON	RE.lScopeKey = SC.lScopeKey
				INNER JOIN	tblScopeType ST WITH (NOLOCK)
						ON	SC.lScopeTypeKey = ST.lScopeTypeKey
				INNER JOIN	tblDepartment DE WITH (NOLOCK)
						ON	RE.lDepartmentKey = DE.lDepartmentKey
				INNER JOIN	tblClient CL WITH (NOLOCK)
						ON	CL.lClientKey = DE.lClientKey
				INNER JOIN	tblDistributor DI WITH (NOLOCK)
						ON	RE.lDistributorKey = DI.lDistributorKey
				INNER JOIN  tblCompany co on (DI.lCompanyKey=co.lCompanyKey)
				LEFT JOIN	tblTechnicians TE WITH (NOLOCK)
						ON	RE.lTechnicianKey = TE.lTechnicianKey
				LEFT JOIN	tblTechnicians T1 WITH (NOLOCK)
						ON	RE.lInspectorKey = T1.lTechnicianKey
				left join dbo.tblPackageTypes pt on (RE.lPackageTypeKey = pt.lPackageTypeKey)
		WHERE RE.lRepairKey = @plRepairKey

		if @lDatabaseKey = 1 And SUBSTRING(@sWorkOrderNumber,1,1)='S'
			BEGIN
				--Update Techs
				Declare @sInspectorInits nvarchar(50)
				Declare @sTechInits nvarchar(50)

				Select @sInspectorInits = ISNULL(i.sTechInits,'N/A'), @sTechInits = ISNULL(t.sTechInits,'N/A')
				From dbo.tblRepair r left join dbo.tblTechnicians t on (r.lTechnicianKey = t.lTechnicianKey)
					left join dbo.tblTechnicians i on (r.lInspectorKey = i.lTechnicianKey)
				Where r.lRepairKey = @plRepairKey

				Update dbo.tblRptFnlInsHdr
				Set sInitTech = @sTechInits, sInitInsptr = @sInspectorInits
				Where lRepairKey = @plRepairKey And lSessionID = @plSessionID
			END


		UPDATE	RH
		SET		sFriendWorkOrderNumber	= RE.sWorkOrderNumber, 
				sFriendSerialNumber		= SC.sSerialNumber, 
				sFriendScopeTypeDesc	= ST.sScopeTypeDesc
		FROM	tblRptFnlInsHdr RH WITH (NOLOCK)
				INNER JOIN	tblRepair RE WITH (NOLOCK)
						ON	RH.lFriendRepairKey = RE.lRepairKey 
				INNER JOIN	tblScope SC WITH (NOLOCK)
						ON	RE.lScopeKey = SC.lScopeKey
				INNER JOIN	tblScopeType ST WITH (NOLOCK)
						ON	SC.lScopeTypeKey = ST.lScopeTypeKey
		WHERE	RH.lSessionID	= @plSessionID
		AND		RH.sSessionTime	= @psSessionTime

		
		Update tblRptFnlInsHdr
		Set mCommentsVisible = Case When @sFlags = '' Then mCommentsVisible
								Else	Case When ISNULL(mCommentsVisible,'')='' Then @sFlags Else ISNULL(mCommentsVisible,'') + nchar(13) + @sFlags End 
								End 
		Where lSessionID = @plSessionID And sSessionTime = @psSessionTime And lRepairKey = @plRepairKey
		

		Declare @nEpoxySizeProximal decimal(10,4)
		Declare @nEpoxySizeDistal decimal(10,4)
		Declare @lRepairItemKey int
		
		Select @lRepairItemKey = lRepairItemKey From tblRepairItem Where sItemDescription = 'Bending Rubber Replacement' And sRigidOrFlexible='F' And bActive=1
		Select @nEpoxySizeProximal = st.nEpoxySizeProximal, @nEpoxySizeDistal = st.nEpoxySizeDistal From tblScopeType st join tblScope s on (st.lScopeTypeKey=s.lScopeTypeKey)
			join tblRepair r on (s.lScopeKey=r.lScopeKey)
		Where r.lRepairKey = @plRepairKey

		If IsNull(@nEpoxySizeDistal,0)=0
			Begin
				--Get rolling average
				Select @nEpoxySizeDistal = AvgEpoxySize
				From dbo.fn_scopeTypeEpoxySizeRollingAvg(@lScopeTypeKey)
			End 

		INSERT INTO tblRptFnlInsDtl 
			(	lSessionID, sSessionTime, lRepairKey, sItemDescription, sComments, 
				sApproved, dblRepairPrice, sFixType, sProductID, sUAorNWT,
				nEpoxySizeProximal, nEpoxySizeDistal, sShowEpoxySizes, lRepairItemKey
			)
		SELECT	RH.lSessionID, RH.sSessionTime, RT.lRepairKey, 
				RI.sItemDescription, RT.sComments, ' ', 0, 
				RT.sFixType, RI.sProductID, RT.sUAorNWT,
				Case When rt.lRepairItemKey = @lRepairItemKey Then @nEpoxySizeProximal Else 0 End As EpoxySizeProximal,
				Case When rt.lRepairItemKey = @lRepairItemKey Then @nEpoxySizeDistal Else 0 End As EpoxySizeDistal,
				Case When rt.lRepairItemKey = @lRepairItemKey Then 'Y' Else 'N' End As ShowEpoxySizes,
				ri.lRepairItemKey
		FROM	tblRptFnlInsHdr RH WITH (NOLOCK)
				INNER JOIN	tblRepairItemTran RT WITH (NOLOCK)
						ON	RH.lRepairKey = RT.lRepairKey
				INNER JOIN	tblRepairItem RI WITH (NOLOCK)
						ON	RT.lRepairItemKey = RI.lRepairItemKey
		WHERE	RH.lSessionID	= @plSessionID 
		AND		RH.sSessionTime	= @psSessionTime
		--AND		RI.sItemDescription <> '!Disassembled & Inspected'
		AND		(@pbBlankInspection=0 Or RI.sItemDescription <> '!Disassembled & Inspected')

		INSERT INTO tblRptFnlInsDtl 
			(	lRepairKey, lSessionID, sSessionTime, sItemDescription, sComments, 
				sApproved, dblRepairPrice, sFixType, sProductID, sUAorNWT,
				nEpoxySizeProximal, nEpoxySizeDistal, sShowEpoxySizes, lRepairItemKey
			)
		SELECT	RT.lRepairKey, @plSessionID, @psSessionTime, RI.sItemDescription, 
				RT.sComments, RT.sApproved, RT.dblRepairPrice, 
				RT.sFixType, RI.sProductID, RT.sUAorNWT,
				Case When rt.lRepairItemKey = @lRepairItemKey Then @nEpoxySizeProximal Else 0 End As EpoxySizeProximal,
				Case When rt.lRepairItemKey = @lRepairItemKey Then @nEpoxySizeDistal Else 0 End As EpoxySizeDistal,
				Case When rt.lRepairItemKey = @lRepairItemKey Then 'Y' Else 'N' End As ShowEpoxySizes,
				ri.lRepairItemKey
		FROM	tblRepairItemTran RT
				INNER JOIN	tblRepairItem RI
						ON	RT.lRepairItemKey = RI.lRepairItemKey
		WHERE	RT.lRepairKey = @plRepairKey
		AND		RT.sApproved = 'Y'
		AND		(@pbBlankInspection=0 Or RI.sItemDescription <> '!Disassembled & Inspected')
		

		Create Table #Detail
			(
				lRepairItemKey int,
				sItemDescription nvarchar(300),
				sApproved nvarchar(1),
				lDisplayOrder int,
				IsParent int,
				lDisplayOrderOrig int,
				lParentRepairItemKey int
			)

		INSERT INTO #Detail ( lRepairItemKey, sItemDescription, sApproved )
		SELECT	RI.lRepairItemKey, RI.sItemDescription, ' '
		FROM	tblRepairItemTran RT INNER JOIN	tblRepairItem RI ON	RT.lRepairItemKey = RI.lRepairItemKey
		WHERE	rt.lRepairKey = @plRepairKey AND (@pbBlankInspection=0 Or RI.sItemDescription <> '!Disassembled & Inspected')

		INSERT INTO #Detail ( lRepairItemKey, sItemDescription, sApproved )
		SELECT	RT.lRepairItemKey, RI.sItemDescription, RT.sApproved
		FROM	tblRepairItemTran RT INNER JOIN	tblRepairItem RI ON	RT.lRepairItemKey = RI.lRepairItemKey
		WHERE	RT.lRepairKey = @plRepairKey AND RT.sApproved = 'Y' AND (@pbBlankInspection=0 Or RI.sItemDescription <> '!Disassembled & Inspected')

		Update r 
		Set lDisplayOrder = a.RowNum, lDisplayOrderOrig = a.RowNum, lParentRepairItemKey = r.lRepairItemKey
		From #Detail r join 
			(	Select sItemDescription, ROW_NUMBER() OVER (Order By Case When sItemDescription Like '%!Diagnostic Inspection%' Then 1 When sItemDescription Like '%!Disassembled%' Then 2 Else 3 End, sItemDescription) As RowNum 
				From #Detail 
			) a on (r.sItemDescription = a.sItemDescription)

		--Change sort order for implied items
		Update c
		Set lDisplayOrder = p.lDisplayOrder, IsParent = 2, sItemDescription = ' ' + ISNULL(c.sItemDescription,''),
			lParentRepairItemKey = p.lRepairItemKey
		From #Detail p join dbo.fn_ImpliedRepairItemsAll() a on (p.lRepairItemKey = a.lRepairItemParentKey) 
			join #Detail c on (a.lRepairItemChildKey = c.lRepairItemKey) And (p.sApproved = c.sApproved)

		Declare @MissingParents Table
			(
				lDisplayOrder int
			)

		Insert Into @MissingParents ( lDisplayOrder ) 
		Select r.lDisplayOrder From #Detail r left join 
		(
			Select a.lDisplayOrder From #Detail r join (Select lDisplayOrder From #Detail Group By lDisplayOrder) a on (r.lDisplayOrder=a.lDisplayOrder)
			Where ISNULL(r.IsParent,0)=0
		) a on (r.lDisplayOrder=a.lDisplayOrder) 
		Where a.lDisplayOrder Is Null
		Group By r.lDisplayOrder

		Declare @cnt int
		Select @cnt = Count(*) From @MissingParents
		Declare @i int

		Set @i = 1
		While @cnt > 0
			BEGIN
				Update c
				Set lDisplayOrder = p.lDisplayOrder
				From #Detail c join @MissingParents m on (c.lDisplayOrder = m.lDisplayOrder)
					join #Detail p on (m.lDisplayOrder = p.lDisplayOrderOrig)

				Delete From @MissingParents
				Insert Into @MissingParents ( lDisplayOrder ) 
				Select r.lDisplayOrder From #Detail r left join 
				(
					Select a.lDisplayOrder From #Detail r join (Select lDisplayOrder From #Detail Group By lDisplayOrder) a on (r.lDisplayOrder=a.lDisplayOrder)
					Where ISNULL(r.IsParent,0)=0
				) a on (r.lDisplayOrder=a.lDisplayOrder) 
				Where a.lDisplayOrder Is Null
				Group By r.lDisplayOrder

				Select @cnt = Count(*) From @MissingParents

				Set @i = @i + 1
				If @i = 5
					Set @cnt = 0
			END


		Update d
		Set lDisplayOrder = de.lDisplayOrder, IsParent = de.IsParent, sItemDescription = de.sItemDescription
		From dbo.tblRptFnlInsDtl d join #Detail de on (d.lRepairItemKey = de.lRepairItemKey) And (d.sApproved = de.sApproved)
		Where d.lRepairKey = @plRepairKey And d.lSessionID = @plSessionID And d.sSessionTime = @psSessionTime 

		Drop Table #Detail
	END TRY
	BEGIN CATCH
		DECLARE @lsReturnValue		VARCHAR(4000)
		SET	@lsReturnValue = dbo.udfErrorSpecs()
		RAISERROR (@lsReturnValue, 16, 1)
	END CATCH
END
