CREATE PROCEDURE [dbo].[rptDuplicatePartNumbers]
	(	
		@plSupplierKey int = 0,
		@psSupplierPartNo nvarchar(25) = ''
	)
AS
BEGIN
	SET NOCOUNT ON;
    
	--exec dbo.rptDuplicatePartNumbers @plSupplierKey=25, @psSupplierPartNo='03110285'

	Select a.sSupplierPartNo, a.lInventoryKey, a.lInventorySizeKey, a.sSupplierName1, a.sItemDescription, a.sSizeDescription, a.ItemActive, a.SizeActive, a.lSupplierSizesKey
	From (
			Select ss.lSupplierSizesKey, s.sSupplierName1, i.lInventoryKey, ivs.lInventorySizeKey, IsNull(i.sItemDescription,'') As sItemDescription, IsNull(ivs.sSizeDescription,'') As sSizeDescription, ss.sSupplierPartNo,
				ISNULL(i.bActive,0) As ItemActive, ISNULL(ivs.bActive,0) As SizeActive
			From tblSupplierSizes ss join tblSupplier s on (ss.lSupplierKey=s.lSupplierKey) 
				join (
						Select a.sSupplierPartNo, Count(a.sSupplierPartNo) As cnt
						From (
								Select i.lInventoryKey, IsNull(i.sItemDescription,'') As sItemDescription, IsNull(ivs.sSizeDescription,'') As sSizeDescription, ss.sSupplierPartNo
								From tblSupplierSizes ss join tblSupplier s on (ss.lSupplierKey=s.lSupplierKey) 
									left join tblInventorySize ivs on (ss.lInventorySizeKey=ivs.lInventorySizeKey)
									left join tblInventory i on (ivs.lInventoryKey=i.lInventoryKey)
								Where ISNULL(ss.sSupplierPartNo,'')<>''
								Group By i.lInventoryKey, IsNull(i.sItemDescription,''), IsNull(ivs.sSizeDescription,''), ss.sSupplierPartNo
							) a 
						Group By a.sSupplierPartNo
						Having Count(a.sSupplierPartNo) > 1
					) b on (ss.sSupplierPartNo = b.sSupplierPartNo)
				left join tblInventorySize ivs on (ss.lInventorySizeKey=ivs.lInventorySizeKey)
				left join tblInventory i on (ivs.lInventoryKey=i.lInventoryKey)
			Where	((@plSupplierKey=0) Or (s.lSupplierKey=@plSupplierKey))
				And ((@psSupplierPartNo='') Or (ss.sSupplierPartNo=@psSupplierPartNo))
		) a
	Order By a.sSupplierPartNo, a.sSupplierName1, a.sItemDescription, a.sSizeDescription
END
