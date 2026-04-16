import '../assets/style.css'

const hamburgerButton = document.getElementById('hamburger-button');
const navMenu = document.getElementById('nav-menu');
const nav = document.querySelector('nav');


hamburgerButton.addEventListener('click', () => {
  navMenu.classList.toggle('hidden');
});

let lastScrollY = window.scrollY;
let isJumping = false;
window.addEventListener('scroll', () => {
  if (!isJumping) {
    if (window.scrollY < 100) {
      nav.classList.remove('-translate-y-full');
    }
    // If we scroll down, slide the nav up out of view
    else if (window.scrollY > lastScrollY) {
      nav.classList.add('-translate-y-full');
    } 
    // If we scroll up, slide the nav back down
    else {
      nav.classList.remove('-translate-y-full');
    }
    lastScrollY = window.scrollY;
  } 
});

const navLinks = navMenu.querySelectorAll('a');

// Loop through each link and add a click event listener
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    // When a link is clicked, hide the menu!
    navMenu.classList.add('hidden');
    navMenu.classList.remove('flex');

    isJumping = true;
    
    // Guarantee the navbar stays visible on arrival
    nav.classList.remove('-translate-y-full');

    setTimeout(() => {
      isJumping = false;
      lastScrollY = window.scrollY; // Reset the baseline so it doesn't instantly snap
    }, 200);
  });
});