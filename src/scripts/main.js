import '../assets/style.css'

document.querySelector('#app').innerHTML = `
    <h1 class="text-3xl font-bold underline">
    Hello world!
    </h1>
`

const hamburgerButton = document.getElementById('hamburger-button');
const navMenu = document.getElementById('nav-menu');

hamburgerButton.addEventListener('click', () => {
  navMenu.classList.toggle('hidden');
});