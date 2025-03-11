// Game-related functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize video controls
    const videoControls = {
        play: () => {
            const video = document.querySelector('video');
            if (video) {
                video.paused ? video.play() : video.pause();
            }
        },
        forward: () => {
            const video = document.querySelector('video');
            if (video) {
                video.currentTime += 10;
            }
        },
        rewind: () => {
            const video = document.querySelector('video');
            if (video) {
                video.currentTime -= 10;
            }
        },
        volumeUp: () => {
            const video = document.querySelector('video');
            if (video && video.volume < 1) {
                video.volume = Math.min(1, video.volume + 0.1);
            }
        },
        volumeDown: () => {
            const video = document.querySelector('video');
            if (video && video.volume > 0) {
                video.volume = Math.max(0, video.volume - 0.1);
            }
        }
    };

    // Handle gesture controls
    window.handleGesture = function(gesture) {
        const gestureActions = {
            'palm': videoControls.play,
            'point_right': videoControls.forward,
            'point_left': videoControls.rewind,
            'index_up': videoControls.volumeUp,
            'fist': videoControls.volumeDown
        };

        if (gestureActions[gesture]) {
            gestureActions[gesture]();
            showGestureIndicator(gesture);
        }
    };

    // Show gesture indicator
    function showGestureIndicator(gesture) {
        const indicator = document.querySelector('.gesture-indicator');
        if (indicator) {
            const gestureText = {
                'palm': 'Play/Pause',
                'point_right': 'Forward',
                'point_left': 'Rewind',
                'index_up': 'Volume Up',
                'fist': 'Volume Down'
            };

            indicator.textContent = gestureText[gesture] || gesture;
            indicator.classList.add('active');

            setTimeout(() => {
                indicator.classList.remove('active');
            }, 2000);
        }
    }
});

class GamesController {
    constructor() {
        this.gestures = ['✊', '✋', '✌️', '👆', '👎'];
        this.score = 0;
        this.currentGesture = '';
        this.drawingContext = null;
        this.isDrawing = false;
    }

    // Gesture Master Game
    initGestureMaster() {
        this.score = 0;
        this.updateScore();
        this.showNextGesture();
        
        // Start gesture recognition
        if (window.gestureController) {
            window.gestureController.onGestureDetected = (gesture) => {
                this.checkGesture(gesture);
            };
        }
    }

    showNextGesture() {
        const display = document.getElementById('gesture-display');
        if (!display) return;

        const randomGesture = this.gestures[Math.floor(Math.random() * this.gestures.length)];
        this.currentGesture = randomGesture;
        display.innerHTML = `<div style="font-size: 72px;">${randomGesture}</div>
                           <div style="margin-top: 16px;">Make this gesture!</div>`;
    }

    checkGesture(detectedGesture) {
        const gestureMap = {
            'fist': '✊',
            'palm': '✋',
            'victory': '✌️',
            'pointing_up': '👆',
            'thumb_down': '👎'
        };

        if (gestureMap[detectedGesture] === this.currentGesture) {
            this.score += 10;
            this.updateScore();
            this.showNextGesture();
            this.showFeedback('Correct! +10 points', 'success');
        }
    }

    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${this.score}`;
        }
    }

    // Rock Paper Scissors Game
    initRockPaperScissors() {
        const statusElement = document.getElementById('game-status');
        const resultElement = document.getElementById('result');
        
        if (window.gestureController) {
            window.gestureController.onGestureDetected = (gesture) => {
                const playerMove = this.convertGestureToMove(gesture);
                if (playerMove) {
                    const computerMove = this.getComputerMove();
                    const result = this.determineWinner(playerMove, computerMove);
                    
                    resultElement.innerHTML = `
                        <div style="font-size: 48px; margin: 20px 0;">
                            You: ${this.getMoveEmoji(playerMove)} vs Computer: ${this.getMoveEmoji(computerMove)}
                        </div>
                        <div style="font-size: 24px; color: ${result.color};">${result.message}</div>
                    `;
                }
            };
        }
    }

    convertGestureToMove(gesture) {
        const moveMap = {
            'fist': 'rock',
            'palm': 'paper',
            'victory': 'scissors'
        };
        return moveMap[gesture];
    }

    getMoveEmoji(move) {
        const emojiMap = {
            'rock': '✊',
            'paper': '✋',
            'scissors': '✌️'
        };
        return emojiMap[move];
    }

    getComputerMove() {
        const moves = ['rock', 'paper', 'scissors'];
        return moves[Math.floor(Math.random() * moves.length)];
    }

    determineWinner(playerMove, computerMove) {
        if (playerMove === computerMove) {
            return { message: "It's a tie!", color: '#FFA500' };
        }
        
        const winConditions = {
            'rock': 'scissors',
            'paper': 'rock',
            'scissors': 'paper'
        };
        
        if (winConditions[playerMove] === computerMove) {
            return { message: 'You win!', color: '#4CAF50' };
        } else {
            return { message: 'Computer wins!', color: '#F44336' };
        }
    }

    // Air Draw Game
    initAirDraw() {
        const canvas = document.getElementById('drawing-canvas');
        if (!canvas) return;

        canvas.width = 600;
        canvas.height = 400;
        this.drawingContext = canvas.getContext('2d');
        this.drawingContext.strokeStyle = '#4ecca3';
        this.drawingContext.lineWidth = 4;
        this.drawingContext.lineCap = 'round';
        
        if (window.gestureController) {
            window.gestureController.onGestureDetected = (gesture, coordinates) => {
                if (gesture === 'pointing_up') {
                    if (!this.isDrawing) {
                        this.isDrawing = true;
                        this.drawingContext.beginPath();
                        this.drawingContext.moveTo(coordinates.x * canvas.width, coordinates.y * canvas.height);
                    } else {
                        this.drawingContext.lineTo(coordinates.x * canvas.width, coordinates.y * canvas.height);
                        this.drawingContext.stroke();
                    }
                } else {
                    this.isDrawing = false;
                }
            };
        }
    }

    clearCanvas() {
        if (this.drawingContext) {
            const canvas = this.drawingContext.canvas;
            this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    showFeedback(message, type) {
        const feedback = document.createElement('div');
        feedback.className = 'gesture-feedback';
        feedback.textContent = message;
        feedback.style.color = type === 'success' ? '#4CAF50' : '#F44336';
        
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1000);
    }
}

// Initialize games controller
window.gamesController = new GamesController();

// Update game start functions to use the controller
function startGestureMasterGame() {
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-overlay';
    gameContainer.innerHTML = `
        <div class="game-window">
            <h2>Gesture Master</h2>
            <div id="gesture-display"></div>
            <div id="score">Score: 0</div>
            <button onclick="closeGame()" class="close-button">Close</button>
        </div>
    `;
    document.body.appendChild(gameContainer);
    window.gamesController.initGestureMaster();
}

function startRockPaperScissors() {
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-overlay';
    gameContainer.innerHTML = `
        <div class="game-window">
            <h2>Rock Paper Scissors</h2>
            <div id="game-status">Show your gesture when ready!</div>
            <div id="result"></div>
            <button onclick="closeGame()" class="close-button">Close</button>
        </div>
    `;
    document.body.appendChild(gameContainer);
    window.gamesController.initRockPaperScissors();
}

function startAirDraw() {
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-overlay';
    gameContainer.innerHTML = `
        <div class="game-window">
            <h2>Air Draw</h2>
            <canvas id="drawing-canvas"></canvas>
            <div class="controls">
                <button onclick="window.gamesController.clearCanvas()">Clear</button>
                <button onclick="closeGame()" class="close-button">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(gameContainer);
    window.gamesController.initAirDraw();
}

function closeGame() {
    const overlay = document.querySelector('.game-overlay');
    if (overlay) {
        overlay.remove();
    }
    // Reset gesture controller to default video controls
    if (window.gestureController) {
        window.gestureController.resetToDefaultControls();
    }
} 