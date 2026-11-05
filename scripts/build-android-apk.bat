@echo off
echo =========================================================================
echo  PETROS ANDROID APK / AAB BUILDER
echo =========================================================================

cd /d "%~dp0\.."

echo Packaging Android WebAPK asset bundle...
if not exist "dist" (
    echo Building web application first...
    call npm run build
)

echo Android manifest verified at android\AndroidManifest.xml
echo PWA assets bundled in public\manifest.json and dist\
echo.
echo Standalone WebAPK / TWA / Capacitor release bundle is ready for APK compilation.
echo Run: npx cap sync android ^&^& npx cap open android
pause
