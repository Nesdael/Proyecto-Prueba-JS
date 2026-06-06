import {getReservasByUsuario, updateReserva, getFunciones, updateFuncion} from '../services/api.js'
import { getSession }    from '../services/auth.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast }         from '../utils/toast.js'

let _misReservas = []
let _funciones   = []

export async function renderMisReservas(app) {
  const session = getSession()

  app.innerHTML = `
    ${renderNavbar()}
    <div class="container page">
      <div class="page-header">
        <h1 class="page-title">Mis Reservas</h1>
      </div>

      <div id="mis-reservas-content">
        <p style="color:var(--color-text-muted)">Cargando tus reservas...</p>
      </div>
    </div>

    <!-- Modal para editar cantidad de entradas -->
    <div class="modal-overlay" id="modal-editar-reserva" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Editar Reserva</h2>
          <button class="modal-close" id="modal-editar-close">×</button>
        </div>

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

  let reservaEditando = null

  async function cargarMisReservas() {
    const content = document.getElementById('mis-reservas-content')

    try {
      // Cargamos solo las reservas de este usuario (filtradas por ID)
      [_misReservas, _funciones] = await Promise.all([
        getReservasByUsuario(session.id),
        getFunciones()
      ])

      if (_misReservas.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <p class="empty-state-text">No tienes reservas aún. ¡Ve a la cartelera!</p>
          </div>
        `
        return
      }

      content.innerHTML = `
        <div class="card-grid">
          ${_misReservas.map(r => `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem">
                <h3 style="font-size:1rem; font-weight:700">${r.peliculaNombre}</h3>
                <span class="badge badge-${r.estado}">${r.estado}</span>
              </div>

              <div style="color:var(--color-text-muted); font-size:0.85rem; line-height:2">
                <div>Entradas: <strong style="color:var(--color-text)">${r.cantidadEntradas}</strong></div>
                <div>Reservado el: ${r.fechaReserva}</div>
              </div>

              <!-- Botones solo si la reserva no está cancelada -->
              ${r.estado !== 'cancelada' ? `
                <div style="display:flex; gap:0.5rem; margin-top:1rem">
                  <button class="btn btn-secondary btn-sm" onclick="window.editarMiReserva('${r.id}')" style="flex:1">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="window.cancelarMiReserva('${r.id}')" style="flex:1">Cancelar</button>
                </div>
              ` : `
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

  window.cancelarMiReserva = async function(id) {
    if (!confirm('¿Cancelar esta reserva? No podrás reactivarla.')) return

    try {
      const reserva = _misReservas.find(r => r.id === id)

      // Devolvemos los cupos a la funcion
      if (reserva) {
        const funcion = _funciones.find(f => f.id === reserva.funcionId)
        if (funcion) {
          await updateFuncion(funcion.id, {
            cuposDisponibles: funcion.cuposDisponibles + reserva.cantidadEntradas
          })
        }
      }

      // Cambiamos el estado a 'cancelada'
      await updateReserva(id, { estado: 'cancelada' })
      toast.success('Reserva cancelada')
      cargarMisReservas()

    } catch (error) {
      toast.error('Error al cancelar la reserva')
    }
  }

 //editar reserva propia
  window.editarMiReserva = function(id) {
    reservaEditando = _misReservas.find(r => r.id === id)
    if (!reservaEditando) return

    // Buscamos la funcion para saber cuántos cupos hay
    const funcion = _funciones.find(f => f.id === reservaEditando.funcionId)
    const cuposDisponibles = funcion ? funcion.cuposDisponibles : 0

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
    // El maximo es la cantidad actual + cupos disponibles
    input.max   = reservaEditando.cantidadEntradas + cuposDisponibles
    input.min   = 1
    input.value = reservaEditando.cantidadEntradas

    document.getElementById('modal-editar-reserva').style.display = 'flex'
  }

  function cerrarModalEditar() {
    document.getElementById('modal-editar-reserva').style.display = 'none'
    reservaEditando = null
  }

  document.getElementById('modal-editar-close').addEventListener('click', cerrarModalEditar)
  document.getElementById('editar-cancel').addEventListener('click',      cerrarModalEditar)

  document.getElementById('editar-save').addEventListener('click', async () => {
    const nuevaCantidad = parseInt(document.getElementById('editar-cantidad').value)

    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
      toast.error('Cantidad inválida')
      return
    }

    try {
      const funcion = _funciones.find(f => f.id === reservaEditando.funcionId)
      const diferencia = nuevaCantidad - reservaEditando.cantidadEntradas

      if (funcion) {
        const nuevosCupos = funcion.cuposDisponibles - diferencia

        if (nuevosCupos < 0) {
          toast.error('No hay suficientes cupos disponibles')
          return
        }

        // Actualizamos cupos de la funcion
        await updateFuncion(funcion.id, { cuposDisponibles: nuevosCupos })
      }

      // Actualizamos la reserva
      await updateReserva(reservaEditando.id, { cantidadEntradas: nuevaCantidad })

      toast.success('Reserva actualizada')
      cerrarModalEditar()
      cargarMisReservas()

    } catch (error) {
      toast.error('Error al actualizar la reserva')
    }
  })

  cargarMisReservas()
}
