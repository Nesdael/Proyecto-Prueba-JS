import { isLoggedIn, isAdmin } from '../services/auth.js'
import { renderLogin }       from '../pages/login.js'
import { renderCartelera }   from '../pages/cartelera.js'
import { renderFunciones }   from '../pages/funciones.js'
import { renderReservas }    from '../pages/reservas.js'
import { renderMisReservas } from '../pages/misReservas.js'

const routes = [
    {
        path : '/login',
        page: renderLogin,
        auth: false,
        admin: false
    },
    {
        path : '/cartelera',
        page: renderCartelera,
        auth: true,
        admin: false
    },
    {
        path : '/funciones',
        page: renderFunciones,
        auth: true,
        admin: true
    },
    {
        path : '/reservas',
        page: renderReservas,
        auth: true,
        admin: true
    },
    {
        path : '/mis-reservas',
        page: renderMisReservas,
        auth: true,
        admin: false
    }
]

async function resolveRoute() {
    const path = window.location.pathname
    const app = document.getElementById('app')

    const route = routes.find(r => r.path === path)

    if(route?.auth && !isLoggedIn()){
        history.pushState({}, '', '/login')
        resolveRoute()
        return
    }

    if (route?.admin && !isAdmin()){
        history.pushState({}, '', '/cartelera')
        resolveRoute()
        return
    }

    if (path === 'login' && isLoggedIn()){
        const destino = isAdmin() ? '/funciones' : '/cartelera'
        history.pushState({}, '', destino)
        resolveRoute()
        return
    }

    if (path === '/') {
        if (!isLoggedIn()) {
            history.pushState({}, '', '/login')
        } else {
            history.pushState({}, '', isAdmin() ? '/funciones' : '/cartelera')
        }
        resolveRoute()
        return
    }

        //Si no se encuentra la ruta sale esto
    if (!route) {
    app.innerHTML = `
        <div style="text-align:center; padding:4rem">
            <h1 style="font-size:4rem; color:var(--color-accent)">404</h1>
            <p style="color:var(--color-text-muted)">Página no encontrada</p>
            <a href="/" data-link style="color:var(--color-gold)">Volver al inicio</a>
        </div>
        `
        return
    }

    await route.page(app)

    setupLinks()

}

function setupLinks() {
    document.querySelectorAll('[data-link]').forEach(link => {
        link.addEventListener('click', (e) => {
        e.preventDefault()
        const href = link.getAttribute('href')
        router.navigate(href)
        })
    })
}

export const router = {
    navigate(path) {
        history.pushState({}, '', path)
        resolveRoute()
    },

    init() {
    window.addEventListener('popstate', resolveRoute)
    resolveRoute()
    }
}