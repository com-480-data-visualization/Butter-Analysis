import '../assets/style.css'

const hamburgerButton = document.getElementById('hamburger-button');
const navMenu = document.getElementById('nav-menu');

hamburgerButton.addEventListener('click', () => {
  navMenu.classList.toggle('hidden');
});