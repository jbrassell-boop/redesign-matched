CREATE PROCEDURE dbo.rptDepartmentAudit
	
AS
BEGIN
	SET NOCOUNT ON;

    Select c.sClientName1, d.sDepartmentName, d.dtCustomerSince, r.dtLastDateIn 
	From tblClient c join tblDepartment d on (c.lClientKey = d.lClientKey)
		left join (Select lDepartmentKey, MAX(dtDateIn) As dtLastDateIn From dbo.tblRepair Group By lDepartmentKey) r on (d.lDepartmentKey = r.lDepartmentKey)
	Where d.bActive = 1 and dtLastDateIn >= DATEADD(year,-1,GetDate())
	Order By c.sClientName1, d.sDepartmentName
END
