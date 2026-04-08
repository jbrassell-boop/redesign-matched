CREATE PROCEDURE dbo.clientLoanersOutReport
	(
		@plDepartmentKey int,
		@plSessionID int,
		@psSessionTime nvarchar(50)
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lClientKey int
	Select @lClientKey = lClientKey From dbo.tblDepartment Where lDepartmentKey = @plDepartmentKey

	Declare @cnt int

	Select @cnt = Count(*)
	From dbo.tblLoanerTran lt join dbo.tblScope s on (lt.lScopeKey = s.lScopeKey)
		join dbo.tblDepartment d on (lt.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where d.lClientKey = @lClientKey
		And lt.sDateIn Is Null

	if @cnt > 0 
		BEGIN
			Insert Into dbo.tblRptOutstandingLoaner ( lSessionID, sSessionTime, nSortGroupOrder, sRigidOrFlexible, sScopeTypeDesc, sSerialNumber, 
				sClientName1, sClientName2, sDepartmentName, sDateOut, dtCreateDate )  
			Select @plSessionID, @psSessionTime, 
				Case When s.bOnSiteLoaner = 0 Then Case When lt.lDepartmentKey = @plDepartmentKey Then 1 Else 2 End Else 3 End, 
				st.sRigidOrFlexible, 
				st.sScopeTypeDesc, s.sSerialNumber, c.sClientName1, c.sClientName2, d.sDepartmentName, lt.sDateOut, lt.dtCreateDate    
			From dbo.tblLoanerTran lt join dbo.tblScope s on (lt.lScopeKey = s.lScopeKey)
				join dbo.tblDepartment d on (lt.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
			Where d.lClientKey = @lClientKey
				And lt.sDateIn Is Null
		END

	Select @cnt As ResultCount
END
