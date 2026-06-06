const API_URL = 'http://localhost:3000'


//Obtenemos todas las funciones
export async function getFunciones() {
    const res = await fetch(`${API_URL}/funciones`)
    return res.json()
}

//Obtener una funcion por su ID
export async function getFuncionById(id) {
    const res = await fetch(`${API_URL}/funciones/${id}`)
    return res.json()
}

//Crear una nueva funcion, solo para el admin
export async function createFuncion(datos) {
    const res = await fetch(`${API_URL}/funciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

//Editar una funcion existente, solo para el admin
export async function updateFuncion(id, datos) {
    const res = await fetch(`${API_URL}/funciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

// Eliminar una funcion, solo para el admin
export async function deleteFuncion(id) {
    const res = await fetch(`${API_URL}/funciones/${id}`, {
        method: 'DELETE'
    })
    return res.ok
}

//Gestion de reservaciones
//Obtener todas las reservas
export async function getReservas() {
    const res = await fetch(`${API_URL}/reservas`)
    return res.json()
}

//Obtener reservas de un usuario específico
export async function getReservasByUsuario(usuarioId) {
    const res = await fetch(`${API_URL}/reservas?usuarioId=${usuarioId}`)
    return res.json()
}

// Crear una nueva reserva
export async function createReserva(datos) {
    const res = await fetch(`${API_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

//Actualizar una reserva(cambiar estado, cantidad, etc)
export async function updateReserva(id, datos){
    const res = await fetch(`${API_URL}/reservas${id}`, {
        method: 'PACTH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    return res.json()
}

//Eliminar una reserva 
export async function deleteReserva(id){
    const res = await fetch(`${API_URL}/reservas${id}`,{
        method: 'DELETE'
    })
    return res.ok
}