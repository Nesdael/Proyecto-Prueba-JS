// =============================================================
// navbar.js  —  Barra de navegación superior
// =============================================================
// Este componente tiene DOS funciones que SIEMPRE deben llamarse juntas:
//
//   1. renderNavbar() — devuelve el HTML como string.
//      Se llama DENTRO del template literal de cada página,
//      antes de que el HTML sea inyectado en el DOM.
//
//   2. setupNavbar() — conecta los event listeners de la navbar.
//      Se llama DESPUÉS de que el HTML fue inyectado con innerHTML.
//
// ¿Por qué están separadas?
// Cuando una página hace  app.innerHTML = `... ${renderNavbar()} ...`
// los elementos de la navbar se crean en ese momento.
// Si intentáramos registrar event listeners dentro de renderNavbar(),
// los elementos todavía no existirían en el DOM y addEventListener fallaría.
// La separación garantiza el orden correcto: primero HTML, luego eventos.
// =============================================================

// Necesitamos getSession para personalizar los links según el rol,
// y logout para el botón "Salir".
import { getSession, logout } from '../services/auth.js'

// Necesitamos el router para navegar a /login después del logout.
import { router } from '../routes/routes.js'


// ─────────────────────────────────────────────────────────────
// renderNavbar — genera el HTML de la navbar como string
// ─────────────────────────────────────────────────────────────
// No recibe parámetros.
// Devuelve: string con el HTML completo de la navbar,
//           o string vacío ('') si no hay sesión activa (ej: página de login).
export function renderNavbar() {
    // Leemos la sesión para personalizar la navbar según el usuario.
    const session = getSession()

    // En la página de login no hay sesión, así que no mostramos navbar.
    // El template de login incluye ${renderNavbar()} por consistencia,
    // pero recibe '' y no renderiza nada.
    if (!session) return ''

    // Links exclusivos para el administrador.
    // El admin gestiona funciones y ve todas las reservas.
    const linksAdmin = `
        <li><a class="nav-link" href="/funciones"  data-link>Funciones</a></li>
        <li><a class="nav-link" href="/reservas"   data-link>Reservas</a></li>
    `

    // Links para el usuario normal.
    // El usuario ve la cartelera y sus propias reservas.
    const linksUser = `
        <li><a class="nav-link" href="/cartelera"    data-link>Cartelera</a></li>
        <li><a class="nav-link" href="/mis-reservas" data-link>Mis Reservas</a></li>
    `

    // Seleccionamos qué bloque de links usar según el rol de la sesión activa.
    const links = session.role === 'admin' ? linksAdmin : linksUser

    // Leemos el estado del dark mode desde localStorage para que el botón
    // muestre el texto correcto: "dark" si estamos en modo claro (para activarlo),
    // "light" si estamos en modo oscuro (para desactivarlo).
    const isDark = localStorage.getItem('darkMode') === 'true'

    // Retornamos el HTML completo de la navbar como string.
    // Todos los <a> llevan data-link para que setupLinks() en routes.js
    // los convierta en navegación SPA sin recarga.
    return `
        <nav class="navbar">
            <!-- Logo — también es un link que lleva a la raíz "/" -->
            <a class="navbar-brand" href="/" data-link>CINE<span>MAX</span></a>

            <!-- Links de navegación según el rol -->
            <ul class="navbar-nav">
                ${links}
            </ul>

            <div class="navbar-user">
                <!-- Botón que alterna entre tema claro y oscuro -->
                <button class="btn-dark-toggle" id="btn-dark-mode" title="Cambiar tema">
                    ${isDark ? 'light' : 'dark'}
                </button>

                <!-- Muestra nombre y rol del usuario logueado actualmente -->
                <div class="user-badge">
                    ${session.name} · <span class="role">${session.role}</span>
                </div>

                <!-- Botón de cierre de sesión -->
                <button class="btn-logout" id="btn-logout">Salir</button>
            </div>
        </nav>
    `
}


// ─────────────────────────────────────────────────────────────
// setupNavbar — conecta los eventos del navbar al DOM
// ─────────────────────────────────────────────────────────────
// Sin parámetros ni valor de retorno.
// DEBE llamarse inmediatamente después de inyectar el HTML de la página
// (después de app.innerHTML = ...) para que los elementos ya existan en el DOM.
export function setupNavbar() {

    // ── Botón "Salir" (logout) ──────────────────────────────
    // getElementById busca en el DOM el botón que renderNavbar() generó.
    const btnLogout = document.getElementById('btn-logout')
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logout()                    // borra la sesión de localStorage
            router.navigate('/login')   // lleva al usuario al formulario de login
        })
    }

    // ── Botón de modo oscuro ────────────────────────────────
    const btnDark = document.getElementById('btn-dark-mode')
    if (btnDark) {
        btnDark.addEventListener('click', () => {
            // classList.toggle agrega la clase si no está, la quita si ya está.
            // Devuelve true si la clase quedó presente (oscuro), false si fue quitada (claro).
            const isCurrentlyDark = document.body.classList.toggle('dark-mode')

            // Guardamos la preferencia en localStorage para que se restaure
            // al recargar la página (lo lee main.js al arrancar).
            localStorage.setItem('darkMode', isCurrentlyDark)

            // Actualizamos el texto del botón sin re-renderizar toda la página.
            btnDark.textContent = isCurrentlyDark ? 'light' : 'dark'
        })
    }

    // ── Marcar el link activo en la navbar ──────────────────
    // Leemos el path actual y le agregamos la clase "active" al link que coincida.
    // Esto resalta visualmente en qué sección estamos (estilos en main.css).
    const currentPath = window.location.pathname
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active')
        }
    })
}
