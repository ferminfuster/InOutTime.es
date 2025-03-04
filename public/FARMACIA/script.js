document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();
    alert("Formulario enviado. Nos pondremos en contacto pronto.");
    this.reset();
});
