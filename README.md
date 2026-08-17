# AR Studio

AR Studio is a Vite + React image-tracking AR web application. The app loads an AR experience from a backend-style JSON endpoint, compiles the configured target image with MindAR in the browser, and opens the camera-based AR viewer.

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

This project is set up as a demo AR app. The AR content is controlled from the backend/config file:

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
    │   ├── AR.module.css
    │   ├── ARWrapper.jsx
    │   ├── ARWrapper.module.css
    │   ├── Home.jsx
    │   └── Home.module.css
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

For AR testing on a mobile device, the phone and development machine should usually be on the same network or hosted via HTTPS.

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

## Usage Notes

### Storage

The main app no longer depends on `localStorage` for the demo experience. It loads the AR config from JSON, which is closer to how the production app should work.

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
