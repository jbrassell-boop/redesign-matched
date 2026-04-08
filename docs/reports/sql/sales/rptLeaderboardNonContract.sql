CREATE PROCEDURE dbo.rptLeaderboardNonContract
AS
BEGIN
	SET NOCOUNT ON;

	Select a.sWorkOrderNumber, a.lDepartmentKey, a.sBillName1, a.sDepartmentName, a.sScopeTypeDesc, a.dtDateIn, a.[Date Approved], a.dtDateOut, a.lSalesRepKey,
		a.sRepFirst, a.sRepLast, a.sRigidOrFlexible, Sum(a.dblRepairPrice) As [Billed Amount], a.DaysInHouse, a.DaysPostApproval
	From
	(
	SELECT r.lDepartmentKey, d.sBillName1, d.sDepartmentName, r.sWorkOrderNumber, st.sScopeTypeDesc, r.dtDateIn, r.dtAprRecvd AS [Date Approved], r.dtDateOut, 
		r.lSalesRepKey, sr.sRepFirst, sr.sRepLast, st.sRigidOrFlexible, rit.dblRepairPrice, DateDiff(day,r.dtDateIn,r.dtDateOut) - (DateDiff(week,[dtDateIn],[dtDateOut])*2) AS DaysInHouse, 
		DateDiff(day,r.dtAprRecvd,r.dtDateOut)-(DateDiff(week,r.dtAprRecvd,[dtDateOut])*2) AS DaysPostApproval
	FROM tblRepairItemTran rit join tblRepairItem ri On (rit.lRepairItemKey=ri.lRepairItemKey)
		join tblRepair r on rit.lRepairKey=r.lRepairKey 
		join tblScope s ON r.lScopeKey=s.lScopeKey
		join tblScopeType st ON s.lScopeTypeKey=st.lScopeTypeKey
		join tblSalesRep sr ON r.lSalesRepKey=sr.lSalesRepKey 
		join tblDepartment d ON r.lDepartmentKey=d.lDepartmentKey
	WHERE r.dtDateOut >= dbo.fn_FirstOfMonth(GetDate()) And r.dtDateOut < DateAdd(day,1,GetDate()) And r.sWorkOrderNumber Not Like '%[A-Z]'
	) a Left Join
	(
	SELECT cd.lDepartmentKey AS ACDeptKey
	FROM tblContract c join tblContractDepartments cd ON c.lContractKey = cd.lContractKey
	WHERE c.dtDateEffective<DateAdd(day,1,GetDate()) AND IsNull(c.dtDateTermination,GetDate()) >= GetDate()		
		And cd.dtContractDepartmentEffectiveDate<DateAdd(day,1,GetDate()) AND IsNull(cd.dtContractDepartmentEndDate,GetDate()) >= GetDate()
	) b on (a.lDepartmentKey=b.ACDeptKey)
	Where b.ACDeptKey Is Null
	Group By a.sWorkOrderNumber, a.lDepartmentKey, a.sBillName1, a.sDepartmentName, a.sScopeTypeDesc, a.dtDateIn, a.[Date Approved], a.dtDateOut, a.lSalesRepKey,
		a.sRepFirst, a.sRepLast, a.sRigidOrFlexible, a.DaysInHouse, a.DaysPostApproval
END
