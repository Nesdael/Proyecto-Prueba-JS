import { getFunciones, createFuncion, updateFuncion, deleteFuncion } from '../services/api.js'
import { renderNavbar, setupNavbar } from '../components/navbar.js'
import { toast } from '../utils/toast.js'

// Variable global en este módulo para guardar las funciones cargadas
let _funciones = []

export async function renderFunciones(app) {
    app.innerHTML = `
        ${renderNavbar()}
        <div class="container page">
            <div class="page-header">
        <h1 class="page-title">Gestión de Funciones</h1>
        <button class="btn btn-primary" id="btn-nueva-funcion">
            + Nueva Función
        </button>
        </div>

      
      <div class="stats-grid" id="stats-funciones"></div>

      <!-- Tabla de funciones -->
      <div id="funciones-content">
        <p style="color:var(--color-text-muted)">Cargando...</p>
      </div>
    </div>

    <!-- MODAL CREAR/EDITAR FUNCIÓN -->
    <div class="modal-overlay" id="modal-funcion" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-funcion-titulo">Nueva Función</h2>
          <button class="modal-close" id="modal-funcion-close">×</button>
        </div>

        <div class="form-group">
          <label class="form-label">Película</label>
          <input class="form-control" type="text" id="f-pelicula" placeholder="Nombre de la película" />
        </div>

        <div class="form-group">
          <label class="form-label">Sala</label>
          <select class="form-control" id="f-sala">
            <option value="Sala 1 - IMAX">Sala 1 - IMAX</option>
            <option value="Sala 2 - 3D">Sala 2 - 3D</option>
            <option value="Sala 3 - 2D">Sala 3 - 2D</option>
            <option value="Sala 4 - 2D">Sala 4 - 2D</option>
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem">
          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input class="form-control" type="date" id="f-fecha" />
          </div>
          <div class="form-group">
            <label class="form-label">Hora</label>
            <input class="form-control" type="time" id="f-hora" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Capacidad Total</label>
          <input class="form-control" type="number" id="f-capacidad" min="1" placeholder="Ej: 100" />
        </div>

        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-control" id="f-estado">
            <option value="activa">Activa</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:0.5rem">
          <button class="btn btn-secondary" id="modal-funcion-cancel">Cancelar</button>
          <button class="btn btn-primary"   id="modal-funcion-save">Guardar</button>
        </div>
      </div>
    </div>
  `

  setupNavbar()

  // ID de la función que se está editando (null = creando nueva)
  let editandoId = null

  // ---- CARGAR FUNCIONES ----
  async function cargarFunciones() {
    const content = document.getElementById('funciones-content')

    try {
      _funciones = await getFunciones()

      // Estadísticas
      const activas   = _funciones.filter(f => f.estado === 'activa').length
      const canceladas = _funciones.filter(f => f.estado === 'cancelada').length

      document.getElementById('stats-funciones').innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Total Funciones</div>
          <div class="stat-value">${_funciones.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Activas</div>
          <div class="stat-value" style="color:var(--color-success)">${activas}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Canceladas</div>
          <div class="stat-value" style="color:var(--color-danger)">${canceladas}</div>
        </div>
      `

      if (_funciones.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <p class="empty-state-text">No hay funciones. ¡Crea la primera!</p>
          </div>
        `
        return
      }

      // Tabla
      content.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Película</th>
                <th>Sala</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cupos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${_funciones.map(f => `
                <tr>
                  <td><strong>${f.pelicula}</strong></td>
                  <td>${f.sala}</td>
                  <td>${f.fecha}</td>
                  <td>${f.hora}</td>
                  <td>${f.cuposDisponibles} / ${f.capacidadTotal}</td>
                  <td><span class="badge badge-${f.estado}">${f.estado}</span></td>
                  <td>
                    <div style="display:flex; gap:0.4rem">
                      <button class="btn btn-secondary btn-sm" onclick="window.editarFuncion('${f.id}')">Editar</button>
                      <button class="btn btn-danger btn-sm" onclick="window.eliminarFuncion('${f.id}')">Eliminar</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `

    } catch (error) {
      content.innerHTML = `<p style="color:var(--color-danger)">Error al cargar funciones</p>`
    }
  }

  function abrirModal(funcion = null) {
    const modal = document.getElementById('modal-funcion')
    const titulo = document.getElementById('modal-funcion-titulo')

    if (funcion) {
      // Modo edición: llenamos los campos con los datos existentes
      editandoId = funcion.id
      titulo.textContent = 'Editar Función'
      document.getElementById('f-pelicula').value  = funcion.pelicula
      document.getElementById('f-sala').value      = funcion.sala
      document.getElementById('f-fecha').value     = funcion.fecha
      document.getElementById('f-hora').value      = funcion.hora
      document.getElementById('f-capacidad').value = funcion.capacidadTotal
      document.getElementById('f-estado').value    = funcion.estado
    } else {
      // Modo creacion: limpiamos los campos
      editandoId = null
      titulo.textContent = '+ Nueva Función'
      document.getElementById('f-pelicula').value  = ''
      document.getElementById('f-sala').value      = 'Sala 1 - IMAX'
      document.getElementById('f-fecha').value     = ''
      document.getElementById('f-hora').value      = ''
      document.getElementById('f-capacidad').value = ''
      document.getElementById('f-estado').value    = 'activa'
    }

    modal.style.display = 'flex'
  }

  function cerrarModal() {
    document.getElementById('modal-funcion').style.display = 'none'
    editandoId = null
  }

  // Botón abrir modal de nueva función
  document.getElementById('btn-nueva-funcion').addEventListener('click', () => abrirModal())
  document.getElementById('modal-funcion-close').addEventListener('click', cerrarModal)
  document.getElementById('modal-funcion-cancel').addEventListener('click', cerrarModal)

  // Guardar función (crear o editar)
  document.getElementById('modal-funcion-save').addEventListener('click', async () => {
    const pelicula  = document.getElementById('f-pelicula').value.trim()
    const sala      = document.getElementById('f-sala').value
    const fecha     = document.getElementById('f-fecha').value
    const hora      = document.getElementById('f-hora').value
    const capacidad = parseInt(document.getElementById('f-capacidad').value)
    const estado    = document.getElementById('f-estado').value

    // Validaciones
    if (!pelicula || !sala || !fecha || !hora || isNaN(capacidad)) {
      toast.error('Completa todos los campos')
      return
    }

    const datos = {
      pelicula,
      sala,
      fecha,
      hora,
      capacidadTotal: capacidad,
      estado
    }

    try {
      if (editandoId) {
        // EDITAR: no tocamos cuposDisponibles a menos que cambie la capacidad
        await updateFuncion(editandoId, datos)
        toast.success('Función actualizada')
      } else {
        // CREAR: los cupos disponibles empiezan igual a la capacidad total
        datos.cuposDisponibles = capacidad
        await createFuncion(datos)
        toast.success('Función creada')
      }

      cerrarModal()
      cargarFunciones()

    } catch (error) {
      toast.error('Error al guardar la función')
    }
  })

  // ---- EDITAR (expuesto al DOM para el onclick de la tabla) ----
  window.editarFuncion = function(id) {
    const funcion = _funciones.find(f => f.id === id)
    if (funcion) abrirModal(funcion)
  }

  // ---- ELIMINAR ----
  window.eliminarFuncion = async function(id) {
    // Confirmación antes de eliminar
    if (!confirm('¿Eliminar esta función? Esta acción no se puede deshacer.')) return

    try {
      await deleteFuncion(id)
      toast.success('Función eliminada')
      cargarFunciones()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  // Carga inicial
  cargarFunciones()
}