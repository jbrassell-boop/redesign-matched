CREATE PROCEDURE [dbo].[rptClientSalesSummaryContract]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@pdtFromDate date,
		@pdtToDate date,
		@plContractKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	INSERT INTO tblRptClientSales (	lSessionID, sSessionTime, sBillName1, sBillName2, dtTranDate, sTranNumber, dblTranAmount, 
			lClientKey, lContractKey, sClientName1, sDepartmentName )
	SELECT  @plSessionID, @psSessionTime, i.sBillName1, i.sBillName2, i.dtTranDate, i.sTranNumber, i.dblTranAmount, 
			c.lClientKey, i.lContractKey, CL.sClientName1, c.sContractName1 
	FROM	tblInvoice i join tblContract c on (i.lContractKey = c.lContractKey)
				join tblClient cl on (c.lClientKey = cl.lClientKey)
	WHERE	i.dtTranDate >= @pdtFromDate And i.dtTranDate < DATEADD(day,1,@pdtToDate) And i.lContractKey = @plContractKey
			And (SUBSTRING(i.sTranNumber,1,1)='C' Or SUBSTRING(i.sTranNumber,2,1)='C')


	Select COUNT(*) as cnt From tblRptClientSales Where lSessionID = @plSessionID And sSessionTime = @psSessionTime And lContractKey = @plContractKey
END
