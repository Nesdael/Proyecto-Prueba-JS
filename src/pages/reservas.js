import { getReservas, updateReserva, deleteReserva, getFunciones, updateFuncion } from '../services/api.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast } from '../utils/toast.js'

let _reservas   = []
let _funciones  = []

export async function renderReservas(app) {
  app.innerHTML = `
    ${renderNavbar()}
    <div class="container page">
      <div class="page-header">
        <h1 class="page-title">Todas las Reservas</h1>
      </div>

      <!-- Stats -->
      <div class="stats-grid" id="stats-reservas"></div>

      <!-- BONUS: Buscador + Filtro por fecha -->
      <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem; flex-wrap:wrap">
        <input class="form-control" type="text" id="reservas-search" placeholder="Buscar por usuario o película..." style="max-width:300px"/>
        <input class="form-control" type="date" id="reservas-fecha" style="max-width:200px"/>
        <button class="btn btn-secondary" id="reservas-limpiar">
          Limpiar filtros
        </button>
      </div>

      <div id="reservas-content">
        <p style="color:var(--color-text-muted)">Cargando...</p>
      </div>
    </div>
  `

  setupNavbar()

  async function cargarReservas() {
    const content = document.getElementById('reservas-content')

    try {
      [_reservas, _funciones] = await Promise.all([
        getReservas(),
        getFunciones()
      ])

      // Stats
      const pendientes  = _reservas.filter(r => r.estado === 'pendiente').length
      const confirmadas = _reservas.filter(r => r.estado === 'confirmada').length
      const canceladas  = _reservas.filter(r => r.estado === 'cancelada').length

      document.getElementById('stats-reservas').innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Total</div>
          <div class="stat-value">${_reservas.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pendientes</div>
          <div class="stat-value" style="color:var(--color-warning)">${pendientes}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Confirmadas</div>
          <div class="stat-value" style="color:var(--color-success)">${confirmadas}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Canceladas</div>
          <div class="stat-value" style="color:var(--color-danger)">${canceladas}</div>
        </div>
      `

      if (_reservas.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <p class="empty-state-text">No hay reservas aún</p>
          </div>
        `
        return
      }

      content.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Película</th>
                <th>Entradas</th>
                <th>Fecha Reserva</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${_reservas.map(r => `
                <tr>
                  <td>${r.usuarioNombre}</td>
                  <td>${r.peliculaNombre}</td>
                  <td style="text-align:center">${r.cantidadEntradas}</td>
                  <td>${r.fechaReserva}</td>
                  <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
                  <td>
                    <div style="display:flex; gap:0.4rem; flex-wrap:wrap">
                      ${r.estado === 'pendiente' ? `
                        <button class="btn btn-success btn-sm" onclick="window.cambiarEstadoReserva('${r.id}', 'confirmada')">Confirmar</button>
                      ` : ''}
                      ${r.estado !== 'cancelada' ? `
                        <button
                          class="btn btn-warning btn-sm"
                          onclick="window.cambiarEstadoReserva('${r.id}', 'cancelada')"
                        >Cancelar</button>
                      ` : ''}
                      <button class="btn btn-danger btn-sm" onclick="window.eliminarReservaAdmin('${r.id}')">Borrar</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `

    } catch (error) {
      content.innerHTML = `<p style="color:var(--color-danger)">Error al cargar reservas</p>`
    }
  }

  window.cambiarEstadoReserva = async function(reservaId, nuevoEstado) {
    try {
      const reserva = _reservas.find(r => r.id === reservaId)
      if (!reserva) return

      if (nuevoEstado === 'cancelada' && reserva.estado !== 'cancelada') {
        const funcion = _funciones.find(f => f.id === reserva.funcionId)
        if (funcion) {
          // Devolvemos los cupos al cancelar
          await updateFuncion(funcion.id, {
            cuposDisponibles: funcion.cuposDisponibles + reserva.cantidadEntradas
          })
        }
      }

      await updateReserva(reservaId, { estado: nuevoEstado })
      toast.success(`Reserva ${nuevoEstado}`)
      cargarReservas()

    } catch (error) {
      toast.error('Error al actualizar la reserva')
    }
  }

  // Eliminar reserva (admin)
  window.eliminarReservaAdmin = async function(id) {
    if (!confirm('¿Eliminar esta reserva?')) return

    try {
      const reserva = _reservas.find(r => r.id === id)

      // Si la reserva no estaba cancelada, devolvemos los cupos
      if (reserva && reserva.estado !== 'cancelada') {
        const funcion = _funciones.find(f => f.id === reserva.funcionId)
        if (funcion) {
          await updateFuncion(funcion.id, {
            cuposDisponibles: funcion.cuposDisponibles + reserva.cantidadEntradas
          })
        }
      }

      await deleteReserva(id)
      toast.success('Reserva eliminada')
      cargarReservas()

    } catch (error) {
      toast.error('Error al eliminar')
    }
  }


  // ---- BONUS: FILTROS ----
  function aplicarFiltrosReservas() {
    const texto = document.getElementById('reservas-search')?.value.trim().toLowerCase() || ''
    const fecha = document.getElementById('reservas-fecha')?.value || ''
    let resultado = [..._reservas]
    if (texto) {
      resultado = resultado.filter(r =>
        r.usuarioNombre.toLowerCase().includes(texto) ||
        r.peliculaNombre.toLowerCase().includes(texto)
      )
    }
    if (fecha) {
      resultado = resultado.filter(r => r.fechaReserva === fecha)
    }
    renderTablaFiltrada(resultado)
  }

  function renderTablaFiltrada(reservas) {
    const content = document.getElementById('reservas-content')
    if (reservas.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-text">No hay reservas que coincidan con la búsqueda</p>
        </div>
      `
      return
    }
    content.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Usuario</th><th>Película</th><th>Entradas</th>
              <th>Fecha</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${reservas.map(r => `
              <tr>
                <td>${r.usuarioNombre}</td>
                <td>${r.peliculaNombre}</td>
                <td style="text-align:center">${r.cantidadEntradas}</td>
                <td>${r.fechaReserva}</td>
                <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
                <td>
                  <div style="display:flex; gap:0.4rem; flex-wrap:wrap">
                    ${r.estado === 'pendiente' ? `<button class="btn btn-success btn-sm" onclick="window.cambiarEstadoReserva('${r.id}', 'confirmada')">Confirmar</button>` : ''}
                    ${r.estado !== 'cancelada' ? `<button class="btn btn-warning btn-sm" onclick="window.cambiarEstadoReserva('${r.id}', 'cancelada')">Cancelar</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="window.eliminarReservaAdmin('${r.id}')">Borrar</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // Conectar filtros después de que el DOM esté listo
  setTimeout(() => {
    document.getElementById('reservas-search')?.addEventListener('input', aplicarFiltrosReservas)
    document.getElementById('reservas-fecha')?.addEventListener('change', aplicarFiltrosReservas)
    document.getElementById('reservas-limpiar')?.addEventListener('click', () => {
      document.getElementById('reservas-search').value = ''
      document.getElementById('reservas-fecha').value  = ''
      renderTablaFiltrada(_reservas)
    })
  }, 100)

  cargarReservas()
}
