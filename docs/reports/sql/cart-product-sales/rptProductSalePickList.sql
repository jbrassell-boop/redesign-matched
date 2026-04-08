CREATE PROCEDURE dbo.rptProductSalePickList
	(
		@plProductSaleKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptProductSalePickList 6

    Select ivs.sSizeDescription2, ivs.sSizeDescription, ivs.sSizeDescription3, ivs.sBinNumber, i.lQuantity
	From dbo.tblProductSalesInventory i join dbo.tblInventorySize ivs on (i.lInventorySizeKey = ivs.lInventorySizeKey)
	Where i.lProductSaleKey = @plProductSaleKey
	Group By ivs.sSizeDescription2, ivs.sSizeDescription, ivs.sSizeDescription3, ivs.sBinNumber, i.lQuantity
	Order By ivs.sSizeDescription, ivs.sSizeDescription3

END
