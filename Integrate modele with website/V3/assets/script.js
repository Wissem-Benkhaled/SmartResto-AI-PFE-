document.addEventListener("DOMContentLoaded", () => {
    // UI Elements - Navigation
    const tabHealth = document.getElementById("tab-health");
    const tabMovement = document.getElementById("tab-movement");
    const tabAttendance = document.getElementById("tab-attendance");
    const viewHealth = document.getElementById("view-health");
    const viewMovement = document.getElementById("view-movement");
    const viewAttendance = document.getElementById("view-attendance");

    // UI Elements - Health View
    const videoHealth = document.getElementById("webcam-health");
    const canvasHealth = document.getElementById("overlay-health");
    const ctxHealth = canvasHealth.getContext("2d");
    const overlayMsgHealth = document.getElementById("video-overlay-ui-health");
    const cameraBtnHealth = document.getElementById("camera-btn-health");
    const streamBtnHealth = document.getElementById("toggle-stream-btn-health");
    const eventLogHealth = document.getElementById("event-log-health");

    // Health Status Elements
    const wsIndicator = document.getElementById("ws-indicator");
    const wsText = document.getElementById("ws-text");
    const overallStatus = document.getElementById("overall-status");
    const overallMsg = document.getElementById("overall-message");
    const maskStatus = document.getElementById("mask-status");
    const glovesStatus = document.getElementById("gloves-status");

    // UI Elements - Movement View
    const videoMovement = document.getElementById("webcam-movement");
    const canvasMovement = document.getElementById("overlay-movement");
    const ctxMovement = canvasMovement.getContext("2d");
    const overlayMsgMovement = document.getElementById("video-overlay-ui-movement");
    const cameraBtnMovement = document.getElementById("camera-btn-movement");
    const streamBtnMovement = document.getElementById("toggle-stream-btn-movement");
    const eventLogMovement = document.getElementById("event-log-movement");
    const movementBadge = document.getElementById("movement-status-badge");
    const movementMsg = document.getElementById("movement-status-msg");

    // UI Elements - Attendance View
    const videoAttendance = document.getElementById("webcam-attendance");
    const canvasAttendance = document.getElementById("overlay-attendance");
    const ctxAttendance = canvasAttendance.getContext("2d");
    const overlayMsgAttendance = document.getElementById("video-overlay-ui-attendance");
    const cameraBtnAttendance = document.getElementById("camera-btn-attendance");
    const btnCheckIn = document.getElementById("btn-check-in");
    const btnCheckOut = document.getElementById("btn-check-out");
    const eventLogAttendance = document.getElementById("event-log-attendance");
    const attendanceBadge = document.getElementById("attendance-status-badge");
    const attendanceMsg = document.getElementById("attendance-status-msg");

    // State - Health
    let isCameraOnHealth = false;
    let isStreamingHealth = false;
    let wsHealth = null;
    let streamIntervalHealth = null;

    // State - Movement
    let isCameraOnMovement = false;
    let isStreamingMovement = false;
    let wsMovement = null;
    let streamIntervalMovement = null;

    // State - Attendance
    let isCameraOnAttendance = false;

    // Shared Hidden Canvas logic (we can use two or just resize one, two is cleaner)
    const hiddenCanvasHealth = document.createElement('canvas');
    const hiddenCtxHealth = hiddenCanvasHealth.getContext('2d');

    const hiddenCanvasMovement = document.createElement('canvas');
    const hiddenCtxMovement = hiddenCanvasMovement.getContext('2d');

    const hiddenCanvasAttendance = document.createElement('canvas');
    const hiddenCtxAttendance = hiddenCanvasAttendance.getContext('2d');

    // ==========================================
    // Tab Switching Logic
    // ==========================================
    function switchTab(tabId) {
        if (tabId === 'health') {
            tabHealth.classList.add('active');
            tabMovement.classList.remove('active');
            tabAttendance.classList.remove('active');
            viewHealth.classList.add('active');
            viewHealth.classList.remove('hidden');
            viewMovement.classList.remove('active');
            viewMovement.classList.add('hidden');
            viewAttendance.classList.remove('active');
            viewAttendance.classList.add('hidden');
        } else if (tabId === 'movement') {
            tabMovement.classList.add('active');
            tabHealth.classList.remove('active');
            tabAttendance.classList.remove('active');
            viewMovement.classList.add('active');
            viewMovement.classList.remove('hidden');
            viewHealth.classList.remove('active');
            viewHealth.classList.add('hidden');
            viewAttendance.classList.remove('active');
            viewAttendance.classList.add('hidden');
        } else {
            tabAttendance.classList.add('active');
            tabHealth.classList.remove('active');
            tabMovement.classList.remove('active');
            viewAttendance.classList.add('active');
            viewAttendance.classList.remove('hidden');
            viewHealth.classList.remove('active');
            viewHealth.classList.add('hidden');
            viewMovement.classList.remove('active');
            viewMovement.classList.add('hidden');
        }
    }

    tabHealth.addEventListener('click', () => switchTab('health'));
    tabMovement.addEventListener('click', () => switchTab('movement'));
    tabAttendance.addEventListener('click', () => switchTab('attendance'));

    // ==========================================
    // HEALTH VIEW LOGIC
    // ==========================================
    function connectWsHealth() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/detect`;
        wsHealth = new WebSocket(wsUrl);

        wsHealth.onopen = () => {
            wsIndicator.className = "indicator connected";
            wsText.textContent = "Connected to Server V2";
            if (isCameraOnHealth) streamBtnHealth.disabled = false;
        };

        wsHealth.onclose = () => {
            wsIndicator.className = "indicator disconnected";
            wsText.textContent = "Disconnected";
            stopStreamingHealth();
            streamBtnHealth.disabled = true;
            setTimeout(connectWsHealth, 3000);
        };

        wsHealth.onerror = (err) => {
            console.error("Health WS error:", err);
            wsHealth.close();
        };

        wsHealth.onmessage = (event) => {
            try {
                const results = JSON.parse(event.data);
                processResultsHealth(results);
            } catch (e) {
                console.error("Error parsing Health WS message:", e);
            }
        };
    }

    async function startCameraHealth() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            videoHealth.srcObject = stream;

            videoHealth.onloadedmetadata = () => {
                canvasHealth.width = videoHealth.videoWidth;
                canvasHealth.height = videoHealth.videoHeight;
                hiddenCanvasHealth.width = videoHealth.videoWidth;
                hiddenCanvasHealth.height = videoHealth.videoHeight;

                isCameraOnHealth = true;
                cameraBtnHealth.textContent = "Stop Camera";
                cameraBtnHealth.classList.replace("primary", "secondary");
                overlayMsgHealth.style.display = "none";

                if (wsHealth && wsHealth.readyState === WebSocket.OPEN) {
                    streamBtnHealth.disabled = false;
                }
            };
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access webcam for Health view. Check permissions.");
        }
    }

    function stopCameraHealth() {
        if (videoHealth.srcObject) {
            videoHealth.srcObject.getTracks().forEach(track => track.stop());
            videoHealth.srcObject = null;
        }
        isCameraOnHealth = false;
        stopStreamingHealth();
        cameraBtnHealth.textContent = "Start Camera";
        cameraBtnHealth.classList.replace("secondary", "primary");
        overlayMsgHealth.style.display = "block";
        overlayMsgHealth.textContent = "Camera Off";
        streamBtnHealth.disabled = true;

        ctxHealth.clearRect(0, 0, canvasHealth.width, canvasHealth.height);
        updateStatusHealth("UNKNOWN", "UNKNOWN");
    }

    function startStreamingHealth() {
        if (!isCameraOnHealth || wsHealth.readyState !== WebSocket.OPEN) return;

        isStreamingHealth = true;
        streamBtnHealth.textContent = "Stop Inference";
        streamBtnHealth.classList.replace("secondary", "primary");

        streamIntervalHealth = setInterval(() => {
            hiddenCtxHealth.drawImage(videoHealth, 0, 0, hiddenCanvasHealth.width, hiddenCanvasHealth.height);
            const base64Img = hiddenCanvasHealth.toDataURL('image/jpeg', 0.8);
            wsHealth.send(JSON.stringify({ image: base64Img }));
        }, 150);

        logEventHealth("Inference tracking started.", "clear");
    }

    function stopStreamingHealth() {
        if (streamIntervalHealth) clearInterval(streamIntervalHealth);
        isStreamingHealth = false;
        streamBtnHealth.textContent = "Start Inference";
        streamBtnHealth.classList.replace("primary", "secondary");

        ctxHealth.clearRect(0, 0, canvasHealth.width, canvasHealth.height);
        updateStatusHealth("UNKNOWN", "UNKNOWN");
        logEventHealth("Inference stopped.", "");
    }

    function processResultsHealth(results) {
        ctxHealth.clearRect(0, 0, canvasHealth.width, canvasHealth.height);

        let hasMask = false, hasNoMask = false;
        let hasGloves = false, hasNoGloves = false;
        let foundViolatorName = null, foundViolatorTime = 0;

        if (results.faces) {
            results.faces.forEach(face => {
                const [x, y, w, h] = face.box;
                const label = face.label;
                const name = face.name;
                const vDuration = face.violation_duration;

                let color = "red";
                if (label === "Mask") { color = "#10b981"; hasMask = true; }
                else if (label === "No Mask") { color = "#ef4444"; hasNoMask = true; }
                else { color = "#f59e0b"; hasNoMask = true; }

                if (vDuration > 0 && vDuration > foundViolatorTime) {
                    foundViolatorName = name;
                    foundViolatorTime = vDuration;
                }

                drawFaceBox(ctxHealth, x, y, w, h, label, name, vDuration, color);
            });
        }

        if (results.hands) {
            results.hands.forEach(hand => {
                const [x, y, w, h] = hand.box;
                const label = hand.label;
                let color = label === "Gloves" ? "#10b981" : "#ef4444";
                if (label === "Gloves") hasGloves = true; else hasNoGloves = true;

                drawHandBox(ctxHealth, x, y, w, h, `${label} (${Math.round(hand.confidence * 100)}%)`, color);
            });
        }

        let curMaskStatus = "UNKNOWN";
        if (hasMask && !hasNoMask) curMaskStatus = "GOOD";
        else if (hasNoMask) curMaskStatus = "BAD";

        let curGlovesStatus = "UNKNOWN";
        if (hasGloves && !hasNoGloves) curGlovesStatus = "GOOD";
        else if (hasNoGloves) curGlovesStatus = "BAD";

        updateStatusHealth(curMaskStatus, curGlovesStatus, foundViolatorName, foundViolatorTime);
    }

    let prevStatusHealth = "";
    function updateStatusHealth(mask, gloves, violatorName, violatorTime) {
        if (mask === "GOOD") { maskStatus.textContent = "Compliant"; maskStatus.className = "value good"; }
        else if (mask === "BAD") { maskStatus.textContent = "Violation"; maskStatus.className = "value bad"; }
        else { maskStatus.textContent = "Scanning..."; maskStatus.className = "value waiting"; }

        if (gloves === "GOOD") { glovesStatus.textContent = "Compliant"; glovesStatus.className = "value good"; }
        else if (gloves === "BAD") { glovesStatus.textContent = "Violation"; glovesStatus.className = "value bad"; }
        else { glovesStatus.textContent = "Scanning..."; glovesStatus.className = "value waiting"; }

        let newStatus = "SAFE", msg = "Worker is compliant with safety gear criteria.", type = "safe";

        if (mask === "BAD" || gloves === "BAD") {
            newStatus = "VIOLATION";
            if (violatorName && violatorName !== "Detecting...") {
                msg = `${violatorName} is missing gear. Duration: ${violatorTime.toFixed(1)}s`;
                if (violatorTime >= 10.0) msg += " (LOGGED)";
            } else { msg = "Worker missing required health and safety gear!"; }
            type = "violation";
        } else if (mask === "UNKNOWN" && gloves === "UNKNOWN") {
            newStatus = "WAITING"; msg = "No person detected in frame."; type = "unknown";
        }

        overallStatus.textContent = newStatus;
        overallStatus.className = `status-badge ${type}`;
        overallMsg.textContent = msg;

        if (newStatus !== prevStatusHealth && newStatus !== "WAITING") {
            logEventHealth(`Status changed to: ${newStatus}`, type === "violation" ? "alert" : "clear");
        }
        if (violatorTime >= 10.0 && (!prevStatusHealth.includes("LOGGED") || newStatus !== prevStatusHealth)) {
            logEventHealth(`WARNING: ${violatorName} exceeded 10s violation threshold (CSV Updated)`, "alert");
            prevStatusHealth = newStatus + " LOGGED";
        } else {
            if (!prevStatusHealth.includes("LOGGED")) prevStatusHealth = newStatus;
        }
    }

    function logEventHealth(message, type) {
        const li = document.createElement("li");
        const time = new Date().toLocaleTimeString();
        li.textContent = `[${time}] ${message}`;
        if (type) li.classList.add(type);
        eventLogHealth.prepend(li);
        if (eventLogHealth.children.length > 50) eventLogHealth.removeChild(eventLogHealth.lastChild);
    }

    cameraBtnHealth.addEventListener("click", () => {
        if (isCameraOnHealth) stopCameraHealth(); else startCameraHealth();
    });

    streamBtnHealth.addEventListener("click", () => {
        if (isStreamingHealth) stopStreamingHealth(); else startStreamingHealth();
    });

    // ==========================================
    // MOVEMENT VIEW LOGIC
    // ==========================================
    function connectWsMovement() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/movement`;
        wsMovement = new WebSocket(wsUrl);

        wsMovement.onopen = () => {
            console.log("Connected to Movement Server");
            if (isCameraOnMovement) streamBtnMovement.disabled = false;
        };

        wsMovement.onclose = () => {
            console.log("Disconnected from Movement Server");
            stopStreamingMovement();
            streamBtnMovement.disabled = true;
            setTimeout(connectWsMovement, 3000);
        };

        wsMovement.onerror = (err) => {
            console.error("Movement WS error:", err);
            wsMovement.close();
        };

        wsMovement.onmessage = (event) => {
            try {
                const result = JSON.parse(event.data);
                if (result.movement) {
                    movementBadge.textContent = "MOTION DETECTED";
                    movementBadge.className = "status-badge violation";
                    movementMsg.textContent = "Motion captured and saved.";
                    logEventMovement(`Motion detected & saved: ${result.filename}`, "alert");

                    // Flash the video border
                    videoMovement.style.boxShadow = "0 0 20px #ef4444";
                    setTimeout(() => {
                        videoMovement.style.boxShadow = "none";
                        if (isStreamingMovement) {
                            movementBadge.textContent = "MONITORING";
                            movementBadge.className = "status-badge safe";
                            movementMsg.textContent = "System active. Analyzing feed...";
                        }
                    }, 1000);
                }
            } catch (e) {
                console.error("Error parsing Movement WS message:", e);
            }
        };
    }

    async function startCameraMovement() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            videoMovement.srcObject = stream;

            videoMovement.onloadedmetadata = () => {
                canvasMovement.width = videoMovement.videoWidth;
                canvasMovement.height = videoMovement.videoHeight;
                hiddenCanvasMovement.width = videoMovement.videoWidth;
                hiddenCanvasMovement.height = videoMovement.videoHeight;

                isCameraOnMovement = true;
                cameraBtnMovement.textContent = "Stop Camera";
                cameraBtnMovement.classList.replace("primary", "secondary");
                overlayMsgMovement.style.display = "none";

                if (wsMovement && wsMovement.readyState === WebSocket.OPEN) {
                    streamBtnMovement.disabled = false;
                }
            };
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access webcam for Movement view. Check permissions.");
        }
    }

    function stopCameraMovement() {
        if (videoMovement.srcObject) {
            videoMovement.srcObject.getTracks().forEach(track => track.stop());
            videoMovement.srcObject = null;
        }
        isCameraOnMovement = false;
        stopStreamingMovement();
        cameraBtnMovement.textContent = "Start Camera";
        cameraBtnMovement.classList.replace("secondary", "primary");
        overlayMsgMovement.style.display = "block";
        overlayMsgMovement.textContent = "Camera Off";
        streamBtnMovement.disabled = true;
    }

    function startStreamingMovement() {
        if (!isCameraOnMovement || wsMovement.readyState !== WebSocket.OPEN) return;

        isStreamingMovement = true;
        streamBtnMovement.textContent = "Stop 24/7 Monitoring";
        streamBtnMovement.classList.replace("secondary", "primary");
        movementBadge.textContent = "MONITORING";
        movementBadge.className = "status-badge safe";
        movementMsg.textContent = "System active. Analyzing feed...";

        // Send frames at 10fps for motion checking
        streamIntervalMovement = setInterval(() => {
            hiddenCtxMovement.drawImage(videoMovement, 0, 0, hiddenCanvasMovement.width, hiddenCanvasMovement.height);
            const base64Img = hiddenCanvasMovement.toDataURL('image/jpeg', 0.6); // Lower quality is fine for motion detect
            wsMovement.send(JSON.stringify({ image: base64Img }));
        }, 100);

        logEventMovement("24/7 Movement monitoring started.", "clear");
    }

    function stopStreamingMovement() {
        if (streamIntervalMovement) clearInterval(streamIntervalMovement);
        isStreamingMovement = false;
        streamBtnMovement.textContent = "Start 24/7 Monitoring";
        streamBtnMovement.classList.replace("primary", "secondary");

        movementBadge.textContent = "OFFLINE";
        movementBadge.className = "status-badge unknown";
        movementMsg.textContent = "Monitoring stopped.";

        logEventMovement("Movement monitoring stopped.", "");
    }

    function logEventMovement(message, type) {
        const li = document.createElement("li");
        const time = new Date().toLocaleTimeString();
        li.textContent = `[${time}] ${message}`;
        if (type) li.classList.add(type);
        eventLogMovement.prepend(li);
        if (eventLogMovement.children.length > 50) eventLogMovement.removeChild(eventLogMovement.lastChild);
    }

    cameraBtnMovement.addEventListener("click", () => {
        if (isCameraOnMovement) stopCameraMovement(); else startCameraMovement();
    });

    streamBtnMovement.addEventListener("click", () => {
        if (isStreamingMovement) stopStreamingMovement(); else startStreamingMovement();
    });

    // ==========================================
    // ATTENDANCE VIEW LOGIC
    // ==========================================
    async function startCameraAttendance() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            videoAttendance.srcObject = stream;

            videoAttendance.onloadedmetadata = () => {
                canvasAttendance.width = videoAttendance.videoWidth;
                canvasAttendance.height = videoAttendance.videoHeight;
                hiddenCanvasAttendance.width = videoAttendance.videoWidth;
                hiddenCanvasAttendance.height = videoAttendance.videoHeight;

                isCameraOnAttendance = true;
                cameraBtnAttendance.textContent = "Stop Camera";
                cameraBtnAttendance.classList.replace("primary", "secondary");
                overlayMsgAttendance.style.display = "none";

                btnCheckIn.disabled = false;
                btnCheckOut.disabled = false;
                btnCheckIn.style.opacity = "1";
                btnCheckOut.style.opacity = "1";
            };
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access webcam for Attendance view. Check permissions.");
        }
    }

    function stopCameraAttendance() {
        if (videoAttendance.srcObject) {
            videoAttendance.srcObject.getTracks().forEach(track => track.stop());
            videoAttendance.srcObject = null;
        }
        isCameraOnAttendance = false;
        cameraBtnAttendance.textContent = "Start Camera";
        cameraBtnAttendance.classList.replace("secondary", "primary");
        overlayMsgAttendance.style.display = "block";
        overlayMsgAttendance.textContent = "Camera Off";

        btnCheckIn.disabled = true;
        btnCheckOut.disabled = true;
        btnCheckIn.style.opacity = "0.5";
        btnCheckOut.style.opacity = "0.5";
        
        ctxAttendance.clearRect(0, 0, canvasAttendance.width, canvasAttendance.height);
    }

    function logEventAttendance(message, type) {
        const li = document.createElement("li");
        const time = new Date().toLocaleTimeString();
        li.textContent = `[${time}] ${message}`;
        if (type) li.classList.add(type);
        eventLogAttendance.prepend(li);
        if (eventLogAttendance.children.length > 50) eventLogAttendance.removeChild(eventLogAttendance.lastChild);
    }

    async function submitAttendance(actionType) {
        if (!isCameraOnAttendance) return;

        // Visual feedback
        const btn = actionType === 'in' ? btnCheckIn : btnCheckOut;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Scanning...";
        
        attendanceBadge.textContent = "SCANNING";
        attendanceBadge.className = "status-badge waiting";
        attendanceMsg.textContent = "Processing face recognition...";

        try {
            hiddenCtxAttendance.drawImage(videoAttendance, 0, 0, hiddenCanvasAttendance.width, hiddenCanvasAttendance.height);
            const base64Img = hiddenCanvasAttendance.toDataURL('image/jpeg', 0.9);

            const response = await fetch('/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionType, image: base64Img })
            });

            const data = await response.json();

            if (data.success) {
                attendanceBadge.textContent = "SUCCESS";
                attendanceBadge.className = "status-badge safe";
                attendanceMsg.textContent = `Welcome, ${data.name}! ${actionType === 'in' ? 'Check-in' : 'Check-out'} recorded successfully.`;
                logEventAttendance(`${data.name} checked ${actionType} successfully.`, "clear");
                
                // Draw a nice green box around the face if coordinates returned
                if (data.box) {
                    const [x, y, w, h] = data.box;
                    ctxAttendance.clearRect(0, 0, canvasAttendance.width, canvasAttendance.height);
                    drawFaceBox(ctxAttendance, x, y, w, h, data.name, "", 0, "#10b981");
                    
                    // Clear after 3 seconds
                    setTimeout(() => {
                         ctxAttendance.clearRect(0, 0, canvasAttendance.width, canvasAttendance.height);
                    }, 3000);
                }
            } else {
                attendanceBadge.textContent = "FAILED";
                attendanceBadge.className = "status-badge violation";
                attendanceMsg.textContent = data.error || "Face not recognized or error occurred.";
                logEventAttendance(`Failed scan: ${data.error}`, "alert");
            }
        } catch (err) {
            console.error("Attendance submission error:", err);
            attendanceBadge.textContent = "ERROR";
            attendanceBadge.className = "status-badge unknown";
            attendanceMsg.textContent = "Network error while submitting attendance.";
        } finally {
            // Restore button
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    cameraBtnAttendance.addEventListener("click", () => {
        if (isCameraOnAttendance) stopCameraAttendance(); else startCameraAttendance();
    });

    btnCheckIn.addEventListener("click", () => submitAttendance('in'));
    btnCheckOut.addEventListener("click", () => submitAttendance('out'));

    // ==========================================
    // DRAWING HELPER FUNCTIONS
    // ==========================================
    function drawFaceBox(ctx, x, y, w, h, label, name, duration, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        const infoMsg = duration > 0 ? `${name} - VIOLATION: ${duration.toFixed(1)}s` : name;
        const mainMsg = `${label}`;

        ctx.font = "bold 16px Inter";
        const wInfo = ctx.measureText(infoMsg).width;
        const wMain = ctx.measureText(mainMsg).width;
        const boxWidth = Math.max(wInfo, wMain) + 20;

        ctx.fillStyle = color;
        ctx.fillRect(x, y - 55, boxWidth, 55);

        ctx.translate(x + boxWidth / 2, y - 27.5);
        ctx.scale(-1, 1);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        ctx.textBaseline = "bottom";
        ctx.font = "16px Inter";
        ctx.fillText(mainMsg, 0, 10);

        ctx.textBaseline = "top";
        ctx.font = "bold 15px Inter";
        if (duration >= 10.0) ctx.fillStyle = "#fef08a";
        ctx.fillText(infoMsg, 0, -22);

        ctx.restore();
    }

    function drawHandBox(ctx, x, y, w, h, label, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = color;
        ctx.font = "14px Inter";
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x, y - 25, textWidth + 10, 25);

        ctx.translate(x + 5 + textWidth / 2, y - 7);
        ctx.scale(-1, 1);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, 0, 0);

        ctx.restore();
    }

    // Initialize WebSockets
    connectWsHealth();
    connectWsMovement();

    // ==========================================
    // Registration Logic
    // ==========================================
    const regBtn = document.getElementById("register-btn");
    const regNameInput = document.getElementById("worker-name-input");
    const regStatusMsg = document.getElementById("reg-status-msg");

    regBtn.addEventListener("click", async () => {
        const name = regNameInput.value.trim();

        if (!name) {
            showRegMsg("Please enter a valid Worker Name.", "error");
            return;
        }

        if (!isCameraOnHealth) { // assume using health camera
            showRegMsg("Health check Camera must be on to register a face.", "error");
            return;
        }

        regBtn.disabled = true;
        regBtn.textContent = "Processing...";
        showRegMsg("Capturing face...", "info");

        try {
            hiddenCtxHealth.drawImage(videoHealth, 0, 0, hiddenCanvasHealth.width, hiddenCanvasHealth.height);
            const base64Img = hiddenCanvasHealth.toDataURL('image/jpeg', 0.9);

            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, image: base64Img })
            });

            const data = await response.json();

            if (data.success) {
                showRegMsg(data.message, "success");
                regNameInput.value = "";
                logEventHealth(`New worker registered: ${name}`, "clear");
            } else {
                showRegMsg(data.error || "Registration failed.", "error");
            }

        } catch (err) {
            console.error(err);
            showRegMsg("Network error during registration.", "error");
        } finally {
            regBtn.disabled = false;
            regBtn.textContent = "Capture & Save Face";
        }
    });

    function showRegMsg(msg, type) {
        regStatusMsg.textContent = msg;
        regStatusMsg.className = `reg-status-msg ${type}`;
        if (type === "success") {
            setTimeout(() => {
                if (regStatusMsg.textContent === msg) {
                    regStatusMsg.textContent = "";
                    regStatusMsg.className = "reg-status-msg";
                }
            }, 5000);
        }
    }
});
