CREATE	PROCEDURE [dbo].[spRptDataSrcRepairFnlInsApproved]
	@plRepairKey		INT
AS
BEGIN
/*
	DECLARE	@plRepairKey	INT
	SET		@plRepairKey	= 464506
--*/
	SELECT	RI.sItemDescription, RI.sProductID, 
			RT.sComments, RT.sApproved, RT.dblRepairPrice, RT.sFixType, RT.sUAorNWT
	FROM	tblRepairItemTran RT WITH (NOLOCK)
			INNER JOIN	tblRepairItem RI WITH (NOLOCK)
					ON	RI.lRepairItemKey = RT.lRepairItemKey
	WHERE	RT.lRepairKey = @plRepairKey
	AND		RT.sApproved = 'Y'
END
