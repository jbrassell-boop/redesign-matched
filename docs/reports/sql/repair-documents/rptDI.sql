CREATE PROCEDURE [dbo].[rptDI]
	(
		@plRepairKey	INTEGER,
		@plSessionID	INTEGER,
		@psSessionTime	VARCHAR(20),
		@pbBlankInspection bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @lBarCodeKey int

	if @pbBlankInspection = 1
		Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='Blank Inspection'
	else 
		Select @lBarCodeKey=lBarCodeKey From tblBarCodeTypes Where sBarCode='D&I'

    Select h.lRepairKey, h.lFriendRepairKey, h.lSessionID, sSessionTime, 
			sClientName1, sClientName2, sDepartmentName, 
			h.sWorkOrderNumber, s.sSerialNumber, st.sScopeTypeDesc, 
			h.sComplaintDesc, sDistName1, sDistName2, 
			st.sAngLeft, st.sAngRight, st.sAngUp, st.sAngDown, 
			h.sRackPosition, h.sIncludesCO2CapYN, h.sIncludesHoodYN, 
			h.sIncludesBioCapYN, h.sIncludesETOCapYN, h.sIncludesAirWaterValveYN, 
			h.sIncludesSuctionValveYN, h.sIncludesWaterProofCapYN, h.sIncludesBoxYN, 
			h.sIncludesCaseYN, h.nLengthIn, h.nLengthOut, st.sLengthSpec, sLoaner, 
			sIncludesCamera, sIncludesCamCoupler, sIncludesCamSoakCap, sIncludesCamEdgeCardProt,
			h.mComments, h.mCommentsDisIns, r.sDICheckedInBy,
			Replace(h.sBarCode,'*','') As sBarCode,
			m.sManufacturer
	From tblRptDisInsHdr h join tblRepair r on (h.lRepairKey=r.lRepairKey)
		join tblScope s on (r.lScopeKey = s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		left join tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
	Where h.lRepairKey=@plRepairKey And h.lSessionID=@plSessionID And sSessionTime=@psSessionTime
END
