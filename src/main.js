// =============================================================
// main.js  —  Punto de entrada de la aplicación
// =============================================================
// Este es el PRIMER archivo JavaScript que ejecuta el navegador.
// Vite lo referencia en index.html como  <script type="module">.
// Su única responsabilidad es esperar a que el HTML esté listo
// y arrancar el router, que a su vez renderiza la primera página.
//
// Flujo de arranque:
//   index.html carga → main.js ejecuta → DOMContentLoaded dispara
//   → restauramos dark mode → router.init() → resolveRoute()
//   → se renderiza la primera página según la URL actual
// =============================================================

// Importamos el router desde su módulo.
// Cuando JavaScript importa un módulo, ejecuta su código de nivel
// superior, pero lo que aquí nos importa es el objeto { navigate, init }.
import { router } from './routes/routes.js'

// DOMContentLoaded se dispara cuando el navegador terminó de parsear
// TODO el HTML de index.html (es decir, el <div id="app"> ya existe en el DOM).
// Sin este evento, document.getElementById('app') podría devolver null
// porque el script se ejecutaría ANTES de que el div fuera creado.
document.addEventListener('DOMContentLoaded', () => {

    // Si el usuario tenía el modo oscuro activado la última vez que usó la app,
    // lo restauramos INMEDIATAMENTE para evitar un "flash" de tema claro al cargar.
    // (El valor fue guardado por el botón de dark mode en navbar.js.)
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode')
    }

    // Iniciamos el router: registra el listener de popstate y renderiza
    // la página que corresponde a la URL actual.
    // A partir de aquí, el control pasa completamente a routes.js.
    router.init()
})
