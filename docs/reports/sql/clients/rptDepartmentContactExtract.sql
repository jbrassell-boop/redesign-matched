CREATE PROCEDURE [dbo].[rptDepartmentContactExtract]
	
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptDepartmentContactExtract

	Create Table #LastDateIn
		(
			lDepartmentKey int,
			dtLastDateIn date
		)

	Insert Into #LastDateIn ( lDepartmentKey ) 
	Select d.lDepartmentKey
	From tblClient c join tblDepartment d on (c.lClientKey=d.lClientKey) 
		join tblContactTran ct on (d.lDepartmentKey=ct.lDepartmentKey)
		join tblContacts co on (ct.lContactKey=co.lContactKey)
		left join dbo.tblSalesRep sr on (d.lSalesRepKey = sr.lSalesRepKey)
	Where co.bActive = 1 And d.bActive = 1 And c.bActive = 1
	Group By d.lDepartmentKey

	Update l
	Set dtLastDateIn = a.MaxDateIn
	From #LastDateIn l join 
		(
			Select r.lDepartmentKey, MAX(r.dtDateIn) As MaxDateIn
			From dbo.tblRepair r join #LastDateIn l on (r.lDepartmentKey = l.lDepartmentKey)
			Group By r.lDepartmentKey
		) a on (l.lDepartmentKey = a.lDepartmentKey)

    Select ct.lContactTranKey, c.sClientName1, d.sDepartmentName, d.sShipAddr1, d.sShipAddr2, d.sShipCity, d.sShipState, d.sShipZip, 
		co.sContactLast, co.sContactFirst, co.sContactPhoneVoice, co.sContactEMail,
		LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As RepName,
		l.dtLastDateIn As LastDateIn
	From tblClient c join tblDepartment d on (c.lClientKey=d.lClientKey) 
		join tblContactTran ct on (d.lDepartmentKey=ct.lDepartmentKey)
		join tblContacts co on (ct.lContactKey=co.lContactKey)
		left join dbo.tblSalesRep sr on (d.lSalesRepKey = sr.lSalesRepKey)
		left join #LastDateIn l on (d.lDepartmentKey = l.lDepartmentKey)
	Where co.bActive = 1 And d.bActive = 1 And c.bActive = 1
	Order By c.sClientName1, d.sDepartmentName, co.sContactLast, co.sContactFirst
END
