CREATE PROCEDURE [dbo].[rptDIWithin40Days]
	(
		@plRepairKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lBarCodeKey int
	Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Under 40 Day Sheet'

	Declare @dtMaxDateIn datetime
	Set @dtMaxDateIn = '1/1/1753'

	Select @dtMaxDateIn = Max(rPrevious.dtDateIn) From tblRepair rPrevious join tblRepair rNow on (rPrevious.lDepartmentKey=rnow.lDepartmentKey)
		And (rPrevious.lScopeKey=rNow.lScopeKey)
	Where rPrevious.lRepairKey<>@plRepairKey And rNow.lRepairKey = @plRepairKey

	Declare @LastRepairWorkOrder nvarchar(50)
	Set @LastRepairWorkOrder = ''
	If @dtMaxDateIn <> '1/1/1753'
		Select @LastRepairWorkOrder = rPrevious.sWorkOrderNumber From tblRepair rPrevious join tblRepair rNow on (rPrevious.lDepartmentKey=rnow.lDepartmentKey)
		And (rPrevious.lScopeKey=rNow.lScopeKey)
	 Where rPrevious.dtDateIn = @dtMaxDateIn And rPrevious.lRepairKey <> @plRepairKey And rNow.lRepairKey = @plRepairKey 
	 
	Select c.sClientName1, d.sDepartmentName, st.sScopeTypeDesc, s.sSerialNumber, r.sWorkOrderNumber, r.sComplaintDesc, IsNull(r.nDaysSinceLastIn,0) As DaysSinceLastIn,
		@LastRepairWorkOrder As PriorWorkOrderNumber,
		--Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(r.lRepairKey as varchar(15)) + '.' + r.sWorkOrderNumber As sBarCode
		Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(r.lRepairKey as varchar(15)) As sBarCode
	From tblRepair r join tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join tblClient c on (d.lClientKey = c.lClientKey)
		join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where r.lRepairKey=@plRepairKey
END
