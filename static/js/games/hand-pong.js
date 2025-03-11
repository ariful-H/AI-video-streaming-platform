class HandPong {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isPaused = false;
        this.score = 0;
        
        // Game elements
        this.paddle = {
            x: canvas.width / 2 - 50,
            y: canvas.height - 20,
            width: 100,
            height: 10,
            speed: 8
        };
        
        this.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 10,
            speedX: 5,
            speedY: 5
        };
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleGesture = this.handleGesture.bind(this);
        
        // Start game loop
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.isPaused) {
            // Clear canvas
            this.ctx.fillStyle = '#1e293b';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Update ball position
            this.ball.x += this.ball.speedX;
            this.ball.y += this.ball.speedY;
            
            // Ball collision with walls
            if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
                this.ball.speedX = -this.ball.speedX;
            }
            
            if (this.ball.y - this.ball.radius < 0) {
                this.ball.speedY = -this.ball.speedY;
            }
            
            // Ball collision with paddle
            if (
                this.ball.y + this.ball.radius > this.paddle.y &&
                this.ball.x > this.paddle.x &&
                this.ball.x < this.paddle.x + this.paddle.width
            ) {
                this.ball.speedY = -this.ball.speedY;
                this.score++;
                this.updateScore();
            }
            
            // Ball out of bounds
            if (this.ball.y + this.ball.radius > this.canvas.height) {
                // Reset ball
                this.ball.x = this.canvas.width / 2;
                this.ball.y = this.canvas.height / 2;
                this.ball.speedX = 5 * (Math.random() > 0.5 ? 1 : -1);
                this.ball.speedY = -5;
                
                // Decrease score
                this.score = Math.max(0, this.score - 1);
                this.updateScore();
            }
            
            // Draw paddle
            this.ctx.fillStyle = '#4ecca3';
            this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
            
            // Draw ball
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#4ecca3';
            this.ctx.fill();
            this.ctx.closePath();
        }
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }
    
    handleGesture(gesture) {
        switch(gesture) {
            case 'next':
                // Move paddle right
                this.paddle.x = Math.min(
                    this.paddle.x + this.paddle.speed * 2,
                    this.canvas.width - this.paddle.width
                );
                break;
            case 'previous':
                // Move paddle left
                this.paddle.x = Math.max(
                    this.paddle.x - this.paddle.speed * 2,
                    0
                );
                break;
            case 'play_pause':
                // Toggle pause
                this.isPaused = !this.isPaused;
                break;
        }
    }
    
    updateScore() {
        const scoreElement = document.getElementById('pongScore');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }
    
    // Mouse control for testing/fallback
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        
        // Update paddle position
        this.paddle.x = Math.max(0, Math.min(mouseX - this.paddle.width / 2, this.canvas.width - this.paddle.width));
    }
}

// Export the game
window.HandPong = HandPong; 