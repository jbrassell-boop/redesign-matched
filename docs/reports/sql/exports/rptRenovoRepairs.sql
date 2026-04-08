CREATE PROCEDURE dbo.rptRenovoRepairs
AS
BEGIN
	SET NOCOUNT ON;

    select r.sWorkOrderNumber, r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip,
		r.dblAmtRepair, r.sPurchaseOrder, r.dtDateOut, st.sScopeTypeDesc, s.sSerialNumber, sr.sRepFirst, sr.sRepLast
	from tblRepair r join tblScope s on (r.lScopeKey=s.lScopeKey) 
		join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		join tblSalesRep sr on (r.lSalesRepKey=sr.lSalesRepKey)
	Where r.lDistributorKey In (67,68)

END
