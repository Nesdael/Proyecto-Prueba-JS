// =============================================================
// api.js  —  Capa de acceso a datos
// =============================================================
// Este archivo es el ÚNICO punto de contacto con el servidor
// (json-server corriendo en localhost:3000). Todas las páginas
// importan funciones de aquí en lugar de hacer fetch() directamente.
// Así, si el día de mañana cambia la URL o el protocolo, solo hay
// que tocar este archivo.
// =============================================================

// URL base del servidor. Todas las peticiones se construyen
// concatenando esta constante + la ruta específica del recurso.
// Ejemplo: API_URL + '/funciones' → 'http://localhost:3000/funciones'
const API_URL = 'http://localhost:3000'


// ─────────────────────────────────────────────────────────────
// SECCIÓN: FUNCIONES (las películas programadas en salas)
// ─────────────────────────────────────────────────────────────

// Trae TODAS las funciones del servidor.
// No recibe nada → devuelve un array con todos los objetos función.
export async function getFunciones() {
    // fetch() hace una petición HTTP GET a /funciones.
    // json-server responde con el array completo del campo "funciones" en db.json.
    const res = await fetch(`${API_URL}/funciones`)
    // .json() convierte el texto de la respuesta en un objeto JavaScript
    // y lo retorna. El llamador recibirá ese array directamente.
    return res.json()
}

// Trae UNA función identificada por su ID.
// Recibe: id (string/número) — el id del objeto en db.json.
// Devuelve: el objeto función { id, pelicula, sala, fecha, hora, ... }
export async function getFuncionById(id) {
    // json-server interpreta /funciones/3 como "dame el objeto con id=3".
    const res = await fetch(`${API_URL}/funciones/${id}`)
    return res.json()
}

// Crea una función NUEVA en la base de datos.
// Recibe: datos — objeto con los campos de la función (sin id, json-server lo asigna solo).
// Devuelve: el objeto creado, ya con el id asignado por el servidor.
export async function createFuncion(datos) {
    const res = await fetch(`${API_URL}/funciones`, {
        method: 'POST',                                   // POST = "crear recurso nuevo"
        headers: { 'Content-Type': 'application/json' }, // le decimos al servidor que enviamos JSON
        body: JSON.stringify(datos)                       // convertimos el objeto JS a texto JSON
    })
    return res.json()   // devolvemos el objeto recién creado (con su nuevo id)
}

// Actualiza PARCIALMENTE una función ya existente.
// Recibe: id — qué función actualizar; datos — solo los campos que cambian.
// Devuelve: el objeto función con los cambios aplicados.
// Diferencia PATCH vs PUT: PATCH modifica solo los campos enviados;
// PUT reemplaza el objeto entero con lo que se envíe.
export async function updateFuncion(id, datos) {
    const res = await fetch(`${API_URL}/funciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

// Elimina una función del servidor de forma permanente.
// Recibe: id — el id de la función a borrar.
// Devuelve: true si el servidor confirmó el borrado (status 200), false si hubo error.
export async function deleteFuncion(id) {
    const res = await fetch(`${API_URL}/funciones/${id}`, {
        method: 'DELETE'   // DELETE = "borrar este recurso"
    })
    return res.ok   // res.ok es true cuando el status HTTP está entre 200 y 299
}


// ─────────────────────────────────────────────────────────────
// SECCIÓN: RESERVAS (entradas que los usuarios compran)
// ─────────────────────────────────────────────────────────────

// Trae TODAS las reservas del sistema (solo el admin usa esto).
// No recibe nada → devuelve array de reservas.
export async function getReservas() {
    const res = await fetch(`${API_URL}/reservas`)
    return res.json()
}

// Trae solo las reservas de UN usuario específico.
// Recibe: usuarioId — el id del usuario cuyas reservas queremos ver.
// Devuelve: array de reservas que pertenecen a ese usuario.
// El "?" en la URL es un query-string: json-server filtra los registros
// donde el campo "usuarioId" coincida con el valor enviado.
export async function getReservasByUsuario(usuarioId) {
    const res = await fetch(`${API_URL}/reservas?usuarioId=${usuarioId}`)
    return res.json()
}

// Crea una reserva nueva.
// Recibe: datos — objeto con usuarioId, funcionId, cantidad de entradas, etc.
// Devuelve: el objeto reserva recién creado (con id asignado por el servidor).
export async function createReserva(datos) {
    const res = await fetch(`${API_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

// Actualiza parcialmente una reserva (cambiar estado, cantidad de entradas, etc.).
// Recibe: id — qué reserva actualizar; datos — campos a modificar.
// Devuelve: el objeto reserva con los cambios aplicados.
//
// ─── BUGS CORREGIDOS ─────────────────────────────────────────
// BUG 1 — URL rota: antes era  `/reservas${id}`  →  quedaba "/reservas5"
//          en lugar de "/reservas/5". Le faltaba la barra "/" entre el
//          recurso y el id. json-server no encontraba ese endpoint y la
//          actualización NUNCA se aplicaba silenciosamente.
// BUG 2 — Método mal escrito: antes era  'PACTH'  (typo, letras invertidas).
//          HTTP no reconoce ese método, el servidor devolvía error 404/400
//          y la reserva nunca se modificaba.
// ─────────────────────────────────────────────────────────────
export async function updateReserva(id, datos){
    const res = await fetch(`${API_URL}/reservas/${id}`, {  // ← BUG 1 corregido: agrega "/"
        method: 'PATCH',                                    // ← BUG 2 corregido: era 'PACTH'
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

// Elimina una reserva del servidor permanentemente.
// Recibe: id — el id de la reserva a borrar.
// Devuelve: true si el servidor confirmó el borrado.
//
// ─── BUG CORREGIDO ───────────────────────────────────────────
// BUG — URL rota: antes era  `/reservas${id}`  →  mismo problema que
//        en updateReserva. La barra "/" faltaba y el borrado nunca ocurría.
// ─────────────────────────────────────────────────────────────
export async function deleteReserva(id){
    const res = await fetch(`${API_URL}/reservas/${id}`, {  // ← BUG corregido: agrega "/"
        method: 'DELETE'
    })
    return res.ok
}
