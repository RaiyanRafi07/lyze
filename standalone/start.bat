@echo off
REM LeetCode Lab — double-click launcher (Windows).
REM Requires once per machine: Node.js LTS, a JDK (javac), and g++ on PATH.
REM Optional: set LLMAI_API_KEY below (or leave empty for no-AI mode).
setlocal
set PORT=8080
if "%LLMAI_API_KEY%"=="" set LLMAI_API_KEY=
if not "%LCLAB_PROGRESS%"=="" goto :haveprogress
REM Default: progress lives next to the app. Point LCLAB_PROGRESS at a file
REM inside OneDrive to share progress between computers (see DEPLOY.md).
:haveprogress
cd /d "%~dp0"
where node >nul 2>nul || (echo [lab] Node.js not found on PATH. & pause & exit /b 1)
start "" "http://localhost:%PORT%/leetcode-lab/"
node server.mjs --port %PORT%
pause
