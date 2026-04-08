CREATE PROCEDURE [dbo].[portalInvoiceGetInfoForPrint]
	(
		@plInvoiceKey int = 0,
		@plRepairKey int = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	If @plInvoiceKey = 0 And @plRepairKey = 0
		RETURN

	If @plInvoiceKey = 0
		BEGIN
			Select @plInvoiceKey = i.lInvoiceKey From WinScopeNet.dbo.tblInvoice i Where i.lRepairKey = @plRepairKey And i.bFinalized = 1
		END

	If @plInvoiceKey = 0
		RETURN


    Select ISNULL(i.lRepairKey,0) As lRepairKey, ISNULL(i.lContractKey,0) As lContractKey, ISNULL(st.sRigidOrFlexible,'') As sInstrumentType
	From dbo.tblInvoice i left join dbo.tblRepair r on (i.lRepairKey=r.lRepairKey)
		left join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		left join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
	Where i.lInvoiceKey = @plInvoiceKey
END
