CREATE PROCEDURE [dbo].[rptRepairMetrics]
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime,
		@plClientKey int = null
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRepairMetrics @pdtStartDate='10/1/2015', @pdtEndDate='10/31/2015', @plClientKey=4609

	Declare @lSystemCodesHdrKey int
	Select @lSystemCodesHdrKey = lSystemCodesHdrKey From tblSystemCodesHdr Where sGroupName = 'ScopeTypeCat'

	Select c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber, r.sPurchaseOrder, it.sInstrumentType, 
		Case When st.sRigidOrFlexible='F' Then ISNULL(sc.sScopeTypeCategory,'') + ' - ' + Case When IsNull(sc.bLargeDiameter,0)=0 Then 'Small' Else 'Large' End Else ISNULL(sc.sScopeTypeCategory,'') End As ScopeCategory, 
		m.sManufacturer, st.sScopeTypeDesc, s.sSerialNumber, dbo.fn_FormatDate(r.dtDateIn, 'mm/dd/yyyy') as dtDateIn, 
		dbo.fn_FormatDate(r.dtReqSent,'mm/dd/yyyy') As dtReqSent, dbo.fn_FormatDate(r.dtAprRecvd,'mm/dd/yyyy') As dtAprRecvd, 
		dbo.fn_FormatDate(r.dtDateOut,'mm/dd/yyyy') as dtDateOut, 
		dbo.fnRepairLevel(r.lRepairKey) As RepairLevel, 
		dbo.fn_DateDiffWeekDays(r.dtDateIn,r.dtDateOut) As LeadTime,
		dbo.fn_DateDiffWeekDays(r.dtAprRecvd,r.dtDateOut) As TurnAroundTime,
		dbo.fn_FormatDate(r.dtShipDate,'mm/dd/yyyy') As dtShipDate, IsNull(r.sShipTrackingNumber,r.sShipTrackingNumberFedEx) As sShipTrackingNumber,
		Case When ISNULL(r.lContractKey,0)=0 Then '' Else 'X' End As UnderContract
	From dbo.tblRepair r join dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblInstrumentTypes it on (st.sRigidOrFlexible = it.sInstrumentTypeKey)
		left join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
	Where	((ISNULL(@plClientKey,0)=0) Or (d.lClientKey=@plClientKey))
		And	r.dtDateIn >= @pdtStartDate
		And r.dtDateIn < DateAdd(day,1,@pdtEndDate)
	Order By r.dtDateIn, c.sClientName1, d.sDepartmentName
END

