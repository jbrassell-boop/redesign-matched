CREATE PROCEDURE [dbo].[invoiceReportNonInstrument]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plInvoiceKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	--Declare @lServiceLocationKey int
	Declare @sTranNumber nvarchar(50)

	--Select @lServiceLocationKey = d.lServiceLocationKey, @sTranNumber = i.sTranNumber 
	Select @sTranNumber = i.sTranNumber From dbo.tblInvoice i Where i.lInvoiceKey = @plInvoiceKey

	Declare @lRepairServiceLocationKey int
	Set @lRepairServiceLocationKey = Case When SUBSTRING(@sTranNumber,1,1)='S' Then 2 Else 1 End 

	--If ISNULL(@lServiceLocationKey,0)=0
	--	Set @lServiceLocationKey = @lDatabaseKey

	if @lDatabaseKey = @lRepairServiceLocationKey
		BEGIN
			INSERT INTO tblRptInvoiceHdr ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
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
				c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, c.CompanyLogo, i.SalesTaxFlag, i.bFinalized, i.dtAprRecvd, ct.sContractType, 
				Case When ct.sContractType='CPO' Then 'Once' Else cit.sInstallmentType END, co.dtDateEffective, co.dtDateTermination    
			FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
				join dbo.tblSalesRep sr on (i.lSalesRepKey=sr.lSalesRepKey)
				join dbo.tblDistributor di on (sr.lDistributorKey=di.lDistributorKey)
				join dbo.tblCompany c on (di.lCompanyKey=c.lCompanyKey)
				left join dbo.tblContract co on (i.lContractKey = co.lContractKey)   
				left join dbo.tblContractTypes ct on (co.lContractTypeKey = ct.lContractTypeKey)   
				left join dbo.tblContractInstallmentTypes cit on (co.lInstallmentTypeID = cit.lInstallmentTypeID)   
			WHERE i.lInvoiceKey = @plInvoiceKey
		END
	else
		BEGIN
			--Need to link to lSalesRepLinkKey

			INSERT INTO tblRptInvoiceHdr ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
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
				c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, c.CompanyLogo, i.SalesTaxFlag, i.bFinalized, i.dtAprRecvd, ct.sContractType, 
				Case When ct.sContractType='CPO' Then 'Once' Else cit.sInstallmentType END, co.dtDateEffective, co.dtDateTermination    
			FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
				join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKeyLink)
				join dbo.tblDistributor di on (sr.lDistributorKey=di.lDistributorKey)
				join dbo.tblCompany c on (di.lCompanyKey=c.lCompanyKey)
				left join dbo.tblContract co on (i.lContractKey = co.lContractKey)   
				left join dbo.tblContractTypes ct on (co.lContractTypeKey = ct.lContractTypeKey)   
				left join dbo.tblContractInstallmentTypes cit on (co.lInstallmentTypeID = cit.lInstallmentTypeID)   
			WHERE i.lInvoiceKey = @plInvoiceKey
		END


	--if @lDatabaseKey = 1 And @lServiceLocationKey <> @lDatabaseKey
	--	BEGIN
	--		--Need to link to lSalesRepLinkKey
			
	--		INSERT INTO tblRptInvoiceHdr ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
	--			sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, 
	--			sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, 
	--			sScopeTypeDesc, sSerialNumber, dtDateDue, dblShippingAmt, dblTranAmount, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, 
	--			sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, sBillEmail, lBillType, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, lDepartmentKey, 
	--			sDisplayCustomerComplaint, sComplaintDesc, lClientKey, sCompanyWebsite, sCompanyEmail_AR, RemittAddr1, RemittAddr2, RemittCity, RemittState, RemittZip, CompanyLogo, sSalesTaxFlag,
	--			bFinalized, dtBillMonth, sContractType, sInvoiceFrequency, dtEffectiveDate, dtExpirationDate )
	--		SELECT @plSessionID, @psSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, 
	--			c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX, i.sBillName1, i.sBillName2, i.sBillAddr1, i.sBillAddr2, i.sBillCity, i.sBillState, i.sBillZip, 
	--			i.sShipName1, i.sShipName2, i.sShipAddr1, i.sShipAddr2, i.sShipCity, i.sShipState, i.sShipZip, i.dtTranDate, i.sDeliveryDesc, i.sTermsDesc, i.sPurchaseOrder, i.dtAprRecvd, 
	--			i.sRepFirst, i.sRepLast, i.sScopeTypeDesc, i.sSerialNumber, i.dtDueDate, i.dblShippingAmt, i.dblTranAmount, i.sPeachTaxCode, i.sJuris1Name, i.dblJuris1Pct, i.dblJuris1Amt, 
	--			i.sJuris2Name, i.dblJuris2Pct, i.dblJuris2Amt, i.sJuris3Name, i.dblJuris3Pct, i.dblJuris3Amt, i.sDispProductID, i.sBillEmail, i.lBillType, sCommentContract, sPreview, 
	--			sShipTrackingNumber, i.sBillEmailName, i.lDepartmentKey, sDisplayCustomerComplaint, sComplaintDesc, d.lDepartmentKey, c.sCompanyWebsite, c.sCompanyEmail_AR, c.RemittAddr1, 
	--			c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, c.CompanyLogo, i.SalesTaxFlag, i.bFinalized, i.dtAprRecvd, ct.sContractType, 
	--			Case When ct.sContractType='CPO' Then 'Once' Else cit.sInstallmentType END, co.dtDateEffective, co.dtDateTermination    
	--		FROM tblInvoice i join tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
	--			join tblSalesRep sr on (d.lSalesRepKey = sr.lSalesRepKeyLink)
	--			join tblDistributor di on (sr.lDistributorKey=di.lDistributorKey)
	--			join tblCompany c on (di.lCompanyKey=c.lCompanyKey)
	--			left join tblContract co on (i.lContractKey = co.lContractKey)   
	--			left join tblContractTypes ct on (co.lContractTypeKey = ct.lContractTypeKey)   
	--			left join tblContractInstallmentTypes cit on (co.lInstallmentTypeID = cit.lInstallmentTypeID)   
	--		WHERE i.lInvoiceKey = @plInvoiceKey
	--	END
	--else
	--	BEGIN
	--		INSERT INTO tblRptInvoiceHdr ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
	--			sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, 
	--			sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, 
	--			sScopeTypeDesc, sSerialNumber, dtDateDue, dblShippingAmt, dblTranAmount, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, 
	--			sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, sBillEmail, lBillType, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, lDepartmentKey, 
	--			sDisplayCustomerComplaint, sComplaintDesc, lClientKey, sCompanyWebsite, sCompanyEmail_AR, RemittAddr1, RemittAddr2, RemittCity, RemittState, RemittZip, CompanyLogo, sSalesTaxFlag,
	--			bFinalized, dtBillMonth, sContractType, sInvoiceFrequency, dtEffectiveDate, dtExpirationDate )
	--		SELECT @plSessionID, @psSessionTime, lInvoiceKey, sTranNumber, lFriendRepairKey, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, 
	--			c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX, i.sBillName1, i.sBillName2, i.sBillAddr1, i.sBillAddr2, i.sBillCity, i.sBillState, i.sBillZip, 
	--			i.sShipName1, i.sShipName2, i.sShipAddr1, i.sShipAddr2, i.sShipCity, i.sShipState, i.sShipZip, i.dtTranDate, i.sDeliveryDesc, i.sTermsDesc, i.sPurchaseOrder, i.dtAprRecvd, 
	--			i.sRepFirst, i.sRepLast, i.sScopeTypeDesc, i.sSerialNumber, i.dtDueDate, i.dblShippingAmt, i.dblTranAmount, i.sPeachTaxCode, i.sJuris1Name, i.dblJuris1Pct, i.dblJuris1Amt, 
	--			i.sJuris2Name, i.dblJuris2Pct, i.dblJuris2Amt, i.sJuris3Name, i.dblJuris3Pct, i.dblJuris3Amt, i.sDispProductID, i.sBillEmail, i.lBillType, sCommentContract, sPreview, 
	--			sShipTrackingNumber, i.sBillEmailName, i.lDepartmentKey, sDisplayCustomerComplaint, sComplaintDesc, d.lDepartmentKey, c.sCompanyWebsite, c.sCompanyEmail_AR, c.RemittAddr1, 
	--			c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, c.CompanyLogo, i.SalesTaxFlag, i.bFinalized, i.dtAprRecvd, ct.sContractType, 
	--			Case When ct.sContractType='CPO' Then 'Once' Else cit.sInstallmentType END, co.dtDateEffective, co.dtDateTermination    
	--		FROM tblInvoice i join tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
	--			join tblSalesRep sr on (d.lSalesRepKey=sr.lSalesRepKey)
	--			join tblDistributor di on (sr.lDistributorKey=di.lDistributorKey)
	--			join tblCompany c on (di.lCompanyKey=c.lCompanyKey)
	--			left join tblContract co on (i.lContractKey = co.lContractKey)   
	--			left join tblContractTypes ct on (co.lContractTypeKey = ct.lContractTypeKey)   
	--			left join tblContractInstallmentTypes cit on (co.lInstallmentTypeID = cit.lInstallmentTypeID)   
	--		WHERE i.lInvoiceKey = @plInvoiceKey
	--	END

	UPDATE h 
	SET sFriendWorkOrderNumber = r.sWorkOrderNumber, sFriendSerialNumber = s.sSerialNumber, sFriendScopeTypeDesc = st.sScopeTypeDesc
	FROM dbo.tblRptInvoiceHdr h join dbo.tblRepair r on (h.lFriendRepairKey = r.lRepairKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where h.lSessionID = @plSessionID And h.sSessionTime = @psSessionTime

	INSERT INTO tblRptInvoiceDtl ( lInvoiceKey, lSessionID, sSessionTime, sItemDescription, dblItemAmount, mComments, sProductID )
	SELECT i.lInvoiceKey, @plSessionID, @psSessionTime, i.sItemDescription, i.dblItemAmount, i.mComments, i.sProductID
	FROM dbo.tblInvoiceDetl i
	WHERE i.lInvoiceKey = @plInvoiceKey
	Order By i.sItemDescription
END
