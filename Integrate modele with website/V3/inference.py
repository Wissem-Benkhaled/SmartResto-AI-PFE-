import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
import numpy as np
from PIL import Image
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from deepface import DeepFace

# Set root directory for paths since we are inside V2
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class HealthSafetyDetectorV2:
    def __init__(self):
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        print(f"[Detector V2] Using device: {self.device}")
        
        # Paths relative to original project
        mask_model_path = os.path.join(root_dir, 'modelle_mask_trained', 'best_mask_detector3_11_2026.pth')
        gloves_model_path = os.path.join(root_dir, 'modelle_gloves_trained', 'best_gloves_detector.pth')
        hand_task_path = os.path.join(root_dir, 'modelle_gloves_trained', 'hand_landmarker.task')
        self.db_path = os.path.join(root_dir, 'worker_database')

        # 1. Setup Mask Model
        self.mask_model = models.mobilenet_v2(weights=None)
        self.mask_model.classifier[1] = nn.Linear(self.mask_model.last_channel, 3)
        self.mask_model.load_state_dict(torch.load(mask_model_path, map_location=self.device))
        self.mask_model = self.mask_model.to(self.device)
        self.mask_model.eval()

        self.mask_class_names = {0: "Mask", 1: "No Mask", 2: "Incorrect Mask"} 

        # 2. Setup Gloves Model
        self.gloves_model = models.mobilenet_v2(weights=None)
        self.gloves_model.classifier[1] = nn.Linear(self.gloves_model.last_channel, 2)
        self.gloves_model.load_state_dict(torch.load(gloves_model_path, map_location=self.device))
        self.gloves_model = self.gloves_model.to(self.device)
        self.gloves_model.eval()

        self.gloves_classes = {0: "Gloves", 1: "No Gloves"}

        # 3. Common Transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        # 4. Setup Face Detectors (OpenCV)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

        # 5. Setup Hand Detectors (Mediapipe)
        base_options = python.BaseOptions(model_asset_path=hand_task_path)
        options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=2)
        self.hand_detector = vision.HandLandmarker.create_from_options(options)
        
        # Deepface Identity tracker (caching)
        self.face_cache = {}
        self.frame_count = 0
        self.recognition_frequency = 10 # Only run deepface every 10 frames to keep high FPS

        print("[Detector V2] All models loaded successfully!")

    def process_frame(self, frame_bgr):
        # Result dictionary
        results = {
            "faces": [],
            "hands": []
        }
        
        self.frame_count += 1
        h, w, c = frame_bgr.shape

        # ==========================================
        # FACE & MASK DETECTION
        # ==========================================
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        all_faces = []

        # Frontal
        faces_frontal = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))
        for f in faces_frontal: all_faces.append(tuple(f))

        # Helper for unique faces
        def add_unique_faces(new_faces):
            for (nx, ny, nw, nh) in new_faces:
                is_unique = True
                cx, cy = nx + nw//2, ny + nh//2
                for (ex, ey, ew, eh) in all_faces:
                    if ex < cx < ex + ew and ey < cy < ey + eh:
                        is_unique = False
                        break
                if is_unique:
                    all_faces.append((nx, ny, nw, nh))

        # Profile
        faces_profile = self.profile_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(120, 120))
        add_unique_faces(faces_profile)

        flipped_gray = cv2.flip(gray, 1)
        faces_profile_flipped = self.profile_cascade.detectMultiScale(flipped_gray, scaleFactor=1.1, minNeighbors=6, minSize=(120, 120))
        flipped_faces = []
        for (nx, ny, fw, fh) in faces_profile_flipped:
            orig_x = w - nx - fw
            flipped_faces.append((orig_x, ny, fw, fh))
        add_unique_faces(flipped_faces)

        # Process each detected face
        new_face_cache = {}
        for (x, y, fw, fh) in all_faces:
            # Ensure ROI is within frame
            x = max(0, x)
            y = max(0, y)
            if x+fw > w: fw = w - x
            if y+fh > h: fh = h - y

            face_crop = frame_bgr[y:y+fh, x:x+fw]
            if face_crop.size == 0: continue

            # 1. MASK DETECTION (PyTorch)
            face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(face_rgb)
            input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self.mask_model(input_tensor)
                _, predicted = torch.max(outputs.data, 1)
                label_idx = predicted.item()
                mask_label = self.mask_class_names.get(label_idx, "Unknown")
                
            # 2. WORKER IDENTITY (DeepFace Object Tracking/Caching)
            # Find the center of the current face
            cx, cy = x + fw//2, y + fh//2
            worker_name = "Detecting..."
            
            # See if this face matches a cached face spatially
            matched_cache_key = None
            for cache_key, cache_val in self.face_cache.items():
                cx_old, cy_old, name_old = cache_val
                # If centers are within 50 pixels, it's the same person moving
                if abs(cx - cx_old) < 50 and abs(cy - cy_old) < 50:
                    worker_name = name_old
                    matched_cache_key = cache_key
                    break
            
            # Only run heavy DeepFace recognition every N frames OR if it's a completely new face
            if worker_name == "Detecting..." or self.frame_count % self.recognition_frequency == 0:
                # Need to run recognition
                try:
                    # DeepFace requires RGB images saved or numpy arrays
                    dfs = DeepFace.find(img_path=face_crop, 
                                        db_path=self.db_path, 
                                        enforce_detection=False,
                                        silent=True)
                    
                    if len(dfs) > 0 and len(dfs[0]) > 0:
                        df = dfs[0]
                        matched_path = df.iloc[0]['identity']
                        # The path is like worker_database/Name/face1.jpg
                        worker_name = os.path.basename(os.path.dirname(matched_path))
                    else:
                        worker_name = "Unknown Worker"
                except Exception as e:
                    worker_name = "Unknown Worker"
            
            # Update cache for next frames
            cache_id = matched_cache_key if matched_cache_key else f"{cx}_{cy}"
            new_face_cache[cache_id] = (cx, cy, worker_name)

            results["faces"].append({
                "box": [int(x), int(y), int(fw), int(fh)],
                "label": mask_label,
                "name": worker_name,
                "class_id": label_idx
            })
            
        self.face_cache = new_face_cache


        # ==========================================
        # GLOVES DETECTION
        # ==========================================
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        detection_result = self.hand_detector.detect(mp_image)

        if detection_result.hand_landmarks:
            for hand_landmarks in detection_result.hand_landmarks:
                x_max, y_max = 0, 0
                x_min, y_min = w, h
                
                for lm in hand_landmarks:
                    x_lm, y_lm = int(lm.x * w), int(lm.y * h)
                    if x_lm > x_max: x_max = x_lm
                    if x_lm < x_min: x_min = x_lm
                    if y_lm > y_max: y_max = y_lm
                    if y_lm < y_min: y_min = y_lm
                
                padding = 30
                y_min = max(0, y_min - padding)
                y_max = min(h, y_max + padding)
                x_min = max(0, x_min - padding)
                x_max = min(w, x_max + padding)
                
                hand_img = frame_rgb[y_min:y_max, x_min:x_max]
                if hand_img.size > 0:
                    pil_img = Image.fromarray(hand_img)
                    input_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
                    
                    with torch.no_grad():
                        output = self.gloves_model(input_tensor)
                        probabilities = torch.nn.functional.softmax(output[0], dim=0)
                        confidence, pred_class = torch.max(probabilities, 0)
                        
                    pred_idx = pred_class.item()
                    
                    results["hands"].append({
                        "box": [int(x_min), int(y_min), int(x_max - x_min), int(y_max - y_min)],
                        "label": self.gloves_classes.get(pred_idx, "Unknown"),
                        "confidence": float(confidence.item()),
                        "class_id": pred_idx
                    })

        return results
