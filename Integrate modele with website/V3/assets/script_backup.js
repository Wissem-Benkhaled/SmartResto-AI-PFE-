document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("overlay");
    const ctx = canvas.getContext("2d");
    const overlayMsg = document.getElementById("video-overlay-ui");
    const cameraBtn = document.getElementById("camera-btn");
    const streamBtn = document.getElementById("toggle-stream-btn");

    // Status Elements
    const wsIndicator = document.getElementById("ws-indicator");
    const wsText = document.getElementById("ws-text");
    const overallStatus = document.getElementById("overall-status");
    const overallMsg = document.getElementById("overall-message");
    const maskStatus = document.getElementById("mask-status");
    const glovesStatus = document.getElementById("gloves-status");
    const eventLog = document.getElementById("event-log");

    // State
    let isCameraOn = false;
    let isStreaming = false;
    let ws = null;
    let streamInterval = null;

    // Hidden canvas for capturing video frames
    const hiddenCanvas = document.createElement('canvas');
    const hiddenCtx = hiddenCanvas.getContext('2d');

    // Setup WebSocket
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/detect`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            wsIndicator.className = "indicator connected";
            wsText.textContent = "Connected to Server V2";
            if (isCameraOn) streamBtn.disabled = false;
        };

        ws.onclose = () => {
            wsIndicator.className = "indicator disconnected";
            wsText.textContent = "Disconnected";
            stopStreaming();
            streamBtn.disabled = true;
            // Try reviving after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            ws.close();
        };

        ws.onmessage = (event) => {
            try {
                const results = JSON.parse(event.data);
                processResults(results);
            } catch (e) {
                console.error("Error parsing WS message:", e);
            }
        };
    }

    // Camera Controls
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                // Ensure canvas size matches video intrinsic size
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                hiddenCanvas.width = video.videoWidth;
                hiddenCanvas.height = video.videoHeight;

                isCameraOn = true;
                cameraBtn.textContent = "Stop Camera";
                cameraBtn.classList.replace("primary", "secondary");
                overlayMsg.style.display = "none";

                if (ws && ws.readyState === WebSocket.OPEN) {
                    streamBtn.disabled = false;
                }
            };
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Could not access webcam. Please ensure permissions are granted.");
        }
    }

    function stopCamera() {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        isCameraOn = false;
        stopStreaming();
        cameraBtn.textContent = "Start Camera";
        cameraBtn.classList.replace("secondary", "primary");
        overlayMsg.style.display = "block";
        overlayMsg.textContent = "Camera Off";
        streamBtn.disabled = true;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateStatus("UNKNOWN", "UNKNOWN");
    }

    // Video Streaming Logic
    function startStreaming() {
        if (!isCameraOn || ws.readyState !== WebSocket.OPEN) return;

        isStreaming = true;
        streamBtn.textContent = "Stop Inference";
        streamBtn.classList.replace("secondary", "primary");

        // Send a frame every 150ms (~6.6 fps to not overwhelm backend)
        streamInterval = setInterval(() => {
            // Draw video to hidden canvas to get base64
            hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
            // We use JPEG for performance
            const base64Img = hiddenCanvas.toDataURL('image/jpeg', 0.8);

            // Send to backend via WS
            ws.send(JSON.stringify({ image: base64Img }));
        }, 150);

        logEvent("Inference tracking started.", "clear");
    }

    function stopStreaming() {
        if (streamInterval) clearInterval(streamInterval);
        isStreaming = false;
        streamBtn.textContent = "Start Inference";
        streamBtn.classList.replace("primary", "secondary");

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateStatus("UNKNOWN", "UNKNOWN");
        logEvent("Inference stopped.", "");
    }

    // Result Processing & Drawing
    function processResults(results) {
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let hasMask = false;
        let hasNoMask = false;
        let hasGloves = false;
        let hasNoGloves = false;
        let foundViolatorName = null;
        let foundViolatorTime = 0;

        // Draw Faces & Identification
        if (results.faces) {
            results.faces.forEach(face => {
                const [x, y, w, h] = face.box;
                const label = face.label;
                const name = face.name;
                const vDuration = face.violation_duration;

                let color = "red";
                if (label === "Mask") {
                    color = "#10b981"; // green
                    hasMask = true;
                } else if (label === "No Mask") {
                    color = "#ef4444"; // red
                    hasNoMask = true;
                } else {
                    color = "#f59e0b"; // yellow
                    hasNoMask = true; // Treating incorrect as no mask for safety
                }

                // Track highest violator to update the UI later
                if (vDuration > 0 && vDuration > foundViolatorTime) {
                    foundViolatorName = name;
                    foundViolatorTime = vDuration;
                }

                drawFaceBox(x, y, w, h, label, name, vDuration, color);
            });
        }

        // Draw Hands
        if (results.hands) {
            results.hands.forEach(hand => {
                const [x, y, w, h] = hand.box;
                const label = hand.label;

                let color = "red";
                if (label === "Gloves") {
                    color = "#10b981"; // green
                    hasGloves = true;
                } else {
                    color = "#ef4444";
                    hasNoGloves = true;
                }

                drawHandBox(x, y, w, h, `${label} (${Math.round(hand.confidence * 100)}%)`, color);
            });
        }

        // Determine Overall Summary Status
        let curMaskStatus = "UNKNOWN";
        if (hasMask && !hasNoMask) curMaskStatus = "GOOD";
        else if (hasNoMask) curMaskStatus = "BAD";

        let curGlovesStatus = "UNKNOWN";
        if (hasGloves && !hasNoGloves) curGlovesStatus = "GOOD";
        else if (hasNoGloves) curGlovesStatus = "BAD";

        updateStatus(curMaskStatus, curGlovesStatus, foundViolatorName, foundViolatorTime);
    }

    function drawFaceBox(x, y, w, h, label, name, duration, color) {
        // Handle mirroring correctly
        ctx.save();

        // 1. Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // 2. Info text structure
        const infoMsg = duration > 0 ? `${name} - VIOLATION: ${duration.toFixed(1)}s` : name;
        const mainMsg = `${label}`;

        ctx.font = "bold 16px Inter";
        const wInfo = ctx.measureText(infoMsg).width;
        const wMain = ctx.measureText(mainMsg).width;
        const boxWidth = Math.max(wInfo, wMain) + 20;

        ctx.fillStyle = color;
        // Background for text (drawn above bounding box)
        ctx.fillRect(x, y - 55, boxWidth, 55);

        // Un-mirror canvas specifically for text
        ctx.translate(x + boxWidth / 2, y - 27.5);
        ctx.scale(-1, 1);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        // Main Label (Mask/No Mask)
        ctx.textBaseline = "bottom";
        ctx.font = "16px Inter";
        ctx.fillText(mainMsg, 0, 10);

        // Name & Timer (Worker/Time)
        ctx.textBaseline = "top";
        ctx.font = "bold 15px Inter";
        if (duration >= 10.0) ctx.fillStyle = "#fef08a"; // highlight if logged
        ctx.fillText(infoMsg, 0, -22);

        ctx.restore();
    }

    function drawHandBox(x, y, w, h, label, color) {
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

    let prevStatus = "";
    function updateStatus(mask, gloves, violatorName, violatorTime) {
        if (mask === "GOOD") {
            maskStatus.textContent = "Compliant";
            maskStatus.className = "value good";
        } else if (mask === "BAD") {
            maskStatus.textContent = "Violation";
            maskStatus.className = "value bad";
        } else {
            maskStatus.textContent = "Scanning...";
            maskStatus.className = "value waiting";
        }

        if (gloves === "GOOD") {
            glovesStatus.textContent = "Compliant";
            glovesStatus.className = "value good";
        } else if (gloves === "BAD") {
            glovesStatus.textContent = "Violation";
            glovesStatus.className = "value bad";
        } else {
            glovesStatus.textContent = "Scanning...";
            glovesStatus.className = "value waiting";
        }

        let newStatus = "SAFE";
        let msg = "Worker is compliant with safety gear criteria.";
        let type = "safe";

        if (mask === "BAD" || gloves === "BAD") {
            newStatus = "VIOLATION";
            if (violatorName && violatorName !== "Detecting...") {
                msg = `${violatorName} is missing gear. Duration: ${violatorTime.toFixed(1)}s`;
                if (violatorTime >= 10.0) msg += " (LOGGED)";
            } else {
                msg = "Worker missing required health and safety gear!";
            }
            type = "violation";
        } else if (mask === "UNKNOWN" && gloves === "UNKNOWN") {
            newStatus = "WAITING";
            msg = "No person detected in frame.";
            type = "unknown";
        }

        overallStatus.textContent = newStatus;
        overallStatus.className = `status-badge ${type}`;
        overallMsg.textContent = msg;

        // Log state changes
        if (newStatus !== prevStatus && newStatus !== "WAITING") {
            logEvent(`Status changed to: ${newStatus}`, type === "violation" ? "alert" : "clear");
        }

        // Specifically log crossing the 10s barrier
        if (violatorTime >= 10.0 && (!prevStatus.includes("LOGGED") || newStatus !== prevStatus)) {
            logEvent(`WARNING: ${violatorName} exceeded 10s violation threshold (CSV Updated)`, "alert");
            prevStatus = newStatus + " LOGGED"; // trick to avoid spamming the UI log
        } else {
            if (!prevStatus.includes("LOGGED")) prevStatus = newStatus;
        }
    }

    function logEvent(message, type) {
        const li = document.createElement("li");
        const time = new Date().toLocaleTimeString();
        li.textContent = `[${time}] ${message}`;
        if (type) li.classList.add(type);

        eventLog.prepend(li);

        if (eventLog.children.length > 50) {
            eventLog.removeChild(eventLog.lastChild);
        }
    }

    // Event Listeners
    cameraBtn.addEventListener("click", () => {
        if (isCameraOn) stopCamera();
        else startCamera();
    });

    streamBtn.addEventListener("click", () => {
        if (isStreaming) stopStreaming();
        else startStreaming();
    });

    connectWebSocket();

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

        if (!isCameraOn) {
            showRegMsg("Camera must be on to register a face.", "error");
            return;
        }

        // Take a snapshot
        regBtn.disabled = true;
        regBtn.textContent = "Processing...";
        showRegMsg("Capturing face...", "info");

        try {
            // Use current hidden canvas which holds the latest frame
            hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
            const base64Img = hiddenCanvas.toDataURL('image/jpeg', 0.9); // higher quality for registration

            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    image: base64Img
                })
            });

            const data = await response.json();

            if (data.success) {
                showRegMsg(data.message, "success");
                regNameInput.value = ""; // clear input
                logEvent(`New worker registered: ${name}`, "clear");
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

        // Clear success messages after 5 seconds
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
