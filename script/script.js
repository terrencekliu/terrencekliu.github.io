// add class navbarDark on navbar scroll
const header = document.querySelector('.navbar');
const welcomePicture = document.querySelector('.bgimage');

window.onscroll = function() {
    const top = window.scrollY;
    if(top < welcomePicture.offsetHeight - header.offsetHeight) {
        header.classList.remove('navbarDark');
    } else {
        header.classList.add('navbarDark');
    }
}
// collapse navbar after click on small devices
const navLinks = document.querySelectorAll('.nav-item');
const menuToggle = document.getElementById('navbarSupportedContent');

navLinks.forEach((l) => {
    l.addEventListener('click', () => { new bootstrap.Collapse(menuToggle).toggle() })
})