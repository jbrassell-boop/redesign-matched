CREATE PROCEDURE [dbo].[rptRepairDefectTrackingForSouth]
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime,
		@psRigidOrFlexible nvarchar(1)
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()
	
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


	if @lDatabaseKey = 1
		BEGIN
			Insert Into #Results ( sClientName1, sDepartmentName, sWorkOrderNumber, dtDateIn, sComplaintDesc, sScopeTypeDesc, sSerialNumber, 
				sRepLast, sRepFirst, DefectDate, DefectTime, DefectReason,
					Defect_LeakTest,
					Defect_ControlButtons,
					Defect_Image,
					Defect_VideoFunctions,
					Defect_Angulation,
					Defect_VariableFunction,
					Defect_Other,
					DefectFollowUp,
					sTechnician )
			Select c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber, dbo.fn_FormatDate(r.dtDateIn,'MM/dd/yyyy') as dtDateIn, r.sComplaintDesc, 
				st.sScopeTypeDesc, s.sSerialNumber, sr.sRepLast, sr.sRepFirst, r.dtDefectTrackingDate, r.dtDefectTrackingTIme, 
					Case r.sDefectReason
						When 'R' Then 'Rework'
						When 'U' Then 'Unrelated to previous repairs'
						Else ''
					End As sDefectReason,
				Case Sum(Case When dt.lDefectTrackingItemKey = 1 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_LeakTest,
				Case Sum(Case When dt.lDefectTrackingItemKey = 2 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_ControlButtons,
				Case Sum(Case When dt.lDefectTrackingItemKey = 3 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_Image,
				Case Sum(Case When dt.lDefectTrackingItemKey = 4 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_VideoFunctions,
				Case Sum(Case When dt.lDefectTrackingItemKey = 5 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_Angulation,
				Case Sum(Case When dt.lDefectTrackingItemKey = 6 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_VariableFunctions,
				Case Sum(Case When dt.lDefectTrackingItemKey = 7 Then 1 Else 0 End) 
					When 0 Then ''
					Else 'X'
				End As Defect_Other,
				r.sDefectFollowUpNotes, t.sTechName
			From dbo.tblRepair r join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
				join TSS.WinscopeNetNashville.dbo.tblSalesRep sr on (r.lSalesRepKey = sr.lSalesRepKey)
				join dbo.tblRepairDefectTracking dt on (r.lRepairKey = dt.lRepairKey)
				left join TSS.WinscopeNetNashville.dbo.tblTechnicians t on (r.lTechnicianKey_DefectTracking = t.lTechnicianKey)
			Where r.dtDefectTrackingDate >= @pdtStartDate And r.dtDefectTrackingDate < DateAdd(day,1,@pdtEndDate)
				And (@psRigidOrFlexible='A' Or st.sRigidOrFlexible=@psRigidOrFlexible)
				And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
						Or
						(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
					)
			Group by c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber, r.dtDateIn, r.sComplaintDesc, st.sScopeTypeDesc, s.sSerialNumber, 
				sr.sRepLast, sr.sRepFirst, r.dtDefectTrackingDate, r.dtDefectTrackingTime, r.sDefectReason, r.sDefectFollowUpNotes, t.sTechName
		END

	Select * from #Results
	Drop Table #Results
END
