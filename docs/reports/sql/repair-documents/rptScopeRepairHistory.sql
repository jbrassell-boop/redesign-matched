CREATE PROCEDURE [dbo].[rptScopeRepairHistory]
	(
		@plRepairKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lScopeKey int
	Declare @dtDateIn date

	Select @lScopeKey = r.lScopeKey, @dtDateIn = r.dtDateIn From dbo.tblRepair r Where lRepairKey = @plRepairKey

	Create Table #PreviousRepairs
		(
			lRepairKey int
		)

	--Insert Into #PreviousRepairs ( lRepairKey ) Values ( @plRepairKey ) 
	Insert Into #PreviousRepairs ( lRepairKey )
	Select TOP 2 r.lRepairKey 
	From dbo.tblRepair r 
	Where r.lScopeKey = @lScopeKey And r.dtDateIn <= @dtDateIn And r.lRepairKey <> @plRepairKey And r.dtDateOut Is Not Null
	Order By r.dtDateIn DESC

	--Only including tech for pre-merger.

	Select r.dtDateOut, st.sScopeTypeDesc, s.sSerialNumber, r.sWorkOrderNumber, r.sComplaintDesc, ri.sItemDescription, r.sNumOfUses, t.sTechName
	From tblRepairItemTran rit join tblRepair r on (rit.lRepairKey=r.lRepairKey) 
		join #PreviousRepairs pr on (r.lRepairKey = pr.lRepairKey)
		join tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
		join tblScope s on (r.lScopeKey=s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		left join tblTechnicians t on (rit.lTechnicianKey = t.lTechnicianKey)
	Order by r.dtDateOut DESC

	Drop Table #PreviousRepairs

 --   Select s.sSerialNumber, r.dtDateOut, ri.sItemDescription, r.sWorkOrderNumber, t.sTechName, st.sScopeTypeDesc, r.sNumOfUses
	--From tblRepairItemTran rit join tblRepair r on (rit.lRepairKey=r.lRepairKey) 
	--	join tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
	--	join tblScope s on (r.lScopeKey=s.lScopeKey)
	--	join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
	--	left join tblTechnicians t on (rit.lTechnicianKey = t.lTechnicianKey)
	--where r.lScopeKey = @lScopeKey
	--Order by r.dtDateOut DESC
END
