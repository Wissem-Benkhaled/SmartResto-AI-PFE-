import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
import numpy as np
from PIL import Image
import os

# 1. Load Model
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# Initialize the MobileNetV2 architecture with our custom classifier
model = models.mobilenet_v2(weights=None) # We don't need pretrained ImageNet weights because we are loading our own
model.classifier[1] = nn.Linear(model.last_channel, 3)

# Load the saved trained weights
# Resolve model path relative to this script so running from other cwd still works
model_path = os.path.join(os.path.dirname(__file__), 'best_mask_detector3_1_2026.pth')
if not os.path.exists(model_path):
    print(f"Error: model file not found at {model_path}")
    print("Make sure 'best_mask_detector3_1_2026.pth' is in the same directory as this script.")
    exit()
try:
    model.load_state_dict(torch.load(model_path, map_location=device))
    print("Model loaded successfully! ->", model_path)
except Exception as e:
    print(f"Error loading model from {model_path}. Error: {e}")
    exit()

model = model.to(device)
model.eval()

# 2. Define Transformations
# Same transformations used for training
my_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Classes mapping mapping based on your notebook
class_names = {0: "Mask", 1: "No Mask"} # You can add index 2 here if "mask_weared_incorrect" is actually trained
colors = {0: (0, 255, 0), 1: (0, 0, 255), 2: (0, 165, 255)} # BGR format: Green for Mask, Red for No Mask

# 3. Initialize Face Detectors (Haar Cascades built into OpenCV)
# Frontal face detector for straight-on viewing
frontal_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
# Profile face detector for side viewing (left/right)
profile_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')

# 4. Starting webcam
print("Opening webcam...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Cannot open webcam. Please make sure no other application is using it.")
    exit()

print("Webcam successfully opened! Press 'q' to quit the window.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break
        
    # Convert to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # List to store all unique faces found
    all_faces = []
    
    # 1. Detect frontal faces (lowered minSize to 30x30 to detect people further away)
    faces_frontal = frontal_face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    for f in faces_frontal:
        all_faces.append(tuple(f))
        
    # Helper to only add a face if it doesn't overlap with one we already found
    def add_unique_faces(new_faces):
        for (nx, ny, nw, nh) in new_faces:
            is_unique = True
            cx, cy = nx + nw//2, ny + nh//2
            for (ex, ey, ew, eh) in all_faces:
                # If the center of the new face is inside an existing face bounding box, it's the same person
                if ex < cx < ex + ew and ey < cy < ey + eh:
                    is_unique = False
                    break
            if is_unique:
                all_faces.append((nx, ny, nw, nh))
                
    # 2. Detect one side of the profile (for anyone facing left/right)
    faces_profile = profile_face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(120, 120))
    add_unique_faces(faces_profile)
    
    # 3. Detect the other side of the profile by flipping the image horizontally
    flipped_gray = cv2.flip(gray, 1)
    faces_profile_flipped = profile_face_cascade.detectMultiScale(flipped_gray, scaleFactor=1.1, minNeighbors=6, minSize=(120, 120))
    
    # Fix x-coordinates for flipped detection
    flipped_faces = []
    for (x, y, w, h) in faces_profile_flipped:
        orig_x = frame.shape[1] - x - w
        flipped_faces.append((orig_x, y, w, h))
    add_unique_faces(flipped_faces)
    
    for (x, y, w, h) in all_faces:
        # Crop the face from the frame using bounding box from face detector
        face_crop = frame[y:y+h, x:x+w]
        
        # Convert OpenCV BGR image to RGB PIL Image
        face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(face_rgb)
        
        # Apply transforms and add batch dimension
        input_tensor = my_transform(pil_image).unsqueeze(0).to(device)
        
        # Inference
        with torch.no_grad():
            outputs = model(input_tensor)
            _, predicted = torch.max(outputs.data, 1)
            label_idx = predicted.item()
            
            # Get text and colors
            label_text = class_names.get(label_idx, "Incorrect")
            color = colors.get(label_idx, (255, 255, 255))
            
        # Draw bounding box and label
        cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
        cv2.putText(frame, label_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    cv2.imshow('Real-time Face Mask Detector', frame)
    
    # Break loop if 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()
