document.addEventListener('DOMContentLoaded', () => {
    // Play button functionality
    const startButton = document.getElementById('start-game');
    startButton.addEventListener('click', () => {
        window.location.href = 'game.html';
    });

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            targetSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Add animation to instruction cards
    const instructionCards = document.querySelectorAll('.instruction-card');
    instructionCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
        card.classList.add('animate-in');
    });

    // Add animation to feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.2}s`;
        item.classList.add('animate-in');
    });

    // Add parallax effect to hero image
    const heroImage = document.querySelector('.hero-image');
    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        heroImage.style.transform = `translateY(${scrollPosition * 0.1}px)`;
    });

    // Add hover effect to play button
    startButton.addEventListener('mouseenter', () => {
        startButton.innerHTML = '<i class="fas fa-play"></i> Let\'s Play!';
    });
    
    startButton.addEventListener('mouseleave', () => {
        startButton.innerHTML = '<i class="fas fa-play"></i> Play Now';
    });

    // Function to copy contract address
    function copyAddress() {
        const address = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0';
        navigator.clipboard.writeText(address).then(() => {
            const copyButton = document.querySelector('.copy-button');
            const originalIcon = copyButton.innerHTML;
            
            // Change to checkmark
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            copyButton.style.color = '#4CAF50';
            
            // Revert back after 2 seconds
            setTimeout(() => {
                copyButton.innerHTML = originalIcon;
                copyButton.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
}); 