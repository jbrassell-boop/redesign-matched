CREATE PROCEDURE [dbo].[rptCartPackingList]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plRepairKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--dbo.rptCartPackingList @plSessionID=1, @psSessionTime='ABCD', @plRepairKey=10011869

	Delete From dbo.tblRptCartPackingSlip Where lSessionID = @plSessionID
	   	  
	Declare @lBarCodeKey int
	Set @lBarCodeKey = 22
	
	INSERT INTO tblRptCartPackingSlip ( lSessionID, sSessionTime, sTranNumber, sCompanyName1, sCompanyName2, lDepartmentKey, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
		sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip,   
		sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd,   
		sRepFirst, sRepLast, sScopeTypeDesc, sSerialNumber, dblShippingAmt, dblTranAmount, sUserFld1, sUserFld2, sUserFld3, sUserFld4, sPORequired, lBillType, 
		sBillEmail, sBillEmailName, lRepairItemKey, sItemDescription, lQty, sBarCode ) 
	SELECT @plSessionID, @psSessionTime, r.sWorkOrderNumber, co.sCompanyName1, co.sCompanyName2, d.lDepartmentKey, co.sCompanyAddr1, co.sCompanyAddr2, 
		co.sCompanyCity, co.sCompanyState, co.sCompanyZip, co.sCompanyPhoneVoice, co.sCompanyPhoneFAX,   
		CASE WHEN r.sBillTo='D' THEN di.sDistName1 ELSE d.sBillName1   END,   
		CASE WHEN r.sBillTo='D' THEN di.sDistName2 ELSE d.sBillName2   END,   
		CASE WHEN r.sBillTo='D' THEN di.sMailAddr1 ELSE d.sBillAddr1   END,   
		CASE WHEN r.sBillTo='D' THEN di.sMailAddr2 ELSE d.sBillAddr2   END,   
		CASE WHEN r.sBillTo='D' THEN di.sMailCity ELSE d.sBillCity   END,   
		CASE WHEN r.sBillTo='D' THEN di.sMailState ELSE d.sBillState   END,   
		CASE WHEN r.sBillTo='D' THEN di.sMailZip ELSE d.sBillZip   END,   
		c.sClientName1, d.sDepartmentName, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.dtDateOut, dm.sDeliveryDesc, pt.sTermsDesc, 
		r.sPurchaseOrder, r.dtAprRecvd, sr.sRepFirst, sr.sRepLast, st.sScopeTypeDesc, s.sSerialNumber, r.dblAmtShipping, r.dblAmtRepair, 
		c.sUserFld1, c.sUserFld2, c.sUserFld3, c.sUserFld4, c.sPORequired,   
		Case When r.sBillTo='D' Then di.lBillType Else d.lBillType End,   
		Case When r.sBillTo='D' Then di.sBillEmail Else d.sBillEmail End,   
		Case When r.sBillTo='D' Then di.sBillEmailName Else d.sBillEmailName End,
		ri.lRepairItemKey, ri.sItemDescription, rit.lQuantity,
		'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(r.lRepairKey as varchar(15)) + '*' 
	FROM dbo.tblRepair r JOIN dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		JOIN dbo.tblClient c on (d.lClientKey = c.lClientKey)
		JOIN dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		JOIN dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		JOIN dbo.tblDeliveryMethod dm on (r.lDeliveryMethodKey=dm.lDeliveryMethodKey)
		JOIN dbo.tblDistributor di on (r.lDistributorKey=di.lDistributorKey)
		JOIN dbo.tblPaymentTerms pt on (r.lPaymentTermsKey=pt.lPaymentTermsKey)
		JOIN dbo.tblCompany co on (di.lCompanyKey=co.lCompanyKey)
		left join dbo.tblSalesRep sr on (r.lSalesRepKey=sr.lSalesRepKey)
		left join dbo.tblRepairItemTran rit on (r.lRepairKey = rit.lRepairKey)
		left join dbo.tblRepairItem ri on (rit.lRepairItemKey = ri.lRepairItemKey)
	WHERE r.lRepairKey = @plRepairKey

	Declare @lDatabaseKey int
	Declare @sWorkOrderNumber nvarchar(50)
	Declare @lSalesRepKey int

	Set @lDatabaseKey = dbo.fnDatabaseKey()
	Select @sWorkOrderNumber = sWorkOrderNumber, @lSalesRepKey = r.lSalesRepKey From dbo.tblRepair r Where r.lRepairKey = @plRepairKey

	if @lDatabaseKey = 1 And SUBSTRING(@sWorkOrderNumber,1,1)='S'
		BEGIN
			Declare @sRepFirst nvarchar(100)
			Declare @sRepLast nvarchar(100)

			Select @sRepFirst = sr.sRepFirst, @sRepLast = sr.sRepLast From TSS.WinscopeNetNashville.dbo.tblSalesRep sr Where sr.lSalesRepKey = @lSalesRepKey

			Update dbo.tblRptCartPackingSlip
			Set sRepFirst = @sRepFirst, sRepLast = @sRepLast
			Where lSessionID = @plSessionID And sSessionTime = @psSessionTime And sTranNumber = @sWorkOrderNumber
		END

END
