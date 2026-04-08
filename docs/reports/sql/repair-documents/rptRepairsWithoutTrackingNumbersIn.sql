CREATE PROCEDURE dbo.rptRepairsWithoutTrackingNumbersIn
	(
		@pdtDateInStart date,
		@pdtDateInEnd date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRepairsWithoutTrackingNumbersIn '9/1/2021', '9/6/2021'
	           
	SELECT c.sClientName1, d.sDepartmentName, r.dtDateIn, r.sWorkOrderNumber, st.sScopeTypeDesc, s.sSerialNumber
	From dbo.tblRepair r join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
	Where LTrim(RTrim(ISNULL(r.sShipTrackingNumberIn,'')))='' And LTrim(RTrim(ISNULL(r.sShipTrackingNumberFedExIn,'')))=''
		And r.dtDateIn >= @pdtDateInStart And r.dtDateIn < DATEADD(day,1,@pdtDateInEnd)
	Order By c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber

END
