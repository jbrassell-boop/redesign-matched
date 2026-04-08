CREATE PROCEDURE [dbo].[rptCostAnalysis]
	(	
		@plContractKey int,
		@pdtDateFrom datetime,
		@pdtDateTo datetime,
		@plPricingCategoryKey int,
		@pbSummary bit
	)	
AS
BEGIN
	SET NOCOUNT ON;

	Declare @dtDateFrom date
	Declare @dtDateTo date

	Set @dtDateFrom = Convert(Date,@pdtDateFrom)
	Set @dtDateTo = Convert(Date,@pdtDateTo)

	Declare @Results Table
		(
			Contract nvarchar(50),
			Client nvarchar(50),
			Department nvarchar(50),
			Model nvarchar(50),
			SerialNumber nvarchar(50),
			WorkOrder nvarchar(50),
			DateIn date,
			DateOut date,
			RepairItem nvarchar(50),
			RepairCost money
		)

	Insert Into @Results ( Contract, Client, Department, Model, SerialNumber, WorkOrder, DateIn, DateOut, RepairItem, RepairCost ) 
	Select co.sContractName1, c.sClientName1, d.sDepartmentName, st.sScopeTypeDesc, s.sSerialNumber, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut, 
			ri.sItemDescription, pd.dblRepairPrice
	From tblRepair r 
		join tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join tblClient c on (d.lClientKey=c.lClientKey)
		join tblScope s on (r.lScopeKey=s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		join tblRepairItemTran rit On (r.lRepairKey=rit.lRepairKey)
		join tblPricingDetail pd on (rit.lRepairItemKey=pd.lRepairItemKey)
		join tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey) 
		join tblContract co on (r.lContractKey=co.lContractKey) 
	Where (((IsNull(@plContractKey,0)=0) And r.lContractKey > 0) Or ((IsNull(@plContractKey,0)>0) And r.lContractKey=@plContractKey))  
		And r.dtDateOut >= @dtDateFrom  
		And r.dtDateOut < DateAdd(day,1,@dtDateTo)
		And pd.lPricingCategoryKey = @plPricingCategoryKey

	If @pbSummary=1
		Select Contract, Client, Department, Model, SerialNumber, WorkOrder, DateIn, DateOut, Sum(RepairCost) As TotalRepairCost
		From @Results 
		Group By Contract, Client, Department, Model, SerialNumber, WorkOrder, DateIn, DateOut
		Order By Contract, Client, Department, Model, SerialNumber 
	Else
		Select Contract, Client, Department, Model, SerialNumber, WorkOrder, DateIn, DateOut, RepairItem, RepairCost
		From @Results 
		Order By Contract, Client, Department, Model, SerialNumber 

END
