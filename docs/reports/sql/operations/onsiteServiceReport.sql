CREATE PROCEDURE [dbo].[onsiteServiceReport]
	(
		@plSiteServiceKey int,
		@pbInvoice bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.onsiteServiceReport 1, 1


	Declare @Table nvarchar(MAX)
	Declare @html nvarchar(MAX)

	Set @Table = ''
	Set @html = ''

	SELECT @Table = @Table +'<tr style="background-color:#FFFFFF; font-size: 9px;">' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(t.lTrayNumber,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(ISNULL(n.sTrayName,ISNULL(t.sTrayName,'Tray ' + Cast(t.lTrayNumber as varchar(10)))) As varchar(500))+ '</td>' +
			--'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(ISNULL(t.sTrayName,'Tray ' + Cast(t.lTrayNumber as varchar(10))) as varchar(150)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(t.lInstrumentsCount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(t.lInspected,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(t.lRepairedCount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(t.lSentToTSICount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(t.lBeyondEconomicalRepairCount,0) as varchar(10)) + '</td>' +
		'</tr>'
	From dbo.tblSiteServiceTrays t left join dbo.tblDepartmentSiteServiceTrayNames n on (t.lDepartmentSiteServiceTrayNameKey = n.lDepartmentSiteServiceTrayNameKey)
	Where t.lSiteServiceKey = @plSiteServiceKey
	Order By t.lTrayNumber

	--Add a footer with totals
	Declare @lInstrumentCount int
	Declare @lInspectedCount int
	Declare @lRepairedCount int
	Declare @lSentToTSICount int
	Declare @lBERCount int

	;WITH TOTALS As
		(
			Select SUM(t.lInstrumentsCount) As lInstrumentsCount, SUM(t.lInspected) As lInspected, SUM(t.lRepairedCount) As lRepairedCount, SUM(t.lSentToTSICount) As lSentToTSICount, SUM(t.lBeyondEconomicalRepairCount) As lBeyondEconomicalRepairCount
			From dbo.tblSiteServiceTrays t left join dbo.tblDepartmentSiteServiceTrayNames n on (t.lDepartmentSiteServiceTrayNameKey = n.lDepartmentSiteServiceTrayNameKey)
			Where t.lSiteServiceKey = @plSiteServiceKey
		)
	Select @lInstrumentCount = t.lInstrumentsCount, @lInspectedCount = t.lInspected, @lRepairedCount = t.lRepairedCount, @lSentToTSICount = t.lSentToTSICount, @lBERCount = t.lBeyondEconomicalRepairCount
	From TOTALS t
	---------------------------


	Set @Table = @Table +'<tr style="background-color:#FFFFFF; font-size: 9px;">' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;"></td>' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;"></td>' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(@lInstrumentCount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(@lInspectedCount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(@lRepairedCount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(@lSentToTSICount,0) as varchar(10)) + '</td>' +
			'<td align="center" style="text-align:center; font-size: 9px; font-weight: 700; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">' + Cast(IsNull(@lBERCount,0) as varchar(10)) + '</td>' +
		'</tr>'

	SET @html = 
		--N'<table border="1" cellpadding="2" cellspacing="0" style="width:100%; color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		'<font size="1">' + 
		--N'<table cellpadding="2" cellspacing="0" style="width:100%; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #A0A0A0;" >' +
		N'<table cellpadding="2" cellspacing="0" style="width:100%; border-collaspe:collapse; font-family:helvetica,sans-serif; border:0.25pt solid #000000;" >' +
		N'<tr style ="font-size: 9px;font-weight: normal;background: #FFFFFF;">
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">Tray</th>
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">Description</th>
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">Instruments</th>
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">Inspected</th>
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">Repaired</th>
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">Sent to TSI</th>
		<th style="padding-left:10px; padding-right:9px; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;">BER</th>
		</tr>' + @Table + N'</table></font>'


	Create Table #Results
		(
			sClientName1 nvarchar(300),
			sDepartmentName nvarchar(300),
			sAddressLine1 nvarchar(300),
			sCityStateZip nvarchar(300),
			sOnsiteDate nvarchar(50),
			sWorkOrderNumber nvarchar(50),
			sPurchaseOrder nvarchar(50),
			sMobileTech nvarchar(300),
			sTruckNumber nvarchar(50),
			sTotalTrays nvarchar(50),
			htmlServiceSummary nvarchar(MAX),
			sNotes nvarchar(MAX),
			sSubmitted nvarchar(1),
			sBarCode nvarchar(50),
			htmlBilling nvarchar(MAX),
			sSubTotal nvarchar(50),
			sTax nvarchar(50),
			sTotal nvarchar(50)
		)

	Insert Into #Results ( sClientName1, sDepartmentName, sAddressLine1, sCityStateZip, sOnsiteDate, sWorkOrderNumber, sPurchaseOrder, sMobileTech, sTruckNumber, sTotalTrays, htmlServiceSummary, sNotes, sSubmitted )
	Select c.sClientName1, d.sDepartmentName, LTrim(RTrim(ISNULL(s.sAddressLine1,'') + ' ' + ISNULL(s.sAddressLine2,''))) As sAddressLine1, 
		LTrim(RTrim(LTrim(Rtrim(ISNULL(s.sCity,'') + Case When ISNULL(s.sCity,'')='' Then '' Else ', ' End + ISNULL(s.sState,''))) + ' ' + ISNULL(s.sZipCode,''))) As sCityStateZip,
		dbo.fn_FormatDate(s.dtOnsiteDate,'mmmm d, yyyy') As sOnsiteDate, s.sWorkOrderNumber, s.sPurchaseOrder, t.sTechName, t.sOnsiteServiceTruckNumber, Cast(s.lTrayCount as varchar(10)), @html, s.sNotes,
		Case When s.dtDateSubmitted Is Null Then 'N' Else 'Y' End
	From dbo.tblSiteServices s join dbo.tblDepartment d on (s.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblTechnicians t on (s.lTechnicianKey = t.lTechnicianKey)
	Where s.lSiteServiceKey = @plSiteServiceKey

	if @pbInvoice = 1
		BEGIN
			Declare @lBarCodeKey int
			Declare @sBarCode nvarchar(50)

			Select @lBarCodeKey = lBarCodeKey from dbo.tblBarCodeTypes Where sBarCode = 'Site Service'
			Set @sBarCode = '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plSiteServiceKey as varchar(15)) + '*'

			Update #Results Set sBarCode = @sBarCode

			Declare @lBillType int
			Declare @sBillEmailName nvarchar(100)
			Declare @sBillEmailAddress nvarchar(500)
			Declare @sBillAddressLine1 nvarchar(300)
			Declare @sBillAddressLine2 nvarchar(300)
			Declare @sBillAddressLine3 nvarchar(300)
			Declare @sBillAddressLine4 nvarchar(300)
			Declare @sBillAddressLine5 nvarchar(300)
			declare @newline nvarchar(6) = '<br />'
			Declare @nSubTotal decimal(10,2)
			Declare @nTax decimal(10,2)

			Select	@sBillAddressLine1 = dbo.fn_GetAddressBlock(1,s.sBillName1, s.sBillName2, s.sBillAddressLine1, s.sBillAddressLine2, s.sBillCity, s.sBillState, s.sBillZipCode, 0, '', ''),
					@sBillAddressLine2 = dbo.fn_GetAddressBlock(2,s.sBillName1, s.sBillName2, s.sBillAddressLine1, s.sBillAddressLine2, s.sBillCity, s.sBillState, s.sBillZipCode, 0, '', ''),
					@sBillAddressLine3 = dbo.fn_GetAddressBlock(3,s.sBillName1, s.sBillName2, s.sBillAddressLine1, s.sBillAddressLine2, s.sBillCity, s.sBillState, s.sBillZipCode, 0, '', ''),
					@sBillAddressLine4 = dbo.fn_GetAddressBlock(4,s.sBillName1, s.sBillName2, s.sBillAddressLine1, s.sBillAddressLine2, s.sBillCity, s.sBillState, s.sBillZipCode, 0, '', ''),
					@sBillAddressLine5 = dbo.fn_GetAddressBlock(5,s.sBillName1, s.sBillName2, s.sBillAddressLine1, s.sBillAddressLine2, s.sBillCity, s.sBillState, s.sBillZipCode, 0, '', ''),
					@lBillType = s.lBillType, @sBillEmailName = s.sBillEmailName, @sBillEmailAddress = s.sBillEmail,
					@nSubTotal = s.nInvoiceAmount, @nTax = s.nTaxAmount
			From dbo.tblSiteServices s 
			Where s.lSiteServiceKey = @plSiteServiceKey

			Set @nSubTotal = ISNULL(@nSubTotal,0)
			Set @nTax = ISNULL(@nTax,0)

			Set @html = ''
			if @lBillType = 1 Or @lBillType = 3
				BEGIN
					Set @html = ISNULL(@sBillAddressLine1,'') + @newline
					if ISNULL(@sBillAddressLine2,'') <> '' 
						Set @html = @html + ISNULL(@sBillAddressLine2,'') + @newline
					if ISNULL(@sBillAddressLine3,'') <> '' 
						Set @html = @html + ISNULL(@sBillAddressLine3,'') + @newline
					if ISNULL(@sBillAddressLine4,'') <> '' 
						Set @html = @html + ISNULL(@sBillAddressLine4,'') + @newline
					if ISNULL(@sBillAddressLine5,'') <> '' 
						Set @html = @html + ISNULL(@sBillAddressLine5,'') + @newline
				END
			if @lBillType = 2 Or @lBillType = 3
				BEGIN
					Set @html = @html + ISNULL(@sBillEmailName,'') + @newline
					Set @html = @html + ISNULL(@sBillEmailAddress,'') + @newline
				END

			Update #Results 
			Set htmlBilling = @html, sSubTotal = dbo.fn_FormatCurrency(@nSubTotal), sTax = dbo.fn_FormatCurrency(@nTax), sTotal = dbo.fn_FormatCurrency(@nSubTotal + @nTax)
			--Update #Results Set sBillAddressLine1 = @sBillAddressLine1, sBillAddressLine2 = @sBillAddressLine2, sBillAddressLine3 = @sBillAddressLine3, sBillAddressLine4 = @sBillAddressLine4, sBillAddressLine5 = @sBillAddressLine5

			

			--SET @html = 
			--	N'<table align="left" cellpadding="2" cellspacing="0" style="width:100%; border-collaspe:collapse; font-family:arial,helvetica,sans-serif; border:0.25pt solid #000000;" >' +
			--	'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
			--		'<td align="right" style="border:0.25pt solid #000000; text-align:right; font-size: 10px; width: 75%;">SUB TOTAL :</td>' +
			--		'<td align="right" style="border:0.25pt solid #000000; text-align:right; font-size: 10px; width: 25%;">' + dbo.fn_FormatCurrency(@nSubTotal) + '</td>' +
			--	'</tr>' +
			--	'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
			--		'<td align="right" style="border:0.25pt solid #000000; text-align:right; font-size: 10px; width: 75%;">TAX :</td>' +
			--		'<td align="right" style="border:0.25pt solid #000000; text-align:right; font-size: 10px; width: 25%;">' + dbo.fn_FormatCurrency(@nTax) + '</td>' +
			--	'</tr>' +
			--	'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
			--		'<td align="right" style="border:0.25pt solid #000000; text-align:right; font-size: 10px; width: 75%;">TOTAL :</td>' +
			--		'<td align="right" style="border:0.25pt solid #000000; text-align:right; font-size: 10px; width: 25%;">' + dbo.fn_FormatCurrency(@nSubTotal + @nTax) + '</td>' +
			--	'</tr></table>'

			--Update #Results Set htmlFees = @html
		END

	Select * from #Results
	Drop Table #Results
END
