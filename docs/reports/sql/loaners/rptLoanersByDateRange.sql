CREATE PROCEDURE dbo.rptLoanersByDateRange
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lClientKey int
	Select @lClientKey = CONVERT(int,sValueString) From dbo.tblSystemOptions Where sInternalDesc = 'Loaner Client Key'

	Select c.sClientName1, d.sDepartmentName, lt.dtCreateDate, st.sScopeTypeDesc, s.sSerialNumber 
	From tblLoanerTran lt join tblDepartment d on (lt.lDepartmentKey=d.lDepartmentKey)
		join tblClient c on (d.lClientKey = c.lClientKey)
		join tblScope s on (lt.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
	Where lt.dtCreateDate >= @pdtStartDate And lt.dtCreateDate < DateAdd(day,1,@pdtEndDate)
		And ISNULL(sDateIn,'')=''
		And c.lClientKey <> ISNULL(@lClientKey,0)
	Order By c.sClientName1, d.sDepartmentName, lt.dtCreateDate, st.sScopeTypeDesc, s.sSerialNumber
END
