CREATE PROCEDURE dbo.rptLoanerStatus
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	Create Table #Results
		(
			LoanerStatus nvarchar(50),
			sSerialNumber nvarchar(50),
			sScopeTypeDesc nvarchar(100),
			InstrumentType nvarchar(50),
			Client nvarchar(100),
			Department nvarchar(100),
			DateOut date,
			DateIn date,
			RepairDateIn date,
			sWorkOrderNumber nvarchar(50)
		)

	Insert Into #Results ( LoanerStatus, sSerialNumber, sScopeTypeDesc, InstrumentType, Client, Department, DateOut ) 
	Select 'Out', s.sSerialNumber, st.sScopeTypeDesc, 
		Case st.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'I' Then 'Instrument'
			When 'C' Then 'Camera'
			Else 'Unknown'
		END, c.sClientName1, d.sDepartmentName, lt.DateOut
	From dbo.vwLoanerTran lt join dbo.tblScope s on (lt.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		left join tblDepartment d on (lt.lDepartmentKey = d.lDepartmentKey)
		left join tblClient c on (d.lClientKey = c.lClientKey)
	Where lt.DateOut >= @pdtStartDate And lt.DateOut < DATEADD(day,1,@pdtEndDate)

	Insert Into #Results ( LoanerStatus, sSerialNumber, sScopeTypeDesc, InstrumentType, Client, Department, DateIn ) 
	Select 'In', s.sSerialNumber, st.sScopeTypeDesc, 
		Case st.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'I' Then 'Instrument'
			When 'C' Then 'Camera'
			Else 'Unknown'
		END, c.sClientName1, d.sDepartmentName, lt.DateIn
	From dbo.vwLoanerTran lt join dbo.tblScope s on (lt.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		left join tblDepartment d on (lt.lDepartmentKey = d.lDepartmentKey)
		left join tblClient c on (d.lClientKey = c.lClientKey)
	Where lt.DateIn >= @pdtStartDate And lt.DateIn < DATEADD(day,1,@pdtEndDate)


	Insert Into #Results ( LoanerStatus, sSerialNumber, sScopeTypeDesc, InstrumentType, RepairDateIn, sWorkOrderNumber ) 
	Select 'Repaired', s.sSerialNumber, st.sScopeTypeDesc, 
		Case st.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'I' Then 'Instrument'
			When 'C' Then 'Camera'
			Else 'Unknown'
		END, r.dtDateIn, r.sWorkOrderNumber
	From dbo.vwLoanerTran lt join dbo.tblScope s on (lt.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblRepair r on (lt.lRepairKey = r.lRepairKey)
	Where r.dtDateIn >= @pdtStartDate And r.dtDateIn < DATEADD(day,1,@pdtEndDate)

	Select * from #Results Order by LoanerStatus, DateIn, DateOut, RepairDateIn

	Drop Table #Results
END
