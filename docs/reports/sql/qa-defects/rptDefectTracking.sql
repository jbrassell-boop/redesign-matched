CREATE PROCEDURE [dbo].[rptDefectTracking]
	(
		@plRepairKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lBarCodeKey int
	Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Defect Tracking'

	Select st.sScopeTypeDesc, s.sSerialNumber, 
		--Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(r.lRepairKey as varchar(15)) + '.' + r.sWorkOrderNumber As sBarCode
		Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(r.lRepairKey as varchar(15)) As sBarCode
	From tblRepair r join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where r.lRepairKey=@plRepairKey
END
