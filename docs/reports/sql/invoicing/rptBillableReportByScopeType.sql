CREATE PROCEDURE dbo.rptBillableReportByScopeType
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime,
		@psInstrumentType nvarchar(1)
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
				End As sRigidOrFlexible, 
	st.sScopeTypeDesc, Sum(i.dblTranAmount) As AmountBilled, Count(i.dblTranAmount) As Cnt, Round(Sum(i.dblTranAmount)/Count(i.dblTranAmount),2) As AvgBilled
	From tblInvoice i join tblRepair r on (i.lRepairKey = r.lRepairKey) 
		join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where dtTranDate >= @pdtStartDate And dtTranDate < DateAdd(day,1,@pdtEndDate)
		And ((IsNull(@psInstrumentType,'A')='A') Or (st.sRigidOrFlexible=@psInstrumentType))
	Group By st.sRigidOrFlexible, st.sScopeTypeDesc
	Order By st.sRigidOrFlexible, st.sScopeTypeDesc
END
