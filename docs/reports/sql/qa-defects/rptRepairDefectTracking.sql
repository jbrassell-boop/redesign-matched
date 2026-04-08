CREATE PROCEDURE [dbo].[rptRepairDefectTracking]
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime,
		@psRigidOrFlexible nvarchar(1)
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRepairDefectTracking @pdtStartDate = '1/1/2018', @pdtEndDate = '12/31/2018', @psRigidOrFlexible='A'
	
	Create Table #Results
		(
			sClientName1 nvarchar(200),
			sDepartmentName nvarchar(200),
			sWorkOrderNumber nvarchar(50),
			dtDateIn nvarchar(20),
			sComplaintDesc nvarchar(300),
			sScopeTypeDesc nvarchar(200),
			sSerialNumber nvarchar(50),
			sRepLast nvarchar(50), 
			sRepFirst nvarchar(50),
			DefectDate datetime,
			DefectTime datetime,
			DefectReason nvarchar(200),
			Defect_LeakTest nvarchar(1),
			Defect_ControlButtons nvarchar(1),
			Defect_Image nvarchar(1),
			Defect_VideoFunctions nvarchar(1),
			Defect_Angulation nvarchar(1),
			Defect_VariableFunction nvarchar(1),
			Defect_Other nvarchar(1),
			DefectFollowUp nvarchar(MAX),
			sTechnician nvarchar(100)
		)

	Insert Into #Results ( sClientName1, sDepartmentName, sWorkOrderNumber, dtDateIn, sComplaintDesc, sScopeTypeDesc, sSerialNumber, sRepLast, sRepFirst, DefectDate,
		DefectTime, DefectReason, Defect_LeakTest, Defect_ControlButtons, Defect_Image, Defect_VideoFunctions, Defect_Angulation, Defect_VariableFunction, Defect_Other,
		DefectFollowUp, sTechnician )
	Select a.sClientName1, a.sDepartmentName, a.sWorkOrderNumber, a.dtDateIn, a.sComplaintDesc, a.sScopeTypeDesc, a.sSerialNumber, a.sRepLast, a.sRepFirst, a.DefectDate,
		a.DefectTime, a.DefectReason, a.Defect_LeakTest, a.Defect_ControlButtons, a.Defect_Image, a.Defect_VideoFunctions, a.Defect_Angulation, a.Defect_VariableFunction, a.Defect_Other,
		a.DefectFollowUp, a.sTechnician
	from dbo.fnDefectTracking(@pdtStartDate, @pdtEndDate, @psRigidOrFlexible) a

	--Declare @lDatabaseKey int
	--Set @lDatabaseKey = dbo.fnDatabaseKey()

	--if @lDatabaseKey = 2 
	--	BEGIN
	--		Insert Into #Results EXEC dbo.rptRepairDefectTrackingForSouth @pdtStartDate, @pdtEndDate, @psRigidOrFlexible
	--	END

	Select * from #Results r Order By r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber
	Drop Table #Results
END
