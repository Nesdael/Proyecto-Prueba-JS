const API_URL = 'http://localhost:3000'

//Esta el clave que se usa para guardar la sesion en localStorage
const SESSION_KEY = 'cinemax_session'

//login
//verifica credeciales
//retorna un usuario existe, null si no
export async function login(email, password){
    const response = await fetch(
        `${API_URL}/users?email=${email}&password=${password}`
    )

    const usuarios = await response.json()
    //Si no se encuentra ninguno, entonces las credeciales son incorrectas
    if(usuarios.length === 0){
        return null
    }

    //Si se encuentra, tomamos el primer usuario encontrado
    const usuario = usuarios[0]

    const sesion ={
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        role: usuario.role
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
    return sesion
}

//logout
//borra la sesion en el localStorage
export function logout(){
    localStorage.removeItem(SESSION_KEY)
}

//getSession
export function getSession(){
    const data = localStorage.getItem(SESSION_KEY)

    if(!data) return null

    return JSON.parse(data)
}

//Is logged in
//verifica si alguien esta logueado
export function isLoggedIn() {
    return getSession() !== null
}

//Is admin
//aqui verifica si el usuario logueado es admin o un usuario normal
export function isAdmin(){
    const session = getSession()
    return session !== null && session.role === 'admin'
}
