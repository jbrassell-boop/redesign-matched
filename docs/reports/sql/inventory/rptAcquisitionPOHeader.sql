CREATE PROCEDURE [dbo].[rptAcquisitionPOHeader]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plAcquisitionSupplierPOKey int,
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
	Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Acquisition PO Received'
	
    INSERT INTO tblRptPOHdr 
		(	lSupplierPOKey, lSessionID, sSessionTime, lSupplierKey, sSupplierPONumber, dtDateOfPO, 
		   sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, 
		   sCompanyPhoneVoice, sCompanyPhoneFAX, 
		   sSupplierName1, sSupplierName2, dblPOTotal, 
		   sMailAddr1, sMailAddr2, sMailCity, sMailState, sMailZip, 
		   sContactLast, sContactFirst, sContactPhoneVoice, sContactPhoneFAX, sContactEMail, Requestor, sEmailFlag, sEmailAddress, sEmailAddress2, sEmailDateTime,
		   RemittAddr1, RemittAddr2, RemittCity, RemittState, RemittZip, sBarCode
		)
	SELECT PO.lAcquisitionSupplierPOKey, @plSessionID, @psSessionTime, SU.lSupplierKey, PO.sSupplierPONumber, PO.dtDateOfPO, 
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailName1 Else CO.sCompanyName1 End As sCompanyName1,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailName2 Else CO.sCompanyName2 End As sCompanyName2,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailAddr1 Else CO.sCompanyAddr1 End As sCompanyAddr1,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailAddr2 Else CO.sCompanyAddr2 End As sCompanyAddr2,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailCity Else CO.sCompanyCity End As sCompanyCity,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailState Else CO.sCompanyState End As sCompanyState,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sMailZip Else CO.sCompanyZip End As sCompanyZip,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sPhone Else CO.sCompanyPhoneVoice End As sCompanyPhoneVoice,
		   Case When IsNull(PO.bAddressOverride,0) = 1 Then po.sFax Else CO.sCompanyPhoneFAX End As sCompanyPhoneFAX,
		   
		   --CO.sCompanyName1, CO.sCompanyName2, CO.sCompanyAddr1, CO.sCompanyAddr2, CO.sCompanyCity, CO.sCompanyState, CO.sCompanyZip, 
		   --CO.sCompanyPhoneVoice, CO.sCompanyPhoneFAX, 
		   
		   SU.sSupplierName1, SU.sSupplierName2, PO.dblPOTotal, 
		   SU.sMailAddr1, SU.sMailAddr2, SU.sMailCity, SU.sMailState, SU.sMailZip, 
		   SU.sContactLast, SU.sContactFirst, SU.sPhoneVoice, SU.sPhoneFAX, SU.sContactEMail, @psRequestor, PO.sEmailFlag, PO.sEmailAddress, PO.sEmailAddress2, dbo.fn_FormatDate(Cast(PO.dtEmailDateTime As datetime),'DateTime'),
		   co.RemittAddr1, co.RemittAddr2, co.RemittCity, co.RemittState, co.RemittZip,
		   '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plAcquisitionSupplierPOKey as varchar(15)) + '*' 
	  FROM tblSupplier SU, tblAcquisitionSupplierPO PO, tblCompany CO
	 WHERE PO.lAcquisitionSupplierPOKey = @plAcquisitionSupplierPOKey
	   AND PO.lSupplierKey = SU.lSupplierKey 
	   AND CO.lCompanyKey = @lCompanyKey
END
