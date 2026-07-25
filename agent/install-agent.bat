@echo off
:: ============================================================
::  Asset Guardian - Tracker Agent Installer
::  Silently registers tracker-agent.ps1 as a Windows Task
::  Scheduler task that runs at system startup and every
::  15 minutes thereafter, with no visible window.
::  Must be run as Administrator.
:: ============================================================

setlocal

set "TASK_NAME=AssetGuardianTrackerAgent"
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_PATH=%SCRIPT_DIR%tracker-agent.ps1"
set "INSTALL_DIR=%ProgramData%\AssetGuardian"

echo Installing Asset Guardian Tracker Agent...

:: Check for administrator privileges
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: This installer must be run as Administrator.
    pause
    exit /b 1
)

:: Copy the agent script to a stable, protected location
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)
copy /Y "%SCRIPT_PATH%" "%INSTALL_DIR%\tracker-agent.ps1" >nul

:: Remove any pre-existing task with the same name
schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %errorLevel% EQU 0 (
    echo Removing existing scheduled task...
    schtasks /Delete /TN "%TASK_NAME%" /F >nul
)

:: Create a scheduled task that:
::   - Triggers at system startup (ONSTART)
::   - Runs hidden (-WindowStyle Hidden)
::   - Runs as SYSTEM so it works before user logon
::   - Repeats every 15 minutes indefinitely
schtasks /Create ^
    /TN "%TASK_NAME%" ^
    /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%INSTALL_DIR%\tracker-agent.ps1\"" ^
    /SC ONSTART ^
    /RU "SYSTEM" ^
    /RL HIGHEST ^
    /F >nul

if %errorLevel% NEQ 0 (
    echo ERROR: Failed to create the scheduled task.
    pause
    exit /b 1
)

:: Add a repeating trigger every 15 minutes on top of the startup trigger
schtasks /Change /TN "%TASK_NAME%" /RI 15 /DU 9999:59 >nul 2>&1

:: Run the task immediately once so the device appears in the staging queue right away
schtasks /Run /TN "%TASK_NAME%" >nul

echo.
echo Asset Guardian Tracker Agent installed successfully.
echo Scheduled task: %TASK_NAME%
echo Script location: %INSTALL_DIR%\tracker-agent.ps1
echo Logs: %INSTALL_DIR%\agent.log
echo.

endlocal
exit /b 0
