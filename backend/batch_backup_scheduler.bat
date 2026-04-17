@echo off
REM ============================================================================
REM Database Backup Scheduler - Windows Batch Script
REM 
REM Purpose: Run database backup automation as a Windows Task Scheduler job
REM 
REM Usage:
REM 1. Open Task Scheduler
REM 2. Create Basic Task and set trigger to "Daily" every 1 hour
REM 3. Action: Start a program
REM 4. Program: batch_backup_scheduler.bat
REM 5. Start in: C:\xampp\htdocs\Stores\backend\
REM ============================================================================

setlocal enabledelayedexpansion

REM Get script directory
set SCRIPT_DIR=%~dp0

REM PHP executable path - adjust based on your XAMPP installation
set PHP_EXE=C:\xampp\php\php.exe

REM Check if PHP exists
if not exist "%PHP_EXE%" (
    echo ERROR: PHP executable not found at %PHP_EXE%
    echo Please edit this script to set the correct PHP_EXE path
    exit /b 1
)

REM Get timestamp for logging
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a-%%b)

REM Run backup automation
"%PHP_EXE%" "%SCRIPT_DIR%backup_automation.php"

REM Check result
if errorlevel 1 (
    echo %mydate% %mytime% - Backup FAILED >> "%SCRIPT_DIR%backup_scheduler.log"
    exit /b 1
) else (
    echo %mydate% %mytime% - Backup SUCCEEDED >> "%SCRIPT_DIR%backup_scheduler.log"
    exit /b 0
)
