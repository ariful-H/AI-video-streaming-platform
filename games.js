// Mini-games implementation
class GameManager {
    constructor() {
        this.currentGame = null;
        this.gameContainer = document.getElementById('game-container');
        this.score = 0;
        this.isPlaying = false;
    }

    startGame(gameName) {
        this.score = 0;
        this.isPlaying = true;
        this.currentGame = gameName;
        
        switch(gameName) {
            case 'memory':
                this.initMemoryGame();
                break;
            case 'reaction':
                this.initReactionGame();
                break;
            case 'gesture':
                this.initGestureGame();
                break;
        }
    }

    stopGame() {
        this.isPlaying = false;
        this.gameContainer.innerHTML = '';
        this.currentGame = null;
    }

    updateScore(points) {
        this.score += points;
        const scoreElement = document.getElementById('game-score');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${this.score}`;
        }
    }

    // Memory Card Game
    initMemoryGame() {
        const cards = ['🎥', '🎬', '🎭', '🎪', '🎨', '🎯', '🎲', '🎮'];
        const gameCards = [...cards, ...cards];
        let flippedCards = [];
        let matchedPairs = 0;

        // Shuffle cards
        gameCards.sort(() => Math.random() - 0.5);

        // Create game UI
        this.gameContainer.innerHTML = `
            <div class="game-header">
                <h2>Memory Game</h2>
                <p id="game-score">Score: ${this.score}</p>
            </div>
            <div class="memory-grid"></div>
        `;

        const grid = this.gameContainer.querySelector('.memory-grid');
        
        gameCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'memory-card';
            cardElement.dataset.cardIndex = index;
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">?</div>
                    <div class="card-back">${card}</div>
                </div>
            `;

            cardElement.addEventListener('click', () => {
                if (!this.isPlaying || flippedCards.length >= 2 || 
                    cardElement.classList.contains('flipped') ||
                    cardElement.classList.contains('matched')) {
                    return;
                }

                cardElement.classList.add('flipped');
                flippedCards.push({ element: cardElement, value: card });

                if (flippedCards.length === 2) {
                    if (flippedCards[0].value === flippedCards[1].value) {
                        flippedCards.forEach(card => card.element.classList.add('matched'));
                        matchedPairs++;
                        this.updateScore(10);
                        
                        if (matchedPairs === cards.length) {
                            setTimeout(() => {
                                alert('Congratulations! You won!');
                                this.stopGame();
                            }, 500);
                        }
                    } else {
                        setTimeout(() => {
                            flippedCards.forEach(card => card.element.classList.remove('flipped'));
                        }, 1000);
                    }
                    flippedCards = [];
                }
            });

            grid.appendChild(cardElement);
        });
    }

    // Reaction Time Game
    initReactionGame() {
        this.gameContainer.innerHTML = `
            <div class="game-header">
                <h2>Reaction Time</h2>
                <p id="game-score">Score: ${this.score}</p>
            </div>
            <div class="reaction-area">
                <div class="target">Click when green!</div>
            </div>
        `;

        const target = this.gameContainer.querySelector('.target');
        let startTime;
        let timeoutId;
        let isWaiting = true;

        const startRound = () => {
            if (!this.isPlaying) return;
            
            target.style.backgroundColor = 'red';
            target.textContent = 'Wait...';
            isWaiting = true;

            const delay = 1000 + Math.random() * 4000;
            timeoutId = setTimeout(() => {
                if (!this.isPlaying) return;
                
                target.style.backgroundColor = 'green';
                target.textContent = 'Click Now!';
                startTime = Date.now();
                isWaiting = false;
            }, delay);
        };

        target.addEventListener('click', () => {
            if (!this.isPlaying) return;

            if (isWaiting) {
                clearTimeout(timeoutId);
                target.style.backgroundColor = '#ff4444';
                target.textContent = 'Too Early! Try again...';
                setTimeout(startRound, 1000);
            } else {
                const reactionTime = Date.now() - startTime;
                const points = Math.max(0, Math.floor((1000 - reactionTime) / 10));
                this.updateScore(points);
                
                target.style.backgroundColor = '#4444ff';
                target.textContent = `${reactionTime}ms! +${points} points`;
                setTimeout(startRound, 1500);
            }
        });

        startRound();
    }

    // Gesture Control Game
    initGestureGame() {
        this.gameContainer.innerHTML = `
            <div class="game-header">
                <h2>Gesture Control Game</h2>
                <p id="game-score">Score: ${this.score}</p>
            </div>
            <div class="gesture-game">
                <div class="target-gesture">✋</div>
                <div class="gesture-instruction">Match the gesture!</div>
            </div>
        `;

        const gestures = ['✋', '✌️', '👆', '👊'];
        const targetGesture = this.gameContainer.querySelector('.target-gesture');
        const instruction = this.gameContainer.querySelector('.gesture-instruction');
        let currentGesture = 0;

        const updateGesture = () => {
            if (!this.isPlaying) return;
            
            currentGesture = (currentGesture + 1) % gestures.length;
            targetGesture.textContent = gestures[currentGesture];
            instruction.textContent = 'Match the gesture!';
            
            // This would integrate with the gesture recognition system
            // For now, we'll just update automatically
            setTimeout(() => {
                if (this.isPlaying) {
                    this.updateScore(5);
                    instruction.textContent = 'Good job! Next gesture...';
                    setTimeout(updateGesture, 1000);
                }
            }, 2000);
        };

        setTimeout(updateGesture, 2000);
    }
}

// Initialize game manager
const gameManager = new GameManager();

// Event listeners for game buttons
document.addEventListener('DOMContentLoaded', () => {
    const gameButtons = document.querySelectorAll('.game-btn');
    gameButtons.forEach(button => {
        button.addEventListener('click', () => {
            const gameName = button.dataset.game;
            if (gameName) {
                gameManager.startGame(gameName);
            }
        });
    });
});
