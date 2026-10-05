@echo off
chcp 65001 >nul
rem 双击这个文件：在本机开一个小网站，然后自动用浏览器打开溜溜。玩完关掉这个黑窗口就行。
cd /d "%~dp0"
echo 溜溜正在启动……玩的时候不要关这个窗口，玩完再关。
start "" http://localhost:8000
python tools\serve.py
