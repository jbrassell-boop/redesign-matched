CREATE PROCEDURE dbo.rptNonContractInstrumentsSummary
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptNonContractInstrumentsSummary '1/1/2023', '12/31/2023'

	Set @pdtEndDate = DATEADD(day,1,@pdtEndDate)

    Create Table #Results
		(
			ID int identity(1,1),
			sItemCode nvarchar(50),
			sScopeTypeDesc nvarchar(300),
			lQuantity int,
			Amt decimal(10,2),
			AvgAmt decimal(10,2),
			BaseUnitCost decimal(10,2),
			BaseUnitCostSouth decimal(10,2),
			sSouthDescription nvarchar(300)
		)

	Insert into #Results ( sItemCode, sScopeTypeDesc, lQuantity, Amt, BaseUnitCost )
	Select st.sItemCode, st.sScopeTypeDesc, SUM(rim.lQuantity) As lQuantity, SUM(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0)) As Amt, st.mMaxCharge
	From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
		join dbo.tblRepairInstrumentModels rim on (r.lRepairKey = rim.lRepairKey)
		join dbo.tblScopeType st on (rim.lScopeTypeKey = st.lScopeTypeKey)
	Where i.bFinalized = 1
		And ISNULL(i.lContractKey,0)=0
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < @pdtEndDate
	Group By st.sItemCode, st.sScopeTypeDesc, st.mMaxCharge
	Order by Convert(int,SUBSTRING(st.sItemCode,3,10))

	Create Table #ResultsSouth
		(
			sItemCode nvarchar(50),
			sScopeTypeDesc nvarchar(300),
			lQuantity int,
			Amt decimal(10,2),
			AvgAmt decimal(10,2),
			BaseUnitCost decimal(10,2)
		)

	Insert into #ResultsSouth ( sItemCode, sScopeTypeDesc, lQuantity, Amt, BaseUnitCost )
	Select st.sItemCode, st.sScopeTypeDesc, SUM(rim.lQuantity) As lQuantity, SUM(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0)) As Amt, st.mMaxCharge
	From TSS.WinscopeNetNashville.dbo.tblInvoice i join TSS.WinscopeNetNashville.dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
		join TSS.WinscopeNetNashville.dbo.tblRepairInstrumentModels rim on (r.lRepairKey = rim.lRepairKey)
		join TSS.WinscopeNetNashville.dbo.tblScopeType st on (rim.lScopeTypeKey = st.lScopeTypeKey)
	Where i.bFinalized = 1
		And ISNULL(i.lContractKey,0)=0
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < @pdtEndDate
	Group By st.sItemCode, st.sScopeTypeDesc, st.mMaxCharge
	Order by Convert(int,SUBSTRING(st.sItemCode,3,10))

	Update r 
	Set lQuantity = ISNULL(r.lQuantity,0) + ISNULL(s.lQuantity,0), Amt = ISNULL(r.Amt,0) + ISNULL(s.Amt,0), BaseUnitCostSouth = s.BaseUnitCost, sSouthDescription = s.sScopeTypeDesc
	From #Results r join #ResultsSouth s on (r.sItemCode = s.sItemCode)

	Delete From #Results Where lQuantity = 0
	Update #Results Set AvgAmt = Amt/lQuantity

	Select r.sItemCode, r.sScopeTypeDesc, r.lQuantity, r.Amt, r.AvgAmt, r.BaseUnitCost
	from #Results r 
	Order By ID

	Drop Table #Results
	Drop Table #ResultsSouth
END
