-- ============================================================================
-- Pilot user provisioning — 2026-05-26 pilot
--
-- Creates 3-5 named TSI Ops users in tblUsers for the read-mostly UX shakedown
-- pilot. Users log in with PLAINTEXT passwords initially; AuthController's
-- auto-upgrade path replaces them with BCrypt hashes on first login (now that
-- sUserPassword has been widened to nvarchar(128) — see ALTER 2026-05-21).
--
-- Prerequisites:
--   1. tblUsers.sUserPassword widened to nvarchar(128) — DONE 2026-05-21
--   2. Pilot user list confirmed by Joe (names, emails, initial passwords, role)
--
-- Naming convention (matches existing tblUsers rows):
--   sUserName       — short login handle (first-initial+lastname, lowercase),
--                     e.g. "jdoe". Limit varchar(25).
--   sUserFullName   — display name, "First Last"
--   sEmailAddress   — full work email
--   sUserPassword   — plaintext for first login only; auto-upgrades to BCrypt
--   sSupervisor='1' OR sISOManager='1' → AuthController returns role="Admin"
--   bActive=1       — required for login
--
-- Rollback / cleanup post-pilot:
--   UPDATE tblUsers SET bActive = 0 WHERE sUserName IN (...)
--   -- or
--   DELETE tblUsers WHERE sUserName IN (...)
-- ============================================================================

SET XACT_ABORT ON;
BEGIN TRAN;

-- ── Replace the placeholder rows below with actual pilot user info ──
-- One row per user. Five slots provided (pilot is 3-5 named people per memory).
-- DELETE any unused slot rows before running. Make sure sUserName doesn't
-- already exist in tblUsers (check first).

DECLARE @pilots TABLE (
    sUserName     varchar(25),
    sUserFullName nvarchar(100),
    sEmailAddress nvarchar(100),
    sUserPassword nvarchar(128),
    sSupervisor   varchar(1),
    sISOManager   varchar(1)
);

INSERT INTO @pilots (sUserName, sUserFullName, sEmailAddress, sUserPassword, sSupervisor, sISOManager)
VALUES
    -- (sUserName,    sUserFullName,           sEmailAddress,                sUserPassword, sSupervisor, sISOManager)
    ('PILOT_1',       'Pilot User One',        'pilot1@totalscopeinc.com',   'PilotPwd2026!', '0', '0'),
    ('PILOT_2',       'Pilot User Two',        'pilot2@totalscopeinc.com',   'PilotPwd2026!', '0', '0'),
    ('PILOT_3',       'Pilot User Three',      'pilot3@totalscopeinc.com',   'PilotPwd2026!', '0', '0')
    -- Optional slots — uncomment + edit as needed
    -- ,('PILOT_4',   'Pilot User Four',       'pilot4@totalscopeinc.com',   'PilotPwd2026!', '0', '0')
    -- ,('PILOT_5',   'Pilot User Five',       'pilot5@totalscopeinc.com',   'PilotPwd2026!', '0', '0')
;

-- ── Safety: refuse to proceed if any sUserName already exists ──
DECLARE @collision INT = (
    SELECT COUNT(*) FROM tblUsers u
    WHERE EXISTS (SELECT 1 FROM @pilots p WHERE p.sUserName = u.sUserName)
);
IF @collision > 0
BEGIN
    ROLLBACK;
    RAISERROR('Refusing to insert: %d sUserName values already exist in tblUsers. Pick fresh handles.', 16, 1, @collision);
    RETURN;
END

-- ── Insert ──
INSERT INTO tblUsers (sUserName, sUserPassword, sUserFullName, sEmailAddress,
                      sSupervisor, sISOManager, bActive)
SELECT sUserName, sUserPassword, sUserFullName, sEmailAddress,
       sSupervisor, sISOManager, 1
FROM @pilots;

DECLARE @insertCount INT = @@ROWCOUNT;

-- ── Sanity check ──
DECLARE @expected INT = (SELECT COUNT(*) FROM @pilots);
IF @insertCount = @expected
BEGIN
    COMMIT;
    PRINT 'COMMITTED — inserted ' + CAST(@insertCount AS varchar) + ' pilot users.';

    -- Show what was created
    SELECT lUserKey, sUserName, sUserFullName, sEmailAddress,
           sSupervisor, sISOManager, bActive
    FROM tblUsers
    WHERE sUserName IN (SELECT sUserName FROM @pilots)
    ORDER BY lUserKey DESC;
END
ELSE
BEGIN
    ROLLBACK;
    RAISERROR('Insert count mismatch (got %d, expected %d) — rolled back.', 16, 1, @insertCount, @expected);
END
