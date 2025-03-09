// Framer Motion animations
const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
};

// Particle animation for login page
function createParticles() {
    const particles = document.querySelector('.particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.setProperty('--x', `${Math.random() * 100}%`);
        particle.style.setProperty('--y', `${Math.random() * 100}%`);
        particle.style.setProperty('--duration', `${2 + Math.random() * 4}s`);
        particle.style.setProperty('--delay', `${-Math.random() * 2}s`);
        particles.appendChild(particle);
    }
}

// Typewriter effect
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Feature text animation
function initFeatureAnimation() {
    const features = [
        'AI-Powered Video Control',
        'Gesture Recognition',
        'Interactive Gaming',
        'Smart Content Discovery'
    ];
    let currentFeature = 0;
    const featureElement = document.querySelector('.feature-text');
    
    if (featureElement) {
        setInterval(() => {
            featureElement.style.opacity = '0';
            setTimeout(() => {
                featureElement.textContent = features[currentFeature];
                featureElement.style.opacity = '1';
                currentFeature = (currentFeature + 1) % features.length;
            }, 500);
        }, 3000);
    }
}

// Scroll animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// Game section animations
function initGameSection() {
    const gameBtn = document.querySelector('.game-btn');
    if (gameBtn) {
        gameBtn.addEventListener('mousemove', (e) => {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            gameBtn.style.setProperty('--x', `${x}px`);
            gameBtn.style.setProperty('--y', `${y}px`);
        });
    }
}

// Navigation animations
function initNavAnimations() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.classList.add('nav-hidden');
        } else {
            navbar.classList.remove('nav-hidden');
        }
        lastScroll = currentScroll;

        // Add blur effect based on scroll
        const blur = Math.min(currentScroll / 1000, 0.3);
        navbar.style.backdropFilter = `blur(${blur * 10}px)`;
    });
}

// Initialize all animations
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particles for login page
    if (document.querySelector('.particles')) {
        createParticles();
    }

    // Initialize typewriter effect
    const typewriterElement = document.querySelector('.typewriter');
    if (typewriterElement) {
        typeWriter(typewriterElement, typewriterElement.textContent);
    }

    // Initialize other animations
    initFeatureAnimation();
    initScrollAnimations();
    initGameSection();
    initNavAnimations();

    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
