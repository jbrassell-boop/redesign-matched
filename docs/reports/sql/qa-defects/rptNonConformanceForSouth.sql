CREATE PROCEDURE [dbo].[rptNonConformanceForSouth]
	(
		@pdtStartDate datetime = Null,
		@pdtEndDate datetime = Null,
		@plRepairKey int = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Create Table #Results
		(
			sClientName1 nvarchar(300), 
			sDepartmentName nvarchar(300), 
			sWorkOrderNumber nvarchar(50), 
			sComplaintDesc nvarchar(300), 
			dtDateIn nvarchar(50), 
			dtDateReceived nvarchar(50), 
			ReceivedBy nvarchar(200),
			ReceivedByMethod nvarchar(50), 
			sRecvdByOther nvarchar(50),
			mComplaint nvarchar(MAX), 
			mInstructions nvarchar(MAX), 
			ResponsibleManager nvarchar(200),
			dtDateAssigned nvarchar(50), 
			dtDateResponseDue nvarchar(50),
			dtEvalDate nvarchar(50), 
			Evaluator nvarchar(200),
			mEvalResults nvarchar(MAX), 
			mEvalConclusion nvarchar(MAX), 
			mFnlDispAction nvarchar(MAX),
			dtFnlDispDate nvarchar(50),
			QAReviewer nvarchar(200),
			sISOComplaint nvarchar(50), 
			sISONonConformance nvarchar(50),
			sImpactOnProduct nvarchar(MAX), 
			sVOE nvarchar(MAX), 
			dtVOE nvarchar(50), 
			VOEReviewer nvarchar(200)
		)

	if @lDatabaseKey = 1 
		BEGIN
			Insert Into #Results ( sClientName1, sDepartmentName, sWorkOrderNumber, sComplaintDesc, dtDateIn, dtDateReceived, ReceivedBy, ReceivedByMethod,
				sRecvdByOther, mComplaint, mInstructions, ResponsibleManager, dtDateAssigned, dtDateResponseDue, dtEvalDate, Evaluator, mEvalResults, mEvalConclusion,
				mFnlDispAction, dtFnlDispDate, QAReviewer, sISOComplaint, sISONonConformance, sImpactOnProduct, sVOE, dtVOE, VOEReviewer )
			SELECT c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber, r.sComplaintDesc, dbo.fn_FormatDate(r.dtDateIn,'MM/dd/yyyy') As dtDateIn, 
				dbo.fn_FormatDate(i.dtDateReceived,'MM/dd/yyyy') As dtDateReceived, 
				Case When UsersRec.lUserKey Is Null Then '' Else Case When IsNull(UsersRec.sUserFullName,'')='' Then UsersRec.sUserName Else UsersRec.sUserFullName End End As ReceivedBy,
				Case IsNull(i.nRecvdByMethod,6)
					When 0 Then 'Phone'
					When 1 Then 'Letter'
					When 2 Then 'Sales'
					When 3 Then 'Evaluation'
					When 4 Then 'Visit'
					When 5 Then 'Other - ' + IsNull(i.sRecvdByOther,'Unknown')
					When 6 Then 'Unknown'
				End As ReceivedByMethod, i.sRecvdByOther,
				i.mComplaint, i.mInstructions, 
				Case When UsersResp.lUserKey Is Null Then '' Else Case When IsNull(UsersResp.sUserFullName,'')='' Then UsersResp.sUserName Else UsersResp.sUserFullName End End As ResponsibleManager,
				dbo.fn_FormatDate(i.dtDateAssigned,'MM/dd/yyyy') As dtDateAssigned, dbo.fn_FormatDate(i.dtDateResponseDue,'MM/dd/yyyy') As dtDateResponseDue,
				dbo.fn_FormatDate(i.dtEvalDate,'MM/dd/yyyy') As dtEvalDate, 
				Case When UsersEval.lUserKey Is Null Then '' Else Case When IsNull(UsersEval.sUserFullName,'')='' Then UsersEval.sUserName Else UsersEval.sUserFullName End End As Evaluator,
				i.mEvalResults, i.mEvalConclusion, i.mFnlDispAction,
				dbo.fn_FormatDate(i.dtFnlDispDate,'MM/dd/yyyy') As dtFnlDispDate,
				Case When UsersQARev.lUserKey Is Null Then '' Else Case When IsNull(UsersQARev.sUserFullName,'')='' Then UsersQARev.sUserName Else UsersQARev.sUserFullName End End As QAReviewer,
				i.sISOComplaint, i.sISONonConformance,
				i.sImpactOnProduct, i.sVOE, dbo.fn_FormatDate(i.dtVOE,'MM/dd/yyyy') As dtVOE, 
				Case When UsersVOE.lUserKey Is Null Then '' Else Case When IsNull(UsersVOE.sUserFullName,'')='' Then UsersVOE.sUserName Else UsersVOE.sUserFullName End End As VOEReviewer
			FROM dbo.tblClient c JOIN dbo.tblDepartment d ON c.lClientKey = d.lClientKey
				join dbo.tblRepair r ON d.lDepartmentKey = r.lDepartmentKey
				join dbo.tblISOComplaint i ON r.lRepairKey = i.lRepairKey
				Left Join TSS.WinscopeNetNashville.dbo.tblUsers UsersEval on (i.lEvalUserKey=UsersEval.lUserKey)
				Left Join TSS.WinscopeNetNashville.dbo.tblUsers UsersResp on (i.lResponsibleMgrUserKey=UsersResp.lUserKey)
				Left Join TSS.WinscopeNetNashville.dbo.tblUsers UsersQARev on (i.lFnlDispQAUserKey=UsersQARev.lUserKey)
				Left Join TSS.WinscopeNetNashville.dbo.tblUsers UsersRec on (i.lRecvdByUserKey=UsersRec.lUserKey)
				Left Join TSS.WinscopeNetNashville.dbo.tblUsers UsersVOE on (i.lVOEUserKey=UsersVOE.lUserKey)
			WHERE i.sISONonConformance='Y'
				And  ((IsNull(@pdtStartDate,'1/1/1753')='1/1/1753') Or (r.dtDateIn >= @pdtStartDate))
				And  ((IsNull(@pdtEndDate,'1/1/1753')='1/1/1753') Or (r.dtDateIn < DateAdd(day,1,@pdtEndDate)))
				And  ((IsNull(@plRepairKey,0)=0) Or (r.lRepairKey=@plRepairKey))
				And	 SUBSTRING(r.sWorkOrderNumber,1,1)='S'
		END

	Select * from #Results
	Drop Table #Results
END