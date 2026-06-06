import { getSession, logout } from '../services/auth.js'
import { router } from '../routes/routes.js'

export function renderNavbar() {
    const session = getSession()
    if (!session) return ''

    const linksAdmin = `
        <li><a class="nav-link" href="/funciones"  data-link>Funciones</a></li>
        <li><a class="nav-link" href="/reservas"   data-link>Reservas</a></li>
        `

    const linksUser = `
        <li><a class="nav-link" href="/cartelera"   data-link>Cartelera</a></li>
        <li><a class="nav-link" href="/mis-reservas" data-link>Mis Reservas</a></li>
    `

    const links = session.role === 'admin' ? linksAdmin : linksUser

    //Leemos si el dark mode está activado en localStorage
    const isDark = localStorage.getItem('darkMode') === 'true'

    return `
        <nav class="navbar">
        <a class="navbar-brand" href="/" data-link>CINE<span>MAX</span></a>

        <ul class="navbar-nav">
            ${links}
        </ul>

        <div class="navbar-user">
        <button class="btn-dark-toggle" id="btn-dark-mode" title="Cambiar tema">
            ${isDark ? 'light' : 'dark'}
            </button>

            <div class="user-badge">
                ${session.name} · <span class="role">${session.role}</span>
            </div>
            <button class="btn-logout" id="btn-logout">Salir</button>
        </div>
        </nav>
        `
}

export function setupNavbar() {
    // Logout
    const btnLogout = document.getElementById('btn-logout')
        if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logout()
        router.navigate('/login')
        })
    }

    // Dark mode toggle
    const btnDark = document.getElementById('btn-dark-mode')
        if (btnDark) {
        btnDark.addEventListener('click', () => {
            const isCurrentlyDark = document.body.classList.toggle('dark-mode')
        localStorage.setItem('darkMode', isCurrentlyDark)
        // Cambiamos el icono sin re-renderizar toda la página
        btnDark.textContent = isCurrentlyDark ? 'light' : 'dark'
        })
    }

    // Marcar link activo
    const currentPath = window.location.pathname
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
        link.classList.add('active')
        }
    })
}
