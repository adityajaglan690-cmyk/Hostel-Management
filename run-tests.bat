@echo off
TITLE Hostel Outpass Test Suite
cd /d %~dp0backend
echo Running Hostel Outpass Backend Integration Test Suite (Jest)...
npm test
pause
