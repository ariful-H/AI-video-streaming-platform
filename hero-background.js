document.addEventListener('DOMContentLoaded', () => {
    const particlesContainer = document.querySelector('.particles-container');
    const heroBackground = document.querySelector('.hero-background');
    
    // Create particles
    function createParticle() {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '2px';
        particle.style.height = '2px';
        particle.style.background = '#00ffff';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        
        // Random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        // Random size
        const size = Math.random() * 3 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Random opacity
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        
        // Animation
        const duration = Math.random() * 3 + 2;
        particle.style.animation = `float ${duration}s ease-in-out infinite`;
        
        particlesContainer.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, duration * 1000);
    }
    
    // Create particles periodically
    setInterval(createParticle, 200);
    
    // Interactive background effect
    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const x = clientX / window.innerWidth;
        const y = clientY / window.innerHeight;
        
        // Move orbs based on mouse position
        const orbs = document.querySelectorAll('.orb');
        orbs.forEach((orb, index) => {
            const factor = (index + 1) * 20;
            orb.style.transform = `translate(${(x - 0.5) * factor}px, ${(y - 0.5) * factor}px)`;
        });
        
        // Adjust grid perspective
        const grid = document.querySelector('.animated-grid');
        grid.style.transform = `perspective(1000px) rotateX(${(y - 0.5) * 5}deg) rotateY(${(x - 0.5) * 5}deg)`;
    });
    
    // Add parallax effect to hero content
    const heroContent = document.querySelector('.hero-content');
    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;
        
        heroContent.style.transform = `translate(${x}px, ${y}px)`;
    });
    
    // Handle touch devices
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
});
