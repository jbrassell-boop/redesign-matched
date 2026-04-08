CREATE PROCEDURE [dbo].[inventoryUsedReport]
	(
		@psInstrumentTypeKey nvarchar(1) = null,
		@pdtStartDate date,
		@pdtEndDate date,
		@plInventoryKey int = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	Set @pdtEndDate = DATEADD(day,1,@pdtEndDate)

	Create Table #Results
		(
			ID int identity(1,1),
			sInstrumentType nvarchar(50),
			sItemDescription nvarchar(300),
			sSizeDescription nvarchar(300),
			sScopeCategory nvarchar(100),
			sDiameter nvarchar(1),
			sModel nvarchar(300),
			nQuantityUsed decimal(10,2),
			dtDateLastUsed date
		)

	Insert Into #Results ( sInstrumentType, sItemDescription, sSizeDescription, sScopeCategory, sDiameter, sModel, nQuantityUsed, dtDateLastUsed ) 
	Select t.sInstrumentType, i.sItemDescription, ivs.sSizeDescription, 
		--sc.sItemText As ScopeCategory, 
		sc.sScopeTypeCategory,
	   Case When st.sRigidOrFlexible='F' Then
			Case IsNull(sc.bLargeDiameter,1)
				When 1 Then 'L'
				Else 'S'
			End
		Else '' End As DiameterSize, st.sScopeTypeDesc, SUM(-it.nTranQuantity) As Quantity, MAX(it.dtTranDate) As DateLastUsed
	from dbo.tblInventoryTran it join dbo.tblRepair r on (it.lRepairKey = r.lRepairKey)
		join tblInventorySize ivs on (it.lInventorySizeKey = ivs.lInventorySizeKey)
		join tblInventory i on (ivs.lInventoryKey = i.lInventoryKey)
		join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join tblInstrumentTypes t on (st.sRigidOrFlexible = t.sInstrumentTypeKey)
		--left join tblSystemCodes sc on (st.lScopeTypeCatKey = sc.lSystemCodesKey)	
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
	Where	((ISNULL(@psInstrumentTypeKey,'')='') Or (t.sInstrumentTypeKey = @psInstrumentTypeKey))
		And r.dtDateIn >= @pdtStartDate And r.dtDateIn < @pdtEndDate
		And ((@plInventoryKey = 0) Or (i.lInventoryKey = @plInventoryKey))
	Group By t.sInstrumentType, i.sItemDescription, ivs.sSizeDescription, 
		--sc.sItemText, 
		sc.sScopeTypeCategory,
		Case When st.sRigidOrFlexible='F' Then
			Case IsNull(sc.bLargeDiameter,1)
				When 1 Then 'L'
				Else 'S'
			End
		Else '' End, st.sScopeTypeDesc
	Order By t.sInstrumentType, sc.sScopeTypeCategory, Case When st.sRigidOrFlexible='F' Then
													Case IsNull(sc.bLargeDiameter,1)
														When 1 Then 'L'
														Else 'S'
													End
												Else '' End, i.sItemDescription, ivs.sSizeDescription

	Select * from #Results Order By ID
END
