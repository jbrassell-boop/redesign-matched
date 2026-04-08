CREATE PROCEDURE [dbo].[rptAnnualSurvey_ActiveCustomers]
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptAnnualSurvey_ActiveCustomers @pdtStartDate='1/1/2014', @pdtEndDate='8/31/2014'

	Declare @EffectiveDate date
	Set @EffectiveDate = Convert(Date,DateAdd(month,-6,GetDate()))

	Create Table #Departments 
		(
			lDepartmentKey int
		)

	Insert Into #Departments ( lDepartmentKey ) Select iv.lDepartmentKey From tblInvoice iv Where dtTranDate >= @EffectiveDate Group By iv.lDepartmentKey

	Create Index idx_Dept On #Departments ( lDepartmentKey )

	Create Table #Results
		(
			lDepartmentKey int,
			sClientName1 nvarchar(100),
			sDepartmentName nvarchar(100),
			sRepLast nvarchar(50),
			sRepFirst nvarchar(50),
			RepName nvarchar(100),
			LastInvoiceDate date,
			Amt decimal(10,2),
			ContactLastName nvarchar(50),
			ContactFirstName nvarchar(50),
			sContactPhoneVoice nvarchar(50),
			sContactPhoneFAX nvarchar(50),
			sContactEmail nvarchar(100),
			sShipAddr1 nvarchar(200),
			sShipAddr2 nvarchar(200),
			sShipCity nvarchar(200),
			sShipState nvarchar(50),
			sShipZip nvarchar(50),
			sShipCountry nvarchar(50)
		)

	Insert Into #Results ( lDepartmentKey, sClientName1, sDepartmentName, sRepLast, sRepFirst, RepName, 
		sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, sShipCountry,
		LastInvoiceDate, Amt )
	Select d.lDepartmentKey, c.sClientName1, d.sDepartmentName, sr.sRepLast, sr.sRepFirst, IsNull(sr.sRepFirst,'') + ' ' + IsNull(sr.sRepLast,'') As RepName, 
		d.sShipAddr1, d.sShipAddr2, d.sShipCity, d.sShipState, d.sShipZip, d.sShipCountry,
		dbo.fn_FormatDate(Max(iv.dtTranDate),'mm/dd/yyyy') As LastInvoiceDate, Sum(iv.dblTranAmount) As Amt
	From #Departments dt join tblDepartment d on (dt.lDepartmentKey=d.lDepartmentKey)
		join tblClient c on (d.lClientKey=c.lClientKey)
		join tblInvoice iv on (dt.lDepartmentKey=iv.lDepartmentKey)
		join tblSalesRep sr on (d.lSalesRepKey=sr.lSalesRepKey)
	Where iv.dtTranDate >= @pdtStartDate And iv.dtTranDate < DateAdd(day,1,@pdtEndDate)
	Group By d.lDepartmentKey, c.sClientName1, sr.sRepLast, sr.sRepFirst, d.sDepartmentName, IsNull(sr.sRepFirst,'') + ' ' + IsNull(sr.sRepLast,''),
		d.sShipAddr1, d.sShipAddr2, d.sShipCity, d.sShipState, d.sShipZip, d.sShipCountry
	Order By Max(iv.dtTranDate), c.sClientName1, d.sDepartmentName
	--Order By c.sClientName1, d.sDepartmentName

	Update r
	Set ContactLastName = co.sContactLast,
		ContactFirstName = co.sContactFirst,
		sContactPhoneVoice = co.sContactPhoneVoice,
		sContactPhoneFAX = co.sContactPhoneFAX,
		sContactEmail = co.sContactEmail
	From #Results r join 
		(	Select ct.lDepartmentKey, MAX(c.lContactKey) As lContactKey  
			From #Departments d join tblContactTran ct on (d.lDepartmentKey = ct.lDepartmentKey)
			join tblContacts c on (ct.lContactKey=c.lContactKey) 
			Where c.bActive=1
			Group By ct.lDepartmentKey
		) c on (r.lDepartmentKey = c.lDepartmentKey)
		join dbo.tblContacts co on (c.lContactKey = co.lContactKey)

	
	Select * From #Results
	
	Drop Table #Departments
	Drop Table #Results
END
