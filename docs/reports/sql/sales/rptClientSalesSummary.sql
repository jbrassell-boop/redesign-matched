CREATE PROCEDURE [dbo].[rptClientSalesSummary]
	(
		@pdtFromDate date,
		@pdtToDate date,
		@psScopes nvarchar(max)
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptClientSalesSummary @pdtFromdate='1/1/2017', @pdtToDate='12/31/2017', @psScopes = '167816,169062,169367,169368,169579,169588,169891,169892,169893,170050,170177,170253,170521,170720,170772,170846,170878,171084,171162,171173,171174,171323,171672,172115,172265,172301,172838,172844,172912,173611,174324,174945,176372,177104,179460,179751,184212,185057,171112,171113,171114,171115,171116,171168,171231,171232,171233,171234,171346,173067,173458,181048'

	Create Table #Scopes
		(
			lScopeKey int
		)

	Insert Into #Scopes ( lScopeKey ) Select s.int_Value From dbo.ParseTxt2Tbl(@psScopes,',') s

	SELECT	i.sBillName1, i.sBillName2, i.sSerialNumber, i.sScopeTypeDesc, i.dtTranDate, i.sTranNumber, i.dblTranAmount, 			i.dblShippingAmt, r.sComplaintDesc, i.lScopeKey, i.lDepartmentKey, i.lClientKey, c.sClientName1, d.sDepartmentName, 			LTrim(Rtrim(IsNull(sr.sRepFirst,'') + ' ' + IsNull(sr.sRepLast,''))) As RepName	FROM	tblInvoice i join tblRepair r ON (i.lRepairKey = r.lRepairKey)				join #Scopes s on (r.lScopeKey = s.lScopeKey)				join tblDepartment d ON	(i.lDepartmentKey = d.lDepartmentKey)				join tblClient c ON	(d.lClientKey = c.lClientKey)				join tblSalesRep sr on (d.lSalesRepKey = sr.lSalesRepKey)	WHERE	i.dtTranDate >= @pdtFromDate AND i.dtTranDate <= @pdtToDate	Drop Table #ScopesEND




