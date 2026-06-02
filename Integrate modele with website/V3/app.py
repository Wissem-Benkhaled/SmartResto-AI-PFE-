from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import cv2
import numpy as np
import base64
import json
import os
import time
from inference import HealthSafetyDetectorV2
from tracker import WorkerTracker

app = FastAPI(title="Worker Health Safety Dashboard V2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application state
detector = HealthSafetyDetectorV2()
tracker = WorkerTracker(log_dir="logs", violation_threshold=10.0)

app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Serve movement logs so frontend can theoretically display them or download them
logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'movement_logs')
app.mount("/logs", StaticFiles(directory=logs_dir), name="logs")

from pydantic import BaseModel

class RegistrationRequest(BaseModel):
    name: str
    image: str # Base64 string

class AttendanceRequest(BaseModel):
    action: str # 'in' or 'out'
    image: str # Base64 string

@app.get("/")
async def get():
    with open("index.html", "r", encoding="utf-8") as file:
         return HTMLResponse(file.read())

@app.post("/register")
async def register_worker(request: RegistrationRequest):
    try:
        # Decode base64 image
        base64_img = request.image
        if base64_img.startswith("data:image"):
            base64_img = base64_img.split(",")[1]
            
        img_data = base64.b64decode(base64_img)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"error": "Invalid image format received."}
            
        # 1. Detect face using OpenCV cascades
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector.face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
        
        if len(faces) == 0:
            return {"error": "No face detected in the image. Please look clearly at the camera."}
            
        # 2. Get the largest face
        faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
        (x, y, w, h) = faces[0]
        
        # Add padding
        padding = int(w * 0.2)
        y1 = max(0, y - padding)
        y2 = min(frame.shape[0], y + h + padding)
        x1 = max(0, x - padding)
        x2 = min(frame.shape[1], x + w + padding)
        
        face_img = frame[y1:y2, x1:x2]
        
        if face_img.size == 0:
            return {"error": "Failed to crop face."}
            
        # 3. Save to database
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(root_dir, 'worker_database')
        worker_dir = os.path.join(db_path, request.name.strip())
        os.makedirs(worker_dir, exist_ok=True)
        
        # Save as face1.jpg (or face2.jpg if it exists)
        img_id = len(os.listdir(worker_dir)) + 1
        img_path = os.path.join(worker_dir, f"face{img_id}.jpg")
        cv2.imwrite(img_path, face_img)
        
        # 4. Trigger DeepFace to generate embeddings immediately
        from deepface import DeepFace
        try:
            # We enforce_detection=False on the already cropped face safely
             DeepFace.find(img_path=img_path, db_path=db_path, enforce_detection=False, silent=True)
        except Exception as e:
            # It's okay if it fails here, the image is saved and will be picked up later
            print(f"Deepface warning during registration: {e}")
            
        return {"success": True, "message": f"Successfully registered worker: {request.name}"}

    except Exception as e:
        print(f"Registration error: {e}")
        return {"error": str(e)}

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, time as time_obj

# PostgreSQL Configuration
DB_CONFIG = {
    "host": "localhost",
    "user": "postgres",
    "password": "0000",
    "database": "SmartResto AI",
    "port": 8080
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

@app.get("/absents")
async def get_absents():
    try:
        now = datetime.now().date()
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Find users who have NOT logged 'IN' today
        query = """
            SELECT username FROM users 
            WHERE username NOT IN (
                SELECT name FROM pointage 
                WHERE action = 'IN' 
                AND action_date::date = %s
            )
        """
        cur.execute(query, (now,))
        absents = cur.fetchall()
        
        conn.close()
        return {"absents": [a['username'] for a in absents]}
    except Exception as e:
        return {"error": str(e)}

@app.post("/attendance")
async def process_attendance(request: AttendanceRequest):
    try:
        base64_img = request.image
        if base64_img.startswith("data:image"):
            base64_img = base64_img.split(",")[1]
            
        img_data = base64.b64decode(base64_img)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"success": False, "error": "Invalid image."}
            
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(root_dir, 'worker_database')
        
        if not os.path.exists(db_path) or len(os.listdir(db_path)) == 0:
             return {"success": False, "error": "No workers registered in database."}
             
        # Temporary save for DeepFace
        tmp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tmp_attendance.jpg")
        cv2.imwrite(tmp_path, frame)
        
        from deepface import DeepFace
        dfs = DeepFace.find(img_path=tmp_path, db_path=db_path, enforce_detection=False, silent=True)
        os.remove(tmp_path)
        
        if len(dfs) > 0 and len(dfs[0]) > 0:
            df = dfs[0]
            best_match_path = df.iloc[0]['identity']
            name = os.path.basename(os.path.dirname(best_match_path))
            
            # --- PRE-CALCULATE FACE COORDINATES FOR ZOOM ---
            face_coords = None
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = detector.face_cascade.detectMultiScale(gray, 1.3, 5)
                if len(faces) > 0:
                    faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
                    face_coords = faces[0].tolist() 
            except: pass

            # --- ADVANCED BUSINESS LOGIC ---
            now = datetime.now()
            current_time = now.time()
            status = "REGULAR"
            is_paid = True
            
            # 1. DUPLICATE CHECK: Has this user already checked IN/OUT today?
            conn = get_db_connection()
            cur = conn.cursor()
            try:
                # Check if the user exists in the database
                cur.execute(
                    "SELECT user_id FROM users WHERE LOWER(username) = LOWER(%s)",
                    (name,)
                )
                if not cur.fetchone():
                    return {
                        "success": False,
                        "error": f"L'employe '{name}' n'est pas cree dans les Utilisateurs."
                    }

                cur.execute(
                    "SELECT id FROM pointage WHERE name = %s AND action = %s AND action_date::date = CURRENT_DATE",
                    (name, request.action.upper())
                )
                if cur.fetchone():
                    # RETURN WITHOUT INSERTING TO DB, but include box for UI Zoom
                    return {
                        "success": True, 
                        "name": name, 
                        "box": face_coords, 
                        "status": "ALREADY_DONE",
                        "is_paid": True
                    }

                # Example Windows (should ideally be synced with frontend or DB)
                # In: 07:30 - 08:00
                # Out: 17:00 - 17:32
                in_start = time_obj(7, 30)
                in_end = time_obj(8, 0)
                in_limit_late = time_obj(8, 30) # 30 min margin
                out_start = time_obj(17, 0)
                out_limit_early = time_obj(16, 30) # 30 min margin
                
                if request.action == 'in':
                    if current_time > in_limit_late:
                        status = "LATE"
                    elif current_time < time_obj(6, 30): # 1 hour early rule (approx)
                        status = "EARLY_ARRIVAL"
                        is_paid = False
                elif request.action == 'out':
                    if current_time < out_limit_early:
                        status = "EARLY_LEAVE"
                
                # Insert into pointage
                cur.execute(
                    "INSERT INTO pointage (name, action, action_date, status, is_paid) VALUES (%s, %s, %s, %s, %s)",
                    (name, request.action.upper(), now, status, is_paid)
                )
                conn.commit()
                print(f"Logged {name} to DB with status {status}")
            except Exception as e:
                print(f"DB Error: {e}")
                conn.rollback()
            finally:
                cur.close()
                conn.close()

            # Find face coordinates for UI response
            face_coords = None
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = detector.face_cascade.detectMultiScale(gray, 1.3, 5)
                if len(faces) > 0:
                    faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
                    face_coords = faces[0].tolist() 
            except: pass
                
            return {
                "success": True, 
                "name": name, 
                "box": face_coords,
                "status": status,
                "is_paid": is_paid
            }
            
        return {"success": False, "error": "Face not recognized."}
        
    except Exception as e:
        print(f"Attendance processing error: {e}")
        return {"success": False, "error": "Recognition failed."}

@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("V2 Client connected for Health Check")
    try:
        while True:
            data = await websocket.receive_text()
            
            payload = json.loads(data)
            base64_img = payload.get("image", "")
            
            if base64_img.startswith("data:image"):
                base64_img = base64_img.split(",")[1]
                
            img_data = base64.b64decode(base64_img)
            np_arr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                # 1. Run inference (Masks, Gloves, Worker Identity)
                results = detector.process_frame(frame)
                
                # 2. Determine compliance strictly based on the results
                has_gloves = any(h["label"] == "Gloves" for h in results["hands"])
                no_gloves = any(h["label"] == "No Gloves" for h in results["hands"])
                
                # Check each identified worker for violations
                for face in results["faces"]:
                    name = face["name"]
                    if name in ["Unknown Worker", "Detecting..."]:
                        face["violation_duration"] = 0.0
                        continue
                        
                    # Rule: Must have Mask AND visible Gloves to be fully compliant
                    # We assume if gloves are not detected in frame, they may be compliant if mask is...
                    # So let's just trigger violation if "No Mask" is True OR "No Gloves" is True anywhere
                    is_compliant = (face["label"] == "Mask") and (not no_gloves)
                    
                    # 3. Update Tracker state
                    duration = tracker.update_worker(
                        name=name, 
                        is_compliant=is_compliant, 
                        mask_status=face["label"],
                        gloves_status="No Gloves Detected" if no_gloves else "Gloves Detected/Assumed"
                    )
                    
                    face["violation_duration"] = duration
                
                # 4. Return results
                await websocket.send_json(results)
            else:
                await websocket.send_json({"error": "Invalid frame data"})
                
    except WebSocketDisconnect:
        print("V2 Client disconnected from Health Check")
    except Exception as e:
        print(f"Error in websocket v2: {e}")

@app.websocket("/ws/movement")
async def websocket_movement_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("V3 Client connected for Movement Detection")
    
    # State specific to this connection
    prev_gray = None
    last_log_time = 0
    movement_threshold = 500  # Minimum contour area
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            base64_img = payload.get("image", "")
            
            if base64_img.startswith("data:image"):
                base64_img = base64_img.split(",")[1]
                
            img_data = base64.b64decode(base64_img)
            np_arr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                # Blur to reduce noise
                gray = cv2.GaussianBlur(gray, (21, 21), 0)
                
                movement_detected = False
                
                if prev_gray is not None:
                    # Compute absolute difference between current frame and previous frame
                    frame_delta = cv2.absdiff(prev_gray, gray)
                    thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
                    
                    # Dilate the thresholded image to fill in holes
                    thresh = cv2.dilate(thresh, None, iterations=2)
                    
                    contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    for c in contours:
                        if cv2.contourArea(c) > movement_threshold:
                            movement_detected = True
                            # Optional: Draw box around movement for visual feedback (currently client doesn't draw this, but could)
                            #(x, y, w, h) = cv2.boundingRect(c)
                            #cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                            break
                
                prev_gray = gray
                
                response = {"movement": False}
                
                if movement_detected:
                    current_time = time.time()
                    # Throttle saving to once every 3 seconds
                    if current_time - last_log_time > 3.0:
                        last_log_time = current_time
                        
                        # Generate timestamp and save path
                        from datetime import datetime
                        ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"capture_{ts_str}.jpg"
                        filepath = os.path.join(logs_dir, filename)
                        
                        # Save the frame
                        cv2.imwrite(filepath, frame)
                        print(f"Movement detected! Captured image saved to {filepath}")
                        
                        response = {
                            "movement": True,
                            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "filename": filename
                        }
                
                await websocket.send_json(response)
            else:
                await websocket.send_json({"error": "Invalid frame data"})
                
    except WebSocketDisconnect:
        print("V3 Client disconnected from Movement Detection")
    except Exception as e:
        print(f"Error in movement websocket: {e}")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
