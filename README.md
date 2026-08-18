# AR Studio

AR Studio is a Vite + React image-tracking AR demo app. The app loads one AR experience from a backend-style JSON endpoint, compiles the configured target image with MindAR, and opens the camera-based AR viewer.

## Features

- Load AR experience data from JSON.
- Compile the configured target image in the browser using MindAR.
- Configure the AR content from the backend:
  - Target image URL
  - Video URL
  - Card title
  - Card body
  - Button label
  - Button destination URL
- Use the camera-based AR viewer at `/`.
- Keep the old setup flow available at `/setup` for development only.

## Current Demo Flow

This project is now set up as a demo AR app, not an admin panel.

The app user only opens the viewer. The AR content is controlled from the backend/config file:

```text
User opens app -> app fetches JSON config -> app prepares target image -> camera opens -> user scans target image
```

For local development, the backend is simulated by:

```text
public/demo-experience.json
```

To change the demo, edit that JSON file and replace the target image URL, video URL, and card content.

## Tech Stack

- React 18
- Vite 5
- React Router
- MindAR
- Three.js
- qrcode.react
- uuid
- Capacitor 7 (Android/iOS native shell)

## Routes

```text
/          Main backend-driven AR demo
/ar/:id    Backend-driven AR demo for a specific config file
/setup     Old local setup tool for development only
```

When `VITE_AR_CONFIG_URL` is not set, `/ar/demo-1` attempts to load:

```text
/experiences/demo-1.json
```

## Project Structure

```text
ar-app/
├── index.html
├── package.json
├── package-lock.json
├── public/
│   ├── demo-experience.json
│   └── demo-target.svg
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── firebase.js
    ├── pages/
    │   ├── Setup.jsx
    │   ├── Setup.module.css
    │   ├── AR.jsx
    │   └── AR.module.css
    └── components/
        ├── ARCard.jsx
        ├── ARCard.module.css
        ├── QRModal.jsx
        └── QRModal.module.css
```

## Prerequisites

Install the following before running the project:

- Node.js 18 or newer
- npm
- A modern browser with camera support

For AR testing on a phone, the phone and development machine should usually be on the same network.

### Android APK Build Prerequisites

- Java 17 (JDK)
- Android Studio (with Android SDK 34+)
- Android SDK command-line tools

## Run From Scratch

1. Clone or download the project.

   ```bash
   git clone <repository-url>
   cd ar-app
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Start the development server.

   ```bash
   npm run dev
   ```

4. Open the local URL shown in the terminal.

   Vite commonly uses:

   ```text
   http://localhost:5173
   ```

5. Open the demo AR viewer.

   The app loads:

   ```text
   public/demo-experience.json
   ```

   The sample target image is:

   ```text
   public/demo-target.svg
   ```

6. Allow camera access when the browser asks for permission.

7. Point the camera at the configured target image.

## Backend Config

For the current demo, the backend is represented by `public/demo-experience.json`:

```json
{
  "targetImageUrl": "/demo-target.svg",
  "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
  "cardTitle": "Eurobliz AR Demo",
  "cardBody": "This AR experience is loaded from backend-style JSON.",
  "buttonLabel": "Visit Website",
  "buttonUrl": "https://www.eurobliz.eu"
}
```

### Config Fields

| Field | Required | Description |
| --- | --- | --- |
| `targetImageUrl` | Required if `mindDataUrl` is not provided | Image that users scan in AR. |
| `mindDataUrl` | Optional | Precompiled MindAR target data. If provided, the app skips browser compilation. |
| `videoUrl` | Required | Direct video file URL, usually `.mp4`. |
| `cardTitle` | Optional | Title shown when the target is tracked. |
| `cardBody` | Optional | Description shown when the target is tracked. |
| `buttonLabel` | Optional | CTA button text. |
| `buttonUrl` | Optional | CTA button destination. |

To use a real backend later, return the same JSON shape from an API and set:

```bash
VITE_AR_CONFIG_URL=https://your-api.example.com/ar-demo
```

Then run:

```bash
npm run build
```

The app also supports `/ar/:id`. Without `VITE_AR_CONFIG_URL`, `/ar/demo-1` loads:

```text
/experiences/demo-1.json
```

## Replacing Demo Content

To change the target image:

1. Add your image to `public/`, for example:

   ```text
   public/my-target.jpg
   ```

2. Update `public/demo-experience.json`:

   ```json
   {
     "targetImageUrl": "/my-target.jpg",
     "videoUrl": "https://example.com/video.mp4",
     "cardTitle": "My AR Demo",
     "cardBody": "Scan the image to play the video.",
     "buttonLabel": "Open Link",
     "buttonUrl": "https://example.com"
   }
   ```

3. Restart or refresh the app.

For production, prefer hosting the target image and video from your backend or CDN.

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the project for production into the `dist` directory.

```bash
npm run preview
```

Serves the production build locally for preview.

```bash
npx cap copy
```

Copies the web build (`dist/`) into the native Android/iOS project.

```bash
npx cap sync
```

Copies web assets and updates native plugin dependencies.

```bash
npx cap open android
```

Opens the Android project in Android Studio for building the APK.

```bash
npx cap run android
```

Builds and runs the app on a connected Android device (requires JDK + Android SDK).

## Usage Notes

### Storage

The main app no longer depends on `localStorage` for the demo experience. It loads the AR config from JSON, which is closer to how the mobile app should work.

The old setup page at `/setup` still uses `localStorage`; treat it as a development helper, not the production flow.

### Camera and HTTPS

Browsers require a secure context for camera access. Camera permissions normally work on:

- `localhost`
- HTTPS URLs

If testing on a phone, use a secure tunnel or deploy the app to an HTTPS host.

### Video URL

The AR viewer expects the video URL to be a direct video file URL, such as an `.mp4` link. Regular webpage links like YouTube watch pages will not work as video sources.

### Target Image URL

The target image URL must be reachable by the browser. If the image is hosted on another domain, that domain must allow CORS, because MindAR needs to read the image pixels in a canvas.

### Target Image Quality

MindAR works best with target images that have strong visual detail and contrast. Plain images, repeated patterns, or low-detail graphics may track poorly.

## Build and Preview

To check the production build locally:

```bash
npm run build
npm run preview
```

Then open the preview URL shown in the terminal.

## Deployment

Because this is a Vite app, it can be deployed to static hosting providers such as Vercel, Netlify, Firebase Hosting, or GitHub Pages.

General deployment flow:

```bash
npm install
npm run build
```

Deploy the generated `dist` folder.

Important: for the AR camera viewer, deploy to HTTPS.

## Android APK Build

This project uses **Capacitor** to package the web AR viewer into a native Android app. The same codebase works on both browsers and the APK — no React Native or WebView bridge needed.

### 1. Prerequisites

- Java 17 JDK
- Android Studio (with Android SDK 34+)
- An Android device with a camera (or an emulator with a virtual camera)

### 2. Build the Web App

```bash
npm run build
```

This produces the production build in `dist/`.

### 3. Sync with Capacitor

```bash
npx cap copy
```

This copies `dist/` into the Android project at `android/app/src/main/assets/public`.

### 4. Open in Android Studio

```bash
npx cap open android
```

Android Studio opens with the Capacitor project loaded.

### 5. Build the APK

In Android Studio:

1. Wait for Gradle sync to finish.
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. The APK is generated at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

Or for a signed release build: **Build → Generate Signed Bundle / APK**.

### 6. Install on Device

Transfer the APK to your Android device and open it. Grant camera permission when prompted.

### Tip: Quick Test via CLI

If you have a connected device with USB debugging enabled:

```bash
npx cap run android
```

This builds and installs the app directly.

### Important Notes

- Camera requires **Android permissions** — Capacitor handles this automatically but the user must grant it on first launch.
- MindAR requires **WebGL** — all modern Android devices support this.
- For **iOS**, add the iOS platform and repeat the same steps:

  ```bash
  npx cap add ios
  npx cap open ios
  ```

  iOS requires Xcode and an Apple Developer account for device installation.

## Troubleshooting

### Experience config could not be loaded

- Check that `public/demo-experience.json` exists.
- If using `VITE_AR_CONFIG_URL`, check that the API returns valid JSON.
- Make sure the endpoint allows CORS if it is on another domain.

### Camera does not start

- Check browser camera permissions.
- Use `localhost` or an HTTPS URL.
- Make sure no other app is blocking the camera.

### Video failed to load

- Use a direct `.mp4` URL.
- Check that the video URL is reachable.
- Avoid URLs that require authentication.

### Image tracking is unstable

- Use a more detailed target image.
- Avoid glossy screens, blur, or poor lighting.
- Keep the target image flat and fully visible to the camera.

## Future Improvements

- Add backend storage so QR codes work across devices.
- Add Firebase, Supabase, or another API for production config storage.
- Add validation for target image, video, and button URLs.
- Add automated tests.
- Sign release APK with a keystore for Play Store distribution.
- Add iOS platform with `npx cap add ios`.
- Add Capacitor plugins for native features (haptic feedback, splash screen, etc.).
