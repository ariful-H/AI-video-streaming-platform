// Hero background animation
document.addEventListener('DOMContentLoaded', function() {
    const hero = document.querySelector('.hero-background');
    if (!hero) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    hero.appendChild(canvas);

    // Set canvas size
    function setCanvasSize() {
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
    }
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Particle class
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.life = 1;
            this.color = `rgba(26, 115, 232, ${this.life})`;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= 0.001;
            this.color = `rgba(26, 115, 232, ${this.life})`;

            if (this.life <= 0 || 
                this.x < 0 || this.x > canvas.width || 
                this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    // Create particles
    const particles = Array(50).fill().map(() => new Particle());

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        requestAnimationFrame(animate);
    }

    animate();
}); 