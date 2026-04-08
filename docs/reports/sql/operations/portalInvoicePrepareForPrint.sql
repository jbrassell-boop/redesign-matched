CREATE PROCEDURE [dbo].[portalInvoicePrepareForPrint]
	(
		@plInvoiceKey int,
		@plRepairKey int = 0,
		@plSessionID int,
		@psSessionTime nvarchar(50)
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @sDisplayItemValues nvarchar(1) = 'N'
	Declare @sDisplayItemDesc nvarchar(1) = 'N'

	Delete From dbo.tblRptInvoiceHdr Where lSessionID = @plSessionID
	Delete From dbo.tblRptInvoiceDtl Where lSessionID = @plSessionID

	If @plInvoiceKey = 0
		RETURN

	Declare @sTranNumber nvarchar(50)
	Declare @lSalesRepKey int

	Select @sTranNumber= i.sTranNumber, @lSalesRepKey = i.lSalesRepKey From dbo.tblInvoice i Where i.lInvoiceKey = @plInvoiceKey
	

	Declare @lBarCodeKey int
	Set @lBarCodeKey = 8
	If @plRepairKey = 0
		Set @lBarCodeKey = 13	--Contract Invoice

	INSERT INTO dbo.tblRptInvoiceHdr ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
		sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, 
		sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, 
		sScopeTypeDesc, sSerialNumber, dtDateDue, dblShippingAmt, dblTranAmount, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, 
		sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, sBillEmail, lBillType, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, lDepartmentKey, 
		sDisplayCustomerComplaint, sComplaintDesc, lClientKey, sCompanyWebsite, sCompanyEmail_AR, RemittAddr1, RemittAddr2, RemittCity, RemittState, RemittZip, CompanyLogo, sSalesTaxFlag,
		bFinalized, dtBillMonth, sContractType, sInvoiceFrequency, dtEffectiveDate, dtExpirationDate )
	SELECT @plSessionID, @psSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, 
		c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX, i.sBillName1, i.sBillName2, i.sBillAddr1, i.sBillAddr2, i.sBillCity, i.sBillState, i.sBillZip, 
		i.sShipName1, i.sShipName2, i.sShipAddr1, i.sShipAddr2, i.sShipCity, i.sShipState, i.sShipZip, i.dtTranDate, i.sDeliveryDesc, i.sTermsDesc, i.sPurchaseOrder, i.dtAprRecvd, 
		i.sRepFirst, i.sRepLast, i.sScopeTypeDesc, i.sSerialNumber, i.dtDueDate, i.dblShippingAmt, i.dblTranAmount, i.sPeachTaxCode, i.sJuris1Name, i.dblJuris1Pct, i.dblJuris1Amt, 
		i.sJuris2Name, i.dblJuris2Pct, i.dblJuris2Amt, i.sJuris3Name, i.dblJuris3Pct, i.dblJuris3Amt, i.sDispProductID, i.sBillEmail, i.lBillType, sCommentContract, sPreview, 
		sShipTrackingNumber, i.sBillEmailName, i.lDepartmentKey, sDisplayCustomerComplaint, sComplaintDesc, d.lDepartmentKey, c.sCompanyWebsite, c.sCompanyEmail_AR, c.RemittAddr1, 
		c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, c.CompanyLogo, i.SalesTaxFlag, i.bFinalized,
		i.dtAprRecvd, ct.sContractType, Case When ct.sContractType='CPO' Then 'Once' Else cit.sInstallmentType END, co.dtDateEffective, co.dtDateTermination
	FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
		left join dbo.tblSalesRep sr on (d.lSalesRepKey=sr.lSalesRepKey)
		left join dbo.tblDistributor di on (sr.lDistributorKey=di.lDistributorKey)
		left join dbo.tblCompany c on (di.lCompanyKey=c.lCompanyKey)
		left join dbo.tblContract co on (i.lContractKey = co.lContractKey)
		left join dbo.tblContractTypes ct on (co.lContractTypeKey = ct.lContractTypeKey)
		left join dbo.tblContractInstallmentTypes cit on (co.lInstallmentTypeID = cit.lInstallmentTypeID)
	WHERE i.lInvoiceKey = @plInvoiceKey
	
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	if @lDatabaseKey = 1 And SUBSTRING(@sTranNumber,1,1)='S'
		BEGIN
			Update h
			Set sCompanyName1 = c.sCompanyName1, sCompanyName2 = c.sCompanyName2, sCompanyAddr1 = c.sCompanyAddr1, sCompanyAddr2 = c.sCompanyAddr2, 
				sCompanyCity = c.sCompanyCity, sCompanyState = c.sCompanyState, sCompanyZip = c.sCompanyZip, sCompanyPhoneVoice = c.sCompanyPhoneVoice, 
				sCompanyPhoneFAX = c.sCompanyPhoneFAX, RemittAddr1 = c.RemittAddr1, RemittAddr2 = c.RemittAddr2, RemittCity = c.RemittCity, 
				RemittState = c.RemittState, RemittZip = c.RemittZip, CompanyLogo = c.CompanyLogo, sCompanyWebsite = c.sCompanyWebsite,
				sCompanyEmail_AR = c.sCompanyEmail_AR
			From dbo.tblRptInvoiceHdr h, 
				TSS.WinscopeNetNashville.dbo.tblSalesRep sr join TSS.WinscopeNetNashville.dbo.tblDistributor di on (sr.lDistributorKey=di.lDistributorKey) 
				join TSS.WinscopeNetNashville.dbo.tblCompany c on (di.lCompanyKey=c.lCompanyKey)
			Where h.lInvoiceKey = @plInvoiceKey And h.lSessionID = @plSessionID And sr.lSalesRepKey = @lSalesRepKey
		END
	
	UPDATE h 
	SET sFriendWorkOrderNumber = r.sWorkOrderNumber, sFriendSerialNumber = s.sSerialNumber, sFriendScopeTypeDesc = st.sScopeTypeDesc
	FROM dbo.tblRptInvoiceHdr h join dbo.tblRepair r on (h.lFriendRepairKey = r.lRepairKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where h.lSessionID = @plSessionID And h.sSessionTime = @psSessionTime

	INSERT INTO dbo.tblRptInvoiceDtl ( lInvoiceKey, lSessionID, sSessionTime, sItemDescription, dblItemAmount, mComments, sProductID )
	SELECT i.lInvoiceKey, @plSessionID, @psSessionTime, i.sItemDescription, i.dblItemAmount, i.mComments, i.sProductID
	FROM dbo.tblInvoiceDetl i
	WHERE i.lInvoiceKey = @plInvoiceKey
	Order By i.sItemDescription

	If @plRepairKey > 0 
		BEGIN
			Update dbo.tblRptInvoiceHdr
			Set sBarCode = '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plRepairKey as varchar(15)) + '*' 
			Where lSessionID=@plSessionID And sSessionTime=@psSessionTime And lInvoiceKey = @plInvoiceKey

			Select @sDisplayItemValues = r.sDisplayItemAmount, @sDisplayItemDesc = r.sDisplayItemDescription
			From dbo.tblRepair r 
			Where r.lRepairKey = @plRepairKey
		END
	else
		BEGIN
			Update ih 
			Set sBarCode = '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plInvoiceKey as varchar(15)) + '*',
				bShowShippingAddress = ISNULL(c.bShowShippingAddressOnInvoice,0),
				sCoveragePeriod = i.sCoveragePeriod,
				sClientName1 = cl.sClientName1,
				sDepartmentName = d.sDepartmentName
			From dbo.tblRptInvoiceHdr ih join dbo.tblInvoice i on (ih.lInvoiceKey=i.lInvoiceKey)
				join dbo.tblContract c on (i.lContractKey = c.lContractKey)
				join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient cl on (d.lClientKey = cl.lClientKey)
			Where ih.lSessionID=@plSessionID And ih.sSessionTime=@psSessionTime And i.lInvoiceKey=@plInvoiceKey 
		END

	Select @sDisplayItemValues As sDisplayItemValues, @sDisplayItemDesc As sDisplayItemDesc
END
