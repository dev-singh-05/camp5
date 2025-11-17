# 🪟 Windows Setup Guide for Campus5 Android Development

This guide helps Windows users set up their environment for building the Campus5 Android app.

## ✅ Prerequisites Checklist

Before building the Android app on Windows, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Java JDK 17 installed and configured
- [ ] Android Studio installed with SDK
- [ ] Git installed

## 🔧 Step-by-Step Setup

### 1. Install Java JDK 17

#### Download and Install

1. **Download JDK 17** from [Adoptium (Eclipse Temurin)](https://adoptium.net/)
   - Select: **JDK 17 (LTS)**
   - Platform: **Windows x64**
   - Package Type: **MSI installer**

2. **Run the installer**
   - Use default installation path: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
   - Check the box: **Add to PATH** (if available)
   - Check the box: **Set JAVA_HOME variable** (if available)

3. **Verify Installation**
   ```powershell
   java -version
   # Should output: openjdk version "17.x.x"
   ```

#### Manual Environment Variable Setup

If the installer didn't set JAVA_HOME automatically:

**Using PowerShell (Recommended):**

```powershell
# Set JAVA_HOME for current session
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Set JAVA_HOME permanently (requires admin)
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot', [System.EnvironmentVariableTarget]::Machine)
```

**Using GUI (Permanent Setup):**

1. **Open Environment Variables:**
   - Press `Windows + R`
   - Type `sysdm.cpl` and press Enter
   - Click **Advanced** tab
   - Click **Environment Variables**

2. **Set JAVA_HOME:**
   - Under **System Variables**, click **New**
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot`
     (Adjust the path to match your actual JDK installation)
   - Click **OK**

3. **Add to PATH:**
   - Under **System Variables**, find and select `Path`
   - Click **Edit**
   - Click **New**
   - Add: `%JAVA_HOME%\bin`
   - Click **OK** on all dialogs

4. **Restart Your Terminal/PowerShell**
   - Close all terminal windows
   - Open a new PowerShell window
   - Verify: `java -version`

### 2. Install Android Studio

1. **Download Android Studio**
   - Go to [developer.android.com/studio](https://developer.android.com/studio)
   - Download the latest version for Windows

2. **Install Android Studio**
   - Run the installer
   - Use default installation path
   - Install all recommended components
   - Include Android Virtual Device (AVD)

3. **Configure Android SDK**

   After installation:
   - Open Android Studio
   - Go to: **File → Settings → Appearance & Behavior → System Settings → Android SDK**
   - In **SDK Platforms** tab:
     - Check **Android 13.0 (Tiramisu)** - API Level 33
     - Check **Android 12.0 (S)** - API Level 31
   - In **SDK Tools** tab:
     - Check **Android SDK Build-Tools 33**
     - Check **Android Emulator**
     - Check **Android SDK Platform-Tools**
     - Check **Android SDK Command-line Tools (latest)**
   - Click **Apply** and wait for downloads

4. **Set ANDROID_HOME Environment Variable**

   **Using PowerShell:**
   ```powershell
   # Set ANDROID_HOME for current session
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"

   # Set permanently (requires admin)
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", [System.EnvironmentVariableTarget]::Machine)
   ```

   **Using GUI:**
   - Follow the same steps as JAVA_HOME
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
   - Add to PATH:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\cmdline-tools\latest\bin`

5. **Verify Android Setup**
   ```powershell
   # Check adb (Android Debug Bridge)
   adb version

   # Check environment variables
   echo $env:ANDROID_HOME
   echo $env:JAVA_HOME
   ```

### 3. Install Node.js

1. **Download Node.js 18+**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download the **LTS version** (18.x or higher)

2. **Install Node.js**
   - Run the installer
   - Use default settings
   - Verify installation:
     ```powershell
     node --version  # Should be v18.x.x or higher
     npm --version   # Should be 9.x.x or higher
     ```

### 4. Clone and Setup Campus5 Project

```powershell
# Clone the repository
git clone https://github.com/dev-singh-05/camp5.git
cd camp5

# Install dependencies
npm install

# Build the Next.js app
npm run build:export

# Sync to Android platform
npx cap sync android
```

## 🚀 Building the App

### Method 1: Using Android Studio (Recommended for Development)

```powershell
# Open Android Studio with the project
npm run open:android
```

Then in Android Studio:
1. Wait for Gradle sync to complete
2. Select a device/emulator from the dropdown
3. Click the green Run button (▶️)

### Method 2: Using Command Line

```powershell
# Run on connected device/emulator
npm run android:run
```

Or manually:
```powershell
# Navigate to android directory
cd android

# Build debug APK
.\gradlew.bat assembleDebug

# Install on connected device
.\gradlew.bat installDebug
```

## 🐛 Troubleshooting

### Error: "JAVA_HOME is not set"

**Solution:**
1. Verify Java is installed:
   ```powershell
   java -version
   ```
2. If Java is installed but JAVA_HOME isn't set:
   ```powershell
   # Find Java installation
   where java
   # Should show: C:\Program Files\Eclipse Adoptium\jdk-17.x.x\bin\java.exe
   ```
3. Set JAVA_HOME to the JDK directory (not the bin folder):
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot"
   ```
4. Restart your terminal and try again

### Error: "gradlew.bat is not recognized"

**Solution:** Make sure you're in the correct directory:
```powershell
# You should be in the project root, not the android folder
cd C:\path\to\camp5
npm run android:run

# OR if you're in the android folder:
cd android
.\gradlew.bat assembleDebug  # Note the .\
```

### Error: "SDK location not found"

**Solution:**
1. Create `android/local.properties`:
   ```properties
   sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
   ```
   (Note: Use double backslashes `\\` or forward slashes `/`)

2. Or set ANDROID_HOME:
   ```powershell
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   ```

### Error: "Gradle sync failed"

**Solution:**
```powershell
# Clean Gradle cache
cd android
.\gradlew.bat clean

# Delete Gradle caches
Remove-Item -Recurse -Force .gradle
Remove-Item -Recurse -Force app\build

# Sync again
cd ..
npx cap sync android
```

### Error: "Could not resolve dependencies"

**Solution:** Check your internet connection and Gradle's proxy settings:

If behind a corporate proxy, create/edit `android/gradle.properties`:
```properties
systemProp.http.proxyHost=proxy.company.com
systemProp.http.proxyPort=8080
systemProp.https.proxyHost=proxy.company.com
systemProp.https.proxyPort=8080
```

### Gradle is Very Slow on Windows

**Solution:**
1. **Enable Gradle Daemon** (should be on by default)

   Edit `android/gradle.properties`:
   ```properties
   org.gradle.daemon=true
   org.gradle.parallel=true
   org.gradle.caching=true
   ```

2. **Allocate More Memory**

   Add to `android/gradle.properties`:
   ```properties
   org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
   ```

3. **Exclude Android Directory from Windows Defender**
   - Open Windows Security
   - Virus & threat protection settings
   - Exclusions → Add an exclusion
   - Add folder: `C:\path\to\camp5\android`

## 📋 Quick Verification Script

Run this PowerShell script to verify your setup:

```powershell
# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
node --version
npm --version

# Check Java
Write-Host "`nChecking Java..." -ForegroundColor Cyan
java -version
Write-Host "JAVA_HOME: $env:JAVA_HOME"

# Check Android SDK
Write-Host "`nChecking Android SDK..." -ForegroundColor Cyan
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
if (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe") {
    adb version
} else {
    Write-Host "ADB not found!" -ForegroundColor Red
}

# Check Git
Write-Host "`nChecking Git..." -ForegroundColor Cyan
git --version

# Summary
Write-Host "`n=== Setup Summary ===" -ForegroundColor Green
if ($env:JAVA_HOME -and $env:ANDROID_HOME) {
    Write-Host "✓ Environment variables configured" -ForegroundColor Green
} else {
    Write-Host "✗ Missing environment variables" -ForegroundColor Red
    if (-not $env:JAVA_HOME) { Write-Host "  - JAVA_HOME not set" -ForegroundColor Yellow }
    if (-not $env:ANDROID_HOME) { Write-Host "  - ANDROID_HOME not set" -ForegroundColor Yellow }
}
```

Save this as `check-setup.ps1` and run:
```powershell
.\check-setup.ps1
```

## 🎯 Common Windows-Specific Issues

### PowerShell Execution Policy

If you get "cannot be loaded because running scripts is disabled":

```powershell
# Allow scripts for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Path Length Limit

Windows has a 260-character path limit. If you encounter path-related errors:

1. **Enable Long Paths** (Windows 10+):
   - Press `Windows + R`
   - Type `gpedit.msc`
   - Navigate to: Computer Configuration → Administrative Templates → System → Filesystem
   - Double-click "Enable Win32 long paths"
   - Select "Enabled"
   - Click OK and restart

2. **Or clone to a shorter path:**
   ```powershell
   # Instead of C:\Users\YourName\Documents\Projects\campus5
   # Use:
   cd C:\
   git clone https://github.com/dev-singh-05/camp5.git
   cd camp5
   ```

### Line Endings (CRLF vs LF)

Git on Windows converts line endings. This can cause issues with shell scripts:

```powershell
# Configure Git to not convert line endings
git config core.autocrlf false

# Re-clone or reset the repository
git reset --hard HEAD
```

## 📚 Additional Resources

- [Java JDK Download](https://adoptium.net/)
- [Android Studio Download](https://developer.android.com/studio)
- [Node.js Download](https://nodejs.org/)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Gradle on Windows](https://docs.gradle.org/current/userguide/installation.html#installing_on_windows)

## ✅ Final Checklist

Before building, ensure:

- [ ] Java JDK 17 is installed
- [ ] `java -version` shows version 17
- [ ] JAVA_HOME is set correctly
- [ ] Android Studio is installed
- [ ] Android SDK is configured (API 33)
- [ ] ANDROID_HOME is set correctly
- [ ] `adb devices` command works
- [ ] Node.js 18+ is installed
- [ ] Project dependencies are installed (`npm install`)
- [ ] Can run `.\gradlew.bat --version` from the android directory

---

**Need help?** Check the [MOBILE_BUILD.md](./MOBILE_BUILD.md) for general build instructions or [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for common problems.
