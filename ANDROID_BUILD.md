# Guide: How to Get Your Android APK (Automated & Local)

Because you cannot download/run ZIP files easily or build Android applications directly inside the browser environment of Google AI Studio (it lacks JDK and Android SDK), the best and easiest way to build your mobile app is **completely online via GitHub Actions (no installation needed!)** or via a Git-cloned local pipeline.

Because of the configuration in `capacitor.config.ts`, your mobile app is designed to load your live website. **Any updates you perform on the Web App automatically show up inside the mobile app instantly without needing to rebuild or re-install the APK!**

---

## ⚡ Method 1: Automated Cloud Build via GitHub (Easiest - Recommended)

We have configured a **GitHub Actions Build Pipeline** in `.github/workflows/android.yml`. Whenever your project is exported to GitHub, GitHub automatically builds the APK inside the cloud! You can download it with a single click.

### 📋 Steps:
1. **Export your app to GitHub**:
   - In Google AI Studio, click the **Settings** menu (gear icon in the top-right corner).
   - Select **Export to GitHub** (or connect your GitHub account if you haven't already) to create a repository.
2. **Access your Android APK**:
   - Go to your newly created repository on [GitHub](https://github.com).
   - Click on the **Actions** tab at the top.
   - You will see a workflow running named **"Build Android APK"**.
   - Wait 1-2 minutes for the green checkmark (success).
   - Click on the completed workflow run, scroll down to the **Artifacts** section at the bottom, and click the **app-debug-apk** link to download your fresh APK file!
3. **Install**: Copy the downloaded `.apk` file to your Android device and install it.

---

## 💻 Method 2: Build Locally on Your Computer

If you prefer to compile it manually on your local development machine, follow this standard workflow:

### 📋 Prerequisites
Before you begin, ensure you have the following installed on your computer:
1. **Node.js** (v18 or higher) ➡️ [Download Node.js](https://nodejs.org/)
2. **Git** ➡️ [Download Git](https://git-scm.com/) (to clone your code without ZIP limitations)
3. **Android Studio** ➡️ [Download Android Studio](https://developer.android.com/studio)
   - During setup, install the **Android SDK**, **Android SDK Platform Tools**, and **Command Line Tools**.

### 🚀 Step-by-Step Local Build Instructions

#### Phase 1: Clone & Install Dependencies
1. Open your Terminal / Command Prompt.
2. Clone your repository (or get your files on your computer):
   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL>
   cd <YOUR_REPOSITORY_NAME>
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

#### Phase 2: Build the Web Assets & Sync
1. Compile the web assets:
   ```bash
   npm run build
   ```
2. Sync the configuration to the native Android platform folder:
   ```bash
   npx cap sync
   ```

#### Phase 3: Build in Android Studio
1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
   *(Or open Android Studio, click **Open Project**, and select the `/android` folder).*
2. **Wait for Gradle Sync to complete**: Android Studio will automatically download build dependencies.
3. Go to the top menu bar of Android Studio:
   `Build` ➡️ `Build Bundle(s) / APK(s)` ➡️ `Build APK(s)`
4. **Locate your APK**:
   - Once success is shown, click the **"Locate"** link in the popup.
   - You will find the fresh `app-debug.apk` file there! Copy it to your device to run it.

---

## 🔮 Benefits of this Setup
- **Continuous Live Delivery**: Since the mobile app links to your live URL, any changes you publish to the web app are instantly available to app users without needing updates.
- **Full Web-to-Native Integration**: Full responsive layouts and smooth transition states.
