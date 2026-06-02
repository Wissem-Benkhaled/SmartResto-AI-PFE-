import time
import csv
import os
from datetime import datetime

class WorkerTracker:
    def __init__(self, log_dir="logs", violation_threshold=10.0):
        self.log_dir = log_dir
        self.violation_threshold = violation_threshold
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Keep track of active workers: { worker_name: {"state": "safe/violation", "violation_start": int_time} }
        self.active_workers = {}
        
    def _log_violation(self, name, duration, mask_status, gloves_status):
        """Write the violation to a CSV file"""
        log_file = os.path.join(self.log_dir, f"violations_{datetime.now().strftime('%Y-%m-%d')}.csv")
        file_exists = os.path.isfile(log_file)
        
        with open(log_file, 'a', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['Timestamp', 'Worker Name', 'Duration (s)', 'Mask Status', 'Gloves Status'])
            
            writer.writerow([
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                name,
                f"{duration:.1f}",
                mask_status,
                gloves_status
            ])
            
        print(f"[Tracker] Logged violation for {name}: out of compliance for {duration:.1f}s")
        
    def update_worker(self, name, is_compliant, mask_status, gloves_status):
        """
        Updates the worker's status and logs if threshold exceeded.
        Returns the current violation duration (or 0 if compliant).
        """
        current_time = time.time()
        
        # Initialize if new worker
        if name not in self.active_workers:
            self.active_workers[name] = {"state": "safe", "violation_start": None}
            
        worker = self.active_workers[name]
        
        if is_compliant:
            # If they were previously in violation, see if we need to log it now that it's over
            if worker["state"] == "violation" and worker["violation_start"] is not None:
                duration = current_time - worker["violation_start"]
                if duration >= self.violation_threshold:
                    self._log_violation(name, duration, "Compliant Now", "Compliant Now") # Record it ended
            
            # Reset
            worker["state"] = "safe"
            worker["violation_start"] = None
            return 0.0
            
        else:
            # If they just became non-compliant
            if worker["state"] == "safe":
                worker["state"] = "violation"
                worker["violation_start"] = current_time
                return 0.0
                
            # If they are continuing to be non-compliant
            elif worker["state"] == "violation":
                duration = current_time - worker["violation_start"]
                
                # To prevent spamming the log every frame after 10s, we can either:
                # 1. Log once right at 10s
                # 2. Log when they finally become compliant again
                # Here we log exactly when they hit the threshold the very first time.
                
                # Let's say we log it immediately when it hits the threshold 
                # (We do it by checking if it crossed from < threshold to >= threshold in this frame)
                # But to keep it simple, we'll just track the duration and the frontend will show the timer.
                
                return duration
