CREATE PROCEDURE [dbo].[rptWithin40Days]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@psRigidOrFlexible nvarchar(1)
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptWithin40Days @pdtStartDate = '10/1/2024', @pdtEndDate = '10/28/2024', @psRigidOrFlexible='A'

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	if @lDatabaseKey = 1
		Select * from dbo.fnWithin40Days(@pdtStartDate, @pdtEndDate, @psRigidOrFlexible, 0) a
	else
		BEGIN
			Create Table #Results
				(
					ClientName1 nvarchar(200),
					sDepartmentName nvarchar(200),
					sWorkOrderNumber nvarchar(50),
					dtDateIn nvarchar(20),
					nDaysSinceLastIn int,
					sComplaintDesc nvarchar(300),
					sScopeTypeDesc nvarchar(200),
					sSerialNumber nvarchar(50),
					sRepLast nvarchar(50), 
					sRepFirst nvarchar(50),
					ResultOfImproperCareByCustomer nvarchar(20),
					Failure_ImproperCare nvarchar(1),
					Failure_Part nvarchar(1),
					Failure_Cosmetic nvarchar(1),
					Failure_ImproperTechnique nvarchar(1),
					Failure_PreviousInspection nvarchar(1),
					Failure_PreviousRepairs nvarchar(1),
					Failure_Complaint nvarchar(1),
					Failure_NoPreviousRepairs nvarchar(1),
					Failure_Other nvarchar(1),
					lSalesRepKey int,
					lDepartmentKey int
				)

			Insert Into #Results Select * from dbo.fnWithin40Days(@pdtStartDate, @pdtEndDate, 'A', 0) a

			Insert Into #Results EXEC TSI.WinscopeNet.dbo.within40DaysReportForSouth @pdtStartDate, @pdtEndDate, 'A'

			Select * From #Results
			Drop Table #Results
		END


END
