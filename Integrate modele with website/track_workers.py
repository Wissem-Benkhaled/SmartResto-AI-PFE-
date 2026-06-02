import cv2
import os
import time
from deepface import DeepFace
import numpy as np

# Configuration
# Path to store the registered faces
DB_PATH = "worker_database"
os.makedirs(DB_PATH, exist_ok=True)

# Haar Cascade for quick face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def register_worker(cap):
    """Registers a new worker by saving their face image to the database."""
    print("\n--- WORKER REGISTRATION ---")
    print("Please look at the camera. Press 'c' to capture your face, or 'q' to cancel.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
            
        frame = cv2.flip(frame, 1)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        display_frame = frame.copy()
        
        if len(faces) > 0:
            # Draw rectangle around the largest face
            faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
            (x, y, w, h) = faces[0]
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(display_frame, "Face detected! Press 'c' to capture.", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        else:
            cv2.putText(display_frame, "No face detected.", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
        cv2.imshow("Registration", display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('c'):
            if len(faces) > 0:
                # Capture the face
                (x, y, w, h) = faces[0]
                # Extent the bounding box a bit
                padding = int(w * 0.2)
                y1 = max(0, y - padding)
                y2 = min(frame.shape[0], y + h + padding)
                x1 = max(0, x - padding)
                x2 = min(frame.shape[1], x + w + padding)
                face_img = frame[y1:y2, x1:x2]
                
                # Ask for name
                cv2.destroyWindow("Registration")
                name = input("Enter the worker's name: ").strip()
                if name:
                    # Save image inside a folder for DeepFace
                    worker_dir = os.path.join(DB_PATH, name)
                    os.makedirs(worker_dir, exist_ok=True)
                    img_path = os.path.join(worker_dir, "face1.jpg")
                    cv2.imwrite(img_path, face_img)
                    print(f"Successfully registered worker '{name}'!")
                    
                    # Force deeply to create representations for the new image immediately
                    try:
                        DeepFace.find(img_path=img_path, db_path=DB_PATH, enforce_detection=False, silent=True)
                    except Exception as e:
                        pass
                else:
                    print("Registration cancelled (empty name).")
                break
            else:
                print("No face detected to capture!")
        elif key == ord('q'):
            print("Registration cancelled.")
            cv2.destroyWindow("Registration")
            break

def track_workers(cap):
    """Tracks workers in real-time."""
    print("\n--- LIVE TRACKING ---")
    print("Press 'q' to quit tracking.")
    
    # Pre-check if DB is empty
    db_items = os.listdir(DB_PATH)
    if not db_items or (len(db_items) == 1 and db_items[0].endswith(".pkl")):
        print("Database is empty! Please register a worker first.")
        return

    # To process every Nth frame for performance
    frame_skip = 5
    frame_count = 0
    
    # Store recognized boxes to draw them smoothly between frames
    recognized_faces = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        frame = cv2.flip(frame, 1)
        frame_count += 1
        
        if frame_count % frame_skip == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            new_recognized = []
            
            for (x, y, w, h) in faces:
                padding = int(w * 0.2)
                y1 = max(0, y - padding)
                y2 = min(frame.shape[0], y + h + padding)
                x1 = max(0, x - padding)
                x2 = min(frame.shape[1], x + w + padding)
                
                face_img = frame[y1:y2, x1:x2]
                
                if face_img.size == 0:
                    continue
                    
                try:
                    # DeepFace search
                    dfs = DeepFace.find(img_path=face_img, 
                                        db_path=DB_PATH, 
                                        enforce_detection=False,
                                        silent=True)
                    
                    # Check if a match was found
                    if len(dfs) > 0 and len(dfs[0]) > 0:
                        df = dfs[0]
                        matched_path = df.iloc[0]['identity']
                        # The path is like worker_database/Name/face1.jpg
                        # We extract the 'Name' directly
                        worker_name = os.path.basename(os.path.dirname(matched_path))
                    else:
                        worker_name = "Unknown"
                except Exception as e:
                    worker_name = "Unknown"
                    
                new_recognized.append({
                    "box": (x, y, w, h),
                    "name": worker_name
                })
                
            recognized_faces = new_recognized

        # Draw the cached recognized faces
        for face in recognized_faces:
            (x, y, w, h) = face["box"]
            name = face["name"]
            
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            cv2.putText(frame, name, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            
        cv2.imshow("Worker Tracking", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            cv2.destroyWindow("Worker Tracking")
            break

def main():
    cap = cv2.VideoCapture(0)
    
    while True:
        print("\n" + "="*30)
        print("WORKER ATTENDANCE SYSTEM")
        print("="*30)
        print("1. Register a new worker")
        print("2. Start live tracking")
        print("3. Exit")
        
        choice = input("Enter your choice (1-3): ").strip()
        
        if choice == '1':
            register_worker(cap)
        elif choice == '2':
            track_workers(cap)
        elif choice == '3':
            break
        else:
            print("Invalid choice, please try again.")
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
