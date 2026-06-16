// =============================================================
// routes.js  —  Sistema de navegación (SPA Router)
// =============================================================
// Una SPA (Single Page Application) carga UNA sola página HTML
// y JavaScript se encarga de "simular" la navegación mostrando
// y ocultando contenido sin recargar el navegador.
//
// Este archivo implementa ese sistema usando la History API del
// navegador (window.history.pushState), que permite cambiar la URL
// visible en la barra de direcciones sin hacer una petición real
// al servidor.
//
// Flujo completo de navegación:
//   1. Usuario hace clic en un enlace con atributo data-link
//   2. setupLinks() intercepta el clic (e.preventDefault) y llama router.navigate()
//   3. navigate() cambia la URL con pushState y llama resolveRoute()
//   4. resolveRoute() lee la URL, verifica permisos y renderiza la página correcta
// =============================================================

// Importamos las funciones de autenticación para usarlas en los "guards".
// Un guard es una verificación que ocurre ANTES de mostrar una página
// para asegurarse de que el usuario tiene permiso de verla.
import { isLoggedIn, isAdmin } from '../services/auth.js'

// Importamos la función render de cada página.
// Cada función recibe el elemento #app y le inyecta su HTML y sus eventos.
import { renderLogin }       from '../pages/login.js'
import { renderCartelera }   from '../pages/cartelera.js'
import { renderFunciones }   from '../pages/funciones.js'
import { renderReservas }    from '../pages/reservas.js'
import { renderMisReservas } from '../pages/misReservas.js'


// ─────────────────────────────────────────────────────────────
// Tabla de rutas
// ─────────────────────────────────────────────────────────────
// Array que define TODAS las pantallas de la app.
// Cada objeto describe una "ruta":
//   path  → URL que la activa (lo que aparece en la barra del navegador)
//   page  → función que renderiza esa pantalla
//   auth  → true = el usuario DEBE estar logueado para acceder
//   admin → true = el usuario DEBE ser admin (además de estar logueado)
const routes = [
    {
        path:  '/login',
        page:  renderLogin,
        auth:  false,   // la página de login es pública, no requiere sesión
        admin: false
    },
    {
        path:  '/cartelera',
        page:  renderCartelera,
        auth:  true,    // solo usuarios logueados ven la cartelera
        admin: false    // cualquier rol puede entrar (admin o user)
    },
    {
        path:  '/funciones',
        page:  renderFunciones,
        auth:  true,
        admin: true     // solo el admin puede gestionar funciones
    },
    {
        path:  '/reservas',
        page:  renderReservas,
        auth:  true,
        admin: true     // solo el admin ve todas las reservas del sistema
    },
    {
        path:  '/mis-reservas',
        page:  renderMisReservas,
        auth:  true,
        admin: false    // cualquier usuario logueado puede ver sus propias reservas
    }
]


// ─────────────────────────────────────────────────────────────
// resolveRoute — lee la URL actual y renderiza la página correcta
// ─────────────────────────────────────────────────────────────
// Es la función central del router. Se ejecuta cada vez que:
//   · La app inicia por primera vez (desde router.init)
//   · El usuario navega atrás/adelante con los botones del navegador (evento popstate)
//   · Se llama a router.navigate() desde cualquier parte del código
async function resolveRoute() {
    // window.location.pathname es la parte de la URL después del dominio.
    // Ejemplo: en "http://localhost:5173/cartelera" devuelve "/cartelera".
    const path = window.location.pathname

    // #app es el div vacío en index.html donde se inyecta todo el contenido.
    // Cada página sobreescribe su innerHTML por completo al renderizarse.
    const app = document.getElementById('app')

    // Buscamos en la tabla de rutas cuál objeto tiene el mismo path.
    // .find() devuelve el primer objeto que cumpla la condición, o undefined si ninguno.
    const route = routes.find(r => r.path === path)


    // ── GUARD 1: Ruta protegida sin sesión ──────────────────
    // Si la ruta requiere login (auth:true) y el usuario NO está logueado,
    // lo redirigimos al login. No tiene acceso.
    if(route?.auth && !isLoggedIn()){
        history.pushState({}, '', '/login')   // cambia la URL a /login sin recargar
        resolveRoute()                         // volvemos a ejecutar para renderizar el login
        return                                 // salimos de esta ejecución para no continuar
    }

    // ── GUARD 2: Ruta de admin sin ser admin ─────────────────
    // Si la ruta requiere ser admin (admin:true) pero el usuario es normal,
    // lo redirigimos a la cartelera (página de inicio del usuario normal).
    if (route?.admin && !isAdmin()){
        history.pushState({}, '', '/cartelera')
        resolveRoute()
        return
    }

    // ── GUARD 3: Ya logueado intenta ir a /login ─────────────
    // Si alguien escribe manualmente /login en la URL pero ya tiene sesión,
    // lo mandamos directo a su página de inicio según su rol.
    //
    // ─── BUG CORREGIDO ───────────────────────────────────────
    // BUG: antes era  path === 'login'  (sin la barra inicial '/').
    //      window.location.pathname SIEMPRE incluye la barra inicial:
    //      '/login', '/cartelera', etc. Sin la barra, la comparación
    //      NUNCA era true, y este guard nunca funcionaba: un usuario
    //      ya logueado podía volver a ver el formulario de login.
    // ─────────────────────────────────────────────────────────
    if (path === '/login' && isLoggedIn()){   // ← BUG corregido: era  'login'  sin '/'
        const destino = isAdmin() ? '/funciones' : '/cartelera'
        history.pushState({}, '', destino)
        resolveRoute()
        return
    }

    // ── Ruta raíz "/" → redirigir según estado de sesión ─────
    // Si el usuario llega a la raíz del sitio, decidimos a dónde mandarlo.
    if (path === '/') {
        if (!isLoggedIn()) {
            history.pushState({}, '', '/login')     // sin sesión → formulario de login
        } else {
            // con sesión → página principal según rol
            history.pushState({}, '', isAdmin() ? '/funciones' : '/cartelera')
        }
        resolveRoute()
        return
    }

    // ── Ruta desconocida → página 404 ────────────────────────
    // Si el path no coincide con ninguna ruta del array, mostramos error.
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

    // ── Renderizar la página ──────────────────────────────────
    // Llamamos a la función de la página (ej: renderCartelera) pasándole #app.
    // La función inyectará su HTML en app.innerHTML y registrará sus event listeners.
    await route.page(app)

    // Después de inyectar el nuevo HTML, reconectamos todos los enlaces de navegación.
    // (El HTML anterior fue reemplazado, así que los listeners anteriores ya no existen.)
    setupLinks()
}


// ─────────────────────────────────────────────────────────────
// setupLinks — convierte enlaces normales en navegación SPA
// ─────────────────────────────────────────────────────────────
// Los elementos con atributo data-link (ej: <a href="/cartelera" data-link>)
// normalmente recargarían toda la página. Esta función los intercepta
// para hacer la navegación internamente sin ninguna recarga.
function setupLinks() {
    // Buscamos todos los elementos [data-link] en el documento actual.
    // Esto incluye links de la navbar y cualquier otro enlace de navegación.
    document.querySelectorAll('[data-link]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()                     // cancelamos el comportamiento nativo (recarga)
            const href = link.getAttribute('href') // leemos el destino del enlace
            router.navigate(href)                  // navegamos internamente sin recargar
        })
    })
}


// ─────────────────────────────────────────────────────────────
// router — objeto público que expone el módulo
// ─────────────────────────────────────────────────────────────
// Es lo que importan los demás módulos (main.js, navbar.js, login.js…).
// Solo expone dos métodos para mantener la API simple: navigate() e init().
export const router = {

    // navigate(path) — cambia la pantalla visible
    // Recibe: path (string) — la ruta destino, ej: '/cartelera'
    // Usado por: botón login (después del login exitoso), botón logout,
    //            botones de guardar en formularios, etc.
    navigate(path) {
        // pushState añade una entrada al historial del navegador sin recargar.
        // Argumentos:
        //   1. state  — datos del historial (no los necesitamos, mandamos objeto vacío)
        //   2. title  — título de la pestaña (ignorado por todos los navegadores modernos)
        //   3. url    — la nueva URL que aparecerá en la barra de direcciones
        history.pushState({}, '', path)
        resolveRoute()   // renderizamos la página correspondiente al nuevo path
    },

    // init() — arranca el router, se llama UNA sola vez al inicio
    // Llamado desde main.js cuando el DOM ya está listo.
    init() {
        // El evento popstate se dispara cuando el usuario presiona
        // Atrás o Adelante en el navegador. Sin esto, esos botones
        // cambiarían la URL pero no renderizarían la nueva página.
        window.addEventListener('popstate', resolveRoute)

        // Renderizamos la página que corresponde a la URL actual
        // (puede ser '/' la primera vez, o cualquier ruta si el usuario
        // escribió directamente una URL o recargó la página).
        resolveRoute()
    }
}
