# HAR Vision

## Current State
The app has a video upload section where users can upload a video file (mp4/avi/mov/webm), which goes through a simulated 5-step AI processing pipeline (frame extraction, CNN, pose estimation, temporal analysis, classification), then displays activity results with confidence scores and a timeline. There is also a demo mode, analysis history, and a "How It Works" section. The backend stores video blobs and analysis results.

## Requested Changes (Diff)

### Add
- A "Live Webcam" tab/toggle in the UploadAnalyzeSection alongside the existing upload option
- Webcam capture view that shows the live camera feed
- Real-time activity detection simulation: cycles through the activity labels every few seconds, displaying the currently detected activity as an overlay on the camera feed with a confidence score
- A "Start Detection" / "Stop Detection" button to control the webcam session
- A live activity log panel that accumulates detected activities during the session
- A "Save Session" button to persist the session results to the backend (using the existing submitVideo / setActivityResults / updateAnalysisStatus APIs with a synthetic blob)

### Modify
- UploadAnalyzeSection: add a tab switcher at the top ("Upload Video" | "Live Webcam") to toggle between the existing upload flow and the new webcam flow
- Section header subtitle to mention webcam as a supported input mode

### Remove
- Nothing removed

## Implementation Plan
1. Add the `camera` Caffeine component to the project
2. Create a new `WebcamSection.tsx` component that:
   - Uses the camera hook/utility from the camera component to access the webcam stream
   - Shows live video feed via a `<video>` element bound to the camera stream
   - Runs a simulated activity detection loop (setInterval cycling through ActivityLabel values with random confidence scores) when detection is active
   - Overlays the current detected activity label and confidence on the video feed
   - Maintains an in-session activity log (array of {label, confidence, timestamp})
   - Has Start/Stop detection controls
   - Has a Save Session button that calls backend APIs to persist the results
3. Modify `UploadAnalyzeSection.tsx` to render a tab switcher (Upload / Live Webcam) and conditionally show either the existing upload UI or the new WebcamSection
4. Update the section header copy to mention webcam support
