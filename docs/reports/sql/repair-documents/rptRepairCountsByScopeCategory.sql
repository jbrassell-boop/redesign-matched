
CREATE PROCEDURE [dbo].[rptRepairCountsByScopeCategory]
	(
		@plClientKey int = 0,
		@psInstrumentType nvarchar(1) = '',
		@plRepairItemKey int = 0,
		@pdtStartDate date,
		@pdtEndDate date,
		@pbHighLevelSummary bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

    --exec dbo.rptRepairCountsByScopeCategory @plClientKey = 4271, @pdtStartDate='1/1/2016', @pdtEndDate='10/31/2016'
	--exec dbo.rptRepairCountsByScopeCategory @psInstrumentType='F', @pdtSTartDate = '1/1/2024', @pdtEndDate='1/31/2024', @pbHighLevelSummary=1

	Declare @Results Table
		(
			sClientName1 nvarchar(300),
			sDepartmentName nvarchar(300),
			sRigidOrFlexible nvarchar(50),
			RepairItem nvarchar(300),
			ScopeType nvarchar(300),
			cnt int,
			sProductID nvarchar(50)
		)

	Insert Into @Results ( sClientName1, sDepartmentName, sRigidOrFlexible, RepairItem, ScopeType, cnt, sProductID )
	Select c.sClientName1, d.sDepartmentName, Case st.sRigidOrFlexible
								When 'F' Then 'Flexible'
								When 'R' Then 'Rigid'
								When 'C' Then 'Camera'
								When 'I' Then 'Instrument'
								Else 'Unknown'
								End,
		ri.sItemDescription, st.sScopeTypeDesc, COUNT(d.sDepartmentName), ri.sProductID
	From dbo.tblRepair r join dbo.tblRepairItemTran rit on (r.lRepairKey = rit.lRepairKey)
		join dbo.tblRepairItem ri on (rit.lRepairItemKey = ri.lRepairItemKey)
		join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
	Where	((ISNULL(@plClientKey,0)=0) Or (d.lClientKey = @plClientKey))
		And ((ISNULL(@plRepairItemKey,0)=0) Or (rit.lRepairItemKey = @plRepairItemKey))
		And ((ISNULL(@psInstrumentType,'')='') Or (st.sRigidOrFlexible = @psInstrumentType))
		And r.dtDateIn >= @pdtStartDate And r.dtDateIn < DATEADD(day,1,@pdtEndDate) 
		And IsNull(ri.bOkayToSkip,0)=0
	Group By c.sClientName1, d.sDepartmentName, st.sRigidOrFlexible, ri.sItemDescription, st.sScopeTypeDesc, ri.sProductID

	If ISNULL(@plRepairItemKey,0)=0 And ((ISNULL(@psInstrumentType,'') = '') Or (ISNULL(@psInstrumentType,'')='I'))
		BEGIN
			--If a Repair Item Key is provided, it can't be an Instrument repair.
			Insert Into @Results ( sClientName1, sDepartmentName, sRigidOrFlexible, RepairItem, ScopeType, cnt, sProductID )
			Select c.sClientName1, d.sDepartmentName, Case st.sRigidOrFlexible
										When 'F' Then 'Flexible'
										When 'R' Then 'Rigid'
										When 'C' Then 'Camera'
										When 'I' Then 'Instrument'
										Else 'Unknown'
										End,
				'N/A' As RepairItem, st.sScopeTypeDesc, COUNT(d.sDepartmentName), st.sItemCode
			From dbo.tblRepair r join tblRepairInstrumentModels rim on (r.lRepairKey = rim.lRepairKey)
				join tblScopeType st on (rim.lScopeTypeKey = st.lScopeTypeKey)
				join tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
			Where	((ISNULL(@plClientKey,0)=0) OR (d.lClientKey = @plClientKey)) 
				And r.dtDateIn >= @pdtStartDate And r.dtDateIn < DATEADD(day,1,@pdtEndDate)
				And ISNULL(rim.lOutsourcedRepairKey,0)=0 And ISNULL(rim.lReplacedRepairKey,0)=0
			Group By c.sClientName1, d.sDepartmentName, st.sRigidOrFlexible, st.sScopeTypeDesc, st.sItemCode
		END

	if @pbHighLevelSummary = 1
		Select r.sProductID, r.RepairItem, Count(r.RepairItem) as cnt  
		From @Results r 
		Group By r.sProductID, r.RepairItem
		Order By r.RepairItem
	else
		Select * from @Results Order By sClientName1, sDepartmentName, sRigidOrFlexible, RepairItem, ScopeType
END


