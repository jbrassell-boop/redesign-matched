CREATE PROCEDURE [dbo].[portalRptDataSrcRepairInvoiceHdr]
	(
		@plRepairKey INT = 0,
		@plInvoiceKey int = 0
	)
AS
BEGIN

	--exec dbo.portalRptDataSrcRepairInvoiceHdr @plRepairKey=495556
	--exec dbo.portalRptDataSrcRepairInvoiceHdr @plRepairKey=0, @plInvoiceKey=1633075207
	
	SELECT	HI.lRepairKey, HI.lInvoiceKey, HI.sTranNumber, HI.lFriendRepairKey, 
			HI.sCompanyName1, HI.sCompanyName2, HI.sCompanyAddr1, HI.sCompanyAddr2, HI.sCompanyCity, HI.sCompanyState, HI.sCompanyZip, 
			HI.sCompanyPhoneVoice, HI.sCompanyPhoneFAX, 
			HI.sBillName1, HI.sBillName2, HI.sBillAddr1, HI.sBillAddr2, HI.sBillCity, HI.sBillState, HI.sBillZip, 
			HI.sShipName1, HI.sShipName2, HI.sShipAddr1, HI.sShipAddr2, HI.sShipCity, HI.sShipState, HI.sShipZip, 
			HI.dtTranDate, HI.sDeliveryDesc, HI.sTermsDesc, HI.sPurchaseOrder, HI.dtAprRecvd, HI.sRepFirst, HI.sRepLast, 
			HI.sScopeTypeDesc, HI.sSerialNumber, HI.dtDueDate, HI.dblShippingAmt, HI.dblTranAmount, HI.sPeachTaxCode, 
			HI.sJuris1Name, HI.dblJuris1Pct, HI.dblJuris1Amt, 
			HI.sJuris2Name, HI.dblJuris2Pct, HI.dblJuris2Amt, 
			HI.sJuris3Name, HI.dblJuris3Pct, HI.dblJuris3Amt, HI.sDispProductID,
			dbo.fn_GetAddressBlock(1,HI.sCompanyName2,'',HI.sCompanyAddr1,HI.sCompanyAddr2,HI.sCompanyCity,HI.sCompanyState,HI.sCompanyZip,1,HI.sCompanyPhoneVoice,HI.sCompanyPhoneFAX) As CompanyAddrBlk1,
			dbo.fn_GetAddressBlock(2,HI.sCompanyName2,'',HI.sCompanyAddr1,HI.sCompanyAddr2,HI.sCompanyCity,HI.sCompanyState,HI.sCompanyZip,1,HI.sCompanyPhoneVoice,HI.sCompanyPhoneFAX) As CompanyAddrBlk2,
			dbo.fn_GetAddressBlock(3,HI.sCompanyName2,'',HI.sCompanyAddr1,HI.sCompanyAddr2,HI.sCompanyCity,HI.sCompanyState,HI.sCompanyZip,1,HI.sCompanyPhoneVoice,HI.sCompanyPhoneFAX) As CompanyAddrBlk3,
			dbo.fn_GetAddressBlock(4,HI.sCompanyName2,'',HI.sCompanyAddr1,HI.sCompanyAddr2,HI.sCompanyCity,HI.sCompanyState,HI.sCompanyZip,1,HI.sCompanyPhoneVoice,HI.sCompanyPhoneFAX) As CompanyAddrBlk4,
			dbo.fn_GetAddressBlock(5,HI.sCompanyName2,'',HI.sCompanyAddr1,HI.sCompanyAddr2,HI.sCompanyCity,HI.sCompanyState,HI.sCompanyZip,1,HI.sCompanyPhoneVoice,HI.sCompanyPhoneFAX) As CompanyAddrBlk5,
			dbo.fn_GetAddressBlock(1,HI.sBillName2,'',HI.sBillAddr1,HI.sBillAddr2,HI.sBillCity,HI.sBillState,HI.sBillZip,0,'','') As BillAddrBlk1,
			dbo.fn_GetAddressBlock(2,HI.sBillName2,'',HI.sBillAddr1,HI.sBillAddr2,HI.sBillCity,HI.sBillState,HI.sBillZip,0,'','') As BillAddrBlk2,
			dbo.fn_GetAddressBlock(3,HI.sBillName2,'',HI.sBillAddr1,HI.sBillAddr2,HI.sBillCity,HI.sBillState,HI.sBillZip,0,'','') As BillAddrBlk3,
			dbo.fn_GetAddressBlock(4,HI.sBillName2,'',HI.sBillAddr1,HI.sBillAddr2,HI.sBillCity,HI.sBillState,HI.sBillZip,0,'','') As BillAddrBlk4,
			dbo.fn_GetAddressBlock(5,HI.sBillName2,'',HI.sBillAddr1,HI.sBillAddr2,HI.sBillCity,HI.sBillState,HI.sBillZip,0,'','') As BillAddrBlk5,
			dbo.fn_GetAddressBlock(1,HI.sShipName2,'',HI.sShipAddr1,HI.sShipAddr2,HI.sShipCity,HI.sShipState,HI.sShipZip,0,'','') As ShipAddrBlk1,
			dbo.fn_GetAddressBlock(2,HI.sShipName2,'',HI.sShipAddr1,HI.sShipAddr2,HI.sShipCity,HI.sShipState,HI.sShipZip,0,'','') As ShipAddrBlk2,
			dbo.fn_GetAddressBlock(3,HI.sShipName2,'',HI.sShipAddr1,HI.sShipAddr2,HI.sShipCity,HI.sShipState,HI.sShipZip,0,'','') As ShipAddrBlk3,
			dbo.fn_GetAddressBlock(4,HI.sShipName2,'',HI.sShipAddr1,HI.sShipAddr2,HI.sShipCity,HI.sShipState,HI.sShipZip,0,'','') As ShipAddrBlk4,
			dbo.fn_GetAddressBlock(5,HI.sShipName2,'',HI.sShipAddr1,HI.sShipAddr2,HI.sShipCity,HI.sShipState,HI.sShipZip,0,'','') As ShipAddrBlk5,
			sShipTrackingNumber,
			HI.sBillEmail, HI.lBillType, HI.sBillEmailName,
			Case 
				When HI.lBillType = 2 Then HI.sBillEmail
				Else 
					HI.sBillName1 + 
					Case When ISNULL(HI.sBillName2,'')='' Then '' Else CHAR(13) + ISNULL(HI.sBillName2,'') End +
					Case When ISNULL(HI.sBillAddr1,'')='' Then '' Else CHAR(13) + ISNULL(HI.sBillAddr1,'') End +
					Case When ISNULL(HI.sBillAddr2,'')='' Then '' Else CHAR(13) + ISNULL(HI.sBillAddr2,'') End +
					CHAR(13) + 
					Case When IsNull(HI.sBillCity,'')='' Then '' Else IsNull(HI.sBillCity,'') + ', ' End +
					Case When ISNULL(HI.sBillState,'')='' Then '' Else ISNULL(HI.sBillState,'') End +
					Case When ISNULL(HI.sBillZip,'')='' Then '' Else ' ' + ISNULL(HI.sBillZip,'') End 
			End 
			As sBillAddressComplete,
			'Accounts Receivable' + CHAR(13) + c.RemittAddr1 + CHAR(13) + 
				Case When IsNull(c.RemittAddr2,'')='' Then '' Else c.RemittAddr2 + CHAR(13) END +
				c.RemittCity + ', ' + c.RemittState + ' ' + Cast(c.RemittZip as varchar(10)) As sRemittAddressComplete,
			c.sCompanyWebsite, c.sCompanyEmail_AR, c.CompanyLogo,
			Case 
				When IsNull(HI.lContractKey,0)=0 Then '8.' + CAST(hi.lRepairKey As varchar(10))
				Else '13.' + CAST(hi.lInvoiceKey as varchar(10))
			End As sBarCode,
			HI.sCoveragePeriod, ct.sContractType, cit.sInstallmentType, co.dtDateEffective, co.dtDateTermination, co.lClientKey, HI.lDepartmentKey
	FROM	dbo.tblInvoice HI WITH (NOLOCK)
			join dbo.tblSalesRep sr on (HI.lSalesRepKey = sr.lSalesRepKey)
			join dbo.tblDistributor d on (sr.lDistributorKey = d.lDistributorKey)
			join dbo.tblCompany c on (d.lCompanyKey = c.lCompanyKey)
			left join dbo.tblContract co on (HI.lContractKey=co.lContractKey)
			left join dbo.tblContractTypes ct on (co.lContractTypeKey=ct.lContractTypeKey)
			left join dbo.tblContractInstallmentTypes cit on (co.lInstallmentTypeID=cit.lInstallmentTypeID)
	WHERE	((IsNull(@plRepairKey,0)=0) Or (HI.lRepairKey = @plRepairKey))
		And ((IsNull(@plInvoiceKey,0)=0) Or (HI.lInvoiceKey = @plInvoiceKey)) And hi.bFinalized=1
END







