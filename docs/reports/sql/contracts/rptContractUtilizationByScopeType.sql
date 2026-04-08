CREATE PROCEDURE [dbo].[rptContractUtilizationByScopeType]
	
AS
BEGIN
	SET NOCOUNT ON;
    
	--exec dbo.rptContractUtilizationByScopeType

	    
	--exec dbo.rptContractUtilizationByScopeType

	Create Table #ContractScopes
		(
			lContractKey int,
			sInstrumentType nvarchar(50),
			lScopeKey int
		)

	Create Table #ContractScopesRepaired
		(
			lContractKey int,
			sInstrumentType nvarchar(50),
			lScopeKey int
		)

	
	Insert Into #ContractScopes ( lContractKey, sInstrumentType, lScopeKey ) 
	Select cs.lContractKey, t.sInstrumentType, cs.lScopeKey 
	From dbo.tblContractScope cs join dbo.tblScope s on (cs.lScopeKey = s.lScopeKey)
		join dbo.tblContract c on (cs.lContractKey = c.lContractKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblInstrumentTypes t on (st.sRigidOrFlexible = t.sInstrumentTypeKey)
	Where ISNULL(c.bUnlimitedProducts,0) = 0
	Group By cs.lContractKey, t.sInstrumentType, cs.lScopeKey

	Insert Into #ContractScopesRepaired ( lContractKey, sInstrumentType, lScopeKey )
	Select cs.lContractKey, cs.sInstrumentType, cs.lScopeKey
	From #ContractScopes cs join dbo.tblRepair r on (cs.lScopeKey = r.lScopeKey)
		left join (Select * From dbo.tblInvoice Where bFinalized=1) i on (r.lRepairKey = i.lRepairKey)
	Where (i.lRepairKey Is Not Null Or r.sRepairClosed = 'N')
		And r.lContractKey = cs.lContractKey
	Group By cs.lContractKey, cs.sInstrumentType, cs.lScopeKey
	
	Create Table #ContractCounts
		(
			lContractKey int,
			sInstrumentType nvarchar(50),
			CoverageCount int,
			ScopesInCount int
		)

	Insert Into #ContractCounts ( lContractKey, sInstrumentType, CoverageCount, ScopesInCount ) 
	Select cs.lContractKey, cs.sInstrumentType, Count(cs.lContractKey) As cnt, 0
	From #ContractScopes cs
	Group By cs.lContractKey, cs.sInstrumentType

	Create Table #ScopesInCounts
		(
			lContractKey int,
			sInstrumentType nvarchar(50),
			ScopesInCount int
		)

	Insert Into #ScopesInCounts ( lContractKey, sInstrumentType, ScopesInCount ) 
	Select csr.lContractKey, csr.sInstrumentType, Count(csr.lContractKey) As cnt
	From #ContractScopesRepaired csr
	Group By csr.lContractKey, csr.sInstrumentType

	Update cc
	Set ScopesInCount = c.ScopesInCount
	From #ContractCounts cc join #ScopesInCounts c on (cc.lContractKey = c.lContractKey) And (cc.sInstrumentType = c.sInstrumentType)

	Select c.lContractKey, c.sContractName1, c.dtDateEffective, c.dtDateTermination, cc.sInstrumentType, cc.CoverageCount, cc.ScopesInCount,
		Round(Cast(cc.ScopesInCount as decimal(10,2)) / cast(cc.CoverageCount as decimal(10,2)),4) As UtilizationPercentage
	From dbo.tblContract c join #ContractCounts cc on (c.lContractKey = cc.lContractKey)
	Order By c.sContractName1, cc.sInstrumentType

	Drop Table #ContractCounts
	Drop Table #ContractScopes
	Drop Table #ContractScopesRepaired
	Drop Table #ScopesInCounts

END
