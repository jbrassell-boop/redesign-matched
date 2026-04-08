CREATE PROCEDURE [dbo].[rptLoanerRequestsUnfulfilled]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@plDepartmentKey int = 0,
		@plContractKey int = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptLoanerRequestsUnfulfilled @pdtStartDate='9/1/2020', @pdtEndDate='10/1/2020'

	Create Table #Departments
		(
			lDepartmentKey int
		)

	If @plContractKey > 0
		Insert Into #Departments ( lDepartmentKey ) 
		Select d.lDepartmentKey From dbo.tblContractDepartments d
		Where d.dtContractDepartmentEffectiveDate <= @pdtEndDate And ((d.dtContractDepartmentEndDate Is Null) Or (d.dtContractDepartmentEndDate >= @pdtStartDate))
		Group By d.lDepartmentKey

    Select s.TaskStatus, Case st.sRigidOrFlexible 
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				When 'C' Then 'Camera'
				Else '' 
			End As InstrumentType, s.sScopeTypeDesc, s.sClientName1, s.sDepartmentName, dbo.fn_FullName(sr.sRepFirst,sr.sRepLast) As RepName,
		s.dtTaskDate
	From dbo.vwTaskStatuses s join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblDepartment d on (s.lDepartmentKey=d.lDepartmentKey)
		join dbo.tblSalesRep sr on (d.lSalesRepKey=sr.lSalesRepKey)
		left join #Departments de on (d.lDepartmentKey = de.lDepartmentKey)
	Where	s.dtTaskDate >= @pdtStartDate And s.dtTaskDate < DATEADD(day,1,@pdtEndDate)
		And ((@plDepartmentKey=0) Or (d.lDepartmentKey=@plDepartmentKey))
		And ((@plContractKey=0) Or (de.lDepartmentKey Is Not Null))
	Order By s.TaskStatus, Case st.sRigidOrFlexible 
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				When 'C' Then 'Camera'
				Else '' 
			End, s.sScopeTypeDesc, s.dtTaskDate, s.sClientName1, s.sDepartmentName
END

