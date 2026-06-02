import sys
import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import os

# 1. Check Arguments
if len(sys.argv) < 2:
    # Default to a test image from your folder if no argument is passed
    base_dir = os.path.dirname(os.path.dirname(__file__)) if '__file__' in locals() else ".."
    image_path = os.path.join(base_dir, 'test4.png')
    print(f"No image provided via command line. Defaulting to: {image_path}")
else:
    image_path = sys.argv[1]

if not os.path.exists(image_path):
    print(f"Error: Image '{image_path}' not found!")
    exit()

# 2. Load Model
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# Initialize MobileNetV2 architecture
model = models.mobilenet_v2(weights=None)
model.classifier[1] = nn.Linear(model.last_channel, 3)

# Load the trained weights
"""try:
    model.load_state_dict(torch.load("best_mask_detector.pth", map_location=device))
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model. Make sure 'best_mask_detector.pth' is in the same directory.")
    print(f"Details: {e}")
    exit()"""
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

# 3. Define Transformations
my_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

class_names = {0: "Mask", 1: "No Mask"}
colors = {0: (0, 255, 0), 1: (0, 0, 255)} # BGR format for OpenCV

# 4. Process Image using OpenCV and Haar Cascade
# Load image
img = cv2.imread(image_path)
if img is None:
    print(f"Error: Could not read image '{image_path}'. Make sure it's a valid image file.")
    exit()

# Make a copy for drawing
output_img = img.copy()

import numpy as np
import urllib.request

# Use OpenCV DNN Face Detector instead of Haar Cascade for much better accuracy with masks
print("Detecting faces using OpenCV DNN...")
base_dnn_dir = os.path.dirname(__file__) if '__file__' in locals() else "."
prototxt_path = os.path.join(base_dnn_dir, "deploy.prototxt")
model_path_dnn = os.path.join(base_dnn_dir, "res10_300x300_ssd_iter_140000.caffemodel")

# Download model files if they don't exist
if not os.path.exists(prototxt_path):
    print("Downloading reliable face detector prototxt...")
    urllib.request.urlretrieve("https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt", prototxt_path)
if not os.path.exists(model_path_dnn):
    print("Downloading reliable face detector model (this might take a moment)...")
    urllib.request.urlretrieve("https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel", model_path_dnn)

net = cv2.dnn.readNetFromCaffe(prototxt_path, model_path_dnn)

h_img, w_img = img.shape[:2]
blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
net.setInput(blob)
detections = net.forward()

faces = []
for i in range(detections.shape[2]):
    confidence = detections[0, 0, i, 2]
    if confidence > 0.45: # Increased to 45% confidence threshold to prevent false positives
        box = detections[0, 0, i, 3:7] * np.array([w_img, h_img, w_img, h_img])
        (startX, startY, endX, endY) = box.astype("int")
        # Ensure valid face crop dimensions and add a tiny bit of padding
        startX, startY = max(0, startX - 5), max(0, startY - 15)
        endX, endY = min(w_img - 1, endX + 5), min(h_img - 1, endY + 5)
        
        if endX - startX > 20 and endY - startY > 20:
            faces.append((startX, startY, endX - startX, endY - startY))

if len(faces) == 0:
    print("No faces detected using DNN Face Detector.")
    print("Running the model on the entire image instead...")
    faces = [(0, 0, img.shape[1], img.shape[0])]
else:
    print(f"Detected {len(faces)} face(s).")

# 5. Crop faces and run inference
for (x, y, w, h) in faces:
    face_crop = img[y:y+h, x:x+w]
    
    # Convert OpenCV BGR to RGB PIL Image
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
        color = colors.get(label_idx, (0, 165, 255)) # Orange for unknown
        
    # Draw bounding box and label
    cv2.rectangle(output_img, (x, y), (x+w, y+h), color, max(2, int(w/100)))
    
    # Dynamic font scale and thickness based on face size
    font_scale = max(0.5, w / 150.0)
    thickness = max(1, int(w / 75.0))
    cv2.putText(output_img, label_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness)

# 6. Save and Display the output
output_path = "output_" + os.path.basename(image_path)
cv2.imwrite(output_path, output_img)
print(f"Result image saved to: {output_path}")

# Resize for display if the image is too large
screen_max_height = 800
screen_max_width = 1200
h, w = output_img.shape[:2]

if h > screen_max_height or w > screen_max_width:
    scaling_factor = min(screen_max_width/w, screen_max_height/h)
    display_img = cv2.resize(output_img, None, fx=scaling_factor, fy=scaling_factor, interpolation=cv2.INTER_AREA)
else:
    display_img = output_img

cv2.imshow('Face Mask Detection - Press any key to close', display_img)
print("Press any key on the image window to close it.")
cv2.waitKey(0)
cv2.destroyAllWindows()
