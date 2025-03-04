document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();
    alert("Formulario enviado. Nos pondremos en contacto pronto.");
    this.reset();
});
window.onload = function() {
    var popup = document.getElementById("popup");
    var closeBtn = document.getElementById("closePopup");

    // Mostrar el popup al cargar la página
    popup.style.display = "block";

    // Generar confeti
    confetti();

    // Cerrar el popup cuando se hace clic en la "X"
    closeBtn.onclick = function() {
        popup.style.display = "none";
    }

    // Cerrar el popup si se hace clic fuera del contenido
    window.onclick = function(event) {
        if (event.target == popup) {
            popup.style.display = "none";
        }
    }
}