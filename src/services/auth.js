// =============================================================
// auth.js  —  Gestión de sesión y autenticación
// =============================================================
// Este archivo centraliza TODO lo relacionado con el usuario
// que está usando la app en este momento:
//   · verificar credenciales contra el servidor  (login)
//   · cerrar sesión y limpiar datos              (logout)
//   · consultar quién está logueado              (getSession)
//   · saber si hay alguien logueado              (isLoggedIn)
//   · saber si el usuario es administrador       (isAdmin)
//
// La sesión se guarda en localStorage, un almacenamiento que el
// navegador mantiene incluso si se cierra y vuelve a abrir la
// pestaña. Solo desaparece si el usuario borra datos del navegador
// o si llamamos a logout().
// =============================================================

// URL base del servidor. La misma que en api.js.
// En un proyecto más grande esto estaría en un archivo de configuración
// compartido (config.js) para no duplicarlo.
const API_URL = 'http://localhost:3000'

// Clave bajo la cual guardamos la sesión en localStorage.
// Usar una constante evita errores de tipeo cuando la misma
// clave se usa en múltiples funciones de este archivo.
const SESSION_KEY = 'cinemax_session'


// ─────────────────────────────────────────────────────────────
// login — verifica credenciales contra el servidor
// ─────────────────────────────────────────────────────────────
// Recibe: email (string), password (string) — lo que el usuario escribió.
// Devuelve: objeto sesión { id, name, email, role } si las credenciales
//           son correctas, o null si no coinciden con ningún usuario.
export async function login(email, password){
    // Pedimos al servidor los usuarios cuyo email Y password coincidan.
    // json-server interpreta los query-strings como filtros AND:
    // ?email=X&password=Y  →  "dame los registros donde ambos campos sean iguales".
    // NOTA: en una app real NUNCA se envía la contraseña en texto plano ni en la URL.
    //       Esto solo es válido para proyectos de práctica con json-server.
    const response = await fetch(
        `${API_URL}/users?email=${email}&password=${password}`
    )

    // El servidor siempre devuelve un array (puede estar vacío).
    const usuarios = await response.json()

    // Si el array está vacío, las credenciales no coinciden con ningún usuario.
    // Devolvemos null para que la página de login muestre el mensaje de error.
    if(usuarios.length === 0){
        return null
    }

    // Si hay al menos un resultado, tomamos el primero con [0].
    // No debería haber dos usuarios con el mismo email, pero
    // siempre es buena práctica tomar explícitamente el primero.
    const usuario = usuarios[0]

    // Construimos el objeto de sesión con SOLO los datos necesarios.
    // No guardamos la contraseña — la información mínima es suficiente
    // para identificar al usuario y controlar sus permisos.
    const sesion = {
        id:    usuario.id,     // necesario para filtrar reservas por usuario
        name:  usuario.name,   // para mostrar el nombre en la navbar
        email: usuario.email,  // información de perfil
        role:  usuario.role    // 'admin' o 'user' → controla qué páginas ve
    }

    // Guardamos la sesión en localStorage como texto JSON.
    // JSON.stringify convierte el objeto JavaScript en una cadena de texto
    // porque localStorage solo puede almacenar strings, no objetos.
    localStorage.setItem(SESSION_KEY, JSON.stringify(sesion))

    // Devolvemos la sesión al componente de login para que
    // redirija al usuario a la página correcta según su rol.
    return sesion
}


// ─────────────────────────────────────────────────────────────
// logout — elimina la sesión activa
// ─────────────────────────────────────────────────────────────
// No recibe ni devuelve nada.
// Después de llamar esta función: isLoggedIn() → false, getSession() → null.
export function logout(){
    // removeItem borra la clave del localStorage.
    // El navegador ya no tendrá información del usuario hasta que vuelva a hacer login.
    localStorage.removeItem(SESSION_KEY)
}


// ─────────────────────────────────────────────────────────────
// getSession — devuelve los datos del usuario logueado
// ─────────────────────────────────────────────────────────────
// No recibe nada.
// Devuelve: objeto sesión { id, name, email, role } si hay sesión activa,
//           o null si no hay nadie logueado.
export function getSession(){
    // Intentamos leer la clave del localStorage.
    const data = localStorage.getItem(SESSION_KEY)

    // Si la clave no existe (nadie logueado, o fue borrada), devolvemos null.
    if(!data) return null

    // JSON.parse hace el proceso inverso a JSON.stringify:
    // convierte el texto guardado de vuelta en un objeto JavaScript usable.
    return JSON.parse(data)
}


// ─────────────────────────────────────────────────────────────
// isLoggedIn — ¿hay alguien logueado ahora mismo?
// ─────────────────────────────────────────────────────────────
// No recibe nada.
// Devuelve: true si hay sesión activa, false si no.
// Usado por los guards de rutas en routes.js para decidir si
// dejar pasar al usuario o redirigirlo al login.
export function isLoggedIn() {
    // Si getSession devuelve algo distinto de null, existe una sesión activa.
    return getSession() !== null
}


// ─────────────────────────────────────────────────────────────
// isAdmin — ¿el usuario logueado es administrador?
// ─────────────────────────────────────────────────────────────
// No recibe nada.
// Devuelve: true si hay sesión Y el rol es 'admin', false en cualquier otro caso.
// Usado por los guards de rutas para proteger páginas de solo-admin
// como /funciones y /reservas.
export function isAdmin(){
    const session = getSession()
    // Doble verificación: primero que exista sesión, luego que sea admin.
    // Si session fuera null y accediéramos a session.role, obtendríamos un TypeError.
    return session !== null && session.role === 'admin'
}
