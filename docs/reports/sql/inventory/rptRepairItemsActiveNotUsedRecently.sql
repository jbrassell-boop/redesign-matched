CREATE PROCEDURE dbo.rptRepairItemsActiveNotUsedRecently
	(
		@plYear int
	)	
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRepairItemsActiveNotUsedRecently @plYear=2019

    Create Table #Temp
	(
		lRepairItemKey int
	)

Insert Into #Temp ( lRepairItemKey )
Select ri.lRepairItemKey
From dbo.tblRepairItem ri join dbo. tblRepairItemTran rit on (ri.lRepairItemKey=rit.lRepairItemKey)
	join dbo.tblRepair r on (rit.lRepairKey = r.lRepairKey)
where ri.bActive=1 And DATEPART(year,r.dtDateIn) >= @plYear
Group By ri.lRepairItemKey


Create Table #RepairItems	
	(
		lRepairItemKey int,
		LastUsedDate date
	)

Insert Into #RepairItems ( lRepairItemKey ) 
Select ri.lRepairItemKey
From dbo.tblRepairItem ri left join #Temp t on (ri.lRepairItemKey=t.lRepairItemKey)
Where t.lRepairItemKey Is Null And ri.bActive = 1

Update r
Set LastUsedDate = a.MaxDateIn
From #RepairItems r join 
	(
		Select ri.lRepairItemKey, MAX(r.dtDateIn) As MaxDateIn
		From #RepairItems re join dbo.tblRepairItem ri on (re.lRepairItemKey=ri.lRepairItemKey) 
			join dbo. tblRepairItemTran rit on (ri.lRepairItemKey=rit.lRepairItemKey)
			join dbo.tblRepair r on (rit.lRepairKey = r.lRepairKey)
		Group By ri.lRepairItemKey
	) a on (r.lRepairItemKey=a.lRepairItemKey)

Truncate Table #Temp
Insert Into #Temp ( lRepairItemKey )
Select ri.lRepairItemKey_Otherserver
From TSS.WinscopenetNashville.dbo.tblRepairItem ri join TSS.WinscopenetNashville.dbo.tblRepairItemTran rit on (ri.lRepairItemKey=rit.lRepairItemKey)
	join TSS.WinscopenetNashville.dbo.tblRepair r on (rit.lRepairKey = r.lRepairKey)
where ri.bActive=1 And DATEPART(year,r.dtDateIn) >= @plYear
Group By ri.lRepairItemKey_Otherserver

Delete r From #RepairItems r join #Temp t on (R.lRepairItemKey=t.lRepairItemKey)

Update r
Set LastUsedDate = Case When a.MaxDateIn > ISNULL(LastUsedDate,'1/1/1900') Then a.MaxDateIn Else LastUsedDate End 
From #RepairItems r join 
	(
		Select re.lRepairItemKey, MAX(r.dtDateIn) As MaxDateIn
		From #RepairItems re join dbo.tblRepairItem ri on (re.lRepairItemKey=ri.lRepairItemKey) 
			join TSS.WinscopenetNashville.dbo.tblRepairItemTran rit on (ri.lRepairItemKey_OtherServer=rit.lRepairItemKey)
			join TSS.WinscopenetNashville.dbo.tblRepair r on (rit.lRepairKey = r.lRepairKey)
		Group By re.lRepairItemKey
	) a on (r.lRepairItemKey=a.lRepairItemKey)

Select ri.lRepairItemKey, r.sItemDescription, r.sRigidOrFlexible, ri.LastUsedDate
From #RepairItems ri join dbo.tblRepairItem r on (ri.lRepairItemKey=r.lRepairItemKey)
order by r.sRigidOrFlexible, r.sItemDescription

Drop Table #RepairItems
Drop Table #Temp




END
