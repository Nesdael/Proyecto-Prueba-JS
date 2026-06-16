// =============================================================
// toast.js  —  Notificaciones temporales (toasts)
// =============================================================
// Un "toast" es un pequeño mensaje que aparece brevemente en la
// pantalla para confirmar una acción ("Reserva creada") o mostrar
// un error, y desaparece solo después de unos segundos.
// El nombre viene de "tostadora": el mensaje "salta" a la vista.
//
// El contenedor HTML  #toast-container  ya existe en index.html.
// Este módulo crea elementos dentro de él y los destruye solos.
//
// Cómo se usa desde cualquier página:
//   import { toast } from '../utils/toast.js'
//   toast.success('¡Reserva creada!')
//   toast.error('Error al conectar')
//   toast.info('Información general')
// =============================================================

// Función base que crea y muestra un toast en pantalla.
// Recibe: mensaje (string) — el texto que verá el usuario.
//         tipo (string)    — 'success', 'error' o 'info' (define el color via CSS).
// No devuelve nada — el efecto es puramente visual en el DOM.
export function showToast(mensaje, tipo = 'info'){
    // Buscamos el contenedor de toasts que ya existe en index.html.
    // Todos los toasts se apilan dentro de él.
    const container = document.getElementById('toast-container')

    // Creamos un nuevo elemento <div> en memoria (todavía no está en la página).
    const toast = document.createElement('div')

    // Le asignamos clases CSS:
    //   "toast"         → estilos base (posición, tamaño, animación)
    //   "toast-success" → fondo verde   (cuando tipo='success')
    //   "toast-error"   → fondo rojo    (cuando tipo='error')
    //   "toast-info"    → fondo azul    (cuando tipo='info')
    toast.className = `toast toast-${tipo}`

    // Ponemos el texto del mensaje dentro del div.
    toast.textContent = mensaje

    // Añadimos el div al contenedor — aquí es cuando aparece en pantalla.
    container.appendChild(toast)

    // Programamos la autodestrucción: después de 3000 ms (3 segundos),
    // .remove() saca el div del DOM y desaparece de la pantalla.
    setTimeout(() => {
        toast.remove()
    }, 3000)
}

// Objeto conveniente que exportamos para uso en toda la app.
// En lugar de escribir  showToast(msg, 'success')  cada vez,
// los módulos importan  toast  y llaman  toast.success(msg).
// Cada propiedad es una función flecha que llama a showToast con el tipo correcto.
export const toast = {
    success: (msg) => showToast(msg, 'success'),  // mensaje verde de confirmación
    error:   (msg) => showToast(msg, 'error'),    // mensaje rojo de error
    info:    (msg) => showToast(msg, 'info'),     // mensaje neutro informativo
}
