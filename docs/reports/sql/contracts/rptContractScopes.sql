CREATE PROCEDURE [dbo].[rptContractScopes]
	(
		@pdtAsOfDate date,
		@pbSummary bit
	)	
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptContractScopes '9/21/2021', 1

	If @pbSummary = 1
		BEGIN
			Select c.lContractKey, c.sContractName1, cl.sClientName1, c.dtDateEffective, c.dtDateTermination, ct.sContractType, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As sRepName, COUNT(cs.lContractKey) As cnt
			From dbo.tblContract c join dbo.tblClient cl on (c.lClientKey=cl.lClientKey)
				join dbo.tblContractScope cs on (c.lContractKey=cs.lContractKey)
				left join dbo.tblContractTypes ct on (c.lContractTypeKey=ct.lContractTypeKey)
				left join dbo.tblSalesRep sr on (c.lSalesRepKey = sr.lSalesRepKey)
			Where c.dtDateEffective <= @pdtAsOfDate
				And ((c.dtDateTermination Is Null) Or (c.dtDateTermination >= @pdtAsOfDate))
				And cs.dtScopeAdded <= @pdtAsOfDate 
				And ((cs.dtScopeRemoved Is Null) Or (cs.dtScopeRemoved>=@pdtAsOfDate))
			Group By c.lContractKey, c.sContractName1, cl.sClientName1, c.dtDateEffective, c.dtDateTermination, ct.sContractType, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,'')))
			Order By c.sContractName1, cl.sClientName1, ct.sContractType
		ENd
	else
		BEGIN
			Select c.lContractKey, c.sContractName1, cl.sClientName1, c.dtDateEffective, c.dtDateTermination, ct.sContractType, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As sRepName, cs.dtScopeAdded, cs.dtScopeRemoved, st.sScopeTypeDesc, s.sSerialNumber
			From dbo.tblContract c join dbo.tblClient cl on (c.lClientKey=cl.lClientKey)
				join dbo.tblContractScope cs on (c.lContractKey=cs.lContractKey)
				join dbo.tblScope s on (cs.lScopeKey=s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
				left join dbo.tblContractTypes ct on (c.lContractTypeKey=ct.lContractTypeKey)
				left join dbo.tblSalesRep sr on (c.lSalesRepKey = sr.lSalesRepKey)
			Where c.dtDateEffective <= @pdtAsOfDate
				And ((c.dtDateTermination Is Null) Or (c.dtDateTermination >= @pdtAsOfDate))
				And cs.dtScopeAdded <= @pdtAsOfDate 
				And ((cs.dtScopeRemoved Is Null) Or (cs.dtScopeRemoved>=@pdtAsOfDate))
			Order By c.sContractName1, cl.sClientName1, ct.sContractType, st.sScopeTypeDesc, s.sSerialNumber
		END
	END
