import { login }   from '../services/auth.js'
import { router }  from '../routes/routes.js'
import { toast }   from '../utils/toast.js'

export async function renderLogin(app) {
    app.innerHTML = `
    <div class="login-page">
        <div class="login-card">

            <div class="login-logo">CINE<span>MAX</span></div>
            <p class="login-subtitle">Sistema de Gestión de Reservas</p>

        <div class="login-error" id="login-error">
            Email o contraseña incorrectos
        </div>

        <!-- Formulario -->
        <div class="form-group">
        <label class="form-label" for="email">Email</label>
            <input class="form-control" type="email" id="email" placeholder="tu@email.com"/>
        </div>

        <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input class="form-control" type="password" id="password" placeholder="••••••••"/>
        </div>

        <button class="btn btn-primary" id="btn-login" style="width:100%; margin-top:0.5rem">
            Iniciar Sesión
        </button>

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

    const btnLogin   = document.getElementById('btn-login')
    const inputEmail = document.getElementById('email')
    const inputPass  = document.getElementById('password')
    const errorDiv   = document.getElementById('login-error')

    // Funcion que ejecuta el login
    async function handleLogin() {
        const email    = inputEmail.value.trim()
        const password = inputPass.value.trim()

        // Validación basica: campos vacíos
        if (!email || !password) {
            errorDiv.textContent = 'Completa todos los campos'
            errorDiv.classList.add('show')
            return
        }

        // Deshabilitar boton mientras carga
        btnLogin.disabled = true
        btnLogin.textContent = 'Verificando...'

        try {
        // Llamamos al servicio de autenticacion
        const usuario = await login(email, password)

        if (!usuario) {
            // Credenciales incorrectas
            errorDiv.textContent = 'Email o contraseña incorrectos'
            errorDiv.classList.add('show')
            btnLogin.disabled = false
            btnLogin.textContent = 'Iniciar Sesion'
            return
        }

        // Login exitoso
        toast.success(`¡Bienvenido, ${usuario.name}!`)

        // Redirigir segun el rol
        const destino = usuario.role === 'admin' ? '/funciones' : '/cartelera'
        router.navigate(destino)

        } catch (error) {
        // Error de conexión, por ejemplo si el json no esta corriendo
        errorDiv.textContent = 'Error de conexión. ¿Está corriendo json-server?'
        errorDiv.classList.add('show')
        btnLogin.disabled = false
        btnLogin.textContent = 'Iniciar Sesión'
        }
    }

    // Click en el boton
    btnLogin.addEventListener('click', handleLogin)

    // Presionar Enter en cualquier campo tambien hace login
    inputPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin()
    })
}
