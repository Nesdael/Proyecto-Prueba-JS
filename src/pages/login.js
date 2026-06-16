// =============================================================
// login.js  —  Página de inicio de sesión
// =============================================================
// Esta es la primera pantalla que ve un usuario no autenticado.
// Responsabilidades:
//   1. Mostrar el formulario (email + contraseña)
//   2. Validar que los campos no estén vacíos
//   3. Llamar al servicio de autenticación con las credenciales
//   4. Redirigir al usuario a su página de inicio según su rol
//   5. Mostrar mensajes de error si algo falla
// =============================================================

// login() — función que hace la petición al servidor y guarda la sesión.
// La importamos de auth.js (que es quien sabe cómo verificar credenciales).
import { login }  from '../services/auth.js'

// router — para navegar a /funciones o /cartelera después del login exitoso.
import { router } from '../routes/routes.js'

// toast — para mostrar la notificación de bienvenida tras loguearse.
import { toast }  from '../utils/toast.js'


// ─────────────────────────────────────────────────────────────
// renderLogin — inyecta el HTML del formulario y conecta sus eventos
// ─────────────────────────────────────────────────────────────
// Recibe: app (HTMLElement) — el div #app de index.html.
// No devuelve nada, modifica el DOM directamente.
export async function renderLogin(app) {

    // Sobreescribimos todo el contenido de #app con el HTML de esta página.
    // Las comillas invertidas (template literal) permiten HTML multilínea
    // sin tener que concatenar strings con +.
    app.innerHTML = `
    <div class="login-page">
        <div class="login-card">

            <!-- Logo de la aplicación -->
            <div class="login-logo">CINE<span>MAX</span></div>
            <p class="login-subtitle">Sistema de Gestión de Reservas</p>

            <!-- Div de error: oculto por defecto (sin clase "show"),
                 se hace visible agregando la clase "show" via JavaScript -->
            <div class="login-error" id="login-error">
                Email o contraseña incorrectos
            </div>

            <!-- Campo de email -->
            <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input class="form-control" type="email" id="email" placeholder="tu@email.com"/>
            </div>

            <!-- Campo de contraseña (type="password" oculta los caracteres con ••••) -->
            <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <input class="form-control" type="password" id="password" placeholder="••••••••"/>
            </div>

            <!-- Botón de envío del formulario -->
            <button class="btn btn-primary" id="btn-login" style="width:100%; margin-top:0.5rem">
                Iniciar Sesión
            </button>

            <!-- Credenciales de prueba visibles en pantalla (solo para desarrollo/demo) -->
            <div style="margin-top:1.5rem; padding-top:1.5rem; border-top:1px solid var(--color-border)">
                <p style="font-size:0.75rem; color:var(--color-text-muted); margin-bottom:0.5rem">
                    USUARIOS DE PRUEBA:
                </p>
                <div style="font-size:0.78rem; color:var(--color-text-muted); line-height:1.8">
                    <div>Admin: admin@cinemax.com / Admin123!</div>
                    <div>User 1: carlos@mail.com / User123!</div>
                    <div>User 2: maria@mail.com / User123!</div>
                </div>
            </div>

        </div>
    </div>
    `

    // Capturamos referencias a los elementos que vamos a manipular.
    // Lo hacemos AQUÍ (después de innerHTML) porque antes no existían en el DOM.
    // Si lo hiciéramos antes del innerHTML, getElementById devolvería null.
    const btnLogin   = document.getElementById('btn-login')
    const inputEmail = document.getElementById('email')
    const inputPass  = document.getElementById('password')
    const errorDiv   = document.getElementById('login-error')


    // ── handleLogin — ejecuta el proceso completo de login ──
    // Se define como función interna (no global) para que tenga acceso a
    // btnLogin, inputEmail, inputPass y errorDiv por "closure"
    // (las variables del scope externo son accesibles desde aquí).
    async function handleLogin() {

        // .trim() elimina espacios al inicio y al final que el usuario
        // haya escrito por accidente (ej: copiar-pegar con espacio al final).
        const email    = inputEmail.value.trim()
        const password = inputPass.value.trim()

        // Validación básica: si algún campo está vacío no hacemos la petición.
        // Un campo vacío después de trim() es un string vacío '', que es falsy en JS.
        if (!email || !password) {
            errorDiv.textContent = 'Completa todos los campos'
            errorDiv.classList.add('show')   // 'show' hace visible el div (ver main.css)
            return                            // salimos de la función, no continuamos
        }

        // Deshabilitamos el botón mientras espera la respuesta del servidor.
        // Esto evita que el usuario haga clic múltiples veces y envíe
        // varias peticiones en paralelo (lo que crearía sesiones duplicadas).
        btnLogin.disabled    = true
        btnLogin.textContent = 'Verificando...'

        try {
            // Llamamos a login() de auth.js. Esa función:
            //   1. Hace fetch al servidor con email y password
            //   2. Si las credenciales son válidas, guarda la sesión en localStorage
            //   3. Retorna el objeto sesión, o null si las credenciales son incorrectas
            const usuario = await login(email, password)

            if (!usuario) {
                // El servidor respondió OK pero no encontró coincidencias → credenciales incorrectas.
                // Este NO es un error de red (no entra al catch), es simplemente null.
                errorDiv.textContent = 'Email o contraseña incorrectos'
                errorDiv.classList.add('show')
                btnLogin.disabled    = false
                btnLogin.textContent = 'Iniciar Sesión'
                return
            }

            // Login exitoso: mostramos notificación de bienvenida con el nombre del usuario.
            toast.success(`¡Bienvenido, ${usuario.name}!`)

            // Redirigimos según el rol:
            //   admin → /funciones (su panel de gestión)
            //   user  → /cartelera (ver películas disponibles)
            const destino = usuario.role === 'admin' ? '/funciones' : '/cartelera'
            router.navigate(destino)

        } catch (error) {
            // El bloque catch captura errores de RED (ej: json-server no está corriendo,
            // no hay conexión). El caso de credenciales incorrectas (usuario=null)
            // NO llega aquí, ya fue manejado arriba.
            errorDiv.textContent = 'Error de conexión. ¿Está corriendo json-server?'
            errorDiv.classList.add('show')
            btnLogin.disabled    = false
            btnLogin.textContent = 'Iniciar Sesión'
        }
    }


    // Conectamos handleLogin al clic del botón.
    btnLogin.addEventListener('click', handleLogin)

    // También ejecutamos el login al presionar Enter en el campo de contraseña.
    // Es el comportamiento esperado en cualquier formulario de login.
    inputPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin()
    })
}
