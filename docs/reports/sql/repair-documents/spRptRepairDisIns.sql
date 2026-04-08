CREATE	PROCEDURE [dbo].[spRptRepairDisIns]
	@plRepairKey	INTEGER,
	@plSessionID	INTEGER,
	@psSessionTime	VARCHAR(20),
	@plUnderContract INT = 0,
	@pbBlankInspection bit = 0
AS
BEGIN
/*
	DECLARE	@plRepairKey	INT
	DECLARE	@plSessionID	INT
	DECLARE	@psSessionTime	INT
	SET		@plRepairKey	= 464506
	SET		@plSessionID	= 464506
	SET		@psSessionTime	= 464506
--*/

	Declare @lBarCodeKey int
	--Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='D&I'
	
	Declare @sFlags nvarchar(MAX) = ''
	
	if @pbBlankInspection = 1
		BEGIN
			Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Blank Inspection'
			Set @sFlags = dbo.fn_flagsGetForPaperwork(@plRepairKey,2)
		END
	else 
		BEGIN
			Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='D&I'
			Set @sFlags = dbo.fn_flagsGetForPaperwork(@plRepairKey,4)
		END
				
	Set @sFlags = ISNULL(@sFlags,'')
	
	INSERT	INTO tblRptDisInsHdr
		(	lRepairKey, lFriendRepairKey, lSessionID, sSessionTime, 
			sClientName1, sClientName2, sDepartmentName, 
			sWorkOrderNumber, sSerialNumber, sScopeTypeDesc, 
			sComplaintDesc, sDistName1, sDistName2, 
			sAngLeft, sAngRight, sAngUp, sAngDown, 
			sRackPosition, sIncludesCO2CapYN, sIncludesHoodYN, 
			sIncludesBioCapYN, sIncludesETOCapYN, sIncludesAirWaterValveYN, 
			sIncludesSuctionValveYN, sIncludesWaterProofCapYN, sIncludesBoxYN, 
			sIncludesCaseYN, nLengthIn, nLengthOut, sLengthSpec, sLoaner, 
			sIncludesCamera, sIncludesCamCoupler, sIncludesCamSoakCap, sIncludesCamEdgeCardProt,
			mComments, mCommentsDisIns, sBarCode, lInstrumentCount, sManufacturer,
			nMaxEpoxySize, sPackageType, sIncludesLightPostAdapterYN, lUnderContract
		)
	SELECT	RE.lRepairKey, RE.lFriendRepairKey, @plSessionID, @psSessionTime, 
			CL.sClientName1, CL.sClientName2, DE.sDepartmentName, 
			RE.sWorkOrderNumber, SC.sSerialNumber, ST.sScopeTypeDesc, 
			RE.sComplaintDesc, DI.sDistName1, DI.sDistName2, 
			ST.sAngLeft, ST.sAngRight, ST.sAngUp, ST.sAngDown, 
			RE.sRackPosition, RE.sIncludesCO2CapYN, RE.sIncludesHoodYN, 
			RE.sIncludesBioCapYN, RE.sIncludesETOCapYN, RE.sIncludesAirWaterValveYN, 
			RE.sIncludesSuctionValveYN, RE.sIncludesWaterProofCapYN, RE.sIncludesBoxYN, 
			RE.sIncludesCaseYN, RE.nLengthIn, nLengthOut, ST.sLengthSpec, 'N', 
			RE.sIncludesCameraYN, RE.sIncludesCamCouplerYN, RE.sIncludesCamSoakCapYN, RE.sIncludesCamEdgeCardProtYN,
			Case When Len(IsNull(Cast(RE.mCommentsDisins As nvarchar(max)),''))=0 Then ' ' Else IsNull(RE.mCommentsDisIns,'') End, 
			Case When Len(IsNull(Cast(SC.mCommentsDisins As nvarchar(max)),''))=0 Then ' ' Else IsNull(SC.mCommentsDisIns,'') End,
			--'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(re.lRepairKey as varchar(15)) + '.' + re.sWorkOrderNumber + '*' As sBarCode
			'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(re.lRepairKey as varchar(15)) + '*' As sBarCode,
			RE.lInstrumentCount, m.sManufacturer, st.nEpoxySizeDistal, pt.sPackageType, ISNULL(RE.sIncludesLightPostAdapterYN,'N'),
			@plUnderContract
	FROM	tblRepair RE WITH (NOLOCK)
			INNER JOIN	tblScope SC WITH (NOLOCK)
					ON	RE.lScopeKey = SC.lScopeKey
			INNER JOIN	tblDepartment DE WITH (NOLOCK)
					ON	RE.lDepartmentKey = DE.lDepartmentKey
			INNER JOIN	tblDistributor DI WITH (NOLOCK)
					ON	RE.lDistributorKey = DI.lDistributorKey
			INNER JOIN	tblClient CL WITH (NOLOCK)
					ON	CL.lClientKey = DE.lClientKey
			INNER JOIN	tblScopeType ST WITH (NOLOCK)
					ON	SC.lScopeTypeKey = ST.lScopeTypeKey
			LEFT JOIN tblManufacturers m on (ST.lManufacturerKey = m.lManufacturerKey)
			left join dbo.tblPackageTypes pt on (RE.lPackageTypeKey = pt.lPackageTypeKey)
	WHERE RE.lRepairKey = @plRepairKey

	Update tblRptDisInsHdr
	Set mCommentsDisIns = Case 
						When @sFlags = '' Then mCommentsDisIns
						Else	Case When ISNULL(mCommentsDisIns,'')='' Then @sFlags Else ISNULL(mCommentsDisIns,'') + nchar(13) + @sFlags End 
					End 
	Where lSessionID = @plSessionID And sSessionTime = @psSessionTime And lRepairKey = @plRepairKey

	Declare @cnt int
	Select @cnt = Count(*) From dbo.tblRptDisInsHdr h Where h.lRepairKey = @plRepairKey And h.lSessionID = @plSessionID And h.sSessionTime = @psSessionTime

	Select Case When @cnt = 0 Then 0 Else 1 End As RecExists
END

