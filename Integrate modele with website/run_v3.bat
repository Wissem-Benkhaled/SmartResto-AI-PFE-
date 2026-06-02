@echo off
echo =======================================================
echo Starting Worker Health ^& Safety Dashboard V3...
echo =======================================================
cd V3
python -m uvicorn app:app --reload
pause
