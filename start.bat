@echo off
setlocal EnableDelayedExpansion
title Vaultkeep - Startup

echo ============================================================
echo  Vaultkeep - starting backend and frontend
echo ============================================================
echo.

REM --- Step 1: clear any stale processes from previous runs -----------------
echo [1/5] Making sure ports 8000 and 5173 are free...
call :KillPort 8000 "backend / uvicorn"
call :KillPort 5173 "frontend / Vite"
echo.

REM --- Step 2: start the backend ----------------------------------------------
echo [2/5] Starting backend (uvicorn) on http://127.0.0.1:8000 ...
start "Vaultkeep Backend" cmd /k "cd /d "%~dp0" && uvicorn app.main:app --reload"

REM --- Step 3: start the frontend -----------------------------------------------
echo [3/5] Starting frontend (Vite) on http://localhost:5173 ...
start "Vaultkeep Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.

REM --- Step 4: wait until both are actually responding -------------------------
echo [4/5] Waiting for both servers to come online (this can take a few seconds)...

REM Backend is checked via 127.0.0.1 (that's the literal address the
REM frontend's own API calls use - see frontend/src/lib/api.js).
call :WaitForPort 127.0.0.1 8000
if "!WAITRESULT!"=="1" (
    echo   Backend is up on port 8000.
) else (
    echo   WARNING: backend did not respond within 30 seconds.
    echo   Check the "Vaultkeep Backend" window for errors.
)

REM Frontend is checked via the "localhost" hostname, not 127.0.0.1 -
REM Vite's dev server resolves "localhost" to the IPv6 loopback ([::1])
REM on some machines and never binds the IPv4 127.0.0.1 address at all,
REM which would make an IPv4-only check report "down" forever even once
REM Vite is genuinely up and serving. Match whatever the browser opens.
call :WaitForPort localhost 5173
if "!WAITRESULT!"=="1" (
    echo   Frontend is up on port 5173.
) else (
    echo   WARNING: frontend did not respond within 30 seconds.
    echo   Check the "Vaultkeep Frontend" window for errors.
)
echo.

REM --- Step 5: open the browser ---------------------------------------------------
echo [5/5] Opening http://localhost:5173 in your browser...
start "" "http://localhost:5173"

echo.
echo ============================================================
echo  All set. Two new windows are now running the backend and
echo  the frontend - leave them open while you work. This
echo  window can be closed any time; it is not needed anymore.
echo ============================================================
echo.
pause
exit /b 0

REM ============================================================
REM  Kill whatever is listening on a given port, if anything is,
REM  then re-check and retry a couple of times - a reload
REM  supervisor (uvicorn --reload) can respawn a fresh worker on
REM  the same port within the same instant its old worker is
REM  killed, so a single kill pass isn't always enough.
REM  Usage: call :KillPort <port> <label for the log line>
REM
REM  Uses a "for /L" counting loop rather than a repeated GOTO -
REM  looping back to the same label many times in a row can hit a
REM  cmd.exe bug ("The system cannot find the batch label
REM  specified") on some systems; a bounded for /L never does.
REM ============================================================
:KillPort
set "PORT=%~1"
set "LABEL=%~2"
set "ANYKILLED=0"
for /L %%N in (1,1,3) do (
    set "FOUND=0"
    for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":!PORT! " ^| findstr "LISTENING"') do (
        echo   Found a stale !LABEL! process on port !PORT! ^(PID %%P^) - killing it...
        taskkill /F /PID %%P >nul 2>&1
        set "FOUND=1"
        set "ANYKILLED=1"
    )
    if "!FOUND!"=="1" ping -n 2 127.0.0.1 >nul
)
netstat -aon | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   WARNING: something is still using port %PORT% - you may need to close it manually.
) else (
    if "%ANYKILLED%"=="0" (
        echo   Port %PORT% was already free.
    ) else (
        echo   Port %PORT% is now free.
    )
)
goto :eof

REM ============================================================
REM  Poll a host:port with curl until it answers HTTP, or give up
REM  after ~30 seconds. Sets WAITRESULT to 1 (up) or 0 (timed out).
REM  Usage: call :WaitForPort <host> <port>
REM
REM  Uses "ping -n 2 127.0.0.1" as a ~1-second sleep instead of the
REM  "timeout" command: "timeout" refuses to run at all ("Input
REM  redirection is not supported") whenever its stdin isn't a real
REM  interactive console - which happens under Task Scheduler, some
REM  remote sessions, and any other non-interactive launch. "ping" has
REM  no such requirement, so the wait loop works everywhere. Also uses
REM  "for /L" rather than a repeated GOTO, for the same reason as
REM  :KillPort above.
REM ============================================================
:WaitForPort
set "WHOST=%~1"
set "WPORT=%~2"
set "WAITRESULT=0"
for /L %%N in (1,1,30) do (
    if "!WAITRESULT!"=="0" (
        curl -s -o nul http://!WHOST!:!WPORT!/ >nul 2>&1
        if not errorlevel 1 (
            set "WAITRESULT=1"
        ) else (
            ping -n 2 127.0.0.1 >nul
        )
    )
)
goto :eof
