class GestureController {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.handLandmarks = null;
        this.faceDetected = false;
        this.gestureCallback = null;
        this.lastGesture = null;
        this.gestureTimeout = null;
        this.isActive = false;
    }

    async initialize(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            await this.video.play();

            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Initialize MediaPipe Hands
            const hands = new mp.Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            hands.setOptions({
                maxNumHands: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults((results) => {
                this.processResults(results);
            });

            // Start detection loop
            const detectFrame = async () => {
                if (this.isActive) {
                    await hands.send({ image: this.video });
                }
                requestAnimationFrame(detectFrame);
            };

            detectFrame();
        } catch (error) {
            console.error('Error initializing gesture controller:', error);
        }
    }

    processResults(results) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw video frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw hand landmarks
                this.drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 5
                });
                this.drawLandmarks(this.ctx, landmarks, {
                    color: '#FF0000',
                    lineWidth: 2
                });

                // Process gestures
                const gesture = this.detectGesture(landmarks);
                if (gesture !== this.lastGesture) {
                    this.lastGesture = gesture;
                    if (this.gestureCallback) {
                        this.gestureCallback(gesture);
                    }
                }
            }
        }
    }

    detectGesture(landmarks) {
        // Calculate finger states using the Python logic
        const thresh = (landmarks[0].y * 100 - landmarks[9].y * 100) / 2;
        let count = 0;

        // Index finger
        if ((landmarks[5].y * 100 - landmarks[8].y * 100) > thresh) count++;
        // Middle finger
        if ((landmarks[9].y * 100 - landmarks[12].y * 100) > thresh) count++;
        // Ring finger
        if ((landmarks[13].y * 100 - landmarks[16].y * 100) > thresh) count++;
        // Pinky
        if ((landmarks[17].y * 100 - landmarks[20].y * 100) > thresh) count++;
        // Thumb
        if ((landmarks[5].x * 100 - landmarks[4].x * 100) > 6) count++;

        // Map finger count to gestures
        switch(count) {
            case 1: return 'next';
            case 2: return 'previous';
            case 3: return 'volume_up';
            case 4: return 'volume_down';
            case 5: return 'play_pause';
            default: return 'none';
        }
    }

    setGestureCallback(callback) {
        this.gestureCallback = callback;
    }

    start() {
        this.isActive = true;
    }

    stop() {
        this.isActive = false;
    }

    drawConnectors(ctx, landmarks, connections, style) {
        if (!landmarks || !connections) return;

        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.lineWidth;

        for (const connection of connections) {
            const [start, end] = connection;
            ctx.beginPath();
            ctx.moveTo(
                landmarks[start].x * this.canvas.width,
                landmarks[start].y * this.canvas.height
            );
            ctx.lineTo(
                landmarks[end].x * this.canvas.width,
                landmarks[end].y * this.canvas.height
            );
            ctx.stroke();
        }
    }

    drawLandmarks(ctx, landmarks, style) {
        if (!landmarks) return;

        ctx.fillStyle = style.color;
        
        for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(
                landmark.x * this.canvas.width,
                landmark.y * this.canvas.height,
                style.lineWidth * 2,
                0,
                2 * Math.PI
            );
            ctx.fill();
        }
    }
}

// Export the controller
window.GestureController = GestureController; 