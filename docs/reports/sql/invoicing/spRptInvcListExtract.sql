CREATE PROCEDURE [dbo].[spRptInvcListExtract]
	(	
		@plSessionID int = 0,
		@psSessionTime nvarchar(50) = null,
		@pdtDateFrom date,
		@pdtDateTo date
	)
AS
BEGIN
	
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	--exec dbo.spRptInvcListExtract @pdtDateFrom = '12/1/2023', @pdtDateTo = '12/31/2023' 449

	If IsNull(@plSessionID,0)>0
		BEGIN
			--Report
			INSERT	INTO tblRptInvoiceHdr (	dtTranDate, sBillName1, sSerialNumber, sTranNumber, sPurchaseOrder, dblTranAmount, 
				dblShippingAmt, lSessionID, sSessionTime, sScopeTypeDesc, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, 
				dblJuris2Pct, dblJuris2Amt, sJuris3Name, dblJuris3Pct, dblJuris3Amt )
			SELECT i.dtTranDate, i.sBillName1, i.sSerialNumber, i.sTranNumber, i.sPurchaseOrder, IsNull(i.dblTranAmount,0) as TranAmt, 
				IsNull(i.dblShippingAmt,0) as ShipAmt, @plSessionID, @psSessionTime, i.sScopeTypeDesc, i.sJuris1Name, 
				i.dblJuris1Pct, IsNull(i.dblJuris1Amt,0) As Juris1Amt, i.sJuris2Name, i.dblJuris2Pct, IsNull(i.dblJuris2Amt,0) As Juris2Amt, 
				i.sJuris3Name, i.dblJuris3Pct, IsNull(i.dblJuris3Amt,0) As Juris3Amt
			FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				left join tblContract co on (i.lContractKey = co.lContractKey)
			WHERE i.dtTranDate >= @pdtDateFrom And i.dtTranDate < DATEADD(day,1,@pdtDateTo) And i.bFinalized = 1

		END
	else
		BEGIN
			--Extract			 

			Create Table #Results 
				(
					dtTranDate date,
					sContractName1 nvarchar(200),
					sClientName1 nvarchar(200), 
					sDepartmentName nvarchar(200),
					sBillName1 nvarchar(200),
					sSerialNumber nvarchar(50),
					InstrumentType nvarchar(50), 
					sScopeTypeDesc nvarchar(200), 
					sTranNumber nvarchar(50), 
					sPurchaseOrder nvarchar(50),
					dblTranAmount decimal(10,2), 
					dblShippingAmt decimal(10,2), 
					Tax decimal(10,2),
					TotalAmount decimal(10,2),
					SalesRep nvarchar(200), 
					sShipState nvarchar(50),
					sShipCity nvarchar(200), 
					TrackingNumberIn nvarchar(50),
					TrackingNumberOut nvarchar(50),
					lSalesRepKey int
				)

			Insert Into #Results ( dtTranDate, sContractName1, sClientName1, sDepartmentName, sBillName1, sSerialNumber, InstrumentType, sScopeTypeDesc, sTranNumber,
				sPurchaseOrder, dblTranAmount, dblShippingAmt, Tax, TotalAmount, SalesRep, sShipState, sShipCity, TrackingNumberIn, TrackingNumberOut, lSalesRepKey )
			SELECT i.dtTranDate, co.sContractName1, c.sClientName1, d.sDepartmentName, i.sBillName1, i.sSerialNumber, ISNULL(st.sRigidOrFlexible,'') As InstrumentType, 
				i.sScopeTypeDesc, i.sTranNumber + Case When IsNull(i.sTranNumberSuffix,0)=0 Then '' Else '-' + CAST(i.sTranNumberSuffix as varchar(10)) End As sTranNumber, 
				i.sPurchaseOrder, i.dblTranAmount, i.dblShippingAmt, IsNull(i.dblJuris1Amt,0) + IsNull(i.dblJuris2Amt,0) + IsNull(i.dblJuris3Amt,0) As Tax,
				IsNull(i.dblTranAmount,0) + IsNull(i.dblJuris1Amt,0) + IsNull(i.dblJuris2Amt,0) + IsNull(i.dblJuris3Amt,0) + IsNull(i.dblShippingAmt,0) As TotalAmount,
				RTrim(LTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As SalesRep, ISNULL(d.sShipState,'') As sShipState,
				ISNULL(d.sShipCity,'') As sShipCity, 
				Case When ISNULL(r.sShipTrackingNumberIn,'')='' Then r.sShipTrackingNumberFedExIn Else r.sShipTrackingNumberIn End As TrackingNumberIn,
				Case When ISNULL(r.sShipTrackingNumber,'')='' Then r.sShipTrackingNumberFedEx Else r.sShipTrackingNumber End As TrackingNumberOut,
				i.lSalesRepKey
			FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				left join dbo.tblSalesRep sr on (i.lSalesRepKey=sr.lSalesRepKey)
				left join dbo.tblContract co on (i.lContractKey = co.lContractKey)
				left join dbo.tblRepair r on (i.lRepairKey=r.lRepairKey)
				left join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
				left join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
			WHERE i.dtTranDate >= @pdtDateFrom And i.dtTranDate < DATEADD(day,1,@pdtDateTo) And i.bFinalized = 1
				--And		(	(r.lRepairKey Is Null)
				--			Or
				--			(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
				--			Or
				--			(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
				--		)

			if @lDatabaseKey = 1
				BEGIN
					--Get South Sales rep for South invoices
					Update #Results Set SalesRep = Null Where SUBSTRING(sTranNumber,1,1)='S'
					
					Update r 
					Set SalesRep = RTrim(LTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,'')))
					From #Results r join dbo.tblSalesRep sr on (r.lSalesRepKey = sr.lSalesRepKeyLink)
				END

			--if @lDatabaseKey = 2
			--	BEGIN
			--		Create Table #ResultsTemp
			--			(
			--				dtTranDate date,
			--				sContractName1 nvarchar(200),
			--				sClientName1 nvarchar(200), 
			--				sDepartmentName nvarchar(200),
			--				sBillName1 nvarchar(200),
			--				sSerialNumber nvarchar(50),
			--				InstrumentType nvarchar(50), 
			--				sScopeTypeDesc nvarchar(200), 
			--				sTranNumber nvarchar(50), 
			--				sPurchaseOrder nvarchar(50),
			--				dblTranAmount decimal(10,2), 
			--				dblShippingAmt decimal(10,2), 
			--				Tax decimal(10,2),
			--				TotalAmount decimal(10,2),
			--				sShipState nvarchar(50),
			--				sShipCity nvarchar(200), 
			--				TrackingNumberIn nvarchar(50),
			--				TrackingNumberOut nvarchar(50),
			--				lSalesRepKey int
			--			)

			--		Insert Into #ResultsTemp ( dtTranDate, sContractName1, sClientName1, sDepartmentName, sBillName1, sSerialNumber, InstrumentType, sScopeTypeDesc, sTranNumber,
			--			sPurchaseOrder, dblTranAmount, dblShippingAmt, Tax, TotalAmount, sShipState, sShipCity, TrackingNumberIn, TrackingNumberOut, lSalesRepKey )
			--		EXEC TSI.WinscopeNet.dbo.spRptInvoiceListForSouth @pdtDateFrom = @pdtDateFrom, @pdtDateTo = @pdtDateTo

			--		Insert Into #Results ( dtTranDate, sContractName1, sClientName1, sDepartmentName, sBillName1, sSerialNumber, InstrumentType, sScopeTypeDesc, sTranNumber,
			--			sPurchaseOrder, dblTranAmount, dblShippingAmt, Tax, TotalAmount, SalesRep, sShipState, sShipCity, TrackingNumberIn, TrackingNumberOut )
			--		Select dtTranDate, sContractName1, sClientName1, sDepartmentName, sBillName1, sSerialNumber, InstrumentType, sScopeTypeDesc, sTranNumber,
			--			sPurchaseOrder, dblTranAmount, dblShippingAmt, Tax, TotalAmount, 
			--			RTrim(LTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As SalesRep,
			--			sShipState, sShipCity, TrackingNumberIn, TrackingNumberOut
			--		From #ResultsTemp t left join dbo.tblSalesRep sr on (t.lSalesRepKey = sr.lSalesRepKey)

			--		Drop Table #ResultsTemp
			--	END


			Select dtTranDate, sContractName1, sClientName1,  sDepartmentName, sBillName1, sSerialNumber, InstrumentType, sScopeTypeDesc, sTranNumber, 
				sPurchaseOrder, dblTranAmount, dblShippingAmt, Tax, TotalAmount, SalesRep, sShipState, sShipCity, TrackingNumberIn, TrackingNumberOut
			From #Results Order By dtTranDate,sClientName1, sDepartmentName
			Drop Table #Results
		END
END
