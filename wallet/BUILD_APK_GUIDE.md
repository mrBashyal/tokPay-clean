# TokPay Android APK Build Guide

## 📦 Production APK Build Instructions (No Metro Required)

### Prerequisites
- Node.js v20+ installed
- Android SDK installed
- Physical Android device or emulator
- USB debugging enabled on device

---

## 🚀 Quick Build Commands (Copy-Paste Ready)

### Step 1: Clean Previous Builds
```bash
cd "/home/ayush/Desktop/tokpay basic app/wallet"
npm run android:clean
rm -rf android/app/src/main/assets/index.android.bundle
rm -rf android/app/build/outputs/apk
```

### Step 2: Install Dependencies (if needed)
```bash
npm install
```

### Step 3: Bundle JavaScript Code
```bash
npm run android:bundle
```
**What this does:** Creates `android/app/src/main/assets/index.android.bundle` containing all JS code and assets. This bundle is embedded in the APK.

### Step 4: Build Release APK
```bash
npm run android:apk
```
**What this does:** Compiles Android native code + bundles JS → creates standalone APK with Hermes bytecode.

### Step 5: Locate Your APK
The release APK will be generated at:
```
/home/ayush/Desktop/tokpay basic app/wallet/android/app/build/outputs/apk/release/app-release.apk
```

### Step 6: Install APK on Device
```bash
adb install -r "/home/ayush/Desktop/tokpay basic app/wallet/android/app/build/outputs/apk/release/app-release.apk"
```

**Alternative:** Copy APK to device via USB/cloud and install manually.

---

## 🔧 Build Configuration Summary

### Enabled Features:
✅ **Hermes Engine** - Enabled (`hermesEnabled=true`)  
✅ **JS Bundling** - Automatic during `assembleRelease`  
✅ **Offline Support** - Bundle embedded in APK  
✅ **Release Mode** - `debuggable=false`  
✅ **No Metro Dependency** - App runs standalone  

### APK Characteristics:
- **Size:** ~40-60 MB (includes all dependencies)
- **Architectures:** armeabi-v7a, arm64-v8a, x86, x86_64
- **Min SDK:** As configured in `build.gradle`
- **Signed:** Debug keystore (for testing; use production keystore for production)

---

## ✅ Verification Steps

### 1. Kill Metro if Running
```bash
# Press Ctrl+C in the terminal running Metro, or:
pkill -f "react-native start"
```

### 2. Uninstall Previous Debug Builds
```bash
adb uninstall com.wallet
```

### 3. Install Release APK
```bash
adb install -r "/home/ayush/Desktop/tokpay basic app/wallet/android/app/build/outputs/apk/release/app-release.apk"
```

### 4. Launch App
```bash
adb shell am start -n com.wallet/.MainActivity
```

### 5. Test Offline Functionality
- Turn off device WiFi/mobile data
- Reboot device
- Launch TokPay app
- Verify:
  - ✅ App launches without Metro
  - ✅ Home screen displays wallet balance
  - ✅ Receive screen generates QR code
  - ✅ BLE permissions work
  - ✅ SQLite wallet operations work

---

## 🐛 Troubleshooting

### Issue: "Unable to load script from assets"
**Solution:** Re-run JS bundling:
```bash
npm run android:bundle
npm run android:apk
```

### Issue: APK not found after build
**Check:** Look in multiple output folders:
```bash
find android/app/build/outputs -name "*.apk"
```

### Issue: App crashes on launch
**Check logs:**
```bash
adb logcat | grep -i "reactnative\|tokpay\|wallet"
```

### Issue: "Hermes bytecode version mismatch"
**Solution:** Clean and rebuild:
```bash
npm run android:clean
rm -rf node_modules/.cache
npm run android:bundle
npm run android:apk
```

### Issue: BLE/Camera permissions not working
**Verify:** Permissions are declared in `AndroidManifest.xml` (should already be configured by libraries).

---

## 📱 Hackathon Demo Checklist

Before demo:
- [ ] Build fresh release APK
- [ ] Install on 2 physical devices (for P2P testing)
- [ ] Test Send flow (QR scan + BLE transfer)
- [ ] Test Receive flow (QR display + BLE advertising)
- [ ] Verify wallet balance persists after app restart
- [ ] Test offline mode (no internet required)
- [ ] Ensure Metro is NOT running during demo

---

## 🔐 Production Considerations (Post-Hackathon)

For Google Play Store release:
1. Generate production keystore:
```bash
keytool -genkeypair -v -keystore tokpay-release.keystore -alias tokpay -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('tokpay-release.keystore')
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias 'tokpay'
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ... rest of config
    }
}
```

3. Enable ProGuard:
```gradle
def enableProguardInReleaseBuilds = true
```

---

## 📊 Build Performance

Typical build times (on decent hardware):
- **Clean build:** 3-5 minutes
- **Incremental build:** 1-2 minutes
- **JS bundling alone:** 10-30 seconds

---

## 🎯 One-Command Build (for convenience)

Add to `package.json` scripts:
```json
"android:release": "npm run android:clean && npm run android:bundle && npm run android:apk"
```

Then just run:
```bash
npm run android:release
```

---

## ✨ What's Changed

### Modified Files:
1. **`package.json`** - Added build scripts:
   - `android:bundle` - Bundle JS code
   - `android:apk` - Build release APK
   - `android:clean` - Clean build artifacts

2. **`android/app/build.gradle`** - Added:
   - `debuggable false` in release build type

### No Changes Made To:
- App architecture or business logic
- Send/Receive/BLE/SQLite flows
- Dependencies (no new packages added)
- JS source files
- Native modules

---

## 🚢 Ready to Ship

Your APK at:
```
android/app/build/outputs/apk/release/app-release.apk
```

Is a **fully standalone Android application** that:
- ✅ Works without Metro bundler
- ✅ Works offline after installation
- ✅ Persists wallet data via SQLite
- ✅ Supports BLE P2P transfers
- ✅ Scans/displays QR codes
- ✅ Uses Hermes for optimal performance

**Next:** Install on 2 devices, load test money, and demo P2P transfer! 🎉
