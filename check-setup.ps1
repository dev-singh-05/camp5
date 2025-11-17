# Campus5 Android Development Setup Verification Script
# This script checks if all prerequisites are properly installed and configured

Write-Host "`n=== Campus5 Android Development Setup Checker ===" -ForegroundColor Cyan
Write-Host "Verifying prerequisites for building Campus5 Android app...`n" -ForegroundColor Cyan

$allGood = $true

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1

    if ($nodeVersion -match "v(\d+)\.") {
        $nodeMajor = [int]$Matches[1]
        if ($nodeMajor -ge 18) {
            Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
            Write-Host "  ✓ npm: v$npmVersion" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Node.js version too old: $nodeVersion (need 18+)" -ForegroundColor Red
            $allGood = $false
        }
    }
} catch {
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
    Write-Host "    Install from: https://nodejs.org/" -ForegroundColor Yellow
    $allGood = $false
}

# Check Java
Write-Host "`nChecking Java JDK..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    if ($javaVersion -match '"(\d+)\.') {
        $javaMajor = [int]$Matches[1]
        if ($javaMajor -eq 17) {
            Write-Host "  ✓ Java: $javaVersion" -ForegroundColor Green
        } elseif ($javaMajor -eq 1 -and $javaVersion -match '"1\.(\d+)') {
            # Handle old versioning like "1.8"
            $javaMinor = [int]$Matches[1]
            if ($javaMinor -eq 17) {
                Write-Host "  ✓ Java: $javaVersion" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ Java version: $javaVersion (recommended: 17)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠ Java version: $javaVersion (recommended: 17)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✓ Java is installed: $javaVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Java not found in PATH" -ForegroundColor Red
    Write-Host "    Install JDK 17 from: https://adoptium.net/" -ForegroundColor Yellow
    $allGood = $false
}

# Check JAVA_HOME
Write-Host "`nChecking JAVA_HOME..." -ForegroundColor Yellow
if ($env:JAVA_HOME) {
    if (Test-Path "$env:JAVA_HOME\bin\java.exe") {
        Write-Host "  ✓ JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
    } else {
        Write-Host "  ✗ JAVA_HOME is set but invalid: $env:JAVA_HOME" -ForegroundColor Red
        Write-Host "    No java.exe found at: $env:JAVA_HOME\bin\java.exe" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "  ✗ JAVA_HOME not set" -ForegroundColor Red
    Write-Host "    Set it to your JDK installation directory" -ForegroundColor Yellow

    # Try to find Java installation
    $possibleJavaPath = "C:\Program Files\Eclipse Adoptium"
    if (Test-Path $possibleJavaPath) {
        $jdkDirs = Get-ChildItem $possibleJavaPath -Directory | Where-Object { $_.Name -like "jdk-*" }
        if ($jdkDirs) {
            $latestJdk = $jdkDirs | Sort-Object Name -Descending | Select-Object -First 1
            Write-Host "    Found JDK at: $($latestJdk.FullName)" -ForegroundColor Yellow
            Write-Host "    Run this command to set JAVA_HOME:" -ForegroundColor Cyan
            Write-Host "    `$env:JAVA_HOME = '$($latestJdk.FullName)'" -ForegroundColor White
        }
    }
    $allGood = $false
}

# Check Android SDK
Write-Host "`nChecking Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "  ✓ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green

    # Check if SDK directory exists
    if (Test-Path $env:ANDROID_HOME) {
        Write-Host "  ✓ Android SDK directory exists" -ForegroundColor Green

        # Check for platform-tools
        if (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe") {
            Write-Host "  ✓ Android platform-tools found" -ForegroundColor Green
            try {
                $adbVersion = adb version 2>&1 | Select-String "Android Debug Bridge" | Select-Object -First 1
                Write-Host "    ADB: $adbVersion" -ForegroundColor Gray
            } catch {
                # ADB not in PATH but exists
            }
        } else {
            Write-Host "  ✗ Android platform-tools not found" -ForegroundColor Red
            Write-Host "    Install via Android Studio SDK Manager" -ForegroundColor Yellow
            $allGood = $false
        }

        # Check for build-tools
        if (Test-Path "$env:ANDROID_HOME\build-tools") {
            $buildTools = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1
            if ($buildTools) {
                Write-Host "  ✓ Android build-tools: $($buildTools.Name)" -ForegroundColor Green
            }
        } else {
            Write-Host "  ✗ Android build-tools not found" -ForegroundColor Red
            Write-Host "    Install via Android Studio SDK Manager" -ForegroundColor Yellow
            $allGood = $false
        }

        # Check for platforms
        if (Test-Path "$env:ANDROID_HOME\platforms") {
            $platforms = Get-ChildItem "$env:ANDROID_HOME\platforms" -Directory | Where-Object { $_.Name -like "android-*" }
            if ($platforms) {
                $latestPlatform = $platforms | Sort-Object Name -Descending | Select-Object -First 1
                Write-Host "  ✓ Android platforms: $($latestPlatform.Name)" -ForegroundColor Green
            } else {
                Write-Host "  ✗ No Android platform SDKs found" -ForegroundColor Red
                Write-Host "    Install Android 13 (API 33) via Android Studio SDK Manager" -ForegroundColor Yellow
                $allGood = $false
            }
        }
    } else {
        Write-Host "  ✗ Android SDK directory does not exist: $env:ANDROID_HOME" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  ✗ ANDROID_HOME not set" -ForegroundColor Red

    # Try to find Android SDK
    $defaultSdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $defaultSdkPath) {
        Write-Host "    Found Android SDK at: $defaultSdkPath" -ForegroundColor Yellow
        Write-Host "    Run this command to set ANDROID_HOME:" -ForegroundColor Cyan
        Write-Host "    `$env:ANDROID_HOME = '$defaultSdkPath'" -ForegroundColor White
    } else {
        Write-Host "    Install Android Studio from: https://developer.android.com/studio" -ForegroundColor Yellow
    }
    $allGood = $false
}

# Check Git
Write-Host "`nChecking Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "  ✓ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Git not found" -ForegroundColor Red
    Write-Host "    Install from: https://git-scm.com/download/win" -ForegroundColor Yellow
    $allGood = $false
}

# Check if in project directory
Write-Host "`nChecking project setup..." -ForegroundColor Yellow
if (Test-Path ".\package.json") {
    Write-Host "  ✓ Found package.json" -ForegroundColor Green

    # Check if node_modules exists
    if (Test-Path ".\node_modules") {
        Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Dependencies not installed" -ForegroundColor Yellow
        Write-Host "    Run: npm install" -ForegroundColor Cyan
    }

    # Check if android directory exists
    if (Test-Path ".\android") {
        Write-Host "  ✓ Android platform added" -ForegroundColor Green

        # Check for gradlew.bat
        if (Test-Path ".\android\gradlew.bat") {
            Write-Host "  ✓ Gradle wrapper found" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Gradle wrapper not found" -ForegroundColor Red
            Write-Host "    Pull latest changes from Git" -ForegroundColor Yellow
            $allGood = $false
        }
    } else {
        Write-Host "  ⚠ Android platform not found" -ForegroundColor Yellow
        Write-Host "    Run: npx cap add android" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ✗ Not in project directory" -ForegroundColor Red
    Write-Host "    Navigate to the campus5 project directory first" -ForegroundColor Yellow
    $allGood = $false
}

# Final summary
Write-Host "`n=== Setup Summary ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ All prerequisites are configured correctly!" -ForegroundColor Green
    Write-Host "`nYou're ready to build the Android app." -ForegroundColor Green
    Write-Host "Run: npm run build:export && npx cap sync android" -ForegroundColor Cyan
} else {
    Write-Host "✗ Some prerequisites are missing or misconfigured" -ForegroundColor Red
    Write-Host "`nPlease fix the issues above before building." -ForegroundColor Yellow
    Write-Host "See WINDOWS_SETUP.md for detailed instructions." -ForegroundColor Cyan
}

Write-Host ""
