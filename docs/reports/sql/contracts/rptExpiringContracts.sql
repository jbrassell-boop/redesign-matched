CREATE PROCEDURE dbo.rptExpiringContracts
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;


    Select c.sContractName1, dbo.fn_FormatDate(c.dtDateEffective,'MM/dd/yyyy') As dtEffectiveDate, dbo.fn_FormatDate(c.dtDateTermination,'MM/dd/yyyy') As dtDateTermination
	From tblContract c 
	Where dtDateTermination>=@pdtStartDate And dtDateTermination<DateAdd(day,1,@pdtEndDate)
	Order By c.dtDateTermination, c.sContractName1 
END
