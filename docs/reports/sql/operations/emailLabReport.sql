CREATE PROCEDURE [dbo].[emailLabReport]
AS
BEGIN
	SET NOCOUNT ON;
    
	--exec dbo.emailLabReport
	
	DECLARE @subject nvarchar(max)
	DECLARE @tableHTML nvarchar(max)
	Declare @emailHTML nvarchar(max)
	DECLARE @Table NVARCHAR(MAX) = N''
	
	Set @emailHTML = ''
	--Set @subject = 'Lab Report for ' + dbo.fn_FormatDate(GETDATE(),'mmm d, yyyy')

	
	SET @emailHTML = @emailHTML + N'<H2><font color="black">Open Inventory</H2>'

	Set @Table = ''
	Set @tableHTML = ''
		
						
	SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY sSupplierName1, po.dtDateOfPO))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="text-align:left; font-size: 10px;">' + IsNull(sSupplierName1,'') + '</td>' +
			'<td style="text-align:left; font-size: 10px;">' + ISNULL(sItemDescription,'') + '</td>' +
			'<td style="text-align:left; font-size: 10px;">' + IsNull(sSizeDescription,'') + '</td>' +
			'<td style="font-size: 10px;">' + Cast(IsNull(pot.nOrderQuantity,0) as nvarchar(50)) + '</td>' +
			'<td style="font-size: 10px;">' + Cast(IsNull(pot.nOrderQuantity,0) - IsNull(pot.nReceivedQuantity,0) as nvarchar(50)) + '</td>' +
			'<td style="text-align:right; font-size: 10px;">' + dbo.fn_FormatCurrency(Cast(IsNull(pot.dblUnitCost,0) as nvarchar(50))) + '</td>' +
			'<td style="text-align:right; font-size: 10px;">' + dbo.fn_FormatCurrency(Cast(IsNull(pot.dblItemCost,0) as nvarchar(50))) + '</td>' +
			'<td style="font-size: 10px;">' + IsNull(sSupplierPONumber,'') + '</td>' +
			'<td style="font-size: 10px;">' + dbo.fn_FormatDate(dtDateOfPO,'MM/dd/yyyy') + '</td>' +
			'<td style="font-size: 10px;">' + Case ISDATE(pot.dtEstimatedDeliveryDate)
													When 0 Then ''
													When 1 Then dbo.fn_FormatDate(pot.dtEstimatedDeliveryDate,'MM/dd/yyyy')
												End + '</td>' +
		'</tr>'
	From tblSupplierPOTran pot join tblSupplierPO po on (pot.lSupplierPOKey = po.lSupplierPOKey)
		join tblSupplier s on (po.lSupplierKey = s.lSupplierKey)
		join tblSupplierSizes ss on (pot.lSupplierSizesKey = ss.lSupplierSizesKey)
		join tblInventorySize ivs on (ss.lInventorySizeKey = ivs.lInventorySizeKey)
		join tblInventory i on (ivs.lInventoryKey = i.lInventoryKey)
	Where	po.bCancelled = 0 And 
			po.bGenerated = 1 And 
			pot.bActive = 1 And 
			IsNull(pot.nOrderQuantity,0)>ISNULL(pot.nReceivedQuantity,0)
			And s.bShowOnDashboard = 1
	Order By s.sSupplierName1, po.dtDateOfPO
	
	SET @tableHTML = 
		--N'<H4><font color="black">Open Inventory</H4>' +
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Supplier</th>
		<th style="padding-left:10px; padding-right:10px">Item Description</th>
		<th style="padding-left:10px; padding-right:10px">Size Description</th>
		<th style="padding-left:10px; padding-right:10px">Order Quantity</th>
		<th style="padding-left:10px; padding-right:10px">Outstanding Quantity</th>
		<th style="padding-left:10px; padding-right:10px">Unit Cost</th>
		<th style="padding-left:10px; padding-right:10px">Line Item Cost</th>
		<th style="padding-left:10px; padding-right:10px">PO Number</th>
		<th style="padding-left:10px; padding-right:10px">PO Date</th>
		<th style="padding-left:10px; padding-right:10px">Est. Delivery Date</th>
		</tr>' + @Table + N'</table>'

	Set @emailHTML = @emailHTML + @tableHTML

	Declare @DBName nvarchar(50)
	Set @DBName = DB_NAME()

	Declare @bTSI bit
	Set @bTSI = 1
	If UPPER(@DBName)='WINSCOPENETNASHVILLE'
		Set @bTSI = 0




	Declare @ProfileName nvarchar(50)

	If @@ServerName='SBLACK17R'		
		Set @ProfileName = 'Master Profile'
	Else
		Set @ProfileName = 'TSI Profile'

	Set @subject = 'Lab Report for ' + dbo.fn_FormatDate(GETDATE(),'mmm d, yyyy') + ' - ' + Case When @bTSI=1 Then 'North' Else 'South' End

	if @bTSI = 1
		BEGIN
			EXEC msdb.dbo.sp_send_dbmail @recipients='lab-tsi@totalscopeinc.com; dkennedy@totalscopeinc.com',
			--EXEC msdb.dbo.sp_send_dbmail @recipients='steve.black@brightlogix.com',
			@profile_name = @ProfileName,
			@subject = @subject,
			@body = @emailHTML,
			@body_format = 'HTML' ;
		END
	else
		BEGIN
			EXEC msdb.dbo.sp_send_dbmail @recipients='lab-tss@totalscopeinc.com; dkennedy@totalscopeinc.com; ceccles@totalscopeinc.com',
			--EXEC msdb.dbo.sp_send_dbmail @recipients='steve.black@brightlogix.com',
			@profile_name = @ProfileName,
			@subject = @subject,
			@body = @emailHTML,
			@body_format = 'HTML' ;
		END

	

END
