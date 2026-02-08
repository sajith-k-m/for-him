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
    const x = Math.random() * (window.innerWidth - btnNo.offsetWidth - 40); // 40px buffer
    const y = Math.random() * (window.innerHeight - btnNo.offsetHeight - 40);
    
    btnNo.style.position = 'absolute';
    btnNo.style.left = `${x}px`;
    btnNo.style.top = `${y}px`;
}

// Mouse for desktop
btnNo.addEventListener('mouseover', moveButton);

// Touch for mobile (using touchstart/touchend to prevent checking "click" if they managed to tap it)
// We want it to move BEFORE they lift their finger, essentially blocking the click.
btnNo.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevents the click from firing
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

// Initialize
// Start at proposal
showPage('proposal');
