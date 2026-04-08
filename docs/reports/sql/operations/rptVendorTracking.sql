CREATE PROCEDURE [dbo].[rptVendorTracking]
	(
		@psVendorName nvarchar(50) = '',
		@pdtStartDate datetime,
		@pdtEndDate datetime
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptVendorTracking @psVendorName='medi', @pdtStartDate='1/1/2015', @pdtEndDate='2/10/2015'

	Set @psVendorName = '%' + IsNull(@psVendorName,'') + '%'
	Set @pdtStartDate=Convert(Date,@pdtStartDate)
	Set @pdtEndDate=Convert(Date,@pdtEndDate) 

	SELECT v.sSupplierName1 As sVendName1, i.sScopeTypeDesc, i.sSerialNumber, r.dblOutSourceCost, --r.sOutSourceReason AS Expr1, 
			i.dblTranAmount, c.sClientName1, dbo.fn_FormatDate(r.dtDateIn,'MM/dd/yyyy') As dtDateIn, dbo.fn_FormatDate(i.dtTranDate,'MM/dd/yyyy') as dtTranDate, i.sTranNumber
	FROM tblClient c JOIN tblInvoice i ON c.lClientKey = i.lClientKey 
		JOIN tblRepair r ON i.lRepairKey = r.lRepairKey
		--JOIN tblVendor v ON r.lVendorKey = v.lVendorKey
		Join tblSupplier v on (r.lVendorKey = v.lSupplierKey)
	WHERE v.sSupplierName1 Like @psVendorName AND i.dtTranDate >=@pdtStartDate And i.dtTranDate<DateAdd(day,1,@pdtEndDate) And IsNull(r.lVendorKey,0)<>0
	ORDER BY i.dtTranDate
END
