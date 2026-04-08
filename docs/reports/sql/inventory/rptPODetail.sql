CREATE PROCEDURE [dbo].[rptPODetail]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plSupplierPOKey int,
		@pbIncludeAdditionalText bit = 1
	)
AS
BEGIN
	SET NOCOUNT ON;
	
	Declare @lSupplierKey int
	Declare @sAdditionalText nvarchar(100) 
	Declare @nAdditonalCost decimal(10,2)
	Declare @bIncludePartNumberInPODescription bit

	Select @lSupplierKey = lSupplierKey From dbo.tblSupplierPO Where lSupplierPOKey = @plSupplierPOKey
	Select @sAdditionalText = s.sAdditionalPODescription, @nAdditonalCost = s.nAdditionalPODescriptionCostPerUnit, @bIncludePartNumberInPODescription = s.bIncludePartNumberInPODescription 
	From dbo.tblSupplier s Where s.lSupplierKey = @lSupplierKey

	if @pbIncludeAdditionalText = 0
		Set @sAdditionalText = ''


	Set @sAdditionalText = LTrim(RTrim(ISNULL(@sAdditionalText,'')))

	Insert Into tblRptPODtl ( lSupplierPOKey, lSupplierPOTranKey, lSessionID, sSessionTime, lSupplierKey, lInventoryKey, lInventorySizeKey, lSupplierSizesKey, 
		sSupplierPartNo, sItemDescription, sSizeDescription, dblUnitCost, nOrderQuantity, dblItemCost )
	Select pot.lSupplierPOKey, pot.lSupplierPOTranKey, @plSessionID, @psSessionTime, PO.lSupplierKey, ivs.lInventoryKey, ivs.lInventorySizeKey, SS.lSupplierSizesKey, 
		Case When ISNULL(s.bShowVendorSKUOnPO,0)=1 Then ss.sVendorSKU Else ss.sSupplierPartNo End, 
		Case When ISNULL(s.bIncludePartNumberInPODescription,0)=1 Then Cast(ss.sSupplierPartNo as varchar(50)) + ' - ' Else '' End + i.sItemDescription As sItemDescription,
		Case When ivs.lInventoryKey=5042 Then '<span style=''font-size:8px;''>' + 'For Internal Use Only: ' + ISNULL(ivs.sSizeDescription2,'') + '</span><br>' Else '' End + 
		ivs.sSizeDescription + Case When @sAdditionalText = '' Then '' Else '<br>' + @sAdditionalText End + '<br>',
		pot.dblUnitCost, 
		pot.nOrderQuantity, 
		pot.dblItemCost
	From dbo.tblSupplierPO po join dbo.tblSupplierPOTran pot on (po.lSupplierPOKey = pot.lSupplierPOKey)
		join dbo.tblSupplier s on (po.lSupplierKey = s.lSupplierKey)
		join dbo.tblSupplierSizes ss on (pot.lSupplierSizesKey = ss.lSupplierSizesKey)
		join dbo.tblInventorySize ivs on (ss.lInventorySizeKey = ivs.lInventorySizeKey)
		join dbo.tblInventory i on (ivs.lInventoryKey = i.lInventoryKey)
	Where po.lSupplierPOKey = @plSupplierPOKey
END



