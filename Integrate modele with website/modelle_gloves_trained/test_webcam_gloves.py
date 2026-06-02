import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
import numpy as np
from PIL import Image
import mediapipe as mp

# ==========================================
# 1. Setup PyTorch Model
# ==========================================
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Define the MobileNetV2 architecture used in training
model = models.mobilenet_v2(pretrained=False) # No need to redownload pretrained ImageNet weights for inference
# Classes: "gloves" (0), "no_gloves" (1)
num_classes = 2 # Based on options in training
model.classifier[1] = nn.Linear(model.last_channel, num_classes)

import os
# Load the trained weights
model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best_gloves_detector.pth")
print(f"Loading weights from {model_path}...")
try:
    model.load_state_dict(torch.load(model_path, map_location=device))
    print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")
    exit(1)

model = model.to(device)
model.eval()

# Define the image transformations matching training
my_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

classes = ["Gloves", "No Gloves"]
colors = [(0, 255, 0), (0, 0, 255)] # Green for Gloves, Red for No Gloves

# ==========================================
# 2. Setup Mediapipe Hands
# ==========================================
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Need to point to the downloaded model bundle
base_options = python.BaseOptions(model_asset_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hand_landmarker.task'))
options = vision.HandLandmarkerOptions(base_options=base_options,
                                       num_hands=2)
detector = vision.HandLandmarker.create_from_options(options)

# ==========================================
# 3. Webcam Processing Loop
# ==========================================
cap = cv2.VideoCapture(0)

print("Starting webcam stream... Press 'q' to quit.")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        print("Ignoring empty camera frame.")
        continue

    # Flip the frame horizontally for a later selfie-view display
    frame = cv2.flip(frame, 1)
    
    # Process the frame with mediapipe Tasks API
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    detection_result = detector.detect(mp_image)

    if detection_result.hand_landmarks:
        h, w, c = frame.shape
        for hand_landmarks in detection_result.hand_landmarks:
            # Get bounding box for the hand
            x_max = 0
            y_max = 0
            x_min = w
            y_min = h
            for lm in hand_landmarks:
                x, y = int(lm.x * w), int(lm.y * h)
                if x > x_max: x_max = x
                if x < x_min: x_min = x
                if y > y_max: y_max = y
                if y < y_min: y_min = y
            
            # Add some padding to the bounding box
            padding = 20
            y_min = max(0, y_min - padding)
            y_max = min(h, y_max + padding)
            x_min = max(0, x_min - padding)
            x_max = min(w, x_max + padding)
            
            # Crop hand area
            frame_rgb = mp_image.numpy_view()
            hand_img = frame_rgb[y_min:y_max, x_min:x_max]
            
            if hand_img.size > 0:
                try:
                    # Convert to PIL Image for the PyTorch transforms
                    pil_img = Image.fromarray(hand_img)
                    input_tensor = my_transform(pil_img).unsqueeze(0).to(device)
                    
                    # Inference
                    with torch.no_grad():
                        output = model(input_tensor)
                        probabilities = torch.nn.functional.softmax(output[0], dim=0)
                        confidence, pred_class = torch.max(probabilities, 0)
                        
                    pred_idx = pred_class.item()
                    label = f"{classes[pred_idx]} ({confidence.item()*100:.1f}%)"
                    color = colors[pred_idx]
                    
                    # Draw bounding box and label
                    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, 2)
                    cv2.putText(frame, label, (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                except Exception as e:
                    print(f"Error processing hand crop: {e}")

    # Display the result
    cv2.imshow('Glove Detection', frame)
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
