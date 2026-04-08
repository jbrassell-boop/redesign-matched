CREATE PROCEDURE [dbo].[spRptInvoiceListForSouth]
	(
		@pdtDateFrom date,
		@pdtDateTo date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.spRptInvoiceListForSouth @pdtDateFrom = '1/1/2023', @pdtDateTo = '1/31/2023'

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

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
			sShipState nvarchar(50),
			sShipCity nvarchar(200), 
			TrackingNumberIn nvarchar(50),
			TrackingNumberOut nvarchar(50),
			lSalesRepKey int
		)

	if @lDatabaseKey = 1 
		BEGIN
			Insert Into #Results ( dtTranDate, sContractName1, sClientName1, sDepartmentName, sBillName1, sSerialNumber, InstrumentType, sScopeTypeDesc, sTranNumber,
				sPurchaseOrder, dblTranAmount, dblShippingAmt,Tax,TotalAmount, sShipState, sShipCity, TrackingNumberIn, TrackingNumberOut, lSalesRepKey )
			SELECT i.dtTranDate, co.sContractName1, c.sClientName1, d.sDepartmentName, i.sBillName1, i.sSerialNumber, ISNULL(st.sRigidOrFlexible,'') As InstrumentType, i.sScopeTypeDesc, 
				i.sTranNumber + Case When IsNull(i.sTranNumberSuffix,0)=0 Then '' Else '-' + CAST(i.sTranNumberSuffix as varchar(10)) End As sTranNumber, 
				i.sPurchaseOrder, i.dblTranAmount, i.dblShippingAmt, IsNull(i.dblJuris1Amt,0) + IsNull(i.dblJuris2Amt,0) + IsNull(i.dblJuris3Amt,0) As Tax,
				IsNull(i.dblTranAmount,0) + IsNull(i.dblJuris1Amt,0) + IsNull(i.dblJuris2Amt,0) + IsNull(i.dblJuris3Amt,0) + IsNull(i.dblShippingAmt,0) As TotalAmount,
				ISNULL(d.sShipState,'') As sShipState,
				ISNULL(d.sShipCity,'') As sShipCity, 
				Case When ISNULL(r.sShipTrackingNumberIn,'')='' Then r.sShipTrackingNumberFedExIn Else r.sShipTrackingNumberIn End As TrackingNumberIn,
				Case When ISNULL(r.sShipTrackingNumber,'')='' Then r.sShipTrackingNumberFedEx Else r.sShipTrackingNumber End As TrackingNumberOut,
				i.lSalesRepKey
			FROM tblInvoice i join tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join tblClient c on (d.lClientKey = c.lClientKey)
				left join tblContract co on (i.lContractKey = co.lContractKey)
				left join dbo.tblRepair r on (i.lRepairKey=r.lRepairKey)
				left join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
				left join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
			WHERE i.dtTranDate >= @pdtDateFrom And i.dtTranDate < DATEADD(day,1,@pdtDateTo) And i.bFinalized = 1
				And SUBSTRING(i.sTranNumber,1,1)='S'

				----And (ISNULL(d.lServiceLocationKey,@lDatabaseKey) <> @lDatabaseKey)
				--And (	(r.lRepairKey Is Null And ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey)
				--		Or
				--		(SUBSTRING(r.sWorkOrderNumber,1,1) = 'S')
				--	)
		END

	Select * From #Results
	Drop Table #Results
END
