@echo off
cd /d "%~dp0"
echo launcher-start %date% %time% > server-launcher.log
node --import tsx server\escrow-launch-server.mjs > server-deferred.log 2>&1
echo launcher-exit %date% %time% exit=%errorlevel% >> server-launcher.log
