CREATE PROCEDURE dbo.rptBillableReportSummary
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime
	)

AS
BEGIN
	SET NOCOUNT ON;

	Set @pdtStartDate = Convert(Date, @pdtStartDate)
	Set @pdtEndDate = Convert(Date,@pdtEndDate)

    Select Case st.sRigidOrFlexible
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				When 'C' Then 'Camera'
				Else 'Flexible'
			End As sRigidOrFlexible, Sum(i.dblTranAmount) As AmountBilled 
	From tblInvoice i join tblRepair r on (i.lRepairKey = r.lRepairKey) 
		join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where dtTranDate >= @pdtStartDate And dtTranDate < DateAdd(day,1,@pdtEndDate)
	Group By st.sRigidOrFlexible
	Order By st.sRigidOrFlexible
END
