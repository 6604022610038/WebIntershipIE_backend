@echo off
REM รัน Robot Framework test suite ทั้งหมด (ต้องเปิด backend ไว้ก่อน)
cd /d "%~dp0"
set BASE_URL=%1
if "%BASE_URL%"=="" set BASE_URL=http://localhost:5000/api
robot --outputdir results --variable BASE_URL:%BASE_URL% tests
