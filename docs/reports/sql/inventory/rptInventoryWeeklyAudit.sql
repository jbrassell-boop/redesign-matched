CREATE PROCEDURE [dbo].[rptInventoryWeeklyAudit]
	(
		@psInstrumentType nvarchar(1) = null,
		@pnMinUnitCost decimal(10,2) = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptInventoryWeeklyAudit 'F',500

	Create Table #Suppliers
		(
			lInventorySizeKey int,
			QtyPerUnit int
		)

	Insert Into #Suppliers ( lInventorySizeKey, QtyPerUnit ) 
	Select ss.lInventorySizeKey, Max(Case When IsNull(ss.nQtyPerUnit,0)=0 Then 1 Else IsNull(ss.nQtyPerUnit,0) End) As QtyPerUnit
	From tblSupplierSizes ss join tblSupplier s on (ss.lSupplierKey=s.lSupplierKey)
		Left Join (
					Select ss.lSupplierKey, Max(po.dtDateOfPO) As LastPODate
					From tblSupplierPOTran pot join tblSupplierSizes ss on (pot.lSupplierSizesKey=ss.lSupplierSizesKey) 
						join tblSupplierPO po on (pot.lSupplierPOKey=po.lSupplierPOKey)
					Where ss.lInventorySizeKey=891
					Group By ss.lSupplierKey
				) po on (s.lSupplierKey=po.lSupplierKey)
	Where	s.bActive = 1 
	Group By ss.lInventorySizeKey

	Create Index idx On #Suppliers ( lInventorySizeKey ASC )

	Select i.sItemDescription, ivs.sSizeDescription, 
		Case ivs.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'C' then 'Camera'
			When 'I' Then 'Instrument'
			Else ivs.sRigidOrFlexible
		End As sInstrumentType, ivs.nLevelCurrent, ivs.nLevelMaximum, ivs.sBinNumber
	From dbo.tblInventory i join dbo.tblInventorySize ivs on (i.lInventoryKey = ivs.lInventoryKey)
		left join #Suppliers s on (ivs.lInventorySizeKey=s.lInventorySizeKey)
	Where i.bActive = 1 And ISNULL(ivs.sStatus,'') Not In ('Inactive','Static')
		--And ((ivs.dblUnitCost >= @pnMinUnitCost) Or (ivs.bIncludeInWeeklyAudit=1))
		And ((Round(Case When IsNull(ivs.nLevelCurrent,0.)<0 Then 0 Else IsNull(ivs.nLevelCurrent,0.) End / Cast(IsNull(s.QtyPerUnit,1) As Decimal(10,2)) * IsNull(ivs.dblUnitCost,0.),2) >= @pnMinUnitCost) Or (ivs.bIncludeInWeeklyAudit=1))
		And ((ISNULL(@psInstrumentType,'')='') Or (ivs.sRigidOrFlexible=@psInstrumentType))
	Order By i.sItemDescription, ivs.sSizeDescription

END


