// Gesture Control for Video Player
class GestureController {
    constructor() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.camera = null;
        this.isEnabled = false;
        this.lastGesture = null;
        this.lastGestureTime = Date.now();
        this.gestureDelay = 1000; // Delay between gestures in ms

        this.setupCamera();
        this.setupHandTracking();
    }

    setupCamera() {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        this.canvasElement = document.createElement('canvas');
        this.canvasElement.classList.add('gesture-canvas');
        document.body.appendChild(this.canvasElement);
        this.canvasCtx = this.canvasElement.getContext('2d');
    }

    setupHandTracking() {
        this.hands.onResults((results) => {
            this.drawResults(results);
            if (this.isEnabled) {
                this.processGestures(results);
            }
        });
    }

    enable() {
        if (!this.camera) {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    await this.hands.send({image: this.videoElement});
                },
                width: 640,
                height: 480
            });
        }
        this.isEnabled = true;
        this.camera.start();
        this.canvasElement.style.display = 'block';
        document.body.classList.add('gesture-control-active');
    }

    disable() {
        if (this.camera) {
            this.camera.stop();
        }
        this.isEnabled = false;
        this.canvasElement.style.display = 'none';
        document.body.classList.remove('gesture-control-active');
    }

    drawResults(results) {
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw hand landmarks
                drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 2
                });
                drawLandmarks(this.canvasCtx, landmarks, {
                    color: '#FF0000',
                    lineWidth: 1,
                    radius: 3
                });
            }
        }
        this.canvasCtx.restore();
    }

    processGestures(results) {
        if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) return;

        const landmarks = results.multiHandLandmarks[0];
        const gesture = this.recognizeGesture(landmarks);
        
        if (gesture && Date.now() - this.lastGestureTime > this.gestureDelay) {
            this.handleGesture(gesture);
            this.lastGesture = gesture;
            this.lastGestureTime = Date.now();
        }
    }

    recognizeGesture(landmarks) {
        // Calculate finger states
        const thumbUp = landmarks[4].y < landmarks[3].y;
        const indexUp = landmarks[8].y < landmarks[6].y;
        const middleUp = landmarks[12].y < landmarks[10].y;
        const ringUp = landmarks[16].y < landmarks[14].y;
        const pinkyUp = landmarks[20].y < landmarks[18].y;

        // Recognize gestures
        if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbUp) {
            return 'thumbs_up';
        } else if (indexUp && !middleUp && !ringUp && !pinkyUp) {
            return 'point';
        } else if (indexUp && middleUp && !ringUp && !pinkyUp) {
            return 'victory';
        } else if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbUp) {
            return 'fist';
        } else if (indexUp && middleUp && ringUp && pinkyUp && !thumbUp) {
            return 'palm';
        }

        return null;
    }

    handleGesture(gesture) {
        if (!window.player) return;

        switch (gesture) {
            case 'palm':
                if (window.player.getPlayerState() === YT.PlayerState.PLAYING) {
                    window.player.pauseVideo();
                } else {
                    window.player.playVideo();
                }
                break;
            case 'fist':
                let volume = window.player.getVolume();
                window.player.setVolume(Math.max(0, volume - 10));
                break;
            case 'point':
                window.player.seekTo(window.player.getCurrentTime() + 10, true);
                break;
            case 'victory':
                let newVolume = window.player.getVolume();
                window.player.setVolume(Math.min(100, newVolume + 10));
                break;
            case 'thumbs_up':
                window.player.seekTo(window.player.getCurrentTime() - 10, true);
                break;
        }

        // Show gesture feedback
        this.showGestureFeedback(gesture);
    }

    showGestureFeedback(gesture) {
        const feedback = document.createElement('div');
        feedback.classList.add('gesture-feedback');
        feedback.textContent = gesture.replace('_', ' ').toUpperCase();
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
        }, 1000);
    }
}

// Initialize gesture controller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.gestureController = new GestureController();

    // Add event listener for the gesture control toggle
    const gestureToggle = document.querySelector('#gestureToggle');
    if (gestureToggle) {
        gestureToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                window.gestureController.enable();
            } else {
                window.gestureController.disable();
            }
        });
    }
}); 