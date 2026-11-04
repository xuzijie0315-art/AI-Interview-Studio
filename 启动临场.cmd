@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0" || goto :folder_failed

where.exe node.exe >nul 2>&1 || goto :missing_runtime
where.exe npm.cmd >nul 2>&1 || goto :missing_runtime
node.exe -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)"
if errorlevel 1 goto :missing_runtime

if exist "node_modules\.package-lock.json" if exist "node_modules\.bin\vinext.cmd" goto :launch
echo 第一次启动正在安装依赖，请保持网络连接。
call npm.cmd ci --include=dev --include=optional
if errorlevel 1 goto :install_failed

:launch
echo 正在启动临场。浏览器打开后，请保留此窗口。
set "LINCHANG_OPEN_BROWSER=1"
call npm.cmd run dev
if errorlevel 1 goto :startup_failed
popd
exit /b 0

:missing_runtime
echo 请先安装 Node.js 24 LTS（包含 npm），再重新双击启动。
echo https://nodejs.org/en/download
goto :failed

:install_failed
echo 安装依赖失败。请检查网络连接，再重新双击启动。
goto :failed

:startup_failed
echo 启动未完成。若上方显示程序已经在运行，请打开提示中的网址。
goto :failed

:folder_failed
echo 无法打开项目目录。请解压整个源码包后再试。
pause
exit /b 1

:failed
popd
pause
exit /b 1
