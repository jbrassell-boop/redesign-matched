CREATE PROCEDURE [dbo].[rptDILoaner]
	(
		@plID int,
		@plSessionID	INTEGER,
		@psSessionTime	VARCHAR(20),
		@pbBlankInspection bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	--@plID should be negative.

	Declare @lBarCodeKey int
	--Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='D&I'

	if @pbBlankInspection = 1
		Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Blank Inspection'
	else 
		Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='D&I'

    Select h.lRepairKey, h.lFriendRepairKey, h.lSessionID, sSessionTime, 
			sClientName1, sClientName2, sDepartmentName, 
			h.sWorkOrderNumber, h.sSerialNumber, h.sScopeTypeDesc, 
			h.sComplaintDesc, sDistName1, sDistName2, 
			h.sAngLeft, h.sAngRight, h.sAngUp, h.sAngDown,
			h.sRackPosition, h.sIncludesCO2CapYN, h.sIncludesHoodYN, 
			h.sIncludesBioCapYN, h.sIncludesETOCapYN, h.sIncludesAirWaterValveYN, 
			h.sIncludesSuctionValveYN, h.sIncludesWaterProofCapYN, h.sIncludesBoxYN, 
			h.sIncludesCaseYN, h.nLengthIn, h.nLengthOut, h.sLengthSpec, sLoaner, 
			sIncludesCamera, sIncludesCamCoupler, sIncludesCamSoakCap, sIncludesCamEdgeCardProt,
			h.mComments, h.mCommentsDisIns, '' As sDICheckedInBy,
			Replace(h.sBarCode,'*','') As sBarCode, h.sManufacturer
	From tblRptDisInsHdr h 
	Where h.lRepairKey = @plID And h.lSessionID=@plSessionID And sSessionTime=@psSessionTime
END
