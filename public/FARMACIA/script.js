document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();
    alert("Formulario enviado. Nos pondremos en contacto pronto.");
    this.reset();
});

        function openTab(evt, tabName) {
            // Ocultar todas las pestañas
            var i, tabcontent, tabbuttons;
            tabcontent = document.getElementsByClassName("tab-content");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].classList.remove("active");
            }

            // Remover la clase activa de todos los botones
            tabbuttons = document.getElementsByClassName("tab-button");
            for (i = 0; i < tabbuttons.length; i++) {
                tabbuttons[i].classList.remove("active");
            }

            // Mostrar la pestaña actual y añadir la clase activa al botón
            document.getElementById(tabName).classList.add("active");
            evt.currentTarget.classList.add("active");
        }
