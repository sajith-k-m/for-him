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

    const container = document.querySelector('.scroll-reveal-container');
    const textEl = document.querySelector('.scroll-reveal-text');
    const scroller = document.querySelector('.container'); // The scrolling element

    if (!container || !textEl || !scroller) return;

    // Split text into words
    const text = textEl.textContent.trim();
    textEl.innerHTML = '';
    const words = text.split(/\s+/);

    words.forEach(word => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word + ' ';
        textEl.appendChild(span);
    });

    const wordElements = textEl.querySelectorAll('.word');

    // 1. Rotation Animation
    gsap.fromTo(
        textEl,
        { transformOrigin: '0% 50%', rotation: 3 },
        {
            ease: 'none',
            rotation: 0,
            scrollTrigger: {
                trigger: container,
                scroller: scroller,
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true
            }
        }
    );

    // 2. Opacity Animation
    gsap.fromTo(
        wordElements,
        { opacity: 0.1, willChange: 'opacity' },
        {
            ease: 'none',
            opacity: 1,
            stagger: 0.05,
            scrollTrigger: {
                trigger: container,
                scroller: scroller,
                start: 'top 80%', // Start when top of container hits 80% viewport height
                end: 'bottom 60%',
                scrub: true
            }
        }
    );

    // 3. Blur Animation
    gsap.fromTo(
        wordElements,
        { filter: 'blur(4px)' },
        {
            ease: 'none',
            filter: 'blur(0px)',
            stagger: 0.05,
            scrollTrigger: {
                trigger: container,
                scroller: scroller,
                start: 'top 80%',
                end: 'bottom 60%',
                scrub: true
            }
        }
    );

    isScrollRevealInitialized = true;
}

// Hook into navigation
const originalShowPage = showPage;
// We don't override showPage directly because it's used internally.
// Instead, let's just add listener to the specific transition.

btnToLetter.addEventListener('click', () => {
    // Wait for page transition to finish (0.6s) before refreshing/initializing scrolltrigger
    setTimeout(() => {
        initScrollReveal();
    }, 700);
});


