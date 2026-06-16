// =============================================================
// misReservas.js  —  Mis Reservas (página del usuario normal)
// =============================================================
// El usuario ve aquí SOLO SUS propias reservas (filtradas por su ID).
// Puede hacer dos cosas con una reserva activa:
//   · Cancelarla → cambia el estado a 'cancelada' y devuelve los cupos
//   · Editarla   → cambia la cantidad de entradas y ajusta los cupos
//
// Lógica de cupos al editar:
//   Si tenía 3 entradas y sube a 5 → diferencia = +2 → se restan 2 cupos a la función
//   Si tenía 3 entradas y baja a 1 → diferencia = -2 → se suman 2 cupos a la función
// =============================================================

// Funciones de API necesarias:
//   getReservasByUsuario — trae SOLO las reservas del usuario logueado
//   updateReserva        — para cancelar (cambiar estado) o editar (cambiar cantidad)
//   getFunciones         — para saber cuántos cupos quedan disponibles
//   updateFuncion        — para ajustar cupos al cancelar o editar
import { getReservasByUsuario, updateReserva, getFunciones, updateFuncion } from '../services/api.js'

// getSession — para saber el ID del usuario y filtrar sus reservas.
import { getSession }    from '../services/auth.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast }         from '../utils/toast.js'

// Variables de módulo: reservas del usuario actual y todas las funciones.
// Están fuera de renderMisReservas porque window.cancelarMiReserva y
// window.editarMiReserva las necesitan acceder desde el ámbito global.
let _misReservas = []
let _funciones   = []


// ─────────────────────────────────────────────────────────────
// renderMisReservas — inyecta la página y conecta sus eventos
// ─────────────────────────────────────────────────────────────
// Recibe: app (HTMLElement) — el div #app.
export async function renderMisReservas(app) {

    // Leemos la sesión para obtener el id del usuario.
    // Lo necesitamos para pedir solo SUS reservas al servidor.
    const session = getSession()

    app.innerHTML = `
        ${renderNavbar()}
        <div class="container page">
            <div class="page-header">
                <h1 class="page-title">Mis Reservas</h1>
            </div>

            <!-- Aquí se inyectan las tarjetas de reservas dinámicamente -->
            <div id="mis-reservas-content">
                <p style="color:var(--color-text-muted)">Cargando tus reservas...</p>
            </div>
        </div>

        <!-- Modal para editar la cantidad de entradas de una reserva -->
        <!-- Oculto por defecto (display:none), se muestra al hacer clic en "Editar" -->
        <div class="modal-overlay" id="modal-editar-reserva" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Editar Reserva</h2>
                    <button class="modal-close" id="modal-editar-close">×</button>
                </div>

                <!-- Info de la reserva (se rellena dinámicamente en editarMiReserva) -->
                <div id="editar-reserva-info" style="margin-bottom:1.5rem"></div>

                <div class="form-group">
                    <label class="form-label">Nueva cantidad de entradas</label>
                    <input class="form-control" type="number" id="editar-cantidad" min="1" />
                </div>

                <div style="display:flex; gap:0.5rem; justify-content:flex-end">
                    <button class="btn btn-secondary" id="editar-cancel">Cancelar</button>
                    <button class="btn btn-primary"   id="editar-save">Guardar Cambios</button>
                </div>
            </div>
        </div>
    `

    setupNavbar()

    // Guarda el objeto de la reserva que se está editando en el modal.
    // null cuando el modal está cerrado.
    let reservaEditando = null


    // ── cargarMisReservas — pide los datos y renderiza las tarjetas ──
    async function cargarMisReservas() {
        const content = document.getElementById('mis-reservas-content')

        try {
            // Cargamos EN PARALELO las reservas del usuario Y todas las funciones.
            // Necesitamos las funciones para:
            //   · Saber cuántos cupos quedan al abrir el modal de edición
            //   · Actualizar cupos al cancelar o editar
            [_misReservas, _funciones] = await Promise.all([
                getReservasByUsuario(session.id),   // SOLO las reservas de este usuario
                getFunciones()                       // todas las funciones del sistema
            ])

            if (_misReservas.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-text">No tienes reservas aún. ¡Ve a la cartelera!</p>
                    </div>
                `
                return
            }

            // Generamos una tarjeta por cada reserva del usuario.
            content.innerHTML = `
                <div class="card-grid">
                    ${_misReservas.map(r => `
                        <div class="card">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem">
                                <h3 style="font-size:1rem; font-weight:700">${r.peliculaNombre}</h3>
                                <!-- Badge de estado: badge-pendiente / badge-confirmada / badge-cancelada -->
                                <span class="badge badge-${r.estado}">${r.estado}</span>
                            </div>

                            <div style="color:var(--color-text-muted); font-size:0.85rem; line-height:2">
                                <div>Entradas: <strong style="color:var(--color-text)">${r.cantidadEntradas}</strong></div>
                                <div>Reservado el: ${r.fechaReserva}</div>
                            </div>

                            <!-- Solo mostramos los botones de acción si la reserva NO fue cancelada.
                                 Una reserva cancelada no puede modificarse. -->
                            ${r.estado !== 'cancelada' ? `
                                <div style="display:flex; gap:0.5rem; margin-top:1rem">
                                    <button class="btn btn-secondary btn-sm"
                                        onclick="window.editarMiReserva('${r.id}')" style="flex:1">
                                        Editar
                                    </button>
                                    <button class="btn btn-danger btn-sm"
                                        onclick="window.cancelarMiReserva('${r.id}')" style="flex:1">
                                        Cancelar
                                    </button>
                                </div>
                            ` : `
                                <!-- Si fue cancelada: mostramos aviso en lugar de botones -->
                                <p style="color:var(--color-text-muted); font-size:0.8rem; margin-top:1rem">
                                    Esta reserva fue cancelada y no puede reactivarse.
                                </p>
                            `}
                        </div>
                    `).join('')}
                </div>
            `

        } catch (error) {
            content.innerHTML = `<p style="color:var(--color-danger)">Error al cargar reservas</p>`
        }
    }


    // ── window.cancelarMiReserva — cancela una reserva propia ──
    // Recibe: id (string) — el id de la reserva a cancelar.
    // Accesible desde los onclick de las tarjetas.
    window.cancelarMiReserva = async function(id) {
        if (!confirm('¿Cancelar esta reserva? No podrás reactivarla.')) return

        try {
            const reserva = _misReservas.find(r => r.id === id)

            // Devolvemos los cupos a la función ANTES de cambiar el estado.
            // Si el usuario tenía 3 entradas y cancela, esas 3 entradas vuelven
            // a estar disponibles para que otros usuarios puedan reservarlas.
            if (reserva) {
                const funcion = _funciones.find(f => f.id === reserva.funcionId)
                if (funcion) {
                    await updateFuncion(funcion.id, {
                        cuposDisponibles: funcion.cuposDisponibles + reserva.cantidadEntradas
                    })
                }
            }

            // Cambiamos el estado a 'cancelada'.
            // NO borramos el registro del servidor — así el historial queda guardado.
            await updateReserva(id, { estado: 'cancelada' })
            toast.success('Reserva cancelada')
            cargarMisReservas()   // recargamos para ver el badge actualizado en la tarjeta

        } catch (error) {
            toast.error('Error al cancelar la reserva')
        }
    }


    // ── window.editarMiReserva — abre el modal de edición de entradas ──
    // Recibe: id (string) — el id de la reserva a editar.
    // Accesible desde los onclick de las tarjetas.
    window.editarMiReserva = function(id) {
        // Guardamos el objeto de la reserva que se va a editar.
        reservaEditando = _misReservas.find(r => r.id === id)
        if (!reservaEditando) return

        // Buscamos la función para saber cuántos cupos adicionales hay disponibles.
        const funcion          = _funciones.find(f => f.id === reservaEditando.funcionId)
        const cuposDisponibles = funcion ? funcion.cuposDisponibles : 0

        // Rellenamos la información de la reserva actual en el modal.
        document.getElementById('editar-reserva-info').innerHTML = `
            <div style="background:var(--color-surface2); border-radius:8px; padding:1rem">
                <p style="font-weight:700; margin-bottom:0.25rem">${reservaEditando.peliculaNombre}</p>
                <p style="color:var(--color-text-muted); font-size:0.85rem">
                    Actual: ${reservaEditando.cantidadEntradas} entradas ·
                    Cupos adicionales disponibles: ${cuposDisponibles}
                </p>
            </div>
        `

        const input = document.getElementById('editar-cantidad')
        // El máximo posible es la cantidad actual + los cupos libres.
        // Por ejemplo: el usuario tiene 3 entradas y quedan 5 cupos libres
        // → puede pedir hasta 8 (3 propias + 5 libres).
        // Esto funciona porque al editar, "libera" sus entradas actuales primero.
        input.max   = reservaEditando.cantidadEntradas + cuposDisponibles
        input.min   = 1
        input.value = reservaEditando.cantidadEntradas   // valor inicial = cantidad actual

        document.getElementById('modal-editar-reserva').style.display = 'flex'
    }


    // ── cerrarModalEditar — oculta el modal y limpia el estado ──
    function cerrarModalEditar() {
        document.getElementById('modal-editar-reserva').style.display = 'none'
        reservaEditando = null   // limpiamos para que la próxima edición sea fresca
    }

    document.getElementById('modal-editar-close').addEventListener('click', cerrarModalEditar)
    document.getElementById('editar-cancel').addEventListener('click',      cerrarModalEditar)


    // ── Guardar cambios en la reserva ──
    document.getElementById('editar-save').addEventListener('click', async () => {
        const nuevaCantidad = parseInt(document.getElementById('editar-cantidad').value)

        if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
            toast.error('Cantidad inválida')
            return
        }

        try {
            const funcion = _funciones.find(f => f.id === reservaEditando.funcionId)

            // Calculamos la diferencia para saber cuántos cupos sumar o restar.
            // Positivo (+) = el usuario quiere MÁS entradas → hay que restar cupos a la función.
            // Negativo (-) = el usuario quiere MENOS entradas → hay que devolver cupos.
            const diferencia = nuevaCantidad - reservaEditando.cantidadEntradas

            if (funcion) {
                // Calculamos los cupos que quedarán en la función después del cambio.
                const nuevosCupos = funcion.cuposDisponibles - diferencia

                // Si la diferencia es mayor que los cupos disponibles, no podemos permitirlo.
                // (nuevosCupos < 0 significa que no hay suficiente lugar.)
                if (nuevosCupos < 0) {
                    toast.error('No hay suficientes cupos disponibles')
                    return
                }

                // Actualizamos los cupos de la función en el servidor.
                await updateFuncion(funcion.id, { cuposDisponibles: nuevosCupos })
            }

            // Actualizamos la cantidad de entradas de la reserva en el servidor.
            await updateReserva(reservaEditando.id, { cantidadEntradas: nuevaCantidad })

            toast.success('Reserva actualizada')
            cerrarModalEditar()
            cargarMisReservas()   // recargamos las tarjetas para ver el número actualizado

        } catch (error) {
            toast.error('Error al actualizar la reserva')
        }
    })


    // Carga inicial: pedimos y mostramos las reservas del usuario al abrir la página.
    cargarMisReservas()
}
