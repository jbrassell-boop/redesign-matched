CREATE PROCEDURE dbo.rptSupplierInventorySizePricing
	(
		@plSupplierKey int,
		@plInventoryKey int,
		@plInventoryPricingListKey int
	)
AS
BEGIN
	SET NOCOUNT ON;


	Set @plSupplierKey = 1112
	Set @plInventoryKey = 5042
	Set @plInventoryPricingListKey = 1

	Select ivs.sSizeDescription2, ivs.sSizeDescription, ivs.sSizeDescription3, ivs.dblUnitCost, ss.sSupplierPartNo, ss.dblUnitCost, a.nUnitCost
	From dbo.tblInventorySize ivs join dbo.tblSupplierSizes ss on (ivs.lInventorySizeKey = ss.lInventorySizeKey)
		left join (Select * from dbo.tblInventoryPricingListDetails Where lInventoryPricingListKey = @plInventoryPricingListKey) a on (ivs.lInventorySizeKey=a.lInventorySizeKey)
	Where ivs.lInventoryKey = @plInventoryKey And ss.lSupplierKey = @plSupplierKey
		And ivs.sStatus <> 'Inactive'
		And ss.bActive = 1
	Order By ivs.sSizeDescription, ivs.sSizeDescription2
END
