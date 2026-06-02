# Implementation Plan: Worker Health Safety Detection Website

The goal is to integrate the `modelle_mask_trained` and `modelle_gloves_trained` models into a real-life website to monitor if workers are respecting health rules in real-time.

## Goal Description
We will build a responsive, modern web application that hooks into the client's webcam. The frontend will capture video frames and send them via WebSockets to a Python backend. The backend will run the frames through both the Mask and Gloves detection pipelines and return the bounding boxes and labels (e.g., "Mask", "No Mask", "Gloves", "No Gloves"). The frontend will overlay these results live on the video feed.

## User Review Required
> [!IMPORTANT]
> - The application will use **FastAPI** and **WebSockets** for high-performance real-time streaming instead of traditional HTTP requests.
> - We will run both the mask detection (OpenCV Haar Cascades + PyTorch) and the gloves detection (MediaPipe + PyTorch) on the same backend.
> - Do you have any specific aesthetic preferences for the website, or should I create a modern, premium "Dashboard" style?

## Proposed Changes

### Backend Application
Summary: Creating the FastAPI server and the unified inference module.

#### [NEW] [requirements.txt](file:///c:/Users/nafed/OneDrive/Bureau/PFE/Integrate%20modele%20with%20website/requirements.txt)
Dependencies: `fastapi`, `uvicorn`, `python-multipart`, `websockets`, `mediapipe`, `torch`, `torchvision`, `opencv-python-headless`, `pillow`.

#### [NEW] [inference.py](file:///c:/Users/nafed/OneDrive/Bureau/PFE/Integrate%20modele%20with%20website/inference.py)
A module that houses the `HealthSafetyDetector` class. It initializes both models into memory once and provides a `process_frame(image_bytes)` method to return detections.

#### [NEW] [app.py](file:///c:/Users/nafed/OneDrive/Bureau/PFE/Integrate%20modele%20with%20website/app.py)
The FastAPI server. It exposes a WebSocket endpoint `/ws/detect` that receives base64 encoded frames, passes them to `inference.py`, and sends back a JSON response with detection coordinates.

---

### Frontend Web UI
Summary: Creating a modern HTML5/JS frontend to interact with the user's webcam.

#### [NEW] [index.html](file:///c:/Users/nafed/OneDrive/Bureau/PFE/Integrate%20modele%20with%20website/index.html)
The main webpage structure, featuring a premium dashboard look, a video player, and an overlay canvas for bounding boxes.

#### [NEW] [assets/style.css](file:///c:/Users/nafed/OneDrive/Bureau/PFE/Integrate%20modele%20with%20website/assets/style.css)
Custom CSS with modern aesthetics: dynamic animations, glassmorphism, and a harmonious color palette (green for safe, red for violations).

#### [NEW] [assets/script.js](file:///c:/Users/nafed/OneDrive/Bureau/PFE/Integrate%20modele%20with%20website/assets/script.js)
Frontend logic to ask for webcam permissions, extract frames at a set FPS, send them via WebSocket, and render the returned boxes on the canvas.

## Verification Plan

### Automated Tests
- Test the backend WebSocket endpoint using a dummy script that sends a static image and prints the JSON response.

### Manual Verification
- Run `uvicorn app:app --reload` to start the backend.
- Open `index.html` in a modern web browser.
- Allow webcam access.
- Wear a mask and gloves in front of the camera to verify that the bounding boxes correctly label "Mask" and "Gloves" in green.
- Remove the mask and/or gloves to verify that "No Mask" and "No Gloves" appear in red.
