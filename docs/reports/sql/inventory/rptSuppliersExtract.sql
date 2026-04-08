CREATE PROCEDURE dbo.rptSuppliersExtract
	
AS
BEGIN
	SET NOCOUNT ON;

	Create Table #Suppliers
		(
			lSupplierKey int,
			sSupplierName1 nvarchar(300),
			sSupplierName2 nvarchar(300),
			sStatus nvarchar(50),
			sAddressLine1 nvarchar(300),
			sAddressLine2 nvarchar(300),
			sCity nvarchar(300),
			sState nvarchar(50),
			sZipCode nvarchar(50),
			sPhoneNumber nvarchar(50),
			sFaxNumber nvarchar(50),
			sBillEmail nvarchar(300),
			sBillEmailName nvarchar(300),
			PartsVendor nvarchar(1),
			RepairVendor nvarchar(1),
			AcquisitionVendor nvarchar(1),
			CartsVendor nvarchar(1)
		)

	Insert Into #Suppliers ( lSupplierKey, sSupplierName1, sSupplierName2, sStatus, sAddressLine1, sAddressLine2, sCity, sState, sZipCode, sPhoneNumber, sFaxNumber, sBillEmail, sBillEmailName )
	Select s.lSupplierKey, s.sSupplierName1, s.sSupplierName2, Case When ISNULL(s.bActive,0)=1 Then 'Active' Else 'Inactive' End, s.sMailAddr1, sMailAddr2, s.sMailCity, s.sMailState, s.sMailZip, s.sPhoneVoice, s.sPhoneFAX, s.sBillEmail, s.sBillEmailName
	From dbo.tblSupplier s 

	Update s Set PartsVendor = 'X' From #Suppliers s join dbo.tblSupplierRoles r on (s.lSupplierKey = r.lSupplierKey) Where r.lSupplierRoleKey = 1
	Update s Set RepairVendor = 'X' From #Suppliers s join dbo.tblSupplierRoles r on (s.lSupplierKey = r.lSupplierKey) Where r.lSupplierRoleKey = 2
	Update s Set AcquisitionVendor = 'X' From #Suppliers s join dbo.tblSupplierRoles r on (s.lSupplierKey = r.lSupplierKey) Where r.lSupplierRoleKey = 3
	Update s Set CartsVendor= 'X' From #Suppliers s join dbo.tblSupplierRoles r on (s.lSupplierKey = r.lSupplierKey) Where r.lSupplierRoleKey = 4
 
	Select * From #Suppliers s Order By s.sSupplierName1, s.sSupplierName2

	Drop Table #Suppliers
END
