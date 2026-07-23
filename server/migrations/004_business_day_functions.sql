-- Migration 004: business-day helper functions for the repair cockpit.
--
-- ============================================================================
-- DEVNOTICE (for Steve):
--   Adds two helper SQL functions (business-day date math) used by the repair
--   cockpit's new Lead Time / TAT / Level Due Date fields. Safe to run any
--   time -- it skips creation if they already exist.
--
--   DEPENDENCY: both functions read dbo.tblHolidays (the holiday calendar).
--   tblHolidays was NOT part of the BCP data-only migration, so it may be
--   absent on Azure/Cloud. This script ABORTS with a clear message if it is
--   missing -- create + populate tblHolidays first, then re-run.
-- ============================================================================
--
-- Why this exists: RepairsController.GetRepairFull (/repairs/{key}/full) calls
-- dbo.fn_DateDiffWeekDays and dbo.fnDateAddBusinessDays inline in its main
-- SELECT. The Azure migration was BCP data-only (rows, not schema objects), so
-- scalar functions did not come across. Without these, /repairs/{key}/full
-- returns 500 for EVERY repair the moment the Command Strip work ships.
--
-- Bodies are ported verbatim from WinScopeNet (only the inline test-print
-- comments were dropped). Idempotent: create-only-if-missing, never ALTER, so
-- an existing (possibly newer) definition is left untouched.

SET NOCOUNT ON;

IF OBJECT_ID('dbo.tblHolidays', 'U') IS NULL
BEGIN
    RAISERROR('MIGRATION 004 ABORTED: dbo.tblHolidays is missing. The business-day functions depend on it (weekend + holiday math). Create and populate tblHolidays first, then re-run.', 16, 1);
END
ELSE
BEGIN
    -- Lead Time / TAT: weekdays between two dates, minus non-weekend holidays.
    IF OBJECT_ID('dbo.fn_DateDiffWeekDays') IS NULL
    BEGIN
        EXEC(N'
CREATE FUNCTION [dbo].[fn_DateDiffWeekDays]
(
    @pdtStartDate datetime,
    @pdtEndDate datetime
)
RETURNS int
AS
BEGIN
    Set @pdtStartDate = CONVERT(Date, @pdtStartDate)
    Set @pdtEndDate = CONVERT(Date, @pdtEndDate)

    Declare @Result int

    Select @Result = DateDiff(dd, @pdtStartDate, @pdtEndDate) - (datediff(wk, @pdtStartDate, @pdtEndDate) * 2) -
        Case When datepart(dw, @pdtStartDate) = 1 then 1 else 0 end +
        Case when datepart(dw, @pdtEndDate) = 1 then 1 else 0 end

    Declare @cnt int
    Select @cnt = COUNT(*) From dbo.tblHolidays Where dtHoliday>Convert(Date,@pdtStartDate) And dtHoliday<=Convert(Date,@pdtEndDate) And DATEPART(dw,dtHoliday) Not In (1,7)

    Return @Result - IsNull(@cnt,0)
END');
        PRINT 'Created dbo.fn_DateDiffWeekDays.';
    END
    ELSE PRINT 'dbo.fn_DateDiffWeekDays already exists - skipped.';

    -- Level Due Date: add N business days to a date, skipping weekends + holidays.
    IF OBJECT_ID('dbo.fnDateAddBusinessDays') IS NULL
    BEGIN
        EXEC(N'
CREATE FUNCTION [dbo].[fnDateAddBusinessDays]
    (
        @pdtDate date,
        @plDays int
    )
RETURNS date
AS
BEGIN
    Declare @i int
    Declare @j int

    If @plDays>0
        Begin
            If DATENAME(WEEKDAY,@pdtDate)=''Saturday''
                Set @pdtDate = DateAdd(day,2,@pdtDate)
            If DATENAME(WEEKDAY,@pdtDate)=''Sunday''
                Set @pdtDate = DateAdd(day,1,@pdtDate)

            Select @i = COUNT(*) From tblHolidays h Where h.dtHoliday = @pdtDate

            While @i > 0
                BEGIN
                    Set @pdtDate = DateAdd(day,1,@pdtDate)

                    If DATENAME(WEEKDAY,@pdtDate)=''Saturday''
                        Set @pdtDate = DateAdd(day,2,@pdtDate)
                    If DATENAME(WEEKDAY,@pdtDate)=''Sunday''
                        Set @pdtDate = DateAdd(day,1,@pdtDate)

                    Select @i = COUNT(*) From tblHolidays h Where h.dtHoliday = @pdtDate
                END

            Set @i=1
            While @i<=@plDays
                Begin
                    Set @j = 1

                    While @j > 0
                        BEGIN
                            Set @pdtDate = DateAdd(day,1,@pdtDate)

                            If DATENAME(WEEKDAY,@pdtDate)=''Saturday''
                                Set @pdtDate = DateAdd(day,2,@pdtDate)
                            If DATENAME(WEEKDAY,@pdtDate)=''Sunday''
                                Set @pdtDate = DateAdd(day,1,@pdtDate)

                            Select @j = COUNT(*) From tblHolidays h Where h.dtHoliday = @pdtDate
                        END

                    Set @i=@i+1
                End
        End

    Return @pdtDate
END');
        PRINT 'Created dbo.fnDateAddBusinessDays.';
    END
    ELSE PRINT 'dbo.fnDateAddBusinessDays already exists - skipped.';
END
