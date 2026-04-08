CREATE PROCEDURE dbo.rptRepairItemsParentChildExtract
	
AS
BEGIN
	SET NOCOUNT ON;

	Select p.sRigidOrFlexible, p.sItemDescription As ParentItem, c.sItemDescription As ChildItem 
	From dbo.fn_ImpliedRepairItemsAll() a join dbo.tblRepairItem p on (a.lRepairItemParentKey=p.lRepairItemKey)
		join dbo.tblRepairItem c on (a.lRepairItemChildKey=c.lRepairItemKey)
	Order By p.sItemDescription, c.sItemDescription
END
