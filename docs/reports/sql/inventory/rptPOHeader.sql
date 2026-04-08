CREATE PROCEDURE dbo.rptPOHeader
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plSupplierPOKey int,
		@psRequestor nvarchar(50)
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lCompanyKey int
	If DB_NAME() = 'WinScopeNet'
		Set @lCompanyKey = 2
	else
		Set @lCompanyKey = 1

	Declare @lBarCodeKey int
	Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='PO Received'
	
    INSERT INTO tblRptPOHdr 
		(	lSupplierPOKey, lSessionID, sSessionTime, lSupplierKey, sSupplierPONumber, dtDateOfPO, 
		   sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, 
		   sCompanyPhoneVoice, sCompanyPhoneFAX, 
		   sSupplierName1, sSupplierName2, dblOrderMinimum, dblPOTotal, 
		   sMailAddr1, sMailAddr2, sMailCity, sMailState, sMailZip, 
		   sContactLast, sContactFirst, sContactPhoneVoice, sContactPhoneFAX, sContactEMail, Requestor, sEmailFlag, sEmailAddress, sEmailAddress2, sEmailDateTime,
		   RemittAddr1, RemittAddr2, RemittCity, RemittState, RemittZip, sBarCode
		)
	SELECT PO.lSupplierPOKey, @plSessionID, @psSessionTime, SU.lSupplierKey, PO.sSupplierPONumber, PO.dtDateOfPO, 
		   CO.sCompanyName1, CO.sCompanyName2, CO.sCompanyAddr1, CO.sCompanyAddr2, CO.sCompanyCity, CO.sCompanyState, CO.sCompanyZip, 
		   CO.sCompanyPhoneVoice, CO.sCompanyPhoneFAX, 
		   SU.sSupplierName1, SU.sSupplierName2, PO.dblOrderMinimum, PO.dblPOTotal, 
		   SU.sMailAddr1, SU.sMailAddr2, SU.sMailCity, SU.sMailState, SU.sMailZip, 
		   SU.sContactLast, SU.sContactFirst, SU.sPhoneVoice, SU.sPhoneFAX, SU.sContactEMail, @psRequestor, PO.sEmailFlag, PO.sEmailAddress, PO.sEmailAddress2, dbo.fn_FormatDate(Cast(PO.dtEmailDateTime As datetime),'DateTime'),
		   co.RemittAddr1, co.RemittAddr2, co.RemittCity, co.RemittState, co.RemittZip,
		   '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plSupplierPOKey as varchar(15)) + '*' 
	  FROM tblSupplier SU, tblSupplierPO PO, tblCompany CO
	 WHERE PO.lSupplierPOKey = @plSupplierPOKey
	   AND PO.lSupplierKey = SU.lSupplierKey 
	   AND CO.lCompanyKey = @lCompanyKey
END
