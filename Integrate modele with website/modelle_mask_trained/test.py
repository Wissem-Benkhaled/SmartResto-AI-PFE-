import torch
import torch.nn as nn
import cv2
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
from datetime import datetime
import os

# Define your model class here (must match your training architecture)
# Example - REPLACE THIS WITH YOUR ACTUAL MODEL CLASS:
# class YourModelClass(nn.Module):
#     def __init__(self):
#         super().__init__()
#         # ... your model architecture ...
#     def forward(self, x):
#         # ... forward pass ...

# Load your trained model
def load_model(model_path, device):
    # Check if file exists
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        return None

    # Load the model based on file extension/content
    try:
        # Try to load as complete model first
        model = torch.load(model_path, map_location=device)
        print("✅ Loaded complete model")
    except:
        # If that fails, try to load as state dict (you need to define your model class)
        # model = YourModelClass()  # UNCOMMENT AND REPLACE WITH YOUR MODEL CLASS
        # model.load_state_dict(torch.load(model_path, map_location=device))
        # print("✅ Loaded model weights")
        print("❌ Failed to load model. Make sure you have the correct model class defined.")
        return None

    model = model.to(device)
    model.eval()
    return model

# Define image transformations (must match your training preprocessing)
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # Adjust size to your model's input size
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # ImageNet norms
])

# Define your class names (REPLACE WITH YOUR ACTUAL CLASSES)
class_names = ['class_0', 'class_1', 'class_2']  # Update this!

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Load model - use the actual path where you saved your model
model_path = './complete_model_20260223_134038.pth'  # Use your actual saved model
model = load_model(model_path, device)

if model is None:
    print("❌ Could not load model. Exiting...")
    exit()

print("✅ Model loaded successfully!")

# Initialize webcam
cap = cv2.VideoCapture(0)  # 0 for default camera

if not cap.isOpened():
    print("❌ Error: Could not open webcam")
    exit()

print("\n🎥 Starting webcam test. Press 'q' to quit, 's' to save screenshot")

while True:
    # Capture frame-by-frame
    ret, frame = cap.read()
    if not ret:
        print("❌ Error: Can't receive frame")
        break

    # Make a copy for display
    display_frame = frame.copy()

    # Prepare image for model
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_frame)

    # Apply transformations
    input_tensor = transform(pil_image).unsqueeze(0).to(device)

    # Make prediction
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, predicted = torch.max(probabilities, 0)

        predicted_class = class_names[predicted.item()]
        confidence_score = confidence.item() * 100

    # Display prediction on frame
    text = f"{predicted_class}: {confidence_score:.1f}%"
    color = (0, 255, 0) if confidence_score > 70 else (0, 255, 255)  # Green if confident, Yellow if unsure

    # Add background rectangle for text
    cv2.rectangle(display_frame, (10, 30), (350, 80), (0, 0, 0), -1)
    cv2.putText(display_frame, text, (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

    # Add confidence bar
    bar_length = int(confidence_score * 3)  # Scale to max 300 pixels
    cv2.rectangle(display_frame, (20, 90), (20 + bar_length, 110), color, -1)
    cv2.rectangle(display_frame, (20, 90), (320, 110), (255, 255, 255), 2)

    # Show top 3 predictions (optional)
    if len(class_names) >= 3:
        top3_prob, top3_idx = torch.topk(probabilities, min(3, len(class_names)))
        y_offset = 140
        for i in range(min(3, len(class_names))):
            class_name = class_names[top3_idx[i].item()]
            prob = top3_prob[i].item() * 100
            text_top = f"{i+1}. {class_name}: {prob:.1f}%"
            cv2.putText(display_frame, text_top, (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            y_offset += 25

    # Display the frame
    cv2.imshow('Model Test with Webcam', display_frame)

    # Handle key presses
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):  # Press 'q' to quit
        break
    elif key == ord('s'):  # Press 's' to save screenshot
        screenshot_path = f'screenshot_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg'
        cv2.imwrite(screenshot_path, display_frame)
        print(f"📸 Screenshot saved: {screenshot_path}")

# Release everything
cap.release()
cv2.destroyAllWindows()
print("\n✅ Webcam test completed!")