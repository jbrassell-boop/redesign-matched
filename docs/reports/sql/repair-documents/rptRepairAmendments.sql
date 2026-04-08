CREATE PROCEDURE [dbo].[rptRepairAmendments]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@pbIncludeRepairItems bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRepairAmendments @pdtStartDate = '1/1/2021', @pdtEndDate = '1/31/2021', @pbIncludeRepairItems = 1

	Create Table #Results
		(
			lAmendRepairCommentKey int, 
			lRepairKey int,
			lClientKey int,
			lDepartmentKey int,
			sClientName1 nvarchar(200),
			sDepartmentName nvarchar(200),
			dtAmendmentDate date,
			sWorkOrderNumber nvarchar(50),
			sAmendmentType nvarchar(50),
			sAmendmentReason nvarchar(100),
			sAmendmentComment nvarchar(MAX),
			lRepairItemTranKey int,
			sItemDescription nvarchar(200),
			nLaborCost decimal(10,2),
			nInventoryCost decimal(10,2),
			sInstrumentType nvarchar(50),
			sModel nvarchar(200),
			sSerialNumber nvarchar(50),
			ContractRepair nvarchar(1),
			ApprovalDateReset nvarchar(1)

		)

	Insert Into #Results ( lAmendRepairCommentKey, lRepairKey, lClientKey, lDepartmentKey, sClientName1, sDepartmentName, 
		dtAmendmentDate, sWorkOrderNumber, sAmendmentType, sAmendmentReason, sAmendmentComment, lRepairItemTranKey, sItemDescription,
		sInstrumentType, sModel, sSerialNumber, ContractRepair, ApprovalDateReset )
	Select a.lAmendRepairCommentKey, a.lRepairKey, c.lClientKey, d.lDepartmentKey, c.sClientName1, d.sDepartmentName, 
		a.dtAmendmentDate, re.sWorkOrderNumber, t.sAmendRepairType, r.sAmendRepairReason, a.sAmendRepairComment,
		Case When @pbIncludeRepairItems = 1 Then rit.lRepairItemTranKey Else 0 End, 
		Case When @pbIncludeRepairItems = 1 Then ri.sItemDescription Else '' End,
		st.sRigidOrFlexible, st.sScopeTypeDesc, s.sSerialNumber, Case When ISNULL(re.lContractKey,0)=0 Then Null Else 'X' End,
		Case When ISNULL(a.bApprovalDateReset,0)=1 Then 'X' Else Null End
	From dbo.tblAmendRepairComments a 
		join dbo.tblAmendRepairTypes t on (a.lAmendRepairTypeKey = t.lAmendRepairTypeKey)
		join dbo.tblAmendRepairReasons r on (a.lAmendRepairReasonKey = r.lAmendRepairReasonKey)
		join dbo.tblRepair re on (a.lRepairKey = re.lRepairKey)
		join dbo.tblDepartment d on (re.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (re.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		left join dbo.tblRepairItemTran rit on (a.lAmendRepairCommentKEy = rit.lAmendRepairCommentKey)
		left join dbo.tblRepairItem ri on (rit.lRepairItemKey = ri.lRepairItemKey)
	Where a.dtAmendmentDate >= @pdtStartDate And a.dtAmendmentDate < DATEADD(day,1,@pdtEndDate)
	Order By a.dtAmendmentDate, c.sClientName1, d.sDepartmentName

	Update #Results
	Set sInstrumentType = Case sInstrumentType 
							When 'F' Then 'Flexible'
							When 'R' Then 'Rigid'
							When 'I' Then 'Instrument'
							When 'C' Then 'Camera'
							Else sInstrumentType
						End 

	If @pbIncludeRepairItems = 1
		BEGIN
			Create Table #RepairKeys
				(
					ID int identity(1,1),
					lRepairKey int
				)

			Insert Into #RepairKeys ( lRepairKey ) Select r.lRepairKey From #Results r Group By r.lRepairKey

			Declare @lRepairKey int
			Declare @cnt int
			Declare @i int
			Select @cnt = Count(*) From #RepairKeys
			Set @i = 1

			While (@i <= @cnt)
				BEGIN
					Select @lRepairKey = lRepairKey From #RepairKeys Where ID = @i

					Update r 
					Set nLaborCost = c.LaborCost
					From #Results r join dbo.fn_GetRepairLaborCosts(@lRepairKey) c on (r.lRepairItemTranKey = c.lRepairItemTranKey)

					Update r 
					Set nInventoryCost = c.InventoryCost
					From #Results r join dbo.fn_RepairInventoryCost(@lRepairKey,0) c on (r.lRepairItemTranKey = c.lRepairItemTranKey)
								
					Set @i = @i + 1
				END

			Drop Table #RepairKeys

			Select r.lAmendRepairCommentKey, r.lRepairKey, r.lClientKey, r.lDepartmentKey, r.sClientName1, r.sDepartmentName, r.dtAmendmentDate, r.sWorkOrderNumber,
				r.sAmendmentType, r.sAmendmentReason, r.sAmendmentComment, 
				r.sInstrumentType, r.sModel, r.sSerialNumber, r.ContractRepair, r.ApprovalDateReset,
				r.lRepairItemTranKey, r.sItemDescription, r.nLaborCost, r.nInventoryCost
			From #Results r 
			Order By r.dtAmendmentDate, r.sClientName1, r.sDepartmentName
		END	
	else
		BEGIN
			Select r.lAmendRepairCommentKey, r.lRepairKey, r.lClientKey, r.lDepartmentKey, r.sClientName1, r.sDepartmentName, r.dtAmendmentDate, r.sWorkOrderNumber,
				r.sAmendmentType, r.sAmendmentReason, r.sAmendmentComment,
			r.sInstrumentType, r.sModel, r.sSerialNumber, r.ContractRepair, r.ApprovalDateReset
			From #Results r 
			Group By r.lAmendRepairCommentKey, r.lRepairKey, r.lClientKey, r.lDepartmentKey, r.sClientName1, r.sDepartmentName, r.dtAmendmentDate, r.sWorkOrderNumber,
				r.sAmendmentType, r.sAmendmentReason, r.sAmendmentComment, r.sInstrumentType, r.sModel, r.sSerialNumber, r.ContractRepair, r.ApprovalDateReset
			Order By r.dtAmendmentDate, r.sClientName1, r.sDepartmentName
		END


	Drop Table #Results
END
