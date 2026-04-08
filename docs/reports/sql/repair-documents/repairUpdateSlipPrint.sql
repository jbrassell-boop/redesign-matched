CREATE PROCEDURE [dbo].[repairUpdateSlipPrint]
	(
		@plRepairKey int = 0, 
		@plRepairUpdateSlipKey int = 0,
		@pbIncludeTechs bit = 1
	)
AS
BEGIN
	SET NOCOUNT ON;

	/*
		exec dbo.repairUpdateSlipPrint @plRepairKey=481773, @plRepairUpdateSlipKey=0
		exec dbo.repairUpdateSlipPrint @plRepairKey=0, @plRepairUpdateSlipKey=5
		exec dbo.repairUpdateSlipPrint @plRepairKey=549061, @plRepairUpdateSlipKey=0
		exec dbo.repairUpdateSlipPrint @plRepairKey=552519, @plRepairUpdateSlipKey=0
	*/
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Declare @sWorkOrderNumber nvarchar(50)

	if @plRepairKey = 0 And @plRepairUpdateSlipKey > 0 
		Select @plRepairKey = lRepairKey From dbo.tblRepairUpdateSlips Where lRepairUpdateSlipKey = @plRepairUpdateSlipKey

	if @plRepairKey > 0
		BEGIN
			Select @sWorkOrderNumber = r.sWorkOrderNumber 		From dbo.tblRepair r Where r.lRepairKey = @plRepairKey
		END

	Declare @lBarCodeKey int
	Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Update Slip'

	Create Table #Results
		(
			ID int identity(1,1),
			lRepairUpdateSlipKey int,
			RequestDate nvarchar(50),
			sClientName1 nvarchar(200),
			sDepartmentName nvarchar(200),
			sScopeTypeDesc nvarchar(300),
			sSerialNumber nvarchar(50),
			sUpdateSlipReason nvarchar(200),
			sUpdateSlipReasonComment nvarchar(200),
			sUpdateSlipReasonFindings nvarchar(200),
			sBarCode nvarchar(50),
			TechName1 nvarchar(200),
			TechName2 nvarchar(200),
			lResponsibleTech int,
			lResponsibleTech2 int
		)

	Insert Into #Results ( lRepairUpdateSlipKey, RequestDate, sClientName1, sDepartmentName, sScopeTypeDesc, sSerialNumber, sUpdateSlipReason, sUpdateSlipReasonComment,
		sUpdateSlipReasonFindings, sBarCode, TechName1, TechName2, lResponsibleTech, lResponsibleTech2 )
	Select s.lRepairUpdateSlipKey, dbo.fn_FormatDate(s.dtUpdateRequestDate,'MM/dd/yyyy') As RequestDate, c.sClientName1, d.sDepartmentName, st.sScopeTypeDesc, sc.sSerialNumber, 
		Case When rsr.lUpdateSlipReasonKey=0 Then rsr.sUpdateSlipReasonOther else sr.sUpdateSlipReason End As sUpdateSlipReason, rsr.sUpdateSlipReasonComment, rsr.sUpdateSlipReasonFindings,
		Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(s.lRepairKey as varchar(15)) As sBarCode,
		Case When @pbIncludeTechs=0 Then '' Else ISNULL(t1.sTechName,'') End as TechName1, 
		Case When @pbIncludeTechs=0 Then '' Else ISNULL(t2.sTechName,'') End As TechName2,
		s.lResponsibleTech, s.lResponsibleTech2
	From dbo.tblRepairUpdateSlips s 
		join dbo.tblRepair r on (s.lRepairKey=r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey=c.lClientKey)
		join dbo.tblScope sc on (r.lScopeKey=sc.lScopeKey)
		join dbo.tblScopeType st on (sc.lScopeTypeKey=st.lScopeTypeKey)
		left join dbo.tblRepairUpdateSlipReasons rsr on (s.lRepairUpdateSlipKey=rsr.lRepairUpdateSlipKey)
		left join dbo.tblUpdateSlipReasons sr on (rsr.lUpdateSlipReasonKey=sr.lUpdateSlipReasonKey)
		left join dbo.tblTechnicians t1 on (s.lResponsibleTech = t1.lTechnicianKey)
		left join dbo.tblTechnicians t2 on (s.lResponsibleTech2 = t2.lTechnicianKey)
	Where	((IsNull(@plRepairKey,0)=0) Or (s.lRepairKey=@plRepairKey)) 
		And ((IsNull(@plRepairUpdateSlipKey,0)=0) Or (s.lRepairUpdateSlipKey=@plRepairUpdateSlipKey))
	Order By s.dtUpdateRequestDate, s.lRepairUpdateSlipKey, rsr.lRepairUpdateSlipReasonKey

	if @lDatabaseKey = 1 And SUBSTRING(@sWorkOrderNumber,1,1)='S'
		BEGIN
			Update #Results Set TechName1 = Null, TechName2 = Null

			Update r Set TechName1 = t.sTechName From #Results r left join TSS.WinscopeNetNashville.dbo.tblTechnicians t on (r.lResponsibleTech = t.lTechnicianKey)
			Update r Set TechName2 = t.sTechName From #Results r left join TSS.WinscopeNetNashville.dbo.tblTechnicians t on (r.lResponsibleTech2 = t.lTechnicianKey)
		END

	Select lRepairUpdateSlipKey, RequestDate, sClientName1, sDepartmentName, sScopeTypeDesc, sSerialNumber, sUpdateSlipReason, sUpdateSlipReasonComment,
		sUpdateSlipReasonFindings, sBarCode, TechName1, TechName2
	From #Results r 
	Order By ID

	Drop Table #Results
END

