$ErrorActionPreference = "Stop"
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

npx cap sync
if ($LASTEXITCODE -ne 0) { throw "cap sync failed" }

cd android
.\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) { throw "gradlew failed" }

adb install -r app\build\outputs\apk\debug\app-debug.apk
if ($LASTEXITCODE -ne 0) { throw "adb install failed" }

adb shell monkey -p com.healthnexus.app -c android.intent.category.LAUNCHER 1
