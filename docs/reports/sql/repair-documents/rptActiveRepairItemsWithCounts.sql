CREATE PROCEDURE dbo.rptActiveRepairItemsWithCounts
	
AS
BEGIN
	SET NOCOUNT ON;

	Declare @dtDate date
	Set @dtDate = DATEADD(day,-365,GETDATE())

	Create Table #Results
		(
			NorthKey int,
			SouthKey int,
			InstrumentType nvarchar(50),
			sItemDescription nvarchar(200),
			CountNorth int,
			CountSouth int
		)

	Insert Into #Results ( NorthKey, SouthKey, InstrumentType, sItemDescription, CountNorth, CountSouth )
	Select ri.lRepairItemKey, ri.lRepairItemKey_OtherServer, ri.sRigidOrFlexible, ri.sItemDescription, 0, 0
	From dbo.tblRepairItem ri 
	Where ri.bActive=1

	Update r
	Set CountNorth = c.cnt 
	From #Results r join 
		(
			Select rit.lRepairItemKey, Count(rit.lRepairItemKey) As cnt 
			From dbo.tblRepairItemTran rit join dbo.tblRepair r on (rit.lRepairKey=r.lRepairKey)
			Where r.dtDateIn > @dtDate
			Group By rit.lRepairItemKey
		) c on (r.NorthKey=c.lRepairItemKey)
	

	Insert Into #Results ( NorthKey, SouthKey, InstrumentType, sItemDescription, CountNorth, CountSouth )
	Select  ri.lRepairItemKey_OtherServer, ri.lRepairItemKey, ri.sRigidOrFlexible, ri.sItemDescription, 0, 0
	From TSS.WinscopeNetNashville.dbo.tblRepairItem ri left join #Results r on (ri.lRepairItemKey_OtherServer = r.NorthKey)
	Where ri.bActive=1 And r.NorthKey Is Null

	Update r
	Set CountSouth = c.cnt 
	From #Results r join 
		(
			Select rit.lRepairItemKey, Count(rit.lRepairItemKey) As cnt 
			From TSS.WinscopeNetNashville.dbo.tblRepairItemTran rit join TSS.WinscopeNetNashville.dbo.tblRepair r on (rit.lRepairKey=r.lRepairKey)
			Where r.dtDateIn > @dtDate
			Group By rit.lRepairItemKey
		) c on (r.SouthKey=c.lRepairItemKey)


	Select *
	from #Results ORder By InstrumentType, sItemDescription

	Drop Table #Results
END
