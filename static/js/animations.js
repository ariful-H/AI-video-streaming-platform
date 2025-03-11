// Add animation classes to elements when they enter the viewport
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.animate');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
});

// Add pulse animation to buttons on hover
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mouseenter', () => {
        button.classList.add('pulse');
    });
    
    button.addEventListener('mouseleave', () => {
        button.classList.remove('pulse');
    });
}); 