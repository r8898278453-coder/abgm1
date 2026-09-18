# Aaditech Solution - Android APK Build & Export Guide

This project is now equipped with **Capacitor Android Build Pipeline** (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`).

## 1. Package & App Details
- **App Name**: `Aaditech Solution AI`
- **Application ID / Package**: `in.aaditechs.growthmanager`
- **Client Website**: `https://aaditechs.in`
- **Capacitor Configuration**: `/capacitor.config.ts`

---

## 2. Generating Standalone Android APK (.apk)

When you download or clone this project to your local machine with Android Studio installed:

### Step 1: Install Dependencies & Build Mobile Bundle
```bash
npm install
npm run build:mobile
```
*(This builds the frontend bundle into `dist/client` with `VITE_API_BASE_URL=https://bga.aaditechs.in` and runs `cap sync`)*

### Step 2: Open in Android Studio & Generate APK
```bash
npm run cap:android
```
Inside Android Studio:
1. Go to **Build** menu -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
2. Android Studio will generate the debug APK at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
3. For release to client / Google Play Store:
   Go to **Build** -> **Generate Signed Bundle / APK** -> select **APK** or **Android App Bundle (.aab)**.

---

## 3. Instant Testing on Mobile Phone Right Now

While generating the local APK requires Android Studio on your workstation:
1. **Live Preview URL**: Open the project preview URL directly in your Android phone's Google Chrome.
2. **In-App Mobile App Mode**: Click **"Mobile App"** in the top navigation to test the native bottom 5-tab smartphone experience.
3. **PWA 1-Click Install**: On your phone's Chrome browser, tap the 3-dots menu -> **"Add to Home Screen"** or **"Install App"**. It will install directly onto your Android device as an app icon with offline launch support.
