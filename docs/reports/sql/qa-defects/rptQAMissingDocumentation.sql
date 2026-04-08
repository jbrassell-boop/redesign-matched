CREATE PROCEDURE [dbo].[rptQAMissingDocumentation]
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptQAMissingDocumentation @pdtStartDate='3/7/2023', @pdtEndDate='3/7/2023'

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()


	Declare @barCodeDI int
	Declare @barCodeBlank int
	Declare @barCodeBlank2 int
	Declare @barCodeLabel int
	Declare @barCodeInvoice int
	Declare @barCodePickList int

	Set @barCodeDI = 2
	Set @barCodeBlank = 3
	Set @barCodeBlank2 = 11
	Set @barCodeLabel = 9
	Set @barCodeInvoice = 8
	Set @barCodePickList = 12

	Create Table #Repairs
		(	
			lRepairKey int,
			HasDI bit,
			HasBlank bit,
			HasLabel bit,
			HasInvoice bit,
			HasPickList bit,
			bContractInvoice bit,
			bNoLabelNeeded bit,
			MissingRepairReason bit,
			lDatabaseKey int
		)

	Insert Into #Repairs ( lRepairKey, HasDI, HasBlank, HasLabel, HasInvoice, HasPickList, bContractInvoice, bNoLabelNeeded, MissingRepairReason, lDatabaseKey )
	Select r.lRepairKey, 0, 0, 0, 0, 0, Case When LEFT(r.sWorkOrderNumber,1)='C' Then 1 Else 0 End, Case When Right(r.sWorkOrderNumber,1)='E' Then 1 Else 0 End,
		Case When st.sRigidOrFlexible='F' And ISNULL(r.lRepairReasonKey,0)=0 Then 1 Else 0 End, @lDatabaseKey
	From dbo.tblRepair r join dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
	Where r.dtDateOut >= @pdtStartdate And r.dtDateOut < DateAdd(day,1,@pdtEndDate)
		And (@lDatabaseKey=2 Or d.lClientKey Not In (4609,26,38))
		And RIGHT(r.sWorkOrderNumber,1)<>'C'		--Blind Coupler 
		And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
				Or
				(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
			)

	Create Index idxRepair On #Repairs ( lRepairKey )

	Update r Set HasDI = 1 
	From #Repairs r join tblDocument d on (r.lRepairKey=d.lOwnerKey)
		join dbo.tblDocumentCategoryType dct on (d.lDocumentCategoryTypeKey=dct.lDocumentCategoryTypeKey)
		join dbo.tblDocumentCategory dc on (dct.lDocumentCategoryKey=dc.lDocumentCategoryKey)
	Where dc.sDocumentCategory='Repair'
		And d.lBarCodeKey = @barCodeDI

	Update r Set HasBlank = 1 
	From #Repairs r join tblDocument d on (r.lRepairKey=d.lOwnerKey)
		join dbo.tblDocumentCategoryType dct on (d.lDocumentCategoryTypeKey=dct.lDocumentCategoryTypeKey)
		join dbo.tblDocumentCategory dc on (dct.lDocumentCategoryKey=dc.lDocumentCategoryKey)
	Where dc.sDocumentCategory='Repair'
		And d.lBarCodeKey = @barCodeBlank Or d.lBarCodeKey=@barCodeBlank2

	Update r Set HasLabel = 1 
	From #Repairs r join tblDocument d on (r.lRepairKey=d.lOwnerKey)
		join dbo.tblDocumentCategoryType dct on (d.lDocumentCategoryTypeKey=dct.lDocumentCategoryTypeKey)
		join dbo.tblDocumentCategory dc on (dct.lDocumentCategoryKey=dc.lDocumentCategoryKey)
	Where dc.sDocumentCategory='Repair'
		And d.lBarCodeKey = @barCodeLabel
		
	Update r Set HasInvoice = 1 
	From #Repairs r join tblDocument d on (r.lRepairKey=d.lOwnerKey)
		join dbo.tblDocumentCategoryType dct on (d.lDocumentCategoryTypeKey=dct.lDocumentCategoryTypeKey)
		join dbo.tblDocumentCategory dc on (dct.lDocumentCategoryKey=dc.lDocumentCategoryKey)
	Where dc.sDocumentCategory='Repair'
		And d.lBarCodeKey = @barCodeInvoice

	Update r Set HasPickList = 1 
	From #Repairs r join tblDocument d on (r.lRepairKey=d.lOwnerKey)
		join dbo.tblDocumentCategoryType dct on (d.lDocumentCategoryTypeKey=dct.lDocumentCategoryTypeKey)
		join dbo.tblDocumentCategory dc on (dct.lDocumentCategoryKey=dc.lDocumentCategoryKey)
	Where dc.sDocumentCategory='Repair'
		And d.lBarCodeKey = @barCodePickList


	Create Table #Results
		(
			sClientName1 nvarchar(200),
			sDepartmentName nvarchar(200),
			sWorkOrderNumber nvarchar(50),
			dtDateIn date,
			dtDateOut date,
			sRigidOrFlexible nvarchar(1),
			HasDI nvarchar(1),
			HasBlank nvarchar(1),
			HasLabel nvarchar(1),
			HasInvoice nvarchar(1),
			HasPickList nvarchar(1),
			MissingRepairReason nvarchar(1)
		)

	Insert Into #Results ( sClientName1, sDepartmentName, sWorkOrderNumber, dtDateIn, dtDateOut, sRigidOrFlexible, 
		HasDI, HasBlank, HasLabel, HasInvoice, HasPickList, MissingRepairReason ) 
	Select c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut, st.sRigidOrFlexible,
		Case when rs.HasDI=0 Then 'X' Else '' End As HasDI,
		Case when rs.HasBlank=0 Then 'X' Else '' End As HasBlank,
		Case when rs.HasLabel=0 Then 'X' Else '' End As HasLabel,
		Case when rs.HasInvoice=0 Then 'X' Else '' End As HasInvoice,
		Case When rs.HasPickList=0 Then 'X' Else '' End As HasPickList,
		Case When rs.MissingRepairReason=1 Then 'X' Else '' End As MissingRepairReason
	from #Repairs rs join dbo.tblRepair r on (rs.lRepairKey=r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey=c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
	--Where	(		
	--			(rs.bContractInvoice=0 And rs.bNoLabelNeeded=0 And (HasDI = 0 Or HasBlank = 0 Or HasLabel = 0 Or HasInvoice = 0 Or HasPickList = 0))
	--		Or	(rs.bContractInvoice=1 And (HasDI=0 Or HasLabel=0))
	--		Or	(rs.bNoLabelNeeded=1 And (HasDI=0 Or HasBlank=0 Or HasInvoice=0 Or HasPickList=0))
	--		Or	(rs.MissingRepairReason = 1)
	--		)
	--Order By c.sClientName1, d.sDepartmentName

	if @lDatabaseKey = 2
		BEGIN
			Insert Into #Results EXEC TSI.WinscopeNet.dbo.rptQAMissingDocumentationForSouth @pdtStartDate, @pdtEndDate
		END

	Select r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut, r.sRigidOrFlexible, r.HasDI, r.HasBlank, r.HasLabel, r.HasInvoice,
		r.HasPickList, r.MissingRepairReason
	From #Results r 
	Order By r.sClientName1, r.sDepartmentName

	Drop Table #Repairs
	Drop Table #Results
END
