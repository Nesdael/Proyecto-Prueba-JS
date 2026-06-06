export function showToast(mensaje, tipo = 'info'){
    const container = document.getElementById('toast-container')
    const toast = document.createElement('div')
    toast.className= `toast toast-${tipo}`
    toast.textContent= mensaje

    container.appendChild(toast)

    setTimeout(() => {
        toast.remove()
    }, 3000);
}

export const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
}