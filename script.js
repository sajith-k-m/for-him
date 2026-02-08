// DOM Elements
const pages = {
    proposal: document.getElementById('page-proposal'),
    success: document.getElementById('page-success'),
    letter: document.getElementById('page-letter'),
    heartAnimation: document.getElementById('page-heart-animation'),
    lock: document.getElementById('page-lock'),
    memories: document.getElementById('page-memories')
};

const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const btnToLetter = document.getElementById('btn-to-letter');
const heartTrigger = document.getElementById('heart-trigger');
const pinInputs = document.querySelectorAll('.pin-digit');
const errorMsg = document.getElementById('error-msg');

let currentPin = '';
const CORRECT_PIN = '1430';

// Navigation Function
function showPage(pageId) {
    // Hide all pages
    Object.values(pages).forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('active');
    });

    // Show target page
    pages[pageId].classList.remove('hidden');
    pages[pageId].classList.add('active');
}

// Event Listeners

// 1. Proposal Page
btnYes.addEventListener('click', () => {
    showPage('success');
});

// The "No" Button Evasion Logic
function moveButton() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const btnWidth = btnNo.offsetWidth;
    const btnHeight = btnNo.offsetHeight;

    // Safety margins
    const maxLeft = viewportWidth - btnWidth - 20;
    const maxTop = viewportHeight - btnHeight - 20;

    // Ensure random position is positive
    const randomX = Math.max(10, Math.random() * maxLeft);
    const randomY = Math.max(10, Math.random() * maxTop);

    btnNo.style.position = 'fixed'; // Use fixed to be relative to VP
    btnNo.style.left = `${randomX}px`;
    btnNo.style.top = `${randomY}px`;
    btnNo.style.zIndex = '1000';
}

// Mouse for desktop
btnNo.addEventListener('mouseover', moveButton);

// Touch for mobile
btnNo.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveButton();
});


// 2. Success Page
btnToLetter.addEventListener('click', () => {
    showPage('letter');
});

// 3. Letter Page (Heart Click)
heartTrigger.addEventListener('click', () => {
    showPage('heartAnimation');

    // Auto transition after animation
    setTimeout(() => {
        showPage('lock');
        // Auto focus first input
        pinInputs[0].focus();
    }, 2500); // 2.5s for the blowing animation
});

// 4. Lock Screen
pinInputs.forEach((input, index) => {
    input.addEventListener('keyup', (e) => {
        // Auto focus next
        if (e.key >= 0 && e.key <= 9) {
            if (index < 3) {
                pinInputs[index + 1].focus();
            }
        }

        // Backspace focus prev
        if (e.key === 'Backspace') {
            if (index > 0) {
                pinInputs[index - 1].focus();
            }
        }

        // Check PIN when all filled
        checkPin();
    });
});

function checkPin() {
    let enteredPin = '';
    pinInputs.forEach(input => enteredPin += input.value);

    if (enteredPin.length === 4) {
        if (enteredPin === CORRECT_PIN) {
            // Success
            errorMsg.classList.add('hidden');
            showPage('memories');
            initDomeGallery();
        } else {
            // Error
            errorMsg.classList.remove('hidden');
            // Shake animation
            document.querySelector('.pin-display').classList.add('shake');
            setTimeout(() => {
                document.querySelector('.pin-display').classList.remove('shake');
                // Clear inputs
                pinInputs.forEach(input => input.value = '');
                pinInputs[0].focus();
            }, 500);
        }
    }
}

// --- Dome Gallery Initialization ---
let domeGalleryInitialized = false;
function initDomeGallery() {
    if (domeGalleryInitialized) return;
    if (typeof DomeGallery !== 'undefined') {
        const images = [
            {
                src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop',
                alt: 'Abstract art'
            },
            {
                src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop',
                alt: 'Modern sculpture'
            },
            {
                src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop',
                alt: 'Digital artwork'
            },
            {
                src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop',
                alt: 'Contemporary art'
            },
            {
                src: 'https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop',
                alt: 'Geometric pattern'
            },
            {
                src: 'https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop',
                alt: 'Textured surface'
            },
            { src: 'https://pbs.twimg.com/media/Gyla7NnXMAAXSo_?format=jpg&name=large', alt: 'Social media image' }
        ];

        new DomeGallery('dome-gallery-root', {
            images: images,
            fit: 0.8,
            minRadius: 600,
            maxVerticalRotationDeg: 0,
            segments: 34,
            dragDampening: 2,
            grayscale: true
        });
    }
}

// Floating Hearts Animation
function createFloatingHearts() {
    const container = document.getElementById('bg-hearts');
    const heartCount = 15; // Number of concurrent hearts

    for (let i = 0; i < heartCount; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.classList.add('floating-heart');
            heart.innerHTML = '❤️';

            // Random positioning
            heart.style.left = Math.random() * 100 + 'vw';
            heart.style.animationDuration = (Math.random() * 5 + 10) + 's'; // 10-15s
            heart.style.fontSize = (Math.random() * 20 + 10) + 'px'; // 10-30px

            container.appendChild(heart);

            // Cleanup after animation to prevent DOM bloat (indefinite loop simulation)
            heart.addEventListener('animationiteration', () => {
                heart.style.left = Math.random() * 100 + 'vw';
            });

        }, i * 1000); // Stagger start
    }
}

// Initialize
// Create background hearts
createFloatingHearts();

// Start at proposal
showPage('proposal');


// --- Scroll Reveal Logic (GSAP) ---
let isScrollRevealInitialized = false;

function initScrollReveal() {
    if (isScrollRevealInitialized) {
        ScrollTrigger.refresh();
        return;
    }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP not loaded');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Target existing paragraphs in the letter
    const paragraphs = document.querySelectorAll('.letter-content p');
    const scroller = document.querySelector('.container'); // The scrolling element

    if (!paragraphs.length || !scroller) return;

    paragraphs.forEach((p, index) => {
        // Split text into words if not already split
        if (p.querySelector('.word')) return; // Avoid double initialization

        const text = p.textContent.trim();
        p.innerHTML = '';
        const words = text.split(/\s+/);

        words.forEach(word => {
            const span = document.createElement('span');
            span.className = 'word';
            span.style.opacity = '0.3'; // Start faint
            span.style.display = 'inline-block';
            span.style.marginRight = '0.25em';
            span.textContent = word;
            p.appendChild(span);
        });

        const wordElements = p.querySelectorAll('.word');

        // Animation: Fade in + Unblur + Slide Up slightly
        gsap.fromTo(
            wordElements,
            {
                opacity: 0.1,
                filter: 'blur(4px)',
                y: 10,
                willChange: 'opacity, filter, transform'
            },
            {
                ease: 'power2.out',
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                stagger: 0.02,
                scrollTrigger: {
                    trigger: p,
                    scroller: scroller,
                    start: 'top 90%', // Start sooner
                    end: 'bottom 70%',
                    scrub: 1 // Smooth scrub
                }
            }
        );
    });

    // Initialize GSAP scroll trigger for letter if needed
    isScrollRevealInitialized = true;
}

// Hook into navigation
btnToLetter.addEventListener('click', () => {
    setTimeout(() => {
        initScrollReveal();
        initAntigravity();
    }, 700);
});

// --- Antigravity Initialization ---
let antigravityInitialized = false;
function initAntigravity() {
    if (antigravityInitialized) return;
    if (typeof AntigravityAnimation !== 'undefined') {
        new AntigravityAnimation('antigravity-container', {
            count: 300,
            magnetRadius: 6,
            ringRadius: 7,
            waveSpeed: 0.4,
            waveAmplitude: 1,
            particleSize: 1.5,
            lerpSpeed: 0.05,
            color: '#ff4d6d', // Matching the button/heart theme
            autoAnimate: true,
            particleVariance: 1,
            rotationSpeed: 0,
            depthFactor: 1,
            pulseSpeed: 3,
            fieldStrength: 10
        });
        antigravityInitialized = true;
    }
}

// --- Click Heart Burst Effect ---
document.addEventListener('click', (e) => {
    const burstCount = 8;
    for (let i = 0; i < burstCount; i++) {
        const heart = document.createElement('div');
        heart.classList.add('click-heart');
        heart.innerHTML = '❤️';

        // Position at click
        heart.style.left = `${e.clientX}px`;
        heart.style.top = `${e.clientY}px`;

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 80 + 20; // Distance

        const tx = Math.cos(angle) * velocity + 'px';
        const ty = Math.sin(angle) * velocity + 'px';

        heart.style.setProperty('--tx', tx);
        heart.style.setProperty('--ty', ty);

        document.body.appendChild(heart);

        // Clean up
        setTimeout(() => heart.remove(), 1000);
    }
});
