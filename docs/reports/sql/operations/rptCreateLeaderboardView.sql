CREATE PROCEDURE dbo.rptCreateLeaderboardView
	(
		@pdtMonth datetime
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptCreateLeaderboardView @pdtMonth = '9/1/2014'

	Declare @FirstOfMonth datetime
	Set @FirstOfMonth = dbo.fn_FirstOfMonth(@pdtMonth)

	Declare @FirstOfNextMonth datetime
	Set @FirstOfNextMonth = DateAdd(month,1,@FirstOfMonth)

	Begin Try
		DROP VIEW dbo.vwNewLeaderboard
	End Try
	Begin Catch
	End Catch

	Declare @strSQL varchar(8000)
	Set @strSQL = 'CREATE VIEW [dbo].[vwNewLeaderboard] AS ' + nchar(13)
	Set @strSQL = @strSQL + 'SELECT a.sWorkOrderNumber, a.lDepartmentKey, a.sBillName1, a.sDepartmentName, a.sScopeTypeDesc, a.dtDateIn, a.[Date Approved], a.dtDateOut, a.lSalesRepKey, a.sRepFirst, a.sRepLast, a.sRigidOrFlexible, SUM(a.dblRepairPrice) AS [Billed Amount], a.DaysInHouse, a.DaysPostApproval '
	Set @strsQL = @strSQL + 'FROM (SELECT r.lDepartmentKey, d.sBillName1, d.sDepartmentName, r.sWorkOrderNumber, st.sScopeTypeDesc, r.dtDateIn, r.dtAprRecvd AS [Date Approved], r.dtDateOut, r.lSalesRepKey, sr.sRepFirst, sr.sRepLast, st.sRigidOrFlexible, rit.dblRepairPrice, '
	Set @strSQL = @strSQL + 'DATEDIFF(day, r.dtDateIn, r.dtDateOut) - DATEDIFF(week, r.dtDateIn, r.dtDateOut) * 2 AS DaysInHouse, DATEDIFF(day, r.dtAprRecvd, r.dtDateOut) - DATEDIFF(week, r.dtAprRecvd, r.dtDateOut) * 2 AS DaysPostApproval '
	Set @strSQL = @strSQL + 'FROM dbo.tblRepairItemTran AS rit INNER JOIN dbo.tblRepairItem AS ri ON rit.lRepairItemKey = ri.lRepairItemKey INNER JOIN dbo.tblRepair AS r ON rit.lRepairKey = r.lRepairKey INNER JOIN dbo.tblScope AS s ON r.lScopeKey = s.lScopeKey INNER JOIN dbo.tblScopeType AS st ON s.lScopeTypeKey = st.lScopeTypeKey INNER JOIN '
	Set @strSQL = @strSQL + 'dbo.tblSalesRep AS sr ON r.lSalesRepKey = sr.lSalesRepKey INNER JOIN dbo.tblDepartment AS d ON r.lDepartmentKey = d.lDepartmentKey WHERE (r.dtDateOut >=''' + dbo.fn_FormatDate(@FirstOfMonth,'MM/dd/yyyy') + ''') AND (r.dtDateOut < ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''') AND (r.sWorkOrderNumber NOT LIKE ''%[A-Z]'')) AS a LEFT OUTER JOIN '
	Set @strSQL = @strSQL + '(SELECT cd.lDepartmentKey AS ACDeptKey FROM dbo.tblContract AS c INNER JOIN dbo.tblContractDepartments AS cd ON c.lContractKey = cd.lContractKey WHERE (c.dtDateEffective < ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''') AND (ISNULL(c.dtDateTermination, ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''') >= ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''') AND '
	Set @strSQL = @strSQL + '(cd.dtContractDepartmentEffectiveDate < ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''') AND (ISNULL(cd.dtContractDepartmentEndDate, ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''') >= ''' + dbo.fn_FormatDate(@FirstOfNextMonth,'MM/dd/yyyy') + ''')) AS b ON a.lDepartmentKey = b.ACDeptKey '
	Set @strSQL = @strSQL + 'WHERE (b.ACDeptKey IS NULL) GROUP BY a.sWorkOrderNumber, a.lDepartmentKey, a.sBillName1, a.sDepartmentName, a.sScopeTypeDesc, a.dtDateIn, a.[Date Approved], a.dtDateOut, a.lSalesRepKey, a.sRepFirst, a.sRepLast, a.sRigidOrFlexible, a.DaysInHouse, a.DaysPostApproval'

	--Print (@strSQL)

	exec(@strSQL)
END
